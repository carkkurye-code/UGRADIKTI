import { supabase, getActiveSupabaseClient, isSupabaseConfigured, getStored, setStored, LOCAL_STORAGE_KEYS, Order, Assistant, db, isUUID, toUUID, getExactTableColumns, filterPayloadByValidColumns } from './supabase';
import { eventBus } from './eventBus';
import { createDomainEvent } from './domainEvents';
import { NotificationService } from '@/services/notificationService';
import { isDistrictSupported, extractZoneFromAddress } from '@/lib/locationUtils';
import { CalculatePriceOutput } from './priceEngine';

export interface DispatchOfferData {
  id: string;
  order_id?: string;
  task_id?: string;
  assistant_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'completed';
  score?: number;
  offered_at: string;
  expires_at?: string;
  courier_net?: number;
  customer_price?: number;
  estimated_minutes?: number;
  distance_km?: number;
  service_type?: string;
  order?: Order;
}

export interface CreateOrderDispatchInput {
  delivery_type: 'hemen' | 'gecerken';
  service_type: 'al' | 'birak';
  task_description: string;
  pickup_address: string;
  delivery_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  notes?: string;
  user_id?: string;
  customer_id?: string;
  address_detail?: string;
  preferred_time?: string | null;
  customer_name?: string;
  customer_phone?: string;
  total_price?: number;
  partner_id?: string | null;
  selectedPartner?: { id: string } | null;
  calcResult?: CalculatePriceOutput;
  courier_net?: number;
  base_price?: number;
  fuel_cost?: number;
  wear_cost?: number;
  operation_cost?: number;
  tax_cost?: number;
  vat_cost?: number;
  commission?: number;
  customer_price?: number;
  distance_km?: number;
  estimated_minutes?: number;
  pickup_zone?: string;
  delivery_zone?: string;
  requires_delivery_code?: boolean;
  delivery_code?: string | null;
  delivery_code_verified?: boolean;
  street?: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  place_id?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

/**
 * Live Dispatch System Service for UĞRA Platform
 * Handles order creation, assistant candidate search, dispatch offers,
 * accept/reject actions, and status progressions.
 */
export class LiveDispatchService {
  private static activelyDispatchingIds = new Set<string>();

  /**
   * Unconditionally ensures a record exists in public.tasks for the given Order.
   * @deprecated Customer requests are stored in public.orders. Tasks table insert is bypassed.
   */
  public static async ensureTaskCreatedForOrder(order: Order): Promise<{ success: boolean; taskId: string; isNew: boolean }> {
    const validTaskId = isUUID(order.id) ? order.id : toUUID(order.id);
    return { success: true, taskId: validTaskId, isNew: false };
  }

  /**
   * 1. Create order in Supabase and trigger live assistant dispatch
   */
  public static async createOrderAndDispatch(input: CreateOrderDispatchInput): Promise<{ success: boolean; order?: Order; message?: string; error?: string }> {
    try {
      const pZone = input.pickup_zone || extractZoneFromAddress(input.pickup_address);
      const dZone = input.delivery_zone || extractZoneFromAddress(input.delivery_address);

      if (!isDistrictSupported(pZone) || !isDistrictSupported(dZone)) {
        return {
          success: false,
          error: 'Üzgünüz, şu an bu bölgede hizmet vermiyoruz.',
        };
      }

      const deliveryTypeLabel = input.delivery_type === 'hemen' ? 'Hemen UĞRA' : 'Geçerken UĞRA';
      const serviceTypeLabel = input.service_type === 'al' ? 'Hazır Olanı Al' : 'Hazır Olanı Bırak';

      const offerPrice = Math.max(100, Number(input.total_price || input.customer_price || 250));
      const estMins = input.delivery_type === 'gecerken' ? 45 : 20;

      const preferredTimeText = input.preferred_time ? `\n• Ne Zaman: ${input.preferred_time}` : '';
      const notesContent = `[${deliveryTypeLabel} - ${serviceTypeLabel}] ${input.task_description}${input.address_detail ? '\n• Adres Detayı: ' + input.address_detail : ''}${preferredTimeText}`;

      const rawPartnerId = input.partner_id || input.selectedPartner?.id || null;
      const partnerUuid = rawPartnerId && isUUID(rawPartnerId) ? rawPartnerId : null;

      let createdOrder: Order | null = null;

      if (isSupabaseConfigured && supabase) {
        try {
          console.log("BEFORE createOrder (createOrderAndDispatch)");
          createdOrder = await db.createOrder({
            partner_id: partnerUuid ?? (null as any),
            customer_name: input.customer_name?.trim() || 'Müşteri',
            customer_phone: input.customer_phone?.trim() || '',
            customer_id: input.customer_id,
            customer_address: input.delivery_address || input.pickup_address || 'Adres',
            delivery_address: input.delivery_address || 'Adres',
            pickup_address: input.pickup_address || 'Adres',
            pickup_lat: input.pickup_lat ?? input.latitude,
            pickup_lng: input.pickup_lng ?? input.longitude,
            delivery_lat: input.delivery_lat ?? input.latitude,
            delivery_lng: input.delivery_lng ?? input.longitude,
            street: input.street,
            district: input.district,
            city: input.city,
            province: input.province,
            postal_code: input.postal_code,
            place_id: input.place_id,
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
            location_url: input.latitude != null && input.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${input.latitude},${input.longitude}` : undefined,
            payment_type: 'kapida_nakit',
            total_price: offerPrice,
            customer_price: offerPrice,
            courier_net: offerPrice,
            distance_km: 0,
            estimated_minutes: estMins,
            service_type: input.delivery_type,
            task_description: input.task_description,
            pickup_zone: input.pickup_zone || 'Adapazarı',
            delivery_zone: input.delivery_zone || 'Serdivan',
            base_price: offerPrice,
            fuel_cost: 0,
            wear_cost: 0,
            operation_cost: 0,
            tax_cost: 0,
            vat_cost: 0,
            commission: 0,
            notes: notesContent,
            preferred_time: input.preferred_time ?? undefined,
            requires_delivery_code: input.requires_delivery_code ?? true,
            delivery_code: input.delivery_code ?? null,
            delivery_code_verified: input.delivery_code_verified ?? false,
            items: [
              { title: `${deliveryTypeLabel} - ${serviceTypeLabel}`, quantity: 1, price: offerPrice }
            ]
          });
          console.log("AFTER createOrder (createOrderAndDispatch)");
        } catch (dbErr) {
          console.warn('[LiveDispatch] Supabase insert warning, using local fallback:', dbErr);
        }
      }

      // Local fallback if Supabase not configured or insert failed
      if (!createdOrder) {
        const localOrders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
        createdOrder = {
          id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          customer_name: input.customer_name?.trim() || 'Müşteri',
          customer_phone: input.customer_phone?.trim() || '',
          customer_id: input.customer_id,
          pickup_address: input.pickup_address,
          delivery_address: input.delivery_address,
          customer_address: input.delivery_address,
          payment_type: 'kapida_nakit',
          total_price: offerPrice,
          customer_price: offerPrice,
          courier_net: offerPrice,
          distance_km: 0,
          estimated_minutes: estMins,
          service_type: input.delivery_type,
          task_description: input.task_description,
          base_price: offerPrice,
          fuel_cost: 0,
          wear_cost: 0,
          operation_cost: 0,
          tax_cost: 0,
          vat_cost: 0,
          commission: 0,
          notes: notesContent,
          requires_delivery_code: input.requires_delivery_code ?? true,
          delivery_code: input.delivery_code ?? null,
          delivery_code_verified: input.delivery_code_verified ?? false,
          status: 'bekliyor',
          created_at: new Date().toISOString()
        };
        localOrders.unshift(createdOrder);
        setStored(LOCAL_STORAGE_KEYS.ORDERS, localOrders);
      }

      const validOrder: Order = createdOrder!;

      // 2. Immediate Assistant Dispatch Pipeline
      await this.dispatchToNextCandidate(validOrder, []);

      return {
        success: true,
        order: validOrder,
        message: 'Siparişiniz başarıyla alındı ve canlı asistan ağına iletildi.'
      };
    } catch (err: any) {
      console.error('[LiveDispatch] Order creation error:', err);
      return {
        success: false,
        error: err?.message || 'Sipariş oluşturulurken bir hata oluştu.'
      };
    }
  }

  /**
   * 2. Find eligible active assistants and dispatch offer to the best candidate not yet excluded
   */
  public static async dispatchToNextCandidate(item: any, excludedAssistantIds: string[] = []): Promise<boolean> {
    if (!item) return false;

    const isTaskRecord = Boolean(
      item.is_task ||
      item.source === 'tasks' ||
      item.service_type === 'asistan_siparis' ||
      (item.task_id && !item.order_id)
    );

    const validTaskId = isTaskRecord
      ? (item.task_id || item.id)
      : (item.task_id || null);

    const validOrderId = !isTaskRecord
      ? (item.order_id ? (isUUID(item.order_id) ? item.order_id : toUUID(item.order_id)) : (isUUID(item.id) ? item.id : toUUID(item.id)))
      : null;

    const dispatchKey = isTaskRecord ? `task_${validTaskId}` : `order_${validOrderId}`;

    if (this.activelyDispatchingIds.has(dispatchKey)) {
      console.warn(`[LiveDispatch] Already dispatching ${dispatchKey}, preventing recursive loop.`);
      return false;
    }

    this.activelyDispatchingIds.add(dispatchKey);

    try {
      // Prevent duplicate dispatch offers for the same order or task
      if (isSupabaseConfigured && supabase) {
        try {
          let checkQuery = supabase.from('dispatch_offers').select('id, status').eq('status', 'pending');
          if (isTaskRecord && validTaskId) {
            checkQuery = checkQuery.eq('task_id', validTaskId);
          } else if (validOrderId) {
            checkQuery = checkQuery.eq('order_id', validOrderId);
          }

          const { data: existingOffers } = await checkQuery.limit(1);

          if (existingOffers && existingOffers.length > 0) {
            console.log(`[LiveDispatch] Active pending offer already exists for ${dispatchKey}. Preventing duplicate dispatch.`);
            return true;
          }
        } catch (checkErr) {
          console.warn('[LiveDispatch] Existing offer check notice:', checkErr);
        }
      }

      let activeAssistants: Assistant[] = [];

      // Fetch active online assistants safely
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('assistants')
            .select('*');

          if (!error && data && data.length > 0) {
            activeAssistants = (data as Assistant[]).filter(a =>
              Boolean(a.user_id || a.id) && a.is_online !== false && (a.status as any) !== 'pasif' && (a.status as any) !== 'pending'
            );
          }
        } catch (err) {
          console.warn('[LiveDispatch] Error loading assistants from Supabase:', err);
        }

        // Fallback: If no assistants found in assistants table, check profiles with role 'assistant'
        if (activeAssistants.length === 0) {
          try {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('*')
              .eq('role', 'assistant');

            if (profilesData && profilesData.length > 0) {
              activeAssistants = profilesData.map((p: any) => ({
                id: p.assistant_id || p.id,
                user_id: p.id,
                full_name: p.full_name || 'Asistan',
                email: p.email || '',
                phone: p.phone || '',
                vehicle_type: 'motosiklet',
                status: 'aktif',
                is_online: true,
                created_at: p.created_at || new Date().toISOString()
              }));
            }
          } catch (pErr) {
            console.warn('[LiveDispatch] Profiles fallback query notice:', pErr);
          }
        }
      }

      // Filter out assistants who already rejected or are excluded
      let candidates = activeAssistants.filter(a => {
        const asstId = a.user_id || a.id;
        return !excludedAssistantIds.includes(asstId) && !excludedAssistantIds.includes(a.id);
      });

      // Fallback: if no filtered candidates, use any active assistant
      if (candidates.length === 0 && activeAssistants.length > 0) {
        candidates = activeAssistants;
      }

      if (candidates.length === 0) {
        const targetId = isTaskRecord ? validTaskId : validOrderId;
        console.log(`[LiveDispatch] No candidates available for ${dispatchKey}. Item remains in open pool.`);
        eventBus.publish(
          createDomainEvent('NOTIFICATION_CREATED', targetId || 'open_pool', {
            notificationId: targetId || 'open_pool',
            title: '⚡ Yeni Görev Havuzda!',
            body: `Sipariş #${String(targetId).slice(0, 8)}: ${item.notes || item.task_description || 'Yeni hizmet talebi'}`,
            type: 'task_created',
            order: item
          })
        );
        return false;
      }

      // Select top candidate
      const targetAssistant = candidates[0];
      const targetAssistantId = targetAssistant.user_id || targetAssistant.id;

      const offerId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : toUUID('off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

      const offerData: DispatchOfferData = {
        id: offerId,
        order_id: validOrderId || undefined,
        task_id: validTaskId || undefined,
        assistant_id: targetAssistantId,
        status: 'pending',
        score: 98,
        offered_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString(),
        courier_net: item.courier_net ?? 0,
        customer_price: item.customer_price ?? item.total_price ?? 0,
        estimated_minutes: item.estimated_minutes ?? 15,
        distance_km: item.distance_km ?? 1.5,
        service_type: item.service_type || 'asistan_siparis',
        order: item
      };

      // Save dispatch_sessions, dispatch_offers & notifications if available
      if (isSupabaseConfigured && supabase) {
        let activeSessionId: string | null = null;
        let offerInsertSuccess = false;

        const validOfferId = isUUID(offerData.id) ? offerData.id : toUUID(offerData.id);
        const validAssistantId = targetAssistantId;

        // Create or get dispatch_sessions record
        try {
          let sessionQuery = supabase.from('dispatch_sessions').select('id');
          if (isTaskRecord && validTaskId) {
            sessionQuery = sessionQuery.eq('task_id', validTaskId);
          } else if (validOrderId) {
            sessionQuery = sessionQuery.eq('order_id', validOrderId);
          }

          const { data: existingSessions } = await sessionQuery.order('created_at', { ascending: false }).limit(1);

          if (existingSessions && existingSessions.length > 0 && existingSessions[0]?.id) {
            activeSessionId = existingSessions[0].id;
          } else {
            const newSessionId = toUUID('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
            const rawSessionPayload: Record<string, any> = {
              id: newSessionId,
              status: 'active'
            };

            if (isTaskRecord && validTaskId) {
              rawSessionPayload.task_id = validTaskId;
              // CRITICAL: DO NOT set order_id for store task!
            } else if (validOrderId) {
              rawSessionPayload.order_id = validOrderId;
              rawSessionPayload.task_id = validOrderId;
            }

            const sessionCols = await getExactTableColumns('dispatch_sessions');
            const sessionInsertPayload = filterPayloadByValidColumns(rawSessionPayload, sessionCols);

            const { data: sessionData, error: sessionErr } = await supabase
              .from('dispatch_sessions')
              .insert([sessionInsertPayload])
              .select('id')
              .single();

            if (!sessionErr && sessionData?.id) {
              activeSessionId = sessionData.id;
            } else {
              console.warn('[LiveDispatch] dispatch_sessions insert conflict/notice, searching existing session:', sessionErr);
              let retryQuery = supabase.from('dispatch_sessions').select('id');
              if (isTaskRecord && validTaskId) {
                retryQuery = retryQuery.eq('task_id', validTaskId);
              } else if (validOrderId) {
                retryQuery = retryQuery.eq('order_id', validOrderId);
              }

              const { data: retrySessions } = await retryQuery.order('created_at', { ascending: false }).limit(1);

              if (retrySessions && retrySessions.length > 0 && retrySessions[0]?.id) {
                activeSessionId = retrySessions[0].id;
              }
            }
          }
        } catch (sessionErr) {
          console.warn('[LiveDispatch] dispatch_sessions creation notice:', sessionErr);
        }

        if (!activeSessionId) {
          console.error(`[LiveDispatch] Active dispatch_session not found for ${dispatchKey}. Aborting offer creation.`);
          return false;
        }

        // Check if offer already exists (idempotency check)
        let offerCheckQuery = supabase.from('dispatch_offers').select('id');
        if (isTaskRecord && validTaskId) {
          offerCheckQuery = offerCheckQuery.eq('task_id', validTaskId).eq('assistant_id', validAssistantId);
        } else if (validOrderId) {
          offerCheckQuery = offerCheckQuery.eq('order_id', validOrderId).eq('assistant_id', validAssistantId);
        }

        const { data: existingOffer } = await offerCheckQuery.maybeSingle();

        if (existingOffer) {
          console.log(`[LiveDispatch] dispatch_offer already exists for ${dispatchKey} and assistant #${validAssistantId}`);
          offerInsertSuccess = true;
        } else {
          const rawOfferPayload: Record<string, any> = {
            id: validOfferId,
            assistant_id: validAssistantId,
            dispatch_session_id: activeSessionId,
            status: 'pending',
            offered_at: offerData.offered_at,
            expires_at: offerData.expires_at || new Date(Date.now() + 60000).toISOString(),
            courier_net: offerData.courier_net,
            customer_price: offerData.customer_price,
            estimated_minutes: offerData.estimated_minutes,
            distance_km: offerData.distance_km,
            service_type: offerData.service_type
          };

          if (isTaskRecord && validTaskId) {
            rawOfferPayload.task_id = validTaskId;
            // CRITICAL: DO NOT set order_id for store task!
          } else if (validOrderId) {
            rawOfferPayload.order_id = validOrderId;
            rawOfferPayload.task_id = validOrderId;
          }

          const offerCols = await getExactTableColumns('dispatch_offers');
          const offerPayload = filterPayloadByValidColumns(rawOfferPayload, offerCols);

          console.log('[LiveDispatch] Inserting dispatch_offer:', offerPayload);

          const { error: offerErr, status: respStatus } = await supabase
            .from('dispatch_offers')
            .insert([offerPayload]);

          if (!offerErr) {
            offerInsertSuccess = true;
            console.log('[LiveDispatch] dispatch_offers inserted successfully:', validOfferId);
          } else if (offerErr.code === '23505') {
            offerInsertSuccess = true;
            console.log('[LiveDispatch] dispatch_offers already existed (23505):', validOfferId);
          } else {
            console.error('[LiveDispatch] dispatch_offers insert error details:', {
              status: respStatus,
              message: offerErr.message,
              details: offerErr.details,
              hint: offerErr.hint,
              code: offerErr.code
            });
            return false;
          }
        }

        if (offerInsertSuccess) {
          try {
            let recipientUserId = validAssistantId;

            if (recipientUserId && isUUID(recipientUserId)) {
              await NotificationService.createNotification({
                recipient_profile_id: recipientUserId,
                title: '⚡ Yeni Görev Teklifi!',
                body: `Sipariş #${String(validTaskId || validOrderId || '').slice(0, 8)}: ${item.notes || item.task_description || 'Yeni hizmet talebi'}`,
                type: 'task_assigned',
                channels: ['app'],
                payload: offerData
              });
            }
          } catch (notifErr) {
            console.warn('[LiveDispatch] notifications insert notice:', notifErr);
          }
        }
      }

      // Store in LocalStorage fallback array
      const storedOffers = getStored<DispatchOfferData>('ugra_dispatch_offers');
      storedOffers.unshift(offerData);
      setStored('ugra_dispatch_offers', storedOffers);

      // Emit Domain Event via EventBus for live Instant UI update
      eventBus.publish(
        createDomainEvent('NOTIFICATION_CREATED', offerId, {
          notificationId: offerId,
          recipientProfileId: targetAssistantId,
          title: '⚡ Yeni Görev Teklifi!',
          body: `Sipariş #${String(validTaskId || validOrderId || '').slice(0, 8)}: ${item.notes || item.task_description || 'Yeni hizmet talebi'}`,
          type: 'dispatch_offer',
          offer: offerData,
          order: item
        })
      );

      console.log(`[LiveDispatch] Item ${dispatchKey} offered to assistant ${targetAssistant.id} (${targetAssistant.full_name})`);
      return true;
    } catch (err) {
      console.error('[LiveDispatch] dispatchToNextCandidate exception:', err);
      return false;
    } finally {
      this.activelyDispatchingIds.delete(dispatchKey);
    }
  }

  /**
   * 3. Handle Assistant Accept ("Kabul Et") Action
   */
  public static async acceptOffer(orderId: string, offerId: string, assistantId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Rule 7: Single assistant atomic lock check
      if (isSupabaseConfigured && supabase) {
        try {
          if (isUUID(orderId)) {
            // Check tasks table first
            const { data: checkTask } = await supabase.from('tasks').select('*').eq('id', orderId).maybeSingle();
            if (checkTask) {
              if (checkTask.assistant_id && checkTask.assistant_id !== assistantId) {
                return {
                  success: false,
                  error: 'Bu sipariş başka bir asistan tarafından kabul edildi.'
                };
              }
              if (['accepted', 'on_the_way', 'delivered', 'completed'].includes(checkTask.status)) {
                if (checkTask.assistant_id !== assistantId) {
                  return {
                    success: false,
                    error: 'Bu sipariş başka bir asistan tarafından zaten üstlenildi.'
                  };
                }
              }
              if (checkTask.order_id && isUUID(checkTask.order_id)) {
                console.log('[OrderFetch] orders.id being queried:', checkTask.order_id);
                const { data: checkOrder } = await supabase.from('orders').select('*').eq('id', checkTask.order_id).maybeSingle();
                if (checkOrder) {
                  if (checkOrder.assistant_id && checkOrder.assistant_id !== assistantId) {
                    return { success: false, error: 'Bu sipariş başka bir asistan tarafından kabul edildi.' };
                  }
                }
              }
            } else {
              console.log('[OrderFetch] orders.id being queried:', orderId);
              const { data: checkOrder, error: checkErr } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .maybeSingle();

              if (!checkErr && checkOrder) {
                if (checkOrder.assistant_id && checkOrder.assistant_id !== assistantId) {
                  return {
                    success: false,
                    error: 'Bu sipariş başka bir asistan tarafından kabul edildi.'
                  };
                }
                if (checkOrder.status === 'accepted' || checkOrder.status === 'on_the_way' || checkOrder.status === 'delivered' || checkOrder.status === 'completed') {
                  if (checkOrder.assistant_id !== assistantId) {
                    return {
                      success: false,
                      error: 'Bu sipariş başka bir asistan tarafından zaten üstlenildi.'
                    };
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('[LiveDispatch] Atomic check error:', e);
        }
      }

      // 1. Update order status and assistant_id in orders table
      if (isSupabaseConfigured) {
        try {
          const client = await getActiveSupabaseClient();
          if (isUUID(orderId)) {
            const validAssistantId = isUUID(assistantId) ? assistantId : toUUID(assistantId);
            const nowIso = new Date().toISOString();

            // Update orders table with exact column filtering
            const orderCols = await getExactTableColumns('orders');
            const rawOrderPayload: Record<string, any> = {
              assistant_id: validAssistantId,
              status: 'accepted',
              accepted_at: nowIso,
              updated_at: nowIso
            };
            const orderPayload = filterPayloadByValidColumns(rawOrderPayload, orderCols);

            if (Object.keys(orderPayload).length > 0) {
              const { error: orderErr } = await client
                .from('orders')
                .update(orderPayload)
                .eq('id', orderId);

              if (orderErr) {
                console.warn('[LiveDispatch] Supabase orders update notice:', orderErr);
              }
            }

            if (isUUID(offerId)) {
              await client
                .from('dispatch_offers')
                .update({ status: 'accepted' })
                .eq('id', offerId);

              const validOrderId = isUUID(orderId) ? orderId : toUUID(orderId);
              await client
                .from('dispatch_offers')
                .update({ status: 'cancelled' })
                .eq('order_id', validOrderId)
                .neq('id', offerId);
            }
          }
        } catch (dbErr) {
          console.warn('[LiveDispatch] Supabase accept update error:', dbErr);
        }
      }

      // 2. Update Local Storage Cache
      const localOrders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
      const oIdx = localOrders.findIndex(o => o.id === orderId);
      if (oIdx !== -1) {
        localOrders[oIdx] = {
          ...localOrders[oIdx],
          assistant_id: assistantId,
          status: 'accepted',
          updated_at: new Date().toISOString()
        };
        setStored(LOCAL_STORAGE_KEYS.ORDERS, localOrders);
      }

      const storedOffers = getStored<DispatchOfferData>('ugra_dispatch_offers');
      storedOffers.forEach(o => {
        if (o.order_id === orderId) {
          if (o.id === offerId || o.assistant_id === assistantId) {
            o.status = 'completed';
          } else {
            o.status = 'cancelled';
          }
        }
      });
      setStored('ugra_dispatch_offers', storedOffers);

      // 3. Emit Domain Event to clear offer from other assistants live
      let resolvedCustomerId: string | undefined = undefined;
      if (isSupabaseConfigured && supabase && isUUID(orderId)) {
        try {
          const { data: tMatch } = await supabase.from('tasks').select('customer_id, user_id, order_id').eq('id', orderId).maybeSingle();
          if (tMatch) {
            resolvedCustomerId = tMatch.customer_id || tMatch.user_id;
            if (!resolvedCustomerId && tMatch.order_id && isUUID(tMatch.order_id)) {
              console.log('[OrderFetch] orders.id being queried:', tMatch.order_id);
              const { data: ord } = await supabase.from('orders').select('*').eq('id', tMatch.order_id).maybeSingle();
              if (ord) resolvedCustomerId = ord.customer_id || ord.user_id || ord.partner_id;
            }
          } else {
            console.log('[OrderFetch] orders.id being queried:', orderId);
            const { data: ord } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
            if (ord) resolvedCustomerId = ord.customer_id || ord.user_id || ord.partner_id;
          }
        } catch (e) {}
      }

      eventBus.publish(
        createDomainEvent('TASK_ACCEPTED', orderId, {
          taskId: orderId,
          orderId,
          offerId,
          assistantId,
          customerId: resolvedCustomerId,
          status: 'accepted'
        })
      );

      return {
        success: true,
        message: 'Görev başarıyla kabul edildi ve hesabınıza atandı!'
      };
    } catch (err: any) {
      console.error('[LiveDispatch] acceptOffer error:', err);
      return {
        success: false,
        error: err?.message || 'Görev kabul edilirken bir hata oluştu.'
      };
    }
  }

  /**
   * 4. Handle Assistant Reject ("Reddet") Action
   */
  public static async rejectOffer(orderId: string, offerId: string, assistantId: string, customClient?: any): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. Mark offer as rejected in Supabase
      const client = customClient || supabase;
      if (isSupabaseConfigured && client) {
        try {
          if (offerId && isUUID(offerId)) {
            await client
              .from('dispatch_offers')
              .update({ status: 'rejected' })
              .eq('id', offerId);
          } else if (orderId && isUUID(orderId)) {
            await client
              .from('dispatch_offers')
              .update({ status: 'rejected' })
              .or(`order_id.eq.${orderId},task_id.eq.${orderId}`)
              .eq('assistant_id', assistantId);
          }
        } catch (dbErr) {
          console.warn('[LiveDispatch] Supabase offer rejection update error:', dbErr);
        }
      }

      // Update Local Storage offers
      const storedOffers = getStored<DispatchOfferData>('ugra_dispatch_offers');
      const excludedAssistantIds: string[] = [assistantId];

      storedOffers.forEach(o => {
        if (o.order_id === orderId) {
          if (o.id === offerId || o.assistant_id === assistantId) {
            o.status = 'rejected';
          }
          if (o.assistant_id) {
            excludedAssistantIds.push(o.assistant_id);
          }
        }
      });
      setStored('ugra_dispatch_offers', storedOffers);

      // Emit event to remove offer card from current assistant
      eventBus.publish(
        createDomainEvent('TASK_CANCELLED', orderId, {
          taskId: orderId,
          orderId,
          offerId,
          assistantId,
          status: 'rejected'
        })
      );

      // 2. Fetch order and automatically dispatch to the NEXT available candidate
      let targetOrder: Order | null = null;
      const localOrders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
      targetOrder = localOrders.find(o => o.id === orderId) || null;

      if (!targetOrder && isSupabaseConfigured && supabase && isUUID(orderId)) {
        const { data: tMatch } = await supabase.from('tasks').select('*').eq('id', orderId).maybeSingle();
        if (tMatch) {
          if (tMatch.order_id && isUUID(tMatch.order_id)) {
            console.log('[OrderFetch] orders.id being queried:', tMatch.order_id);
            const { data: oMatch } = await supabase.from('orders').select('*').eq('id', tMatch.order_id).maybeSingle();
            if (oMatch) targetOrder = { ...oMatch, ...tMatch } as any;
            else targetOrder = tMatch as any;
          } else {
            targetOrder = tMatch as any;
          }
        } else {
          console.log('[OrderFetch] orders.id being queried:', orderId);
          const { data } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
          if (data) targetOrder = data as Order;
        }
      }

      if (targetOrder) {
        await this.dispatchToNextCandidate(targetOrder, excludedAssistantIds);
      }

      return {
        success: true,
        message: 'Teklif reddedildi, sıradaki musait asistana yönlendiriliyor.'
      };
    } catch (err: any) {
      console.error('[LiveDispatch] rejectOffer error:', err);
      return {
        success: false,
        message: 'Teklif reddedildi.'
      };
    }
  }

  /**
   * 5. Update Order Status (Sequential progression: Bekliyor -> Kabul Edildi -> Yolda -> Teslim Edildi -> Tamamlandı)
   */
  public static async updateOrderStatus(orderId: string, newStatus: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      let updatedOrder: Order | null = null;

      if (isSupabaseConfigured) {
        try {
          const client = await getActiveSupabaseClient();
          if (isUUID(orderId)) {
            const { data: tMatch } = await client.from('tasks').select('id, order_id').eq('id', orderId).maybeSingle();
            if (tMatch) {
              const { data: uTask } = await client.from('tasks').update({ status: newStatus }).eq('id', orderId).select('*').maybeSingle();
              if (uTask) updatedOrder = uTask as Order;
              if (tMatch.order_id && isUUID(tMatch.order_id)) {
                console.log('[OrderFetch] orders.id being queried:', tMatch.order_id);
                const { data: uOrder } = await client.from('orders').update({ status: newStatus }).eq('id', tMatch.order_id).select('*').maybeSingle();
                if (uOrder) updatedOrder = { ...(uOrder as Order), ...updatedOrder };
              }
            } else {
              console.log('[OrderFetch] orders.id being queried:', orderId);
              const { data, error } = await client
                .from('orders')
                .update({
                  status: newStatus
                })
                .eq('id', orderId)
                .select('*')
                .maybeSingle();

              if (!error && data) {
                updatedOrder = data as Order;
              }
            }
          }
        } catch (dbErr) {
          console.warn('[LiveDispatch] Supabase status update warning:', dbErr);
        }
      }

      const localOrders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
      const idx = localOrders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        localOrders[idx] = {
          ...localOrders[idx],
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        setStored(LOCAL_STORAGE_KEYS.ORDERS, localOrders);
        if (!updatedOrder) updatedOrder = localOrders[idx];
      }

      // Broadcast update event
      eventBus.publish(
        createDomainEvent('TASK_COMPLETED', orderId, {
          taskId: orderId,
          orderId,
          status: newStatus
        })
      );

      return {
        success: true,
        order: updatedOrder || undefined
      };
    } catch (err: any) {
      console.error('[LiveDispatch] updateOrderStatus error:', err);
      return {
        success: false,
        error: err?.message || 'Sipariş durumu güncellenirken bir hata oluştu.'
      };
    }
  }
}
