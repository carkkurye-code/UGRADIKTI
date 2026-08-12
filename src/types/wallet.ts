export type WalletTransactionType =
  | 'deposit'
  | 'withdraw'
  | 'task_earning'
  | 'commission'
  | 'refund'
  | 'escrow_hold'
  | 'escrow_release'
  | 'manual_adjustment';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded';

export interface Wallet {
  id: string;
  profile_id: string;
  available_balance: number;
  pending_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  profile_id: string;
  task_id?: string;
  order_id?: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  task_id?: string;
  customer_profile_id?: string;
  assistant_profile_id?: string;
  partner_profile_id?: string;
  gross_amount: number;
  platform_commission: number;
  assistant_amount: number;
  partner_amount: number;
  payment_status: PaymentStatus;
  payment_provider: string;
  payment_reference?: string;
  created_at: string;
}

export interface CommissionConfig {
  base_fee: number;
  per_km_fee: number;
  platform_commission_rate: number;
  assistant_share: number;
  partner_share: number;
}

export interface CommissionBreakdown {
  gross_amount: number;
  base_fee: number;
  distance_fee: number;
  platform_commission: number;
  assistant_amount: number;
  partner_amount: number;
  effective_commission_rate: number;
}

export interface WalletSummary {
  total_balance: number;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  transaction_count: number;
}
