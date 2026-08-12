import { TaskService } from './taskService';
import { MapEngine } from './mapEngine';
import { NotificationService } from './notificationService';
import { RatingService } from './ratingService';
import {
  CustomerTrackingState,
  PostDeliveryRatingInput,
} from '@/types/customerTracking';
import { RatingTag } from '@/types/rating';
import {
  buildCustomerTimeline,
  getTrackingStageDetails,
  mapTaskStatusToTrackingStage,
} from '@/lib/customerTimeline';
import { calculateRouteMetrics } from '@/lib/locationUtils';
import { eventBus } from '@/lib/eventBus';

/**
 * Customer Live Tracking Experience Service
 * Provides real-time tracking for customer orders: live status updates, live courier GPS motion,
 * dynamic ETA updates, polyline routes, courier change handling, offline sync, and post-delivery rating prompt.
 */
export class CustomerTrackingService {
  private static lastKnownLocations: Map<string, { lat: number; lng: number; updatedAt: string }> = new Map();
  private static listeners: Map<string, Set<(state: CustomerTrackingState) => void>> = new Map();

  /**
   * Fetches real-time Customer Tracking State for a given Task
   */
  public static async getLiveTrackingState(
    taskId: string,
    customerId: string
  ): Promise<CustomerTrackingState | null> {
    const taskRes = await TaskService.getTaskById(taskId);
    if (!taskRes.success || !taskRes.data) {
      return null;
    }

    const task = taskRes.data;
    const stage = mapTaskStatusToTrackingStage(task.status);
    const stageDetails = getTrackingStageDetails(stage);
    const timeline = buildCustomerTimeline(stage, task.updated_at);

    const pickupLat = task.pickup_lat || 40.7731;
    const pickupLng = task.pickup_lng || 30.3948;
    const deliveryLat = task.delivery_lat || 40.7800;
    const deliveryLng = task.delivery_lng || 30.4000;

    const routeMetrics = calculateRouteMetrics(pickupLat, pickupLng, deliveryLat, deliveryLng, 'motorcycle');

    // Courier details if assigned
    const courier = task.assistant_id
      ? {
          id: task.assistant_id,
          fullName: 'Ahmet Yılmaz (Saha Kuryesi)',
          phone: '+90 532 999 8877',
          rating: 4.9,
          vehicleType: 'Motosiklet (34 AB 123)',
          lat: pickupLat + 0.002,
          lng: pickupLng + 0.002,
        }
      : undefined;

    // Partner details
    const partner = task.partner_id
      ? {
          id: task.partner_id,
          name: 'Lezzet Doner / Izgara',
          phone: '+90 264 270 1020',
          address: task.pickup_address,
          lat: pickupLat,
          lng: pickupLng,
        }
      : undefined;

    // Last known GPS position
    const lastLoc = this.lastKnownLocations.get(taskId) || {
      lat: courier?.lat || pickupLat,
      lng: courier?.lng || pickupLng,
      updatedAt: task.updated_at || new Date().toISOString(),
    };

    // Auto-sync live map route & markers
    MapEngine.createOrUpdateTaskRoute(taskId, pickupLat, pickupLng, deliveryLat, deliveryLng);

    if (courier) {
      MapEngine.upsertMarker({
        id: `courier-${courier.id}`,
        type: 'assistant',
        title: courier.fullName,
        coordinates: { latitude: lastLoc.lat, longitude: lastLoc.lng },
        status: task.status === 'completed' ? 'idle' : 'working',
      });
    }

    const state: CustomerTrackingState = {
      taskId: task.id,
      orderId: task.id,
      currentStage: stage,
      stageTitle: stageDetails.title,
      stageSubtitle: stageDetails.subtitle,
      progressPercent: stageDetails.progressPercent,
      timeline,
      courier,
      partner,
      pickupAddress: task.pickup_address,
      deliveryAddress: task.delivery_address,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      distanceKm: routeMetrics.estimatedRouteDistanceKm,
      etaMinutes: routeMetrics.etaMinutes,
      lastKnownLocation: lastLoc,
      isOffline: false,
      isRatingPending: task.status === 'completed',
    };

    return state;
  }

  /**
   * Handles Courier Change Scenario (e.g., reassignment or cancellation replacement)
   */
  public static async handleCourierChanged(
    taskId: string,
    newAssistantId: string,
    newAssistantName = 'Mehmet Demir'
  ): Promise<void> {
    console.log(`[CustomerTracking] Courier changed for task #${taskId} -> New Courier #${newAssistantId}`);

    // Fetch updated tracking state
    const taskRes = await TaskService.getTaskById(taskId);
    if (!taskRes.success || !taskRes.data) return;

    const task = taskRes.data;

    // Update map polyline and markers
    MapEngine.createOrUpdateTaskRoute(
      taskId,
      task.pickup_lat || 40.7731,
      task.pickup_lng || 30.3948,
      task.delivery_lat || 40.7800,
      task.delivery_lng || 30.4000
    );

    // Send push notification to customer
    await NotificationService.sendTaskNotification(
      task.customer_id,
      taskId,
      'task_updated',
      'Kuryeniz Değiştirildi 🛵',
      `Siparişiniz için yeni kurye atandı: ${newAssistantName}. Haritadan canlı takip edebilirsiniz.`
    );

    // Publish event
    eventBus.publish({
      id: `evt-courier-change-${Date.now()}`,
      type: 'TASK_ACCEPTED',
      aggregateId: taskId,
      payload: { taskId, assistantId: newAssistantId, customerId: task.customer_id, newAssistantId, newAssistantName },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Processes live GPS ping update for customer tracking
   */
  public static async updateLocationPing(
    taskId: string,
    lat: number,
    lng: number,
    isOnline = true
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    this.lastKnownLocations.set(taskId, { lat, lng, updatedAt });

    if (isOnline) {
      MapEngine.upsertMarker({
        id: `track-${taskId}`,
        type: 'assistant',
        title: 'Kurye Canlı Konum',
        coordinates: { latitude: lat, longitude: lng },
        status: 'working',
      });
    } else {
      console.log(`[CustomerTracking] Offline mode: Displaying last known GPS position for task #${taskId} (${lat}, ${lng})`);
    }
  }

  /**
   * Submits Post-Delivery Rating for Assistant and Partner
   */
  public static async submitPostTaskRating(
    input: PostDeliveryRatingInput
  ): Promise<{ success: boolean; error?: string }> {
    if (input.assistantScore < 1 || input.assistantScore > 5) {
      return { success: false, error: 'Puan 1 ile 5 arasında olmalıdır.' };
    }

    // Submit Assistant Rating
    if (input.assistantId) {
      const asstRes = await RatingService.createRating({
        task_id: input.taskId,
        reviewer_profile_id: input.customerId,
        target_profile_id: input.assistantId,
        target_type: 'assistant',
        score: input.assistantScore,
        tags: (input.tags || []) as RatingTag[],
        comment: input.comment,
      });

      if (!asstRes.success) {
        return { success: false, error: asstRes.error };
      }
    }

    // Submit Partner Rating if applicable
    if (input.partnerId && input.partnerScore) {
      await RatingService.createRating({
        task_id: input.taskId,
        reviewer_profile_id: input.customerId,
        target_profile_id: input.partnerId,
        target_type: 'partner',
        score: input.partnerScore,
        tags: (input.tags || []) as RatingTag[],
        comment: input.comment,
      });
    }

    console.log(`[CustomerTracking] Post-delivery rating submitted for task #${input.taskId}`);
    return { success: true };
  }

  /**
   * Realtime Listener Subscription for Customer Tracking Screen
   */
  public static subscribeToTrackingUpdates(
    taskId: string,
    callback: (state: CustomerTrackingState) => void
  ): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }

    this.listeners.get(taskId)!.add(callback);

    return () => {
      const set = this.listeners.get(taskId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(taskId);
        }
      }
    };
  }
}
