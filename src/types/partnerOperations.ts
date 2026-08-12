export type PartnerOrderStatus =
  | 'preparing'
  | 'ready'
  | 'waiting_courier'
  | 'courier_arrived'
  | 'delivered'
  | 'cancelled';

export interface PartnerOrder {
  id: string;
  taskId: string;
  partnerId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  status: PartnerOrderStatus;
  itemsCount: number;
  totalPrice: number;
  preparationTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
  assistantId?: string;
  assistantName?: string;
  etaMinutes?: number;
}

export interface PartnerDashboardMetrics {
  partnerId: string;
  todayOrderCount: number;
  activeTaskCount: number;
  pendingOrderCount: number;
  avgPrepTimeMinutes: number;
  totalRevenue: number;
  platformCommission: number;
  netEarning: number;
  liveAssistantsCount: number;
}

export interface PartnerActiveTaskOverview {
  taskId: string;
  orderId: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: PartnerOrderStatus;
  assistantName?: string;
  assistantPhone?: string;
  assistantLat?: number;
  assistantLng?: number;
  etaMinutes?: number;
  price: number;
  createdTimeFormatted: string;
}
