export type AdminAlarmType =
  | 'unassigned_task_delay'
  | 'long_pending_order'
  | 'high_cancellation_partner'
  | 'high_cancellation_courier'
  | 'offline_courier_in_shift'
  | 'system_error';

export type AdminAlarmSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AdminAlarm {
  id: string;
  type: AdminAlarmType;
  severity: AdminAlarmSeverity;
  title: string;
  description: string;
  targetId: string;
  createdAt: string;
  isAcknowledged: boolean;
}

export interface AdminDashboardMetrics {
  activeTaskCount: number;
  pendingTaskCount: number;
  activeCourierCount: number;
  onlineCourierCount: number;
  offlineCourierCount: number;
  activePartnerCount: number;
  todayOrderCount: number;
  todayTaskCount: number;
  totalTurnover: number;
  totalCommission: number;
  successfulDeliveryRate: number; // percentage (e.g. 96.5)
  cancellationRate: number; // percentage (e.g. 3.5)
  avgDeliveryTimeMinutes: number;
}

export interface AdminLiveMapData {
  tasks: Array<{
    id: string;
    status: string;
    pickupLat: number;
    pickupLng: number;
    deliveryLat: number;
    deliveryLng: number;
    price: number;
    assistantId?: string;
  }>;
  assistants: Array<{
    id: string;
    fullName: string;
    isOnline: boolean;
    lat: number;
    lng: number;
    vehicleType: string;
  }>;
  partners: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    isActive: boolean;
  }>;
}

export interface EmergencyTaskInput {
  customerId: string;
  customerPhone?: string;
  partnerId?: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  price: number;
  notes?: string;
}
