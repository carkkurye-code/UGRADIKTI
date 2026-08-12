import { VehicleType } from '@/types/dispatch';
import { TaskStatus } from '@/types/task';

export interface AssistantProfile {
  assistantId: string;
  fullName: string;
  phone: string;
  vehicleType: VehicleType;
  isOnline: boolean;
  isBusy: boolean;
  rating: number; // 1.0 - 5.0
  acceptanceRate: number; // %
  cancellationRate: number; // %
  currentLat?: number;
  currentLng?: number;
}

export interface AssistantActiveTaskDetails {
  taskId: string;
  status: TaskStatus;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  verificationCode: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  customerName?: string;
  customerPhone?: string;
  partnerName?: string;
  partnerPhone?: string;
  earningAmount: number;
  etaMinutes: number;
  distanceKm: number;
  urgencyType: 'urgent' | 'scheduled';
}

export interface AssistantEarningsSummary {
  assistantId: string;
  todayEarnings: number;
  pendingBalance: number;
  completedTasksCount: number;
  cancelledTasksCount: number;
  ratingScore: number;
  acceptanceRate: number;
  cancellationRate: number;
  totalDistanceCoveredKm: number;
}

export interface ActiveOfferState {
  offerId: string;
  taskId: string;
  title: string;
  price: number;
  pickupAddress: string;
  deliveryAddress: string;
  matchScore: number;
  expiresAt: string;
  remainingSeconds: number;
}
