export type DispatchStrategy = 'single' | 'wave' | 'broadcast';

export type DispatchOfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export type DispatchSessionStatus = 'active' | 'assigned' | 'exhausted' | 'fallback_pool';

export type VehicleType = 'motorcycle' | 'car' | 'bicycle' | 'pedestrian';

export interface AssistantCandidate {
  id?: string;
  user_id?: string;
  full_name?: string;
  assistantId: string;
  profileId: string;
  fullName?: string;
  phone?: string;
  isOnline: boolean;
  isBusy: boolean;
  lastActiveAt: string;
  latitude?: number;
  longitude?: number;
  acceptanceRate: number; // 0 - 100 %
  rating: number; // 1.0 - 5.0
  cancellationRate: number; // 0 - 100 %
  dailyTaskCount: number;
  workingHoursActive: boolean;
  vehicleType: VehicleType;
  partnerPriorityBoost?: number;
  preferredZone?: string;
}

export interface DispatchScoreBreakdown {
  distanceKm: number;
  distanceScore: number;
  availabilityScore: number;
  performanceScore: number;
  workloadScore: number;
  urgencyFitScore: number;
  vehicleFitScore: number;
  priorityBoostScore: number;
  totalScore: number;
}

export interface ScoredCandidate {
  candidate: AssistantCandidate;
  score: number;
  breakdown: DispatchScoreBreakdown;
}

export interface DispatchOffer {
  id: string;
  taskId: string;
  assistantId: string;
  strategy: DispatchStrategy;
  score: number;
  status: DispatchOfferStatus;
  offeredAt: string;
  expiresAt: string;
  waveIndex?: number;
}

export interface DispatchSession {
  taskId: string;
  strategy: DispatchStrategy;
  status: DispatchSessionStatus;
  offers: DispatchOffer[];
  currentIndex: number;
  createdAt: string;
  updatedAt: string;
  assignedAssistantId?: string;
}
