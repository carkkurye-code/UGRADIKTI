import { AssistantCandidate, DispatchScoreBreakdown, ScoredCandidate } from '@/types/dispatch';
import { Task } from '@/types/task';

/**
 * Calculates distance between two geographical points using the Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return 3.5; // Default fallback distance in km if coordinates missing
  }

  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Calculates the comprehensive dispatch score for an assistant candidate
 * evaluating all 15 operational criteria.
 */
export function calculateDispatchScore(
  candidate: AssistantCandidate,
  task: Task,
  isVipCustomer = false,
  zoneDensityFactor = 1.0
): { score: number; breakdown: DispatchScoreBreakdown } {
  // 1. Distance Calculation to Pickup Address
  const distanceKm = calculateHaversineDistanceKm(
    candidate.latitude,
    candidate.longitude,
    task.pickup_lat,
    task.pickup_lng
  );

  // Distance Score (Max 30 pts): Decay as distance grows
  // 0-1 km = 30 pts, 1-3 km = 25 pts, 3-5 km = 18 pts, 5-10 km = 10 pts, >10 km = 2 pts
  let distanceScore = 30 - distanceKm * 2.5;
  if (distanceScore < 0) distanceScore = 0;
  if (distanceScore > 30) distanceScore = 30;

  // 2. Availability & Active Status (Max 25 pts)
  let availabilityScore = 0;
  if (candidate.isOnline) availabilityScore += 15;
  if (!candidate.isBusy) availabilityScore += 10;
  if (candidate.workingHoursActive) availabilityScore += 5;

  // Recency penalty (last active within 15 mins)
  const lastActiveMinutesAgo = candidate.lastActiveAt
    ? (Date.now() - new Date(candidate.lastActiveAt).getTime()) / 60000
    : 120;
  if (lastActiveMinutesAgo > 30) availabilityScore -= 10;

  // 3. Performance Score (Max 25 pts)
  // Rating (0-5) -> Max 10 pts
  const ratingContribution = ((candidate.rating || 5.0) / 5.0) * 10;
  // Acceptance Rate (0-100) -> Max 10 pts
  const acceptanceContribution = ((candidate.acceptanceRate || 100) / 100) * 10;
  // Cancellation Penalty -> Max -10 pts
  const cancellationPenalty = ((candidate.cancellationRate || 0) / 100) * 10;

  let performanceScore = ratingContribution + acceptanceContribution - cancellationPenalty;

  // 4. Daily Workload Balance (Max 10 pts)
  // Encourage fair task distribution among assistants
  let workloadScore = 10 - candidate.dailyTaskCount * 1.5;
  if (workloadScore < 0) workloadScore = 0;

  // 5. Task Urgency Fit (Hemen UĞRA vs Geçerken UĞRA) (Max 10 pts)
  let urgencyFitScore = 5;
  if (task.task_type === 'hemen_ugra' || task.urgency_type === 'urgent') {
    // Urgent tasks heavily prioritize close and online assistants
    if (distanceKm <= 2.5 && candidate.isOnline && !candidate.isBusy) {
      urgencyFitScore = 10;
    }
  } else if (task.task_type === 'gecerken_ugra' || task.urgency_type === 'scheduled') {
    // Scheduled tasks can tolerate slightly further assistants
    urgencyFitScore = 8;
  }

  // 6. Vehicle Fit Score (Max 10 pts)
  let vehicleFitScore = 5;
  if (distanceKm > 5.0 && (candidate.vehicleType === 'motorcycle' || candidate.vehicleType === 'car')) {
    vehicleFitScore = 10;
  } else if (distanceKm <= 2.0) {
    vehicleFitScore = 8; // All vehicle types suitable for short distance
  }

  // 7. Priority Boosts (Partner, VIP, Zone Priority)
  let priorityBoostScore = 0;
  if (task.partner_id && candidate.partnerPriorityBoost) {
    priorityBoostScore += candidate.partnerPriorityBoost; // Partner priority
  }
  if (isVipCustomer) {
    priorityBoostScore += 5; // VIP customer boost
  }
  if (zoneDensityFactor > 1.2) {
    priorityBoostScore += 5; // Zone congestion boost
  }

  // Aggregate Total Score
  let totalScore =
    distanceScore +
    availabilityScore +
    performanceScore +
    workloadScore +
    urgencyFitScore +
    vehicleFitScore +
    priorityBoostScore;

  // Clamp totalScore to 0-100
  totalScore = Math.max(0, Math.min(100, Math.round(totalScore * 10) / 10));

  const breakdown: DispatchScoreBreakdown = {
    distanceKm,
    distanceScore: Math.round(distanceScore * 10) / 10,
    availabilityScore: Math.round(availabilityScore * 10) / 10,
    performanceScore: Math.round(performanceScore * 10) / 10,
    workloadScore: Math.round(workloadScore * 10) / 10,
    urgencyFitScore: Math.round(urgencyFitScore * 10) / 10,
    vehicleFitScore: Math.round(vehicleFitScore * 10) / 10,
    priorityBoostScore: Math.round(priorityBoostScore * 10) / 10,
    totalScore,
  };

  return { score: totalScore, breakdown };
}

/**
 * Ranks candidates by calculated dispatch score in descending order
 */
export function rankCandidatesForTask(
  candidates: AssistantCandidate[],
  task: Task,
  isVipCustomer = false,
  zoneDensityFactor = 1.0
): ScoredCandidate[] {
  return candidates
    .map((candidate) => {
      const { score, breakdown } = calculateDispatchScore(
        candidate,
        task,
        isVipCustomer,
        zoneDensityFactor
      );
      return { candidate, score, breakdown };
    })
    .sort((a, b) => b.score - a.score);
}
