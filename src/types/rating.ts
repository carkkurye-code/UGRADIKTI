export type RatingTargetType = 'assistant' | 'partner' | 'customer';

export type RatingTag =
  | 'hizli_teslimat'
  | 'guler_yuz'
  | 'ozenli_paket'
  | 'iletisim_harika'
  | 'zamaninda'
  | 'guvenilir'
  | 'profesyonel'
  | 'temiz_hizmet';

export interface Rating {
  id: string;
  task_id?: string;
  order_id?: string;
  reviewer_profile_id: string;
  target_profile_id: string;
  target_type: RatingTargetType;
  score: number; // 1 - 5
  tags?: RatingTag[];
  comment?: string;
  is_anonymous: boolean;
  created_at: string;
}

export interface AssistantMetrics {
  assistant_profile_id: string;
  total_completed_tasks: number;
  total_cancelled_tasks: number;
  avg_completion_time: number; // in minutes
  acceptance_rate: number; // percentage e.g. 98.5
  rating_average: number; // 0.00 - 5.00
  updated_at: string;
}

export interface RatingSummary {
  target_profile_id: string;
  rating_average: number;
  total_ratings: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  top_tags: Array<{ tag: RatingTag; count: number }>;
}

export interface CreateRatingInput {
  task_id?: string;
  order_id?: string;
  reviewer_profile_id: string;
  target_profile_id: string;
  target_type: RatingTargetType;
  score: number;
  tags?: RatingTag[];
  comment?: string;
  is_anonymous?: boolean;
}
