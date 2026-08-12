import { supabase, isSupabaseConfigured, isUUID, toUUID } from '@/lib/supabase';
import {
  Rating,
  AssistantMetrics,
  RatingSummary,
  CreateRatingInput,
  RatingTargetType,
} from '@/types/rating';
import { IntegrationService } from './integrationService';

export interface RatingServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Production Rating & Metrics Engine Service for UĞRA Platform
 * Handles task ratings, score calculations, tag aggregation, assistant performance metrics,
 * and completion audit logic.
 */
export class RatingService {
  /**
   * 1. Create a Rating for a completed Task or User
   */
  public static async createRating(input: CreateRatingInput): Promise<RatingServiceResult<Rating>> {
    if (input.score < 1 || input.score > 5) {
      return { success: false, error: 'Puan 1 ile 5 arasında olmalıdır.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // If task_id provided, ensure order/task status is completed/delivered
        if (input.task_id && isUUID(input.task_id)) {
          let orderStatus: string | null = null;
          const { data: tData } = await supabase.from('tasks').select('status, order_id').eq('id', input.task_id).maybeSingle();
          if (tData) {
            orderStatus = tData.status;
            if (tData.order_id && isUUID(tData.order_id)) {
              const { data: oData } = await supabase.from('orders').select('status').eq('id', tData.order_id).maybeSingle();
              if (oData) orderStatus = oData.status;
            }
          } else {
            const { data: oData } = await supabase.from('orders').select('status').eq('id', input.task_id).maybeSingle();
            if (oData) orderStatus = oData.status;
          }

          if (!orderStatus) {
            return { success: false, error: 'İlişkili sipariş bulunamadı.' };
          }

          if (orderStatus !== 'completed' && orderStatus !== 'teslim_edildi') {
            return { success: false, error: 'Tamamlanmamış siparişler için puanlama yapılamaz.' };
          }

          // Guard: Prevent duplicate rating for the same task by the same reviewer
          const { data: existingRating } = await supabase
            .from('ratings')
            .select('id')
            .eq('task_id', input.task_id)
            .eq('reviewer_profile_id', input.reviewer_profile_id)
            .maybeSingle();

          if (existingRating) {
            return { success: false, error: 'Bu görev için zaten değerlendirme yaptınız.' };
          }
        }

        // Direct Table Insert with safely formatted UUIDs
        const validTaskUuid = input.task_id && isUUID(input.task_id) ? input.task_id : (input.task_id ? toUUID(input.task_id) : null);
        const validReviewerUuid = isUUID(input.reviewer_profile_id) ? input.reviewer_profile_id : toUUID(input.reviewer_profile_id);
        const validTargetUuid = isUUID(input.target_profile_id) ? input.target_profile_id : toUUID(input.target_profile_id);

        // Direct Insert Fallback
        const { data: newRating, error: insertErr } = await supabase
          .from('ratings')
          .insert({
            task_id: input.task_id || null,
            order_id: input.order_id || null,
            reviewer_profile_id: input.reviewer_profile_id,
            target_profile_id: input.target_profile_id,
            target_type: input.target_type,
            score: input.score,
            tags: input.tags || [],
            comment: input.comment || null,
            is_anonymous: input.is_anonymous || false,
          })
          .select('*')
          .single();

        if (insertErr) return { success: false, error: insertErr.message };

        // Automatically update metrics if assistant target
        if (input.target_type === 'assistant') {
          await this.updateAssistantMetrics(input.target_profile_id);
        }

        await IntegrationService.emitRatingCreated({
          ratingId: newRating.id,
          taskId: newRating.task_id,
          reviewerProfileId: newRating.reviewer_profile_id,
          targetProfileId: newRating.target_profile_id,
          targetType: newRating.target_type,
          score: newRating.score,
          comment: newRating.comment,
          tags: newRating.tags,
        }, newRating.reviewer_profile_id);

        return { success: true, data: newRating as Rating };
      } catch (err: any) {
        return { success: false, error: err.message || 'Değerlendirme kaydedilemedi.' };
      }
    }

    // Mock Mode
    const mockRating: Rating = {
      id: `rating-${Date.now()}`,
      task_id: input.task_id,
      order_id: input.order_id,
      reviewer_profile_id: input.reviewer_profile_id,
      target_profile_id: input.target_profile_id,
      target_type: input.target_type,
      score: input.score,
      tags: input.tags || [],
      comment: input.comment,
      is_anonymous: input.is_anonymous || false,
      created_at: new Date().toISOString(),
    };

    await IntegrationService.emitRatingCreated({
      ratingId: mockRating.id,
      taskId: mockRating.task_id,
      reviewerProfileId: mockRating.reviewer_profile_id,
      targetProfileId: mockRating.target_profile_id,
      targetType: mockRating.target_type,
      score: mockRating.score,
      comment: mockRating.comment,
      tags: mockRating.tags,
    }, mockRating.reviewer_profile_id);

    return { success: true, data: mockRating };
  }

  /**
   * 2. Get Ratings list for a target user profile
   */
  public static async getRatings(
    targetProfileId: string,
    limit: number = 30
  ): Promise<RatingServiceResult<Rating[]>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('ratings')
          .select('*')
          .eq('target_profile_id', targetProfileId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) return { success: false, error: error.message };
        return { success: true, data: (data || []) as Rating[] };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, data: [] };
  }

  /**
   * 3. Calculate Average Rating and Summary breakdown for a target
   */
  public static async getAverageRating(targetProfileId: string): Promise<RatingServiceResult<RatingSummary>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: ratings, error } = await supabase
          .from('ratings')
          .select('*')
          .eq('target_profile_id', targetProfileId);

        if (error) return { success: false, error: error.message };

        const list = (ratings || []) as Rating[];
        return { success: true, data: this.calculateSummaryFromRatings(targetProfileId, list) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return {
      success: true,
      data: {
        target_profile_id: targetProfileId,
        rating_average: 5.0,
        total_ratings: 1,
        five_star_count: 1,
        four_star_count: 0,
        three_star_count: 0,
        two_star_count: 0,
        one_star_count: 0,
        top_tags: [{ tag: 'hizli_teslimat', count: 1 }],
      },
    };
  }

  /**
   * 4. Update Assistant Performance Metrics
   */
  public static async updateAssistantMetrics(assistantProfileId: string): Promise<RatingServiceResult<AssistantMetrics>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const validAssistantUuid = isUUID(assistantProfileId) ? assistantProfileId : toUUID(assistantProfileId);

        // Fallback calculations directly via public.orders table
        const { count: completedCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('assistant_id', validAssistantUuid)
          .in('status', ['completed', 'teslim_edildi']);

        const { count: cancelledCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('assistant_id', validAssistantUuid)
          .in('status', ['cancelled', 'iptal', 'failed']);

        const summaryRes = await this.getAverageRating(assistantProfileId);
        const avgScore = summaryRes.data?.rating_average || 0;

        const totalTasks = (completedCount || 0) + (cancelledCount || 0);
        const acceptanceRate = totalTasks > 0 ? Number((((completedCount || 0) / totalTasks) * 100).toFixed(2)) : 100.0;

        const { data: updatedMetrics, error: upsertErr } = await supabase
          .from('assistant_metrics')
          .upsert({
            assistant_profile_id: assistantProfileId,
            total_completed_tasks: completedCount || 0,
            total_cancelled_tasks: cancelledCount || 0,
            avg_completion_time: 0.0,
            acceptance_rate: acceptanceRate,
            rating_average: avgScore,
          })
          .select('*')
          .single();

        if (upsertErr) return { success: false, error: upsertErr.message };
        return { success: true, data: updatedMetrics as AssistantMetrics };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const mockMetrics: AssistantMetrics = {
      assistant_profile_id: assistantProfileId,
      total_completed_tasks: 10,
      total_cancelled_tasks: 0,
      avg_completion_time: 25.0,
      acceptance_rate: 100.0,
      rating_average: 4.95,
      updated_at: new Date().toISOString(),
    };
    return { success: true, data: mockMetrics };
  }

  /**
   * 5. Get Assistant Metrics by profile ID
   */
  public static async getAssistantMetrics(assistantProfileId: string): Promise<RatingServiceResult<AssistantMetrics>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('assistant_metrics')
          .select('*')
          .eq('assistant_profile_id', assistantProfileId)
          .maybeSingle();

        if (error) return { success: false, error: error.message };
        if (!data) {
          return this.updateAssistantMetrics(assistantProfileId);
        }

        return { success: true, data: data as AssistantMetrics };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return this.updateAssistantMetrics(assistantProfileId);
  }

  /**
   * Helper: Calculate Rating Summary stats array
   */
  private static calculateSummaryFromRatings(targetId: string, list: Rating[]): RatingSummary {
    const total = list.length;
    if (total === 0) {
      return {
        target_profile_id: targetId,
        rating_average: 0.0,
        total_ratings: 0,
        five_star_count: 0,
        four_star_count: 0,
        three_star_count: 0,
        two_star_count: 0,
        one_star_count: 0,
        top_tags: [],
      };
    }

    let sum = 0;
    let five = 0, four = 0, three = 0, two = 0, one = 0;
    const tagCounts: Record<string, number> = {};

    for (const r of list) {
      sum += r.score;
      if (r.score === 5) five++;
      else if (r.score === 4) four++;
      else if (r.score === 3) three++;
      else if (r.score === 2) two++;
      else if (r.score === 1) one++;

      if (r.tags && Array.isArray(r.tags)) {
        for (const t of r.tags) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    }

    const avg = Number((sum / total).toFixed(2));
    const sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag: tag as any, count }))
      .sort((a, b) => b.count - a.count);

    return {
      target_profile_id: targetId,
      rating_average: avg,
      total_ratings: total,
      five_star_count: five,
      four_star_count: four,
      three_star_count: three,
      two_star_count: two,
      one_star_count: one,
      top_tags: sortedTags,
    };
  }
}
