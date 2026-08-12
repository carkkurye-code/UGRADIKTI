import { supabase, isSupabaseConfigured, isUUID, toUUID, getActiveSupabaseClient } from '@/lib/supabase';
import {
  AdminAlarm,
  AdminDashboardMetrics,
  AdminLiveMapData,
  EmergencyTaskInput,
} from '@/types/admin';
import { calculateAdminMetrics, generateAdminAlarms } from '@/lib/adminMetrics';
import { TaskService } from './taskService';
import { DispatchEngine } from './dispatchEngine';
import { LiveDispatchService } from '@/lib/dispatchService';
import { MapEngine } from './mapEngine';
import { NotificationService } from './notificationService';
import { Task } from '@/types/task';
import { eventBus } from '@/lib/eventBus';

/**
 * Admin Command Center Service (Realtime Operations Control)
 * Central management service for real-time fleet map, system metrics, manual operational interventions
 * (reassigning, changing couriers, canceling, locking, emergency task creation), and automated operational alarms.
 */
export class AdminOperationsService {
  private static acknowledgedAlarmIds: Set<string> = new Set();
  private static lockedTaskIds: Set<string> = new Set();

  /**
   * Fetches real-time system metrics across all tasks, couriers, and partners
   */
  public static async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const tasksRes = await TaskService.getTasks();
    const tasks = tasksRes.data || [];

    const candidates = await DispatchEngine.getAvailableAssistantCandidates();

    return calculateAdminMetrics(tasks, candidates, 14);
  }

  /**
   * Fetches and syncs all active operations onto MapEngine
   */
  public static async getLiveMapData(): Promise<AdminLiveMapData> {
    const tasksRes = await TaskService.getTasks();
    const tasks = tasksRes.data || [];

    const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
    const candidates = await DispatchEngine.getAvailableAssistantCandidates();

    const liveMapData: AdminLiveMapData = {
      tasks: activeTasks.map((t: Task) => ({
        id: t.id,
        status: t.status,
        pickupLat: t.pickup_lat || 40.7731,
        pickupLng: t.pickup_lng || 30.3948,
        deliveryLat: t.delivery_lat || 40.7800,
        deliveryLng: t.delivery_lng || 30.4000,
        price: t.price,
        assistantId: t.assistant_id,
      })),
      assistants: candidates.map((a) => ({
        id: a.assistantId,
        fullName: a.fullName || 'Saha Asistanı',
        isOnline: a.isOnline,
        lat: a.latitude || 40.7731,
        lng: a.longitude || 30.3948,
        vehicleType: a.vehicleType,
      })),
      partners: [
        { id: 'p-1', name: 'Lezzet Doner', lat: 40.7740, lng: 30.3950, isActive: true },
        { id: 'p-2', name: 'Gurme Burger', lat: 40.7710, lng: 30.3910, isActive: true },
        { id: 'p-3', name: 'Koyu Kahve', lat: 40.7760, lng: 30.3980, isActive: true },
      ],
    };

    // Load into MapEngine
    candidates.forEach((a) => {
      MapEngine.upsertMarker({
        id: `asst-${a.assistantId}`,
        type: 'assistant',
        title: a.fullName || `Asistan #${a.assistantId}`,
        coordinates: { latitude: a.latitude || 40.7731, longitude: a.longitude || 30.3948 },
        status: a.isOnline ? (a.isBusy ? 'busy' : 'idle') : 'offline',
      });
    });

    return liveMapData;
  }

  /**
   * Admin Intervention: Reassign task or change courier
   */
  public static async reassignTask(
    taskId: string,
    newAssistantId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (this.lockedTaskIds.has(taskId)) {
      return { success: false, error: 'Bu görev kilitlidir. Yeniden atama yapılamaz.' };
    }

    const assignRes = await TaskService.acceptTask(taskId, newAssistantId);
    if (!assignRes.success) {
      return { success: false, error: assignRes.error };
    }

    let recipientUserId = newAssistantId;
    if (!isUUID(newAssistantId) && isSupabaseConfigured && supabase) {
      try {
        const { data: asst } = await supabase
          .from('assistants')
          .select('user_id')
          .eq('id', newAssistantId)
          .maybeSingle();
        if (asst?.user_id) {
          recipientUserId = asst.user_id;
        }
      } catch (err) {
        console.warn('[AdminOperations] Error resolving assistant user_id:', err);
      }
    }

    if (isUUID(recipientUserId)) {
      await NotificationService.sendTaskNotification(
        recipientUserId,
        taskId,
        'task_assigned',
        'Yönetici Tarafından Görev Atandı 🛡️',
        'Sistem yöneticisi tarafından bir görev hesabınıza atandı.'
      );
    } else {
      console.warn('[AdminOperations] Cannot send task notification: invalid recipient user_id UUID:', recipientUserId);
    }

    console.log(`[AdminCommandCenter] Task #${taskId} manually reassigned to Assistant #${newAssistantId}`);
    return { success: true };
  }

  /**
   * Admin Intervention: Cancel task
   */
  public static async cancelTask(
    taskId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await TaskService.cancelTask(taskId, 'admin', 'admin', reason);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    console.log(`[AdminCommandCenter] Task #${taskId} cancelled by Admin. Reason: ${reason}`);
    return { success: true };
  }

  /**
   * Admin Intervention: Lock task against automated dispatch modifications
   */
  public static lockTask(taskId: string): { success: boolean; isLocked: boolean } {
    if (this.lockedTaskIds.has(taskId)) {
      this.lockedTaskIds.delete(taskId);
      console.log(`[AdminCommandCenter] Task #${taskId} unlocked.`);
      return { success: true, isLocked: false };
    } else {
      this.lockedTaskIds.add(taskId);
      console.log(`[AdminCommandCenter] Task #${taskId} locked.`);
      return { success: true, isLocked: true };
    }
  }

  /**
   * Admin Intervention: Force complete task
   */
  public static async forceCompleteTask(
    taskId: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await TaskService.completeTask(taskId, 'admin');
    if (!res.success) {
      return { success: false, error: res.error };
    }

    console.log(`[AdminCommandCenter] Task #${taskId} FORCE COMPLETED by Admin.`);
    return { success: true };
  }

  /**
   * Admin Intervention: Toggle partner active status
   */
  public static async togglePartnerStatus(
    partnerId: string,
    isActive: boolean
  ): Promise<{ success: boolean }> {
    if (isSupabaseConfigured && supabase) {
      const validPartnerUuid = isUUID(partnerId) ? partnerId : toUUID(partnerId);
      await supabase.from('partners').update({ is_active: isActive }).eq('id', validPartnerUuid);
    }
    console.log(`[AdminCommandCenter] Partner #${partnerId} status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'}`);
    return { success: true };
  }

  /**
   * Admin Intervention: Toggle assistant active/online status
   */
  public static async toggleAssistantStatus(
    assistantId: string,
    isActive: boolean
  ): Promise<{ success: boolean }> {
    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        const validAssistantUuid = isUUID(assistantId) ? assistantId : toUUID(assistantId);
        await client.from('assistants').update({
          status: isActive ? 'aktif' : 'pasif'
        }).eq('id', validAssistantUuid);
      } catch (err) {
        console.warn('AdminCommandCenter.toggleAssistantStatus error:', err);
      }
    }
    console.log(`[AdminCommandCenter] Assistant #${assistantId} status updated to ${isActive ? 'ONLINE' : 'SUSPENDED'}`);
    return { success: true };
  }

  /**
   * Admin Intervention: Create Emergency High-Priority Task
   */
  public static async createEmergencyTask(
    input: EmergencyTaskInput
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    const dispatchRes = await LiveDispatchService.createOrderAndDispatch({
      partner_id: input.partnerId,
      customer_name: 'Acil Müşteri',
      customer_phone: input.customerPhone || '',
      pickup_address: input.pickupAddress,
      delivery_address: input.deliveryAddress,
      pickup_lat: input.pickupLat || 40.7731,
      pickup_lng: input.pickupLng || 30.3948,
      delivery_lat: input.deliveryLat || 40.7800,
      delivery_lng: input.deliveryLng || 30.4000,
      total_price: input.price,
      customer_price: input.price,
      notes: `[ACİL ADMİN GÖREVİ] ${input.notes || ''}`,
      task_description: `[ACİL ADMİN GÖREVİ] ${input.notes || ''}`,
      delivery_type: 'hemen',
      service_type: 'al',
    });

    if (!dispatchRes.success || !dispatchRes.order) {
      return { success: false, error: dispatchRes.error || 'Acil görev oluşturulamadı.' };
    }

    console.log(`[AdminCommandCenter] Emergency Task #${dispatchRes.order.id} created and dispatched via LiveDispatch.`);
    return { success: true, taskId: dispatchRes.order.id };
  }

  /**
   * Returns active operational alarms
   */
  public static async getAlarms(): Promise<AdminAlarm[]> {
    const tasksRes = await TaskService.getTasks();
    const tasks = tasksRes.data || [];
    const candidates = await DispatchEngine.getAvailableAssistantCandidates();

    const allAlarms = generateAdminAlarms(tasks, candidates);

    // Filter out acknowledged alarms
    return allAlarms.filter((a) => !this.acknowledgedAlarmIds.has(a.id));
  }

  /**
   * Acknowledges an operational alarm
   */
  public static acknowledgeAlarm(alarmId: string): void {
    this.acknowledgedAlarmIds.add(alarmId);
    console.log(`[AdminCommandCenter] Alarm #${alarmId} acknowledged.`);
  }
}
