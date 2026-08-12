import { supabase, isSupabaseConfigured, isUUID, getExactTableColumns, getActiveSupabaseClient } from '@/lib/supabase';
import {
  PartnerActiveTaskOverview,
  PartnerDashboardMetrics,
  PartnerOrder,
  PartnerOrderStatus,
} from '@/types/partnerOperations';
import { calculatePartnerDashboardMetrics } from '@/lib/partnerMetrics';
import { NotificationService } from './notificationService';
import { MapEngine } from './mapEngine';
import { DispatchEngine } from './dispatchEngine';
import { eventBus } from '@/lib/eventBus';

/**
 * Partner Operations Center Service
 * Manages live partner orders, operational statuses (preparing, ready, waiting_courier, courier_arrived, delivered, cancelled),
 * live map courier tracking for partner orders, and real-time dashboard metrics.
 */
export class PartnerOperationsService {
  private static livePartnerOrders: Map<string, PartnerOrder[]> = new Map();

  /**
   * Fetches or initializes partner orders list
   */
  public static async getPartnerOrders(partnerId: string): Promise<PartnerOrder[]> {
    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        let targetId = partnerId;
        if (!isUUID(targetId)) {
          const { data: sessionData } = await client.auth.getSession();
          if (sessionData?.session?.user?.id && isUUID(sessionData.session.user.id)) {
            targetId = sessionData.session.user.id;
          }
        }

        if (isUUID(targetId)) {
          const orderCols = await getExactTableColumns('orders');
          if (orderCols.length > 0 && (orderCols.includes('partner_id') || orderCols.includes('store_id'))) {
            const filterCol = orderCols.includes('partner_id') ? 'partner_id' : 'store_id';
            const { data: orders, error } = await client
              .from('orders')
              .select('*')
              .eq(filterCol, targetId)
              .order('created_at', { ascending: false });

            if (!error && orders) {
              const mappedOrders: PartnerOrder[] = orders.map((t: any) => ({
                id: `ord-${t.id}`,
                taskId: t.id,
                partnerId: targetId,
                customerId: t.customer_id || t.user_id || 'cust-1',
                status: this.mapTaskStatusToPartnerStatus(t.status),
                itemsCount: 1,
                totalPrice: Number(t.total_price || t.customer_price || 0),
                preparationTimeMinutes: 10,
                createdAt: t.created_at,
                updatedAt: t.updated_at,
                assistantId: t.assistant_id,
                etaMinutes: 8,
              }));

              this.livePartnerOrders.set(partnerId, mappedOrders);
              return mappedOrders;
            }
          }
        }
      } catch (err) {
        console.warn('[PartnerOperationsService] Failed to load partner tasks from Supabase:', err);
      }
    }

    // Return in-memory or mock partner orders
    if (!this.livePartnerOrders.has(partnerId)) {
      this.livePartnerOrders.set(partnerId, [
        {
          id: 'ord-101',
          taskId: 'task-p1',
          partnerId,
          customerId: 'cust-1',
          customerName: 'Ahmet K.',
          status: 'preparing',
          itemsCount: 3,
          totalPrice: 450,
          preparationTimeMinutes: 12,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          etaMinutes: 10,
        },
        {
          id: 'ord-102',
          taskId: 'task-p2',
          partnerId,
          customerId: 'cust-2',
          customerName: 'Selin Y.',
          status: 'waiting_courier',
          itemsCount: 2,
          totalPrice: 280,
          preparationTimeMinutes: 8,
          createdAt: new Date(Date.now() - 900000).toISOString(),
          updatedAt: new Date().toISOString(),
          assistantId: 'asst-001',
          assistantName: 'Ahmet Yılmaz',
          etaMinutes: 5,
        },
      ]);
    }

    return this.livePartnerOrders.get(partnerId) || [];
  }

  /**
   * Updates partner order operational stage (e.g., preparing -> ready -> waiting_courier)
   */
  public static async updateOrderStatus(
    partnerId: string,
    orderId: string,
    newStatus: PartnerOrderStatus
  ): Promise<{ success: boolean; order?: PartnerOrder; error?: string }> {
    const orders = await this.getPartnerOrders(partnerId);
    const order = orders.find((o) => o.id === orderId || o.taskId === orderId);

    if (!order) {
      return { success: false, error: 'Sipariş bulunamadı.' };
    }

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    // Trigger Notifications & Dispatch logic based on status
    if (newStatus === 'ready') {
      console.log(`[PartnerOperationsCenter] Order #${order.id} marked READY by Partner #${partnerId}. Triggering courier dispatch...`);

      // Notify customer that order is ready
      await NotificationService.sendTaskNotification(
        order.customerId,
        order.taskId,
        'task_updated',
        'Siparişiniz Hazır 🍔',
        'İşletme siparişinizi hazırladı. Kurye ataması yapılıyor!'
      );
    } else if (newStatus === 'courier_arrived') {
      console.log(`[PartnerOperationsCenter] Courier arrived at partner for order #${order.id}`);
      await NotificationService.sendTaskNotification(
        order.customerId,
        order.taskId,
        'task_updated',
        'Kurye İşletmede 📍',
        'Kuryeniz siparişi teslim almak üzere işletmeye ulaştı.'
      );
    } else if (newStatus === 'delivered') {
      console.log(`[PartnerOperationsCenter] Order #${order.id} delivered.`);
    }

    // Sync Live Operations Map
    MapEngine.upsertMarker({
      id: `partner-ord-${order.id}`,
      type: 'partner',
      title: `Sipariş #${order.id} (${newStatus})`,
      coordinates: { latitude: 40.7731, longitude: 30.3948 },
      status: newStatus === 'delivered' ? 'idle' : 'working',
    });

    // Publish event
    eventBus.publish({
      id: `evt-partner-${Date.now()}`,
      type: 'TASK_UPDATED' as any,
      aggregateId: order.taskId,
      payload: { taskId: order.taskId, partnerId, customerId: order.customerId, assistantId: order.assistantId, newStatus },
      timestamp: new Date().toISOString(),
    });

    return { success: true, order };
  }

  /**
   * Generates real-time Dashboard Metrics for Partner Operations
   */
  public static async getDashboardMetrics(partnerId: string): Promise<PartnerDashboardMetrics> {
    const orders = await this.getPartnerOrders(partnerId);
    const availableCandidates = await DispatchEngine.getAvailableAssistantCandidates();

    return calculatePartnerDashboardMetrics(partnerId, orders, availableCandidates.length);
  }

  /**
   * Returns active live tasks specifically assigned to or belonging to partner for Live Map view
   */
  public static async getPartnerActiveTasksOverview(
    partnerId: string
  ): Promise<PartnerActiveTaskOverview[]> {
    const orders = await this.getPartnerOrders(partnerId);
    const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');

    return activeOrders.map((o) => ({
      taskId: o.taskId,
      orderId: o.id,
      pickupAddress: 'Partner İşletme Adresi',
      deliveryAddress: 'Müşteri Teslimat Adresi',
      status: o.status,
      assistantName: o.assistantName || 'Kurye Aranıyor',
      assistantLat: 40.7731 + Math.random() * 0.01,
      assistantLng: 30.3948 + Math.random() * 0.01,
      etaMinutes: o.etaMinutes || 10,
      price: o.totalPrice,
      createdTimeFormatted: new Date(o.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));
  }

  /**
   * Maps internal task status string to partner operational status
   */
  private static mapTaskStatusToPartnerStatus(status: string): PartnerOrderStatus {
    switch (status) {
      case 'created':
      case 'pending':
        return 'preparing';
      case 'assigned':
      case 'accepted':
        return 'waiting_courier';
      case 'in_progress':
        return 'courier_arrived';
      case 'completed':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'preparing';
    }
  }
}
