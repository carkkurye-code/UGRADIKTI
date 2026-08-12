import { PartnerDashboardMetrics, PartnerOrder } from '@/types/partnerOperations';

/**
 * Calculates operational metrics for a partner's dashboard
 */
export function calculatePartnerDashboardMetrics(
  partnerId: string,
  orders: PartnerOrder[],
  liveAssistantsCount = 0
): PartnerDashboardMetrics {
  const todayStr = new Date().toISOString().split('T')[0];

  const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));

  const todayOrderCount = todayOrders.length;

  const activeTasks = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const pendingOrders = orders.filter((o) => o.status === 'preparing');

  // Compute average preparation time for completed/ready orders
  const prepTimes = orders
    .filter((o) => o.preparationTimeMinutes > 0)
    .map((o) => o.preparationTimeMinutes);

  const avgPrepTimeMinutes =
    prepTimes.length > 0
      ? Math.round(
          (prepTimes.reduce((acc, curr) => acc + curr, 0) / prepTimes.length) * 10
        ) / 10
      : 12;

  // Financial calculations
  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((acc, o) => acc + o.totalPrice, 0);

  // Platform commission rate: 15%
  const platformCommission = Math.round(totalRevenue * 0.15 * 100) / 100;
  const netEarning = Math.round((totalRevenue - platformCommission) * 100) / 100;

  return {
    partnerId,
    todayOrderCount,
    activeTaskCount: activeTasks.length,
    pendingOrderCount: pendingOrders.length,
    avgPrepTimeMinutes,
    totalRevenue,
    platformCommission,
    netEarning,
    liveAssistantsCount,
  };
}

/**
 * Groups orders by operational stage
 */
export function groupOrdersByStage(orders: PartnerOrder[]): Record<string, PartnerOrder[]> {
  return {
    preparing: orders.filter((o) => o.status === 'preparing'),
    ready: orders.filter((o) => o.status === 'ready' || o.status === 'waiting_courier'),
    courier_arrived: orders.filter((o) => o.status === 'courier_arrived'),
    in_transit: orders.filter((o) => o.status === 'waiting_courier' && o.assistantId),
    delivered: orders.filter((o) => o.status === 'delivered'),
    cancelled: orders.filter((o) => o.status === 'cancelled'),
  };
}
