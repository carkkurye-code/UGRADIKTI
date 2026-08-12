export type TrackingStage =
  | 'created'
  | 'preparing'
  | 'waiting_courier'
  | 'courier_accepted'
  | 'courier_heading_pickup'
  | 'picked_up'
  | 'heading_delivery'
  | 'arriving'
  | 'delivered'
  | 'cancelled';

export interface TimelineStep {
  stepId: string;
  label: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
  description?: string;
}

export interface CourierInfo {
  id: string;
  fullName: string;
  phone: string;
  rating: number;
  vehicleType: string;
  lat?: number;
  lng?: number;
}

export interface PartnerInfo {
  id: string;
  name: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface CustomerTrackingState {
  taskId: string;
  orderId?: string;
  currentStage: TrackingStage;
  stageTitle: string;
  stageSubtitle: string;
  progressPercent: number;
  timeline: TimelineStep[];
  courier?: CourierInfo;
  partner?: PartnerInfo;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  distanceKm: number;
  etaMinutes: number;
  lastKnownLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
  isOffline: boolean;
  isRatingPending: boolean;
}

export interface PostDeliveryRatingInput {
  taskId: string;
  customerId: string;
  assistantId?: string;
  partnerId?: string;
  assistantScore: number;
  partnerScore?: number;
  comment?: string;
  tags?: string[];
}
