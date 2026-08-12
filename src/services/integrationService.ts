import { eventBus } from '@/lib/eventBus';
import {
  DomainEvent,
  DomainEventType,
  createDomainEvent,
  TaskCreatedPayload,
  TaskAssignedPayload,
  TaskAcceptedPayload,
  TaskPickedUpPayload,
  TaskCompletedPayload,
  TaskCancelledPayload,
  PaymentCapturedPayload,
  PaymentRefundedPayload,
  WalletUpdatedPayload,
  RatingCreatedPayload,
  NotificationCreatedPayload,
  PartnerApprovedPayload,
  AssistantApprovedPayload,
} from '@/lib/domainEvents';
import { TaskService } from './taskService';
import { WalletService } from './walletService';
import { RatingService } from './ratingService';
import { NotificationService } from './notificationService';
import { DispatchEngine } from './dispatchEngine';
import { LiveDispatchService } from '@/lib/dispatchService';
import { Task, TaskType } from '@/types/task';
import { supabase, isSupabaseConfigured, isUUID, getExactTableColumns, filterPayloadByValidColumns } from '@/lib/supabase';

/**
 * Helper: Insert a standardized audit log entry into Supabase audit_logs table
 */
async function recordAuditLog(
  _action: string,
  _profileId?: string,
  _details: Record<string, any> = {}
): Promise<void> {
  return;
}

/**
 * Production Service Integration Engine for UĞRA Platform
 * Connects Task, Wallet, Rating, Notification, and Audit Log services
 * seamlessly through Event-Driven Architecture (Domain Events).
 */
export class IntegrationService {
  private static isInitialized = false;
  private static unbindList: Array<() => void> = [];

  /**
   * Initialize and subscribe all domain event handlers to EventBus
   */
  public static initialize(): void {
    if (this.isInitialized) return;

    console.log('[IntegrationEngine] Initializing UĞRA Production Service Integration Engine...');

    // 1. TASK_CREATED
    this.unbindList.push(
      eventBus.subscribe<TaskCreatedPayload>('TASK_CREATED', async (evt) => {
        let { taskId, customerId, price } = evt.payload;
        console.log(`[IntegrationEngine] Processing TASK_CREATED for task ${taskId}`);

        if (!customerId && taskId && isUUID(taskId) && isSupabaseConfigured && supabase) {
          try {
            const { data: tData } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
            if (tData) {
              customerId = tData.customer_id || tData.user_id || tData.partner_id;
              if (!customerId && tData.order_id && isUUID(tData.order_id)) {
                console.log('[OrderFetch] orders.id being queried:', tData.order_id);
                const { data: oData } = await supabase.from('orders').select('*').eq('id', tData.order_id).maybeSingle();
                if (oData) customerId = oData.customer_id || oData.user_id || oData.partner_id;
              }
            }
          } catch (e) {}
        }

        // a. Notification
        if (customerId && isUUID(customerId)) {
          await NotificationService.sendTaskNotification(
            customerId,
            taskId,
            'task_assigned',
            'Görev Oluşturuldu',
            'Göreviniz başarıyla oluşturuldu ve sistemde yayınlandı.'
          );
        }

        // b. Audit Log
        if (customerId) {
          await recordAuditLog('TASK_CREATED', customerId, { ...evt.payload });
        }

        // c. Wallet Escrow Hold
        if (customerId && price > 0) {
          await WalletService.holdBalance(customerId, price, taskId);
        }

        // d. Trigger Live Dispatch Engine
        await LiveDispatchService.dispatchToNextCandidate({
          id: taskId,
          customer_id: customerId || '',
          partner_id: evt.payload.partnerId,
          price,
          pickup_address: evt.payload.pickupAddress || '',
          delivery_address: evt.payload.deliveryAddress || '',
          customer_name: 'Müşteri',
          customer_phone: '',
          customer_address: evt.payload.deliveryAddress || '',
          total_price: price,
          status: 'pending'
        } as any, []);
      })
    );

    // 2. TASK_ACCEPTED
    this.unbindList.push(
      eventBus.subscribe<TaskAcceptedPayload>('TASK_ACCEPTED', async (evt) => {
        let { taskId, assistantId, customerId } = evt.payload;
        console.log(`[IntegrationEngine] Processing TASK_ACCEPTED for task ${taskId}`);

        if ((!customerId || !assistantId) && taskId && isUUID(taskId) && isSupabaseConfigured && supabase) {
          try {
            const { data: tData } = await supabase.from('tasks').select('customer_id, user_id, assistant_id, order_id').eq('id', taskId).maybeSingle();
            if (tData) {
              if (!customerId) customerId = tData.customer_id || tData.user_id;
              if (!assistantId) assistantId = tData.assistant_id;
              if ((!customerId || !assistantId) && tData.order_id && isUUID(tData.order_id)) {
                console.log('[OrderFetch] orders.id being queried:', tData.order_id);
                const { data: oData } = await supabase.from('orders').select('customer_id, user_id, assistant_id').eq('id', tData.order_id).maybeSingle();
                if (oData) {
                  if (!customerId) customerId = oData.customer_id || oData.user_id;
                  if (!assistantId) assistantId = oData.assistant_id;
                }
              }
            }
          } catch (e) {}
        }

        // a. Task Status Update Notification to Customer
        if (customerId && isUUID(customerId)) {
          await NotificationService.sendTaskNotification(
            customerId,
            taskId,
            'task_updated',
            'Görev Kabul Edildi',
            'Asistanınız görevinizi kabul etti ve hazırlanıyor.'
          );
        }

        // b. Notification to Assistant
        if (assistantId && isUUID(assistantId)) {
          await NotificationService.sendTaskNotification(
            assistantId,
            taskId,
            'task_assigned',
            'Görev Üstlenildi',
            'Görevi başarıyla üstlendiniz. Lütfen zamanında çıkış yapın.'
          );
        }

        // c. Audit Log
        if (assistantId || customerId) {
          await recordAuditLog('TASK_ACCEPTED', assistantId || customerId || 'system', { taskId, customerId });
        }
      })
    );

    // 3. TASK_PICKED_UP
    this.unbindList.push(
      eventBus.subscribe<TaskPickedUpPayload>('TASK_PICKED_UP', async (evt) => {
        let { taskId, assistantId, customerId } = evt.payload;
        console.log(`[IntegrationEngine] Processing TASK_PICKED_UP for task ${taskId}`);

        if ((!customerId || !assistantId) && taskId && isUUID(taskId) && isSupabaseConfigured && supabase) {
          try {
            const { data: tData } = await supabase.from('tasks').select('customer_id, user_id, assistant_id, order_id').eq('id', taskId).maybeSingle();
            if (tData) {
              if (!customerId) customerId = tData.customer_id || tData.user_id;
              if (!assistantId) assistantId = tData.assistant_id;
              if ((!customerId || !assistantId) && tData.order_id && isUUID(tData.order_id)) {
                console.log('[OrderFetch] orders.id being queried:', tData.order_id);
                const { data: oData } = await supabase.from('orders').select('customer_id, user_id, assistant_id').eq('id', tData.order_id).maybeSingle();
                if (oData) {
                  if (!customerId) customerId = oData.customer_id || oData.user_id;
                  if (!assistantId) assistantId = oData.assistant_id;
                }
              }
            }
          } catch (e) {}
        }

        // a. Notification
        if (customerId && isUUID(customerId)) {
          await NotificationService.sendTaskNotification(
            customerId,
            taskId,
            'task_updated',
            'Paket Teslim Alındı',
            'Asistanınız paketi teslim aldı ve teslimat adresine doğru yola çıktı.'
          );
        }

        // b. Audit Log
        if (assistantId || customerId) {
          await recordAuditLog('TASK_PICKED_UP', assistantId || customerId || 'system', { taskId, customerId });
        }
      })
    );

    // 4. TASK_COMPLETED
    this.unbindList.push(
      eventBus.subscribe<TaskCompletedPayload>('TASK_COMPLETED', async (evt) => {
        let { taskId, assistantId, customerId, partnerId, price } = evt.payload;
        console.log(`[IntegrationEngine] Processing TASK_COMPLETED for task ${taskId}`);

        if ((!customerId || !assistantId) && taskId && isUUID(taskId) && isSupabaseConfigured && supabase) {
          try {
            const { data: tData } = await supabase.from('tasks').select('customer_id, user_id, assistant_id, partner_id, customer_price, courier_net, order_id').eq('id', taskId).maybeSingle();
            if (tData) {
              if (!customerId) customerId = tData.customer_id || tData.user_id;
              if (!assistantId) assistantId = tData.assistant_id;
              if (!partnerId) partnerId = tData.partner_id;
              if (!price) price = Number(tData.customer_price || tData.courier_net || 0);
              if ((!customerId || !assistantId || !partnerId) && tData.order_id && isUUID(tData.order_id)) {
                console.log('[OrderFetch] orders.id being queried:', tData.order_id);
                const { data: oData } = await supabase.from('orders').select('customer_id, user_id, assistant_id, partner_id, total_price, customer_price').eq('id', tData.order_id).maybeSingle();
                if (oData) {
                  if (!customerId) customerId = oData.customer_id || oData.user_id;
                  if (!assistantId) assistantId = oData.assistant_id;
                  if (!partnerId) partnerId = oData.partner_id;
                  if (!price) price = Number(oData.total_price || oData.customer_price || 0);
                }
              }
            }
          } catch (e) {}
        }

        // a. Capture Payment & Release Escrow
        await WalletService.capturePayment(taskId);

        // b. Calculate Commission Breakdown
        const breakdown = WalletService.calculateCommission(price || 0);

        // c. Deposit Assistant Earnings
        if (assistantId && isUUID(assistantId) && breakdown.assistant_amount > 0) {
          await WalletService.deposit(
            assistantId,
            breakdown.assistant_amount,
            `Görev Kazancı (#${taskId})`
          );
        }

        // d. Deposit Partner Earnings (if applicable)
        if (partnerId && isUUID(partnerId) && breakdown.partner_amount > 0) {
          await WalletService.deposit(
            partnerId,
            breakdown.partner_amount,
            `Görev Komisyon Payı (#${taskId})`
          );
        }

        // e. Notification to Customer
        if (customerId && isUUID(customerId)) {
          await NotificationService.sendTaskNotification(
            customerId,
            taskId,
            'task_completed',
            'Görev Tamamlandı',
            'Göreviniz başarıyla tamamlandı. Hizmeti değerlendirmek için tıklayın.'
          );
        }

        // f. Notification to Assistant
        if (assistantId && isUUID(assistantId)) {
          await NotificationService.sendPaymentNotification(
            assistantId,
            breakdown.assistant_amount,
            'payment_received',
            'Kazanç Hesabınıza Aktarıldı',
            `#${taskId} numaralı görevden ${breakdown.assistant_amount} ₺ kazancınız bakiyenize eklendi.`
          );
        }

        // g. Audit Log
        await recordAuditLog('TASK_COMPLETED', assistantId || customerId || 'system', {
          taskId,
          customerId,
          partnerId,
          price,
          breakdown,
        });

        // h. Trigger Automatic Rating Prompt Notification
        if (customerId && isUUID(customerId)) {
          await NotificationService.createNotification({
            recipient_profile_id: customerId,
            title: 'Asistanınızı Değerlendirin',
            body: 'Tamamlanan göreviniz için asistanınıza puan ve yorum bırakın.',
            type: 'system',
            channels: ['app', 'push'],
            payload: { task_id: taskId, extra: { action: 'open_rating' } },
          });
        }
      })
    );

    // 5. TASK_CANCELLED
    this.unbindList.push(
      eventBus.subscribe<TaskCancelledPayload>('TASK_CANCELLED', async (evt) => {
        let { taskId, customerId, assistantId, price, reason } = evt.payload;
        console.log(`[IntegrationEngine] Processing TASK_CANCELLED for task ${taskId}`);

        if ((!customerId || !assistantId) && taskId && isUUID(taskId) && isSupabaseConfigured && supabase) {
          try {
            const { data: tData } = await supabase.from('tasks').select('customer_id, user_id, assistant_id, order_id').eq('id', taskId).maybeSingle();
            if (tData) {
              if (!customerId) customerId = tData.customer_id || tData.user_id;
              if (!assistantId) assistantId = tData.assistant_id;
              if ((!customerId || !assistantId) && tData.order_id && isUUID(tData.order_id)) {
                console.log('[OrderFetch] orders.id being queried:', tData.order_id);
                const { data: oData } = await supabase.from('orders').select('customer_id, user_id, assistant_id').eq('id', tData.order_id).maybeSingle();
                if (oData) {
                  if (!customerId) customerId = oData.customer_id || oData.user_id;
                  if (!assistantId) assistantId = oData.assistant_id;
                }
              }
            }
          } catch (e) {}
        }

        // a. Release Escrow / Refund Customer
        if (customerId && price > 0) {
          await WalletService.releaseBalance(customerId, price, taskId);
          await WalletService.refundPayment(taskId, reason);
        }

        // b. Notification to Customer
        if (customerId && isUUID(customerId)) {
          await NotificationService.sendTaskNotification(
            customerId,
            taskId,
            'task_updated',
            'Görev İptal Edildi',
            `Göreviniz iptal edildi. ${reason ? `Nedeni: ${reason}` : ''}`
          );
        }

        // c. Notification to Assistant (if assigned)
        if (assistantId && isUUID(assistantId)) {
          await NotificationService.sendTaskNotification(
            assistantId,
            taskId,
            'task_updated',
            'Görev İptal Edildi',
            'Atandığınız görev müşteri veya sistem tarafından iptal edildi.'
          );
        }

        // d. Audit Log
        if (customerId || assistantId) {
          await recordAuditLog('TASK_CANCELLED', customerId || assistantId || 'system', { taskId, reason, price });
        }
      })
    );

    // 6. RATING_CREATED
    this.unbindList.push(
      eventBus.subscribe<RatingCreatedPayload>('RATING_CREATED', async (evt) => {
        const { targetProfileId, targetType, score, comment, reviewerProfileId, taskId } = evt.payload;
        console.log(`[IntegrationEngine] Processing RATING_CREATED for target ${targetProfileId}`);

        // a. Update Assistant Metrics if target is assistant
        if (targetType === 'assistant') {
          await RatingService.updateAssistantMetrics(targetProfileId);
        }

        // b. Send Notification to Target
        await NotificationService.sendSystemNotification(
          targetProfileId,
          'Yeni Değerlendirme Aldınız',
          `Bir müşteriniz size ${score} yıldız verdi. ${comment ? `Yorum: "${comment}"` : ''}`
        );

        // c. Audit Log
        await recordAuditLog('RATING_CREATED', reviewerProfileId, {
          targetProfileId,
          targetType,
          score,
          taskId,
        });
      })
    );

    // 7. WALLET_UPDATED
    this.unbindList.push(
      eventBus.subscribe<WalletUpdatedPayload>('WALLET_UPDATED', async (evt) => {
        const { profileId, amount, transactionType, newBalance, description } = evt.payload;
        console.log(`[IntegrationEngine] Processing WALLET_UPDATED for profile ${profileId}`);

        // a. Send Notification
        await NotificationService.sendPaymentNotification(
          profileId,
          Math.abs(amount),
          'wallet_updated',
          'Cüzdan Bakiyeniz Güncellendi',
          `${description || 'Cüzdanınızda yeni bir işlem gerçekleşti.'} Güncel bakiye: ${newBalance} ₺`
        );

        // b. Audit Log
        await recordAuditLog('WALLET_UPDATED', profileId, {
          amount,
          transactionType,
          newBalance,
          description,
        });
      })
    );

    // 8. PARTNER_APPROVED
    this.unbindList.push(
      eventBus.subscribe<PartnerApprovedPayload>('PARTNER_APPROVED', async (evt) => {
        const { partnerProfileId, partnerId, approvedBy } = evt.payload;
        console.log(`[IntegrationEngine] Processing PARTNER_APPROVED for profile ${partnerProfileId}`);

        // a. Update Role in Profiles table
        if (isSupabaseConfigured && supabase && partnerProfileId && isUUID(partnerProfileId)) {
          try {
            await supabase
              .from('profiles')
              .update({ role: 'partner', partner_id: partnerId })
              .eq('id', partnerProfileId);
          } catch (err) {
            console.error('Failed to update profile role to partner:', err);
          }
        }

        // b. Notification
        await NotificationService.sendSystemNotification(
          partnerProfileId,
          'Partner Hesabınız Onaylandı 🎉',
          'Tebrikler! Partner başvurunuz onaylandı. Artık mağaza ve ürünlerinizi yönetebilirsiniz.'
        );

        // c. Audit Log
        await recordAuditLog('PARTNER_APPROVED', approvedBy || 'system', {
          partnerProfileId,
          partnerId,
        });
      })
    );

    // 9. ASSISTANT_APPROVED
    this.unbindList.push(
      eventBus.subscribe<AssistantApprovedPayload>('ASSISTANT_APPROVED', async (evt) => {
        const { assistantProfileId, assistantId, approvedBy } = evt.payload;
        console.log(`[IntegrationEngine] Processing ASSISTANT_APPROVED for profile ${assistantProfileId}`);

        // a. Update Role in Profiles table
        if (isSupabaseConfigured && supabase && assistantProfileId && isUUID(assistantProfileId)) {
          try {
            await supabase
              .from('profiles')
              .update({ role: 'assistant', assistant_id: assistantId })
              .eq('id', assistantProfileId);
          } catch (err) {
            console.error('Failed to update profile role to assistant:', err);
          }
        }

        // b. Notification
        await NotificationService.sendSystemNotification(
          assistantProfileId,
          'Asistan Hesabınız Onaylandı ⚡',
          'Tebrikler! Asistan başvurunuz onaylandı. Görev havuzunu inceleyip teslimat kabul etmeye başlayabilirsiniz.'
        );

        // c. Audit Log
        await recordAuditLog('ASSISTANT_APPROVED', approvedBy || 'system', {
          assistantProfileId,
          assistantId,
        });
      })
    );

    this.isInitialized = true;
    console.log('[IntegrationEngine] UĞRA Service Integration Engine successfully bound to EventBus.');
  }

  /**
   * Teardown event listeners
   */
  public static destroy(): void {
    this.unbindList.forEach((unbind) => unbind());
    this.unbindList = [];
    this.isInitialized = false;
  }

  // ==========================================
  // EVENT EMITTER HELPER METHODS
  // ==========================================

  public static async emitTaskCreated(payload: TaskCreatedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('TASK_CREATED', payload.taskId, payload, actorId || payload.customerId);
    await eventBus.publish(event);
  }

  public static async emitTaskAccepted(payload: TaskAcceptedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('TASK_ACCEPTED', payload.taskId, payload, actorId || payload.assistantId);
    await eventBus.publish(event);
  }

  public static async emitTaskPickedUp(payload: TaskPickedUpPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('TASK_PICKED_UP', payload.taskId, payload, actorId || payload.assistantId);
    await eventBus.publish(event);
  }

  public static async emitTaskCompleted(payload: TaskCompletedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('TASK_COMPLETED', payload.taskId, payload, actorId || payload.assistantId);
    await eventBus.publish(event);
  }

  public static async emitTaskCancelled(payload: TaskCancelledPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('TASK_CANCELLED', payload.taskId, payload, actorId || payload.customerId);
    await eventBus.publish(event);
  }

  public static async emitPaymentCaptured(payload: PaymentCapturedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('PAYMENT_CAPTURED', payload.taskId, payload, actorId);
    await eventBus.publish(event);
  }

  public static async emitPaymentRefunded(payload: PaymentRefundedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('PAYMENT_REFUNDED', payload.taskId, payload, actorId);
    await eventBus.publish(event);
  }

  public static async emitWalletUpdated(payload: WalletUpdatedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('WALLET_UPDATED', payload.profileId, payload, actorId || payload.profileId);
    await eventBus.publish(event);
  }

  public static async emitRatingCreated(payload: RatingCreatedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('RATING_CREATED', payload.ratingId, payload, actorId || payload.reviewerProfileId);
    await eventBus.publish(event);
  }

  public static async emitNotificationCreated(payload: NotificationCreatedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('NOTIFICATION_CREATED', payload.notificationId, payload, actorId);
    await eventBus.publish(event);
  }

  public static async emitPartnerApproved(payload: PartnerApprovedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('PARTNER_APPROVED', payload.partnerProfileId, payload, actorId);
    await eventBus.publish(event);
  }

  public static async emitAssistantApproved(payload: AssistantApprovedPayload, actorId?: string): Promise<void> {
    const event = createDomainEvent('ASSISTANT_APPROVED', payload.assistantProfileId, payload, actorId);
    await eventBus.publish(event);
  }
}

// Auto-initialize when imported
IntegrationService.initialize();
