import { supabase, isSupabaseConfigured, isUUID, toUUID, getExactTableColumns, filterPayloadByValidColumns } from '@/lib/supabase';
import {
  AssistantCandidate,
  DispatchOffer,
  DispatchSession,
  DispatchStrategy,
  ScoredCandidate,
} from '@/types/dispatch';
import { Task } from '@/types/task';
import { rankCandidatesForTask } from '@/lib/dispatchScore';
import { TaskService } from './taskService';
import { NotificationService } from './notificationService';
import { IntegrationService } from './integrationService';

const DISPATCH_OFFER_TIMEOUT_MS = 15000; // 15 seconds offer acceptance window
const WAVE_SIZE = 3;

/**
 * Smart Dispatch Engine (Akıllı Görev Dağıtım Motoru)
 * Manages automated, score-based task offers to assistants using Single, Wave,
 * and Broadcast strategies with fallback handling.
 */
export class DispatchEngine {
  private static activeSessions: Map<string, DispatchSession> = new Map();
  private static offerTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Fetches eligible online assistants from database or returns simulated candidate set
   */
  public static async getAvailableAssistantCandidates(
    pickupLat?: number,
    pickupLng?: number
  ): Promise<AssistantCandidate[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: assistants, error } = await supabase
          .from('assistants')
          .select('*');

        if (!error && assistants && assistants.length > 0) {
          return assistants
            .filter((a: any) => Boolean(a.user_id))
            .map((a: any) => ({
              id: a.id,
              user_id: a.user_id,
              full_name: a.full_name || a.name,
              assistantId: a.id,
              profileId: a.user_id,
              isOnline: a.status === 'aktif' || a.status === 'görevde',
              isBusy: a.status === 'görevde',
              lastActiveAt: a.updated_at || new Date().toISOString(),
              latitude: a.latitude || pickupLat || 40.7731,
              longitude: a.longitude || pickupLng || 30.3948,
              acceptanceRate: 95,
              rating: 4.8,
              cancellationRate: 2,
              dailyTaskCount: 0,
              workingHoursActive: true,
              vehicleType: a.vehicle_type || 'motosiklet',
            }));
        }
      } catch (err) {
        console.warn('[DispatchEngine] Failed to load real assistants:', err);
      }
    }

    return [];
  }

  /**
   * @deprecated DO NOT USE. Use LiveDispatchService.dispatchToNextCandidate or createOrderAndDispatch instead.
   * All dispatch sessions and offers must be created via LiveDispatchService.
   */
  public static async dispatchTask(
    task: Task,
    strategy: DispatchStrategy = 'single',
    isVipCustomer = false
  ): Promise<{ success: boolean; session?: DispatchSession; error?: string }> {
    console.log(`[DispatchEngine] Initiating ${strategy.toUpperCase()} dispatch for task ${task.id}`);

    // Prevent duplicate dispatch for already dispatched / pending tasks
    if (isSupabaseConfigured && supabase) {
      try {
        const validOrderId = isUUID(task.id) ? task.id : toUUID(task.id);
        const { data: existingOffers } = await supabase
          .from('dispatch_offers')
          .select('id, status')
          .eq('order_id', validOrderId)
          .eq('status', 'pending')
          .limit(1);

        if (existingOffers && existingOffers.length > 0) {
          console.log(`[DispatchEngine] Active pending offer already exists for order ${validOrderId}. Preventing duplicate dispatch.`);
          return { success: true };
        }
      } catch (checkErr) {
        console.warn('[DispatchEngine] Existing offer check notice:', checkErr);
      }
    }

    if (strategy === 'broadcast') {
      return this.executeBroadcastDispatch(task);
    }

    // 1. Fetch Candidates
    const candidates = await this.getAvailableAssistantCandidates(task.pickup_lat, task.pickup_lng);
    if (candidates.length === 0) {
      console.log('[DispatchEngine] No online candidates available. Falling back to open pool broadcast.');
      return this.executeBroadcastDispatch(task);
    }

    // 2. Score and Rank Candidates
    const scoredCandidates = rankCandidatesForTask(candidates, task, isVipCustomer);
    console.log(
      `[DispatchEngine] Candidate Rankings for Task ${task.id}:`,
      scoredCandidates.map((c) => `${c.candidate.assistantId}: ${c.score} pts (${c.breakdown.distanceKm} km)`)
    );

    // 3. Create Dispatch Session
    const session: DispatchSession = {
      taskId: task.id,
      strategy,
      status: 'active',
      offers: [],
      currentIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.activeSessions.set(task.id, session);

    // 4. Start Strategy Execution
    if (strategy === 'single') {
      await this.processNextSingleOffer(task, session, scoredCandidates);
    } else if (strategy === 'wave') {
      await this.processWaveOffers(task, session, scoredCandidates);
    }

    return { success: true, session };
  }

  /**
   * Helper to fetch active dispatch_session_id or create a new active session in Supabase
   */
  private static async getOrCreateActiveSessionId(taskId: string): Promise<string | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const validOrderId = isUUID(taskId) ? taskId : toUUID(taskId);
    try {
      const { data: existingSessions } = await supabase
        .from('dispatch_sessions')
        .select('id')
        .eq('order_id', validOrderId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingSessions && existingSessions.length > 0 && existingSessions[0]?.id) {
        return existingSessions[0].id;
      }

      const newSessionId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : toUUID(`sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

      const rawSessionPayload = {
        id: newSessionId,
        order_id: validOrderId,
        status: 'active'
      };

      const sessionCols = await getExactTableColumns('dispatch_sessions');
      const sessionPayload = filterPayloadByValidColumns(rawSessionPayload, sessionCols);

      const { data: sessionData, error: sessionErr } = await supabase
        .from('dispatch_sessions')
        .insert(sessionPayload)
        .select('id')
        .single();

      if (!sessionErr && sessionData?.id) {
        return sessionData.id;
      } else {
        if (sessionErr) {
          console.error('[DispatchEngine] dispatch_sessions insert error:', sessionErr);
        }
        return newSessionId;
      }
    } catch (sessionErr) {
      console.error('[DispatchEngine] dispatch_sessions creation failed:', sessionErr);
      return null;
    }
  }

  /**
   * Process single offer sequentially to the top candidate
   */
  private static async processNextSingleOffer(
    task: Task,
    session: DispatchSession,
    scoredCandidates: ScoredCandidate[]
  ): Promise<void> {
    if (session.currentIndex >= scoredCandidates.length) {
      console.log(`[DispatchEngine] All candidates exhausted for task ${task.id}. Executing fallback broadcast.`);
      await this.fallbackToPoolBroadcast(task, session);
      return;
    }

    const currentCandidate = scoredCandidates[session.currentIndex];
    const targetAssistant = currentCandidate.candidate;

    if (!targetAssistant.user_id) {
      console.error("Assistant user_id is NULL", targetAssistant);
      return;
    }

    const offerId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : toUUID(`off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    const expiresAt = new Date(Date.now() + DISPATCH_OFFER_TIMEOUT_MS).toISOString();

    const offer: DispatchOffer = {
      id: offerId,
      taskId: task.id,
      assistantId: targetAssistant.user_id,
      strategy: 'single',
      score: currentCandidate.score,
      status: 'pending',
      offeredAt: new Date().toISOString(),
      expiresAt,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const activeSessionId = await this.getOrCreateActiveSessionId(task.id);
        if (activeSessionId) {
          const targetId = isUUID(task.id) ? task.id : toUUID(task.id);
          const rawOfferPayload = {
            id: offerId,
            dispatch_session_id: activeSessionId,
            order_id: targetId,
            assistant_id: targetAssistant.user_id,
            status: 'pending',
            offered_at: new Date().toISOString(),
            expires_at: expiresAt,
          };

          const offerCols = await getExactTableColumns('dispatch_offers');
          const offerPayload = filterPayloadByValidColumns(rawOfferPayload, offerCols);

          const { error: offerErr } = await supabase.from('dispatch_offers').insert(offerPayload);
          if (offerErr) {
            console.error('[DispatchEngine] dispatch_offers insert error:', offerErr);
            console.error("FULL OFFER ERROR", JSON.stringify(offerErr, null, 2));
            console.error("FULL OFFER ERROR DETAILS -> message:", offerErr?.message, "details:", offerErr?.details, "hint:", offerErr?.hint);
          }
        } else {
          console.warn('[DispatchEngine] Could not obtain active dispatch_session_id. Skipping dispatch_offers insert.');
        }
      } catch (dbErr) {
        console.error('[DispatchEngine] Failed to insert dispatch_offer to Supabase:', dbErr);
      }
    }

    session.offers.push(offer);
    session.updatedAt = new Date().toISOString();

    console.log(
      `[DispatchEngine] Offering task ${task.id} to assistant user ${targetAssistant.user_id} (Score: ${currentCandidate.score}). Timeout in 15s.`
    );

    // Notify Assistant via App & Push Notification
    await NotificationService.sendTaskNotification(
      targetAssistant.user_id,
      task.id,
      'task_assigned',
      'Yeni Göreviniz Var ⚡',
      `Size özel yeni bir görev teklifi var (${currentCandidate.score} puan eşleşme). Kabul etmek için 15 saniyeniz var!`
    );

    // Set 15-second timeout timer
    const timer = setTimeout(async () => {
      console.log(`[DispatchEngine] Offer ${offerId} expired for assistant ${offer.assistantId}`);
      offer.status = 'expired';
      session.currentIndex += 1;
      await this.processNextSingleOffer(task, session, scoredCandidates);
    }, DISPATCH_OFFER_TIMEOUT_MS);

    this.offerTimers.set(offerId, timer);
  }

  /**
   * Process wave offers (batch of candidates simultaneously)
   */
  private static async processWaveOffers(
    task: Task,
    session: DispatchSession,
    scoredCandidates: ScoredCandidate[]
  ): Promise<void> {
    const startIndex = session.currentIndex;
    const waveCandidates = scoredCandidates.slice(startIndex, startIndex + WAVE_SIZE);

    if (waveCandidates.length === 0) {
      console.log(`[DispatchEngine] Wave dispatch candidates exhausted for task ${task.id}. Executing fallback broadcast.`);
      await this.fallbackToPoolBroadcast(task, session);
      return;
    }

    const activeSessionId = (isSupabaseConfigured && supabase)
      ? await this.getOrCreateActiveSessionId(task.id)
      : null;

    const expiresAt = new Date(Date.now() + DISPATCH_OFFER_TIMEOUT_MS).toISOString();
    const waveOffers: DispatchOffer[] = [];

    for (const sc of waveCandidates) {
      const targetAssistant = sc.candidate;
      if (!targetAssistant.user_id) {
        console.error("Assistant user_id is NULL", targetAssistant);
        continue;
      }

      const offerId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : toUUID(`off-wave-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
      const offer: DispatchOffer = {
        id: offerId,
        taskId: task.id,
        assistantId: targetAssistant.user_id,
        strategy: 'wave',
        score: sc.score,
        status: 'pending',
        offeredAt: new Date().toISOString(),
        expiresAt,
        waveIndex: Math.floor(startIndex / WAVE_SIZE),
      };

      if (isSupabaseConfigured && supabase && activeSessionId) {
        try {
          const targetId = isUUID(task.id) ? task.id : toUUID(task.id);
          const rawOfferPayload = {
            id: offerId,
            dispatch_session_id: activeSessionId,
            order_id: targetId,
            assistant_id: targetAssistant.user_id,
            status: 'pending',
            offered_at: new Date().toISOString(),
            expires_at: expiresAt,
          };

          const offerCols = await getExactTableColumns('dispatch_offers');
          const offerPayload = filterPayloadByValidColumns(rawOfferPayload, offerCols);

          const { error: offerErr } = await supabase.from('dispatch_offers').insert(offerPayload);
          if (offerErr) {
            console.error('[DispatchEngine] Wave dispatch_offers insert error:', offerErr);
            console.error("FULL OFFER ERROR", JSON.stringify(offerErr, null, 2));
            console.error("FULL OFFER ERROR DETAILS -> message:", offerErr?.message, "details:", offerErr?.details, "hint:", offerErr?.hint);
          }
        } catch (dbErr) {
          console.error('[DispatchEngine] Failed to insert wave dispatch_offer to Supabase:', dbErr);
        }
      }

      session.offers.push(offer);
      waveOffers.push(offer);

      await NotificationService.sendTaskNotification(
        targetAssistant.user_id,
        task.id,
        'task_assigned',
        'Sana Özel Görev Teklifi 🚀',
        `Toplu dalga teklifi! Görevi kapmak için ilk tıklayan siz olun.`
      );
    }

    console.log(
      `[DispatchEngine] Wave #${Math.floor(startIndex / WAVE_SIZE) + 1} sent to ${waveCandidates.length} candidates for task ${task.id}`
    );

    // Wave timeout timer
    const timer = setTimeout(async () => {
      let accepted = false;
      waveOffers.forEach((o) => {
        if (o.status === 'accepted') accepted = true;
        else if (o.status === 'pending') o.status = 'expired';
      });

      if (!accepted) {
        session.currentIndex += WAVE_SIZE;
        await this.processWaveOffers(task, session, scoredCandidates);
      }
    }, DISPATCH_OFFER_TIMEOUT_MS);

    this.offerTimers.set(`wave-${task.id}-${startIndex}`, timer);
  }

  /**
   * Directly broadcasts task to open pool
   */
  private static async executeBroadcastDispatch(
    task: Task
  ): Promise<{ success: boolean; session?: DispatchSession }> {
    await TaskService.broadcastTask(task.id);
    return {
      success: true,
      session: {
        taskId: task.id,
        strategy: 'broadcast',
        status: 'fallback_pool',
        offers: [],
        currentIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Fallback strategy when single/wave dispatch fails to secure an acceptance
   */
  private static async fallbackToPoolBroadcast(
    task: Task,
    session: DispatchSession
  ): Promise<void> {
    session.status = 'fallback_pool';
    session.updatedAt = new Date().toISOString();
    await TaskService.broadcastTask(task.id);
    console.log(`[DispatchEngine] Task ${task.id} fallback completed. Moved to general open pool.`);
  }

  /**
   * Handle assistant acceptance or rejection of a dispatch offer
   */
  public static async respondToOffer(
    taskId: string,
    assistantId: string,
    accept: boolean
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const session = this.activeSessions.get(taskId);

    if (accept) {
      // 1. Assign Task via TaskService
      const assignRes = await TaskService.acceptTask(taskId, assistantId);
      if (!assignRes.success) {
        return { success: false, error: assignRes.error || 'Görev atanamadı.' };
      }

      // 2. Mark Session and Offers
      if (session) {
        session.status = 'assigned';
        session.assignedAssistantId = assistantId;
        session.updatedAt = new Date().toISOString();

        session.offers.forEach((o) => {
          if (o.assistantId === assistantId) {
            o.status = 'accepted';
            // Clear timer for this offer
            const timer = this.offerTimers.get(o.id);
            if (timer) clearTimeout(timer);
          } else if (o.status === 'pending') {
            o.status = 'expired';
          }
        });
      }

      // 3. Emit Domain Event
      let realCustomerId = assignRes.data?.customer_id || '';
      if (!realCustomerId && isSupabaseConfigured && supabase) {
        try {
          const { data: tData } = await supabase
            .from('tasks')
            .select('customer_id, order_id')
            .eq('id', taskId)
            .maybeSingle();
          if (tData) {
            realCustomerId = tData.customer_id || '';
            if (!realCustomerId && tData.order_id && isUUID(tData.order_id)) {
              console.log('[OrderFetch] orders.id being queried:', tData.order_id);
              const { data: oData } = await supabase
                .from('orders')
                .select('customer_id')
                .eq('id', tData.order_id)
                .maybeSingle();
              if (oData) realCustomerId = oData.customer_id || '';
            }
          } else if (isUUID(taskId)) {
            console.log('[OrderFetch] orders.id being queried:', taskId);
            const { data: oData } = await supabase
              .from('orders')
              .select('customer_id')
              .eq('id', taskId)
              .maybeSingle();
            if (oData) realCustomerId = oData.customer_id || '';
          }
        } catch (err) {
          console.warn('[DispatchEngine] Failed to resolve task customer_id:', err);
        }
      }

      await IntegrationService.emitTaskAccepted(
        { taskId, assistantId, customerId: realCustomerId },
        assistantId
      );

      return { success: true, message: 'Görev başarıyla üstlenildi.' };
    } else {
      // Assistant rejected offer
      if (session) {
        const pendingOffer = session.offers.find(
          (o) => o.assistantId === assistantId && o.status === 'pending'
        );

        if (pendingOffer) {
          pendingOffer.status = 'rejected';
          const timer = this.offerTimers.get(pendingOffer.id);
          if (timer) clearTimeout(timer);

          console.log(`[DispatchEngine] Assistant ${assistantId} rejected offer for task ${taskId}`);
        }
      }

      return { success: true, message: 'Teklif reddedildi.' };
    }
  }

  /**
   * Returns active dispatch session status
   */
  public static getSessionStatus(taskId: string): DispatchSession | undefined {
    return this.activeSessions.get(taskId);
  }
}
