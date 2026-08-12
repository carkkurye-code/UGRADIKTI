import { AssistantEarningsSummary } from '@/types/assistant';
import { Task } from '@/types/task';

/**
 * Calculates earnings, performance ratings, and metrics for an assistant
 */
export function calculateAssistantEarningsMetrics(
  assistantId: string,
  tasks: Task[],
  walletBalance = 0,
  rating = 4.85,
  acceptanceRate = 96,
  cancellationRate = 2
): AssistantEarningsSummary {
  const todayStr = new Date().toISOString().split('T')[0];

  const assistantTasks = tasks.filter((t) => t.assistant_id === assistantId);

  const todayTasks = assistantTasks.filter((t) => t.created_at?.startsWith(todayStr));

  const completedToday = todayTasks.filter((t) => t.status === 'completed');
  const cancelledToday = todayTasks.filter((t) => t.status === 'cancelled');

  const todayEarnings = completedToday.reduce((sum, t) => sum + (t.assistant_earning || t.price * 0.85), 0);

  // Total completed all time
  const totalCompleted = assistantTasks.filter((t) => t.status === 'completed').length;
  const totalCancelled = assistantTasks.filter((t) => t.status === 'cancelled').length;

  return {
    assistantId,
    todayEarnings: Math.round(todayEarnings * 100) / 100,
    pendingBalance: Math.round(walletBalance * 100) / 100,
    completedTasksCount: totalCompleted,
    cancelledTasksCount: totalCancelled,
    ratingScore: rating,
    acceptanceRate,
    cancellationRate,
    totalDistanceCoveredKm: Math.round(totalCompleted * 3.8 * 10) / 10,
  };
}
