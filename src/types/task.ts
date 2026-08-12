export type TaskStatus =
  | 'created'
  | 'broadcasted'
  | 'assigned'
  | 'heading_to_pickup'
  | 'arrived_at_pickup'
  | 'picked_up'
  | 'heading_to_delivery'
  | 'arrived_at_delivery'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type TaskType = 'hemen_ugra' | 'gecerken_ugra' | 'partner_order' | 'custom';
export type UrgencyType = 'standard' | 'urgent' | 'scheduled';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type TaskActorRole = 'customer' | 'assistant' | 'admin' | 'partner' | 'system';

export interface TaskContactInfo {
  name?: string;
  phone?: string;
  note?: string;
}

export interface Task {
  id: string;
  customer_id: string;
  assistant_id?: string;
  partner_id?: string;
  
  task_type: TaskType;
  urgency_type: UrgencyType;
  task_description?: string;
  notes?: string;
  service_type?: string;
  
  pickup_address: string;
  delivery_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  
  pickup_contact?: TaskContactInfo;
  delivery_contact?: TaskContactInfo;
  
  verification_code: string;
  verification_status: VerificationStatus;
  
  price: number;
  customer_price?: number;
  courier_net?: number;
  distance_km?: number;
  estimated_minutes?: number;
  assistant_earning: number;
  platform_commission: number;
  
  status: TaskStatus;
  
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  pickup_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  actor_id?: string;
  actor_role: TaskActorRole;
  event_type: string;
  previous_status?: TaskStatus;
  new_status: TaskStatus;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreateTaskInput {
  customer_id: string;
  partner_id?: string;
  task_type?: TaskType;
  urgency_type?: UrgencyType;
  task_description?: string;
  notes?: string;
  service_type?: string;
  pickup_address: string;
  delivery_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  pickup_contact?: TaskContactInfo;
  delivery_contact?: TaskContactInfo;
  price: number;
  customer_price?: number;
  courier_net?: number;
  distance_km?: number;
  estimated_minutes?: number;
  commission_rate?: number; // Default e.g. 0.15 (15%)
}

// State machine transition validation rules
export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  created: ['broadcasted', 'assigned', 'cancelled'],
  broadcasted: ['assigned', 'cancelled'],
  assigned: ['heading_to_pickup', 'cancelled', 'failed'],
  heading_to_pickup: ['arrived_at_pickup', 'cancelled', 'failed'],
  arrived_at_pickup: ['picked_up', 'cancelled', 'failed'],
  picked_up: ['heading_to_delivery', 'cancelled', 'failed'],
  heading_to_delivery: ['arrived_at_delivery', 'cancelled', 'failed'],
  arrived_at_delivery: ['completed', 'cancelled', 'failed'],
  completed: [],
  cancelled: [],
  failed: [],
};

export function isValidTaskTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_TASK_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}
