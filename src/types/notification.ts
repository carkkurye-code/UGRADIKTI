export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'payment_received'
  | 'wallet_updated'
  | 'system'
  | 'announcement';

export type NotificationChannel = 'app' | 'push' | 'sms' | 'email';

export interface NotificationPayload {
  task_id?: string;
  order_id?: string;
  payment_id?: string;
  wallet_transaction_id?: string;
  amount?: number;
  sender_name?: string;
  action_url?: string;
  extra?: Record<string, any>;
}

export interface Notification {
  id: string;
  recipient_profile_id: string;
  title: string;
  body: string;
  type: NotificationType;
  channels: NotificationChannel[];
  payload: NotificationPayload;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationInput {
  recipient_profile_id: string;
  title: string;
  body: string;
  type: NotificationType;
  channels?: NotificationChannel[];
  payload?: NotificationPayload;
}
