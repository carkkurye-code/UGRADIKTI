import { supabase, isSupabaseConfigured, isUUID, toUUID, filterTaskPayload, filterOrderPayload } from '@/lib/supabase';
import {
  Task,
  TaskStatus,
  CreateTaskInput,
  TaskEvent,
  TaskActorRole,
  isValidTaskTransition,
} from '@/types/task';
import { IntegrationService } from './integrationService';
import { LiveDispatchService } from '@/lib/dispatchService';

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Production Task Engine Service for UĞRA Platform
 * Manages the entire lifecycle of task execution, state transitions, atomic assignments,
 * verification codes, and event auditing.
 */
export class TaskService {
  /**
   * Helper: Generate a random 6-digit numeric verification code
   */
  private static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Helper: Record task lifecycle event in task_events table
   */
  private static async logTaskEvent(
    taskId: string,
    actorId: string | undefined,
    actorRole: TaskActorRole,
    eventType: string,
    previousStatus: TaskStatus | undefined,
    newStatus: TaskStatus,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      console.log(`[TaskEvent Mock] Task ${taskId}: ${eventType} (${previousStatus} -> ${newStatus}) by ${actorRole}`);
      return;
    }

    try {
      await supabase.from('task_events').insert({
        task_id: taskId,
        actor_id: actorId || null,
        actor_role: actorRole,
        event_type: eventType,
        previous_status: previousStatus || null,
        new_status: newStatus,
        metadata,
      });
    } catch (err) {
      console.error('Task event log error:', err);
    }
  }

  /**
   * @deprecated Customer requests are stored in public.orders. Use LiveDispatchService.createOrderAndDispatch directly.
   */
  public static async createTask(input: CreateTaskInput): Promise<ServiceResult<Task>> {
    const offerPrice = Math.max(100, Number(input.customer_price ?? input.price ?? 250));

    let taskDesc = input.task_description?.trim() || '';
    if (!taskDesc && input.notes) {
      taskDesc = input.notes.replace(/^\[.*?\]\s*/, '').trim();
    }
    if (!taskDesc) {
      taskDesc = 'Hizmet Talebi';
    }

    try {
      const dispatchRes = await LiveDispatchService.createOrderAndDispatch({
        delivery_type: (input.task_type === 'gecerken_ugra' || input.service_type === 'gecerken') ? 'gecerken' : 'hemen',
        service_type: input.service_type === 'al' ? 'al' : 'birak',
        task_description: taskDesc,
        pickup_address: input.pickup_address,
        delivery_address: input.delivery_address,
        pickup_lat: input.pickup_lat ?? undefined,
        pickup_lng: input.pickup_lng ?? undefined,
        delivery_lat: input.delivery_lat ?? undefined,
        delivery_lng: input.delivery_lng ?? undefined,
        user_id: input.customer_id,
        customer_name: 'Müşteri',
        total_price: offerPrice,
        customer_price: offerPrice,
        partner_id: input.partner_id || null
      });

      if (dispatchRes.success && dispatchRes.order) {
        return { success: true, data: dispatchRes.order as unknown as Task };
      }
      return { success: false, error: dispatchRes.error || 'Sipariş oluşturulamadı.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Görev oluşturulurken bir hata oluştu.' };
    }
  }

  /**
   * Fetch a single task by ID
   */
  public static async getTaskById(taskId: string): Promise<ServiceResult<Task>> {
    if (!taskId || !isUUID(taskId)) {
      return { success: false, error: 'Görev bulunamadı.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Check tasks table first
        const { data: taskData } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .maybeSingle();

        if (taskData) {
          if (taskData.order_id && isUUID(taskData.order_id)) {
            const { data: orderData } = await supabase
              .from('orders')
              .select('*')
              .eq('id', taskData.order_id)
              .maybeSingle();

            if (orderData) {
              return { success: true, data: { ...orderData, ...taskData } as Task };
            }
          }
          return { success: true, data: taskData as Task };
        }

        // 2. Fallback check orders table if taskId is an order_id UUID
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', taskId)
          .maybeSingle();

        if (orderErr) return { success: false, error: orderErr.message };
        if (!orderData) return { success: false, error: 'Görev bulunamadı.' };

        return { success: true, data: orderData as Task };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: 'Görev bulunamadı.' };
  }

  /**
   * Fetch all tasks (Admin/Operations query)
   */
  public static async getTasks(): Promise<ServiceResult<Task[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) return { success: false, error: error.message };
        return { success: true, data: (data || []) as Task[] };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, data: [] };
  }

  /**
   * 2. Broadcast Task to available assistants in the pool
   */
  public static async broadcastTask(taskId: string, actorId?: string): Promise<ServiceResult<Task>> {
    return this.transitionTaskState(taskId, 'broadcasted', actorId, 'system', 'broadcasted');
  }

  /**
   * 3. Accept Task (Atomic execution to prevent duplicate assistant assignment)
   */
  public static async acceptTask(taskId: string, assistantId: string): Promise<ServiceResult<Task>> {
    if (!taskId || !isUUID(taskId)) {
      return { success: false, error: 'Görev bulunamadı.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const validTaskUuid = taskId;
        const validAssistantUuid = isUUID(assistantId) ? assistantId : toUUID(assistantId);
        const nowIso = new Date().toISOString();

        // Check tasks table first, then orders table
        const { data: tData } = await supabase.from('tasks').select('*').eq('id', validTaskUuid).maybeSingle();
        let existing = tData;
        let isTasksTable = true;

        if (!existing) {
          const { data: oData } = await supabase.from('orders').select('*').eq('id', validTaskUuid).maybeSingle();
          existing = oData;
          isTasksTable = false;
        }

        if (!existing) return { success: false, error: 'Görev bulunamadı.' };

        if (!isValidTaskTransition(existing.status, 'assigned')) {
          return { success: false, error: `Geçersiz durum geçişi: ${existing.status} -> assigned` };
        }

        if (existing.assistant_id) {
          return { success: false, error: 'Bu göreve zaten başka bir asistan atanmış.' };
        }

        let updated: any = null;

        if (isTasksTable) {
          const taskPayload = filterTaskPayload({
            assistant_id: validAssistantUuid,
            status: 'assigned',
            accepted_at: nowIso,
          });

          const { data: uTask, error: uErr } = await supabase
            .from('tasks')
            .update(taskPayload)
            .eq('id', validTaskUuid)
            .is('assistant_id', null)
            .select('*')
            .single();

          if (uErr || !uTask) {
            return { success: false, error: 'Görev kabul edilirken bir çakışma oluştu.' };
          }
          updated = uTask;

          if (existing.order_id && isUUID(existing.order_id)) {
            const orderPayload = filterOrderPayload({
              assistant_id: validAssistantUuid,
              status: 'assigned',
            });
            await supabase.from('orders').update(orderPayload).eq('id', existing.order_id);
          }
        } else {
          const orderPayload = filterOrderPayload({
            assistant_id: validAssistantUuid,
            status: 'assigned',
          });

          const { data: uOrder, error: uErr } = await supabase
            .from('orders')
            .update(orderPayload)
            .eq('id', validTaskUuid)
            .is('assistant_id', null)
            .select('*')
            .single();

          if (uErr || !uOrder) {
            return { success: false, error: 'Görev kabul edilirken bir çakışma oluştu.' };
          }
          updated = uOrder;
        }

        await this.logTaskEvent(taskId, assistantId, 'assistant', 'assigned', existing.status, 'assigned');

        await IntegrationService.emitTaskAccepted({
          taskId,
          assistantId,
          customerId: updated.customer_id,
        }, assistantId);

        return { success: true, data: updated as Task };
      } catch (err: any) {
        return { success: false, error: err.message || 'Görev kabul edilemedi.' };
      }
    }

    return { success: false, error: 'Supabase veritabanı bağlantısı bulunamadı.' };
  }

  /**
   * 4. Reject Task (by assistant, returns to broadcasted)
   */
  public static async rejectTask(taskId: string, assistantId: string, reason?: string): Promise<ServiceResult<null>> {
    await this.logTaskEvent(taskId, assistantId, 'assistant', 'rejected', undefined, 'broadcasted', { reason });
    return { success: true };
  }

  /**
   * 5. Assign Assistant manually (Admin or System)
   */
  public static async assignAssistant(taskId: string, assistantId: string, adminId?: string): Promise<ServiceResult<Task>> {
    return this.transitionTaskState(
      taskId,
      'assigned',
      adminId,
      adminId ? 'admin' : 'system',
      'assigned',
      { assistant_id: assistantId, assigned_at: new Date().toISOString() }
    );
  }

  /**
   * 6. Pickup Task (Assistant picked up the package/item)
   */
  public static async pickupTask(taskId: string, assistantId: string): Promise<ServiceResult<Task>> {
    return this.transitionTaskState(
      taskId,
      'picked_up',
      assistantId,
      'assistant',
      'picked_up',
      { pickup_at: new Date().toISOString() }
    );
  }

  /**
   * 7. Verify Task via Verification Code
   */
  public static async verifyTask(taskId: string, code: string, actorId: string): Promise<ServiceResult<boolean>> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true, data: true };
    }

    try {
      if (!taskId || !isUUID(taskId)) {
        return { success: false, error: 'Görev bulunamadı.' };
      }

      // Security check: Check if verification failed 3 times
      const { data: wrongAttempts } = await supabase
        .from('task_events')
        .select('id')
        .eq('task_id', taskId)
        .eq('event_type', 'verification_attempt')
        .eq('metadata->>success', 'false');

      if (wrongAttempts && wrongAttempts.length >= 3) {
        return {
          success: false,
          error: 'Doğrulama kodu 3 kez yanlış girildiği için kilitlendi. Lütfen müşteri hizmetleri ile iletişime geçin.',
        };
      }

      let taskCode: string | null = null;
      let orderIdToUpdate: string | null = null;

      const { data: taskData } = await supabase.from('tasks').select('delivery_code, order_id').eq('id', taskId).maybeSingle();
      if (taskData) {
        taskCode = taskData.delivery_code;
        orderIdToUpdate = taskData.order_id;
        await supabase.from('tasks').update({ delivery_code_verified: true }).eq('id', taskId);
      } else {
        const { data: orderData } = await supabase.from('orders').select('delivery_code').eq('id', taskId).maybeSingle();
        if (orderData) {
          taskCode = orderData.delivery_code;
        }
      }

      if (!taskCode) {
        return { success: false, error: 'Görev bulunamadı.' };
      }

      const isMatch = (taskCode || '').trim() === code.trim();
      if (!isMatch) {
        await this.logTaskEvent(taskId, actorId, 'assistant', 'verification_attempt', undefined, 'arrived_at_delivery', {
          success: false,
          entered_code: code,
        });
        return { success: false, error: 'Doğrulama kodu hatalı.' };
      }

      if (orderIdToUpdate && isUUID(orderIdToUpdate)) {
        await supabase
          .from('orders')
          .update({ delivery_code_verified: true })
          .eq('id', orderIdToUpdate);
      } else if (isUUID(taskId)) {
        await supabase
          .from('orders')
          .update({ delivery_code_verified: true })
          .eq('id', taskId);
      }

      await this.logTaskEvent(taskId, actorId, 'assistant', 'verification_attempt', undefined, 'arrived_at_delivery', {
        success: true,
      });

      return { success: true, data: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 8. Complete Task
   */
  public static async completeTask(taskId: string, actorId: string, verificationCode?: string): Promise<ServiceResult<Task>> {
    // If code supplied, verify first
    if (verificationCode) {
      const verifyRes = await this.verifyTask(taskId, verificationCode, actorId);
      if (!verifyRes.success) {
        return { success: false, error: verifyRes.error };
      }
    }

    return this.transitionTaskState(
      taskId,
      'completed',
      actorId,
      'assistant',
      'completed',
      { delivered_at: new Date().toISOString(), verification_status: 'verified' }
    );
  }

  /**
   * 9. Cancel Task
   */
  public static async cancelTask(taskId: string, actorId: string, actorRole: TaskActorRole = 'customer', reason?: string): Promise<ServiceResult<Task>> {
    return this.transitionTaskState(
      taskId,
      'cancelled',
      actorId,
      actorRole,
      'cancelled',
      { cancelled_at: new Date().toISOString(), cancel_reason: reason }
    );
  }

  /**
   * 10. Fail Task (e.g., Unreachable customer, delivery issue)
   */
  public static async failTask(taskId: string, actorId: string, reason: string): Promise<ServiceResult<Task>> {
    return this.transitionTaskState(
      taskId,
      'failed',
      actorId,
      'assistant',
      'failed',
      { fail_reason: reason }
    );
  }

  /**
   * Public method to update task progress to any valid TaskStatus
   */
  public static async updateTaskStatus(
    taskId: string,
    targetStatus: TaskStatus,
    actorId: string,
    actorRole: TaskActorRole = 'assistant'
  ): Promise<ServiceResult<Task>> {
    return this.transitionTaskState(taskId, targetStatus, actorId, actorRole, targetStatus);
  }

  /**
   * Internal State Machine Executor with Strict Validation
   */
  private static async transitionTaskState(
    taskId: string,
    targetStatus: TaskStatus,
    actorId?: string,
    actorRole: TaskActorRole = 'system',
    eventType: string = 'status_update',
    additionalUpdates: Record<string, any> = {}
  ): Promise<ServiceResult<Task>> {
    if (!taskId || !isUUID(taskId)) {
      return { success: false, error: 'Görev bulunamadı.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Fetch current status (check tasks first, then orders)
        let currentTask: any = null;
        let isTasksTable = false;

        const { data: tData } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .maybeSingle();

        if (tData) {
          currentTask = tData;
          isTasksTable = true;
        } else {
          const { data: oData } = await supabase
            .from('orders')
            .select('*')
            .eq('id', taskId)
            .maybeSingle();
          if (oData) currentTask = oData;
        }

        if (!currentTask) {
          return { success: false, error: 'Görev bulunamadı.' };
        }

        const currentStatus: TaskStatus = currentTask.status as TaskStatus;

        // 2. Validate transition against State Machine Rules (Admins can override)
        if (actorRole !== 'admin' && !isValidTaskTransition(currentStatus, targetStatus)) {
          return {
            success: false,
            error: `Geçersiz durum geçişi: '${currentStatus}' -> '${targetStatus}'`,
          };
        }

        // 3. Update task/order
        const updatePayload = {
          status: targetStatus,
          ...additionalUpdates,
        };

        let updatedTask: any = null;

        if (isTasksTable) {
          const taskPayload = filterTaskPayload(updatePayload);
          const { data: uTask, error: uErr } = await supabase
            .from('tasks')
            .update(taskPayload)
            .eq('id', taskId)
            .select('*')
            .maybeSingle();

          if (uErr) {
            return { success: false, error: uErr.message };
          }
          updatedTask = uTask || { ...currentTask, ...updatePayload };

          if (currentTask.order_id && isUUID(currentTask.order_id)) {
            const orderPayload = filterOrderPayload(updatePayload);
            if (Object.keys(orderPayload).length > 0) {
              await supabase
                .from('orders')
                .update(orderPayload)
                .eq('id', currentTask.order_id);
            }
          }
        } else {
          const orderPayload = filterOrderPayload(updatePayload);
          const { data: uOrder, error: uErr } = await supabase
            .from('orders')
            .update(orderPayload)
            .eq('id', taskId)
            .select('*')
            .single();

          if (uErr) {
            return { success: false, error: uErr.message };
          }
          updatedTask = uOrder;
        }

        // 4. Log event
        await this.logTaskEvent(
          taskId,
          actorId,
          actorRole,
          eventType,
          currentStatus,
          targetStatus,
          additionalUpdates
        );

        // 5. Emit Domain Events based on transition
        if (targetStatus === 'picked_up') {
          await IntegrationService.emitTaskPickedUp({
            taskId,
            assistantId: updatedTask.assistant_id || actorId || '',
            customerId: updatedTask.customer_id,
          }, actorId);
        } else if (targetStatus === 'completed') {
          await IntegrationService.emitTaskCompleted({
            taskId,
            assistantId: updatedTask.assistant_id || actorId || '',
            customerId: updatedTask.customer_id,
            partnerId: updatedTask.partner_id || undefined,
            price: updatedTask.price,
          }, actorId);
        } else if (targetStatus === 'cancelled') {
          await IntegrationService.emitTaskCancelled({
            taskId,
            customerId: updatedTask.customer_id,
            assistantId: updatedTask.assistant_id || undefined,
            price: updatedTask.price,
            reason: additionalUpdates.cancel_reason,
            cancelledBy: actorId,
          }, actorId);
        }

        return { success: true, data: updatedTask as Task };
      } catch (err: any) {
        return { success: false, error: err.message || 'Görev durumu güncellenemedi.' };
      }
    }

    return { success: false, error: 'Supabase veritabanı bağlantısı bulunamadı.' };
  }
}
