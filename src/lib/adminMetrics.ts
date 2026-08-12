import { AdminAlarm, AdminDashboardMetrics } from '@/types/admin';
import { Task } from '@/types/task';
import { AssistantCandidate } from '@/types/dispatch';

/**
 * Calculates real-time system metrics for Admin Command Center Dashboard
 */
export function calculateAdminMetrics(
  tasks: Task[],
  assistants: AssistantCandidate[],
  partnerCount = 0
): AdminDashboardMetrics {
  const activeTaskCount = tasks.filter(
    (t) =>
      t.status === 'assigned' ||
      t.status === 'heading_to_pickup' ||
      t.status === 'arrived_at_pickup' ||
      t.status === 'picked_up' ||
      t.status === 'heading_to_delivery' ||
      t.status === 'arrived_at_delivery'
  ).length;
  const pendingTaskCount = tasks.filter((t) => t.status === 'created' || t.status === 'broadcasted').length;

  const onlineCourierCount = assistants.filter((a) => a.isOnline).length;
  const activeCourierCount = assistants.filter((a) => a.isOnline && !a.isBusy).length;
  const offlineCourierCount = assistants.filter((a) => !a.isOnline).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((t) => t.created_at?.startsWith(todayStr));

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const cancelledTasks = tasks.filter((t) => t.status === 'cancelled');

  const totalCompleted = completedTasks.length;
  const totalCancelled = cancelledTasks.length;
  const totalEvaluated = totalCompleted + totalCancelled;

  const successfulDeliveryRate =
    totalEvaluated > 0 ? Math.round((totalCompleted / totalEvaluated) * 1000) / 10 : 0;

  const cancellationRate =
    totalEvaluated > 0 ? Math.round((totalCancelled / totalEvaluated) * 1000) / 10 : 0;

  const totalTurnover = completedTasks.reduce((sum, t) => sum + (t.price || 0), 0);
  const totalCommission = Math.round(totalTurnover * 0.15 * 100) / 100;

  let avgDeliveryTimeMinutes = 0;
  if (completedTasks.length > 0) {
    const totalMinutes = completedTasks.reduce((acc, t) => {
      if (t.created_at && t.updated_at) {
        const diff = (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 60000;
        return acc + (diff > 0 ? diff : 15);
      }
      return acc + 15;
    }, 0);
    avgDeliveryTimeMinutes = Math.round((totalMinutes / completedTasks.length) * 10) / 10;
  }

  return {
    activeTaskCount,
    pendingTaskCount,
    activeCourierCount,
    onlineCourierCount,
    offlineCourierCount,
    activePartnerCount: partnerCount,
    todayOrderCount: todayTasks.length,
    todayTaskCount: todayTasks.length,
    totalTurnover,
    totalCommission,
    successfulDeliveryRate,
    cancellationRate,
    avgDeliveryTimeMinutes,
  };
}

/**
 * Generates automated operational alarms based on real-time task and courier thresholds
 */
export function generateAdminAlarms(
  tasks: Task[],
  assistants: AssistantCandidate[]
): AdminAlarm[] {
  const alarms: AdminAlarm[] = [];
  const now = Date.now();

  // 1. Detect unassigned / waiting tasks longer than 5 minutes
  tasks.forEach((t) => {
    if ((t.status === 'created' || t.status === 'broadcasted') && t.created_at) {
      const waitTimeMins = (now - new Date(t.created_at).getTime()) / 60000;
      if (waitTimeMins > 5) {
        alarms.push({
          id: `alarm-unassigned-${t.id}`,
          type: 'unassigned_task_delay',
          severity: waitTimeMins > 10 ? 'critical' : 'high',
          title: `Kurye Bulunamadı (Görev #${t.id.slice(0, 8)})`,
          description: `Görev ${Math.round(waitTimeMins)} dakikadır kurye bekliyor. Manuel müdahale veya teklif yükseltme önerilir.`,
          targetId: t.id,
          createdAt: new Date().toISOString(),
          isAcknowledged: false,
        });
      }
    }
  });

  // 2. Detect couriers with high cancellation rate (> 10%)
  assistants.forEach((a) => {
    if (a.cancellationRate > 10) {
      alarms.push({
        id: `alarm-cancel-asst-${a.assistantId}`,
        type: 'high_cancellation_courier',
        severity: 'medium',
        title: `Yüksek İptal Oranı (${a.fullName || a.assistantId})`,
        description: `Asistan %${a.cancellationRate} iptal oranına ulaştı. Performans incelemesi gerekebilir.`,
        targetId: a.assistantId,
        createdAt: new Date().toISOString(),
        isAcknowledged: false,
      });
    }
  });

  return alarms;
}
