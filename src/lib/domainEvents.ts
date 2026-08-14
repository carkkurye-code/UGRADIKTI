export type DomainEventType =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_ACCEPTED'
  | 'TASK_PICKED_UP'
  | 'TASK_COMPLETED'
  | 'TASK_CANCELLED'
  | 'PAYMENT_CAPTURED'
  | 'PAYMENT_REFUNDED'
  | 'RATING_CREATED'
  | 'NOTIFICATION_CREATED'
  | 'PARTNER_APPROVED'
  | 'ASSISTANT_APPROVED';

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  aggregateId: string;
  actorId?: string;
  payload: T;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Payload Interfaces for Production Event Engine
export interface TaskCreatedPayload {
  taskId: string;
  customerId: string;
  partnerId?: string;
  price: number;
  pickupAddress: string;
  deliveryAddress: string;
  taskType?: string;
}

export interface TaskAssignedPayload {
  taskId: string;
  assistantId: string;
  assignedBy?: string;
}

export interface TaskAcceptedPayload {
  taskId: string;
  assistantId: string;
  customerId: string;
}

export interface TaskPickedUpPayload {
  taskId: string;
  assistantId: string;
  customerId: string;
}

export interface TaskCompletedPayload {
  taskId: string;
  assistantId: string;
  customerId: string;
  partnerId?: string;
  price: number;
  verificationCode?: string;
}

export interface TaskCancelledPayload {
  taskId: string;
  customerId: string;
  assistantId?: string;
  price: number;
  reason?: string;
  cancelledBy?: string;
}

export interface PaymentCapturedPayload {
  taskId: string;
  paymentId: string;
  grossAmount: number;
  platformCommission: number;
  assistantAmount: number;
  partnerAmount?: number;
  customerId: string;
  assistantId?: string;
  partnerId?: string;
}

export interface PaymentRefundedPayload {
  taskId: string;
  paymentId?: string;
  customerId: string;
  amount: number;
  reason?: string;
}

export interface RatingCreatedPayload {
  ratingId: string;
  taskId?: string;
  reviewerProfileId: string;
  targetProfileId: string;
  targetType: 'assistant' | 'partner' | 'customer';
  score: number;
  comment?: string;
  tags?: string[];
}

export interface NotificationCreatedPayload {
  notificationId: string;
  recipientProfileId: string;
  title: string;
  body: string;
  type: string;
}

export interface PartnerApprovedPayload {
  partnerProfileId: string;
  partnerId: string;
  approvedBy?: string;
}

export interface AssistantApprovedPayload {
  assistantProfileId: string;
  assistantId: string;
  approvedBy?: string;
}

export function createDomainEvent<T = any>(
  type: DomainEventType,
  aggregateId: string,
  payload: T,
  actorId?: string,
  metadata?: Record<string, any>
): DomainEvent<T> {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    aggregateId,
    actorId,
    payload,
    timestamp: new Date().toISOString(),
    metadata,
  };
}
