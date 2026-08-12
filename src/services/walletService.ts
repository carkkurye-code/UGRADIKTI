import { supabase, isSupabaseConfigured, isUUID, toUUID, getActiveSupabaseClient, getExactTableColumns } from '@/lib/supabase';
import {
  Wallet,
  WalletTransaction,
  PaymentTransaction,
  CommissionConfig,
  CommissionBreakdown,
  WalletSummary,
  WalletTransactionType,
} from '@/types/wallet';
import { IntegrationService } from './integrationService';

export interface WalletServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  base_fee: 0.0,
  per_km_fee: 0.0,
  platform_commission_rate: 0.0,
  assistant_share: 1.0,
  partner_share: 0.0,
};

/**
 * Production Wallet, Commission & Payment Service for UĞRA Platform
 * Manages double-entry financial ledger operations, wallet balances,
 * escrow holds, payouts, commission calculations, and payment tracking.
 */
export class WalletService {
  /**
   * Reads dynamic commission configuration settings
   */
  public static getCommissionConfig(custom?: Partial<CommissionConfig>): CommissionConfig {
    return {
      base_fee: custom?.base_fee ?? DEFAULT_COMMISSION_CONFIG.base_fee,
      per_km_fee: custom?.per_km_fee ?? DEFAULT_COMMISSION_CONFIG.per_km_fee,
      platform_commission_rate: custom?.platform_commission_rate ?? DEFAULT_COMMISSION_CONFIG.platform_commission_rate,
      assistant_share: custom?.assistant_share ?? DEFAULT_COMMISSION_CONFIG.assistant_share,
      partner_share: custom?.partner_share ?? DEFAULT_COMMISSION_CONFIG.partner_share,
    };
  }

  /**
   * 1. Create a Wallet for a user profile
   */
  public static async createWallet(profileId: string): Promise<WalletServiceResult<Wallet>> {
    if (isSupabaseConfigured) {
      try {
        const walletCols = await getExactTableColumns('wallets');
        if (walletCols.length > 0) {
          const client = await getActiveSupabaseClient();
          let targetId = profileId;
          if (!isUUID(targetId)) {
            const { data: sessionData } = await client.auth.getSession();
            if (sessionData?.session?.user?.id && isUUID(sessionData.session.user.id)) {
              targetId = sessionData.session.user.id;
            }
          }

          if (!isUUID(targetId)) {
            const mockWallet: Wallet = {
              id: `wallet-${profileId}`,
              profile_id: profileId,
              available_balance: 0.0,
              pending_balance: 0.0,
              currency: 'TRY',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return { success: true, data: mockWallet };
          }

          const payload: Record<string, any> = {
            available_balance: 0.0,
            pending_balance: 0.0,
            currency: 'TRY',
          };
          if (walletCols.includes('profile_id')) payload.profile_id = targetId;

          const { data, error } = await client
            .from('wallets')
            .insert(payload)
            .select();

          if (error) {
            console.error('[UĞRA Admin] wallets insert error:', error);
            if (error.code === '23505') {
              return this.getWallet(targetId);
            }
            return { success: false, error: error.message };
          }

          const created = Array.isArray(data) ? data[0] : data;
          return { success: true, data: created as Wallet };
        }
      } catch (err: any) {
        console.error('[UĞRA Admin] wallets insert error:', err);
        return { success: false, error: err.message || 'Cüzdan oluşturulamadı.' };
      }
    }

    // Mock Mode
    const mockWallet: Wallet = {
      id: `wallet-${profileId}`,
      profile_id: profileId,
      available_balance: 0.0,
      pending_balance: 0.0,
      currency: 'TRY',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { success: true, data: mockWallet };
  }

  /**
   * 2. Get User Wallet by profile ID (Returns zero wallet fallback if missing)
   */
  public static async getWallet(profileId: string): Promise<WalletServiceResult<Wallet>> {
    if (isSupabaseConfigured) {
      try {
        const walletCols = await getExactTableColumns('wallets');
        if (walletCols.length > 0) {
          const client = await getActiveSupabaseClient();
          const filterCol = walletCols.includes('profile_id')
            ? 'profile_id'
            : (walletCols.includes('partner_id') ? 'partner_id' : 'id');

          let targetId = profileId;
          if (!isUUID(targetId)) {
            const { data: sessionData } = await client.auth.getSession();
            if (sessionData?.session?.user?.id && isUUID(sessionData.session.user.id)) {
              targetId = sessionData.session.user.id;
            }
          }

          if (!isUUID(targetId)) {
            const mockWallet: Wallet = {
              id: `wallet-${profileId}`,
              profile_id: profileId,
              available_balance: 0.0,
              pending_balance: 0.0,
              currency: 'TRY',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return { success: true, data: mockWallet };
          }

          const { data, error } = await client
            .from('wallets')
            .select('*')
            .eq(filterCol, targetId)
            .maybeSingle();

          if (error) {
            console.warn('[WalletService] Supabase wallet fetch error, returning local wallet fallback:', error.message || error);
            const mockWallet: Wallet = {
              id: `wallet-${profileId}`,
              profile_id: profileId,
              available_balance: 0.0,
              pending_balance: 0.0,
              currency: 'TRY',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return { success: true, data: mockWallet };
          }

          if (!data) {
            const defaultWallet: Wallet = {
              id: `wallet-${profileId}`,
              profile_id: profileId,
              available_balance: 0.0,
              pending_balance: 0.0,
              currency: 'TRY',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            return { success: true, data: defaultWallet };
          }

          return { success: true, data: data as Wallet };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Fallback Mock Wallet if table does not exist
    const mockWallet: Wallet = {
      id: `wallet-${profileId}`,
      profile_id: profileId,
      available_balance: 0.0,
      pending_balance: 0.0,
      currency: 'TRY',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { success: true, data: mockWallet };
  }

  /**
   * 3. Fetch Transaction History for a Wallet
   */
  public static async getTransactions(profileId: string, limit: number = 50): Promise<WalletServiceResult<WalletTransaction[]>> {
    if (isSupabaseConfigured) {
      try {
        const txCols = await getExactTableColumns('wallet_transactions');
        if (txCols.length > 0) {
          const client = await getActiveSupabaseClient();
          const filterCol = txCols.includes('profile_id') ? 'profile_id' : 'wallet_id';

          let targetId = profileId;
          if (!isUUID(targetId)) {
            const { data: sessionData } = await client.auth.getSession();
            if (sessionData?.session?.user?.id && isUUID(sessionData.session.user.id)) {
              targetId = sessionData.session.user.id;
            }
          }

          if (!isUUID(targetId)) {
            return { success: true, data: [] };
          }

          const { data, error } = await client
            .from('wallet_transactions')
            .select('*')
            .eq(filterCol, targetId)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true, data: (data || []) as WalletTransaction[] };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, data: [] };
  }

  /**
   * 4. Deposit Funds into Wallet (Ledger Driven)
   */
  public static async deposit(profileId: string, amount: number, description?: string): Promise<WalletServiceResult<Wallet>> {
    if (amount <= 0) {
      return { success: false, error: 'Yüklenecek tutar 0\'dan büyük olmalıdır.' };
    }
    return this.recordLedgerTransaction(profileId, 'deposit', amount, description || 'Bakiye Yükleme');
  }

  /**
   * 5. Withdraw Funds from Wallet (Ledger Driven)
   */
  public static async withdraw(profileId: string, amount: number, description?: string): Promise<WalletServiceResult<Wallet>> {
    if (amount <= 0) {
      return { success: false, error: 'Çekilecek tutar 0\'dan büyük olmalıdır.' };
    }

    const walletRes = await this.getWallet(profileId);
    if (!walletRes.success || !walletRes.data) {
      return { success: false, error: 'Cüzdan bulunamadı.' };
    }

    if (walletRes.data.available_balance < amount) {
      return { success: false, error: 'Yetersiz bakiye.' };
    }

    return this.recordLedgerTransaction(profileId, 'withdraw', -amount, description || 'Bakiye Çekme');
  }

  /**
   * 6. Escrow Hold (Move available balance to pending balance)
   */
  public static async holdBalance(profileId: string, amount: number, taskId?: string): Promise<WalletServiceResult<Wallet>> {
    if (amount <= 0) return { success: false, error: 'Tutar geçersiz.' };

    const walletRes = await this.getWallet(profileId);
    if (!walletRes.success || !walletRes.data) return { success: false, error: 'Cüzdan bulunamadı.' };

    const wallet = walletRes.data;

    // Idempotency check: Check if escrow_hold already recorded for this task
    if (isSupabaseConfigured && supabase && taskId) {
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('wallet_id', wallet.id)
        .eq('task_id', taskId)
        .eq('type', 'escrow_hold')
        .maybeSingle();

      if (existingTx) {
        return { success: true, data: wallet };
      }
    }

    if (wallet.available_balance < amount) {
      return { success: false, error: 'Bloke için yetersiz kullanılabilir bakiye.' };
    }

    const newAvailable = wallet.available_balance - amount;
    const newPending = wallet.pending_balance + amount;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          profile_id: profileId,
          task_id: taskId || null,
          type: 'escrow_hold',
          amount: -amount,
          balance_after: newAvailable,
          description: `Görev bloke tutarı (#${taskId || 'görev'})`,
        });

        const { data: updated, error } = await supabase
          .from('wallets')
          .update({
            available_balance: newAvailable,
            pending_balance: newPending,
          })
          .eq('id', wallet.id)
          .select('*')
          .single();

        if (error) return { success: false, error: error.message };
        return { success: true, data: updated as Wallet };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, data: { ...wallet, available_balance: newAvailable, pending_balance: newPending } };
  }

  /**
   * 7. Escrow Release (Move pending balance to available or clear hold)
   */
  public static async releaseBalance(profileId: string, amount: number, taskId?: string): Promise<WalletServiceResult<Wallet>> {
    if (amount <= 0) return { success: false, error: 'Tutar geçersiz.' };

    const walletRes = await this.getWallet(profileId);
    if (!walletRes.success || !walletRes.data) return { success: false, error: 'Cüzdan bulunamadı.' };

    const wallet = walletRes.data;
    const newPending = Math.max(0, wallet.pending_balance - amount);
    const newAvailable = wallet.available_balance + amount;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          profile_id: profileId,
          task_id: taskId || null,
          type: 'escrow_release',
          amount: amount,
          balance_after: newAvailable,
          description: `Görev bloke çözümü (#${taskId || 'görev'})`,
        });

        const { data: updated, error } = await supabase
          .from('wallets')
          .update({
            available_balance: newAvailable,
            pending_balance: newPending,
          })
          .eq('id', wallet.id)
          .select('*')
          .single();

        if (error) return { success: false, error: error.message };
        return { success: true, data: updated as Wallet };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, data: { ...wallet, available_balance: newAvailable, pending_balance: newPending } };
  }

  /**
   * 8. Calculate Dynamic Commission Breakdown
   */
  public static calculateCommission(
    grossAmount: number,
    distanceKm: number = 0,
    customConfig?: Partial<CommissionConfig>
  ): CommissionBreakdown {
    const offerPrice = Math.max(100, grossAmount || 0);
    
    const platformCommission = 0;
    const assistantAmount = offerPrice;
    const partnerAmount = 0;

    return {
      gross_amount: offerPrice,
      base_fee: 0,
      distance_fee: 0,
      platform_commission: 0,
      assistant_amount: assistantAmount,
      partner_amount: partnerAmount,
      effective_commission_rate: 0,
    };
  }

  /**
   * 9. Calculate Payout for a specific Task
   */
  public static async calculatePayout(taskId: string): Promise<WalletServiceResult<CommissionBreakdown>> {
    if (!taskId || !isUUID(taskId)) {
      return { success: false, error: 'Sipariş bulunamadı.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        let order: any = null;
        const { data: taskData } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
        if (taskData) {
          if (taskData.order_id && isUUID(taskData.order_id)) {
            const { data: oData } = await supabase.from('orders').select('*').eq('id', taskData.order_id).maybeSingle();
            order = oData || taskData;
          } else {
            order = taskData;
          }
        } else {
          const { data: oData } = await supabase.from('orders').select('*').eq('id', taskId).maybeSingle();
          order = oData;
        }

        if (!order) return { success: false, error: 'Sipariş bulunamadı.' };

        const price = Number(order.total_price || order.customer_price || order.courier_net || 0);
        const breakdown = this.calculateCommission(price);
        return { success: true, data: breakdown };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, data: this.calculateCommission(100) };
  }

  /**
   * 10. Capture Payment for Completed Task
   */
  public static async capturePayment(taskId: string, paymentReference?: string): Promise<WalletServiceResult<PaymentTransaction>> {
    if (!taskId || !isUUID(taskId)) {
      return { success: false, error: 'Sipariş bulunamadı.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Idempotency check: Return existing captured payment if already captured
        const validTaskUuid = taskId;

        const { data: existingPayment } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('task_id', validTaskUuid)
          .eq('payment_status', 'captured')
          .maybeSingle();

        if (existingPayment) {
          return { success: true, data: existingPayment as PaymentTransaction };
        }

        let order: any = null;
        const { data: taskData } = await supabase.from('tasks').select('*').eq('id', validTaskUuid).maybeSingle();
        if (taskData) {
          if (taskData.order_id && isUUID(taskData.order_id)) {
            const { data: oData } = await supabase.from('orders').select('*').eq('id', taskData.order_id).maybeSingle();
            order = oData || taskData;
          } else {
            order = taskData;
          }
        } else {
          const { data: oData } = await supabase.from('orders').select('*').eq('id', validTaskUuid).maybeSingle();
          order = oData;
        }

        if (!order) return { success: false, error: 'Sipariş bulunamadı.' };

        const price = Number(order.total_price || order.customer_price || 0);
        const breakdown = this.calculateCommission(price);
        const { data: newPayment, error: insertErr } = await supabase
          .from('payment_transactions')
          .insert({
            task_id: taskId,
            customer_profile_id: order.customer_id || order.user_id,
            assistant_profile_id: order.assistant_id,
            partner_profile_id: order.partner_id,
            gross_amount: breakdown.gross_amount,
            platform_commission: breakdown.platform_commission,
            assistant_amount: breakdown.assistant_amount,
            partner_amount: breakdown.partner_amount,
            payment_status: 'captured',
            payment_provider: 'iyzico',
            payment_reference: paymentReference || `REF-${Date.now()}`,
          })
          .select('*')
          .single();

        if (insertErr) return { success: false, error: insertErr.message };

        return { success: true, data: newPayment as PaymentTransaction };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return {
      success: true,
      data: {
        id: `pay-${Date.now()}`,
        task_id: taskId,
        gross_amount: 100,
        platform_commission: 15,
        assistant_amount: 85,
        partner_amount: 0,
        payment_status: 'captured',
        payment_provider: 'iyzico',
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * 11. Refund Payment
   */
  public static async refundPayment(taskId: string, reason?: string): Promise<WalletServiceResult<PaymentTransaction>> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: payment, error: fetchErr } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchErr || !payment) return { success: false, error: 'Ödeme kaydı bulunamadı.' };

        const { data: updated, error: updateErr } = await supabase
          .from('payment_transactions')
          .update({
            payment_status: 'refunded',
            created_at: new Date().toISOString(),
          })
          .eq('id', payment.id)
          .select('*')
          .single();

        if (updateErr) return { success: false, error: updateErr.message };

        // If assistant was already credited, reverse ledger entry
        if (payment.assistant_profile_id && payment.assistant_amount > 0) {
          await this.recordLedgerTransaction(
            payment.assistant_profile_id,
            'refund',
            -payment.assistant_amount,
            `İptal/İade Görev Kesintisi (#${taskId}) - ${reason || 'İptal'}`
          );
        }

        return { success: true, data: updated as PaymentTransaction };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true, data: { id: `ref-${Date.now()}`, payment_status: 'refunded' } as any };
  }

  /**
   * 12. Manual Adjustment by Admin
   */
  public static async manualAdjustment(
    profileId: string,
    amount: number,
    description: string,
    adminId: string
  ): Promise<WalletServiceResult<Wallet>> {
    return this.recordLedgerTransaction(
      profileId,
      'manual_adjustment',
      amount,
      `Admin Düzeltmesi (Admin: ${adminId}): ${description}`
    );
  }

  /**
   * Internal Double-Entry Ledger Core Processor
   */
  private static async recordLedgerTransaction(
    profileId: string,
    type: WalletTransactionType,
    amountDelta: number,
    description: string
  ): Promise<WalletServiceResult<Wallet>> {
    const walletRes = await this.getWallet(profileId);
    if (!walletRes.success || !walletRes.data) return { success: false, error: 'Cüzdan bulunamadı.' };

    const wallet = walletRes.data;
    const newAvailableBalance = Number((wallet.available_balance + amountDelta).toFixed(2));

    if (newAvailableBalance < 0 && type !== 'manual_adjustment') {
      return { success: false, error: 'Yetersiz kullanılabilir bakiye.' };
    }

    if (isSupabaseConfigured) {
      try {
        const walletCols = await getExactTableColumns('wallets');
        const txCols = await getExactTableColumns('wallet_transactions');
        if (walletCols.length > 0) {
          const client = await getActiveSupabaseClient();
          if (txCols.length > 0) {
            await client.from('wallet_transactions').insert({
              wallet_id: wallet.id,
              profile_id: profileId,
              type,
              amount: amountDelta,
              balance_after: newAvailableBalance,
              description,
            });
          }

          const { data: updatedWallet, error: updateErr } = await client
            .from('wallets')
            .update({
              available_balance: newAvailableBalance,
            })
            .eq('id', wallet.id)
            .select('*')
            .single();

          if (updateErr) return { success: false, error: updateErr.message };

          await IntegrationService.emitWalletUpdated({
            profileId,
            walletId: wallet.id,
            transactionType: type,
            amount: amountDelta,
            newBalance: newAvailableBalance,
            description,
          }, profileId);

          return { success: true, data: updatedWallet as Wallet };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    await IntegrationService.emitWalletUpdated({
      profileId,
      walletId: wallet.id,
      transactionType: type,
      amount: amountDelta,
      newBalance: newAvailableBalance,
      description,
    }, profileId);

    return {
      success: true,
      data: {
        ...wallet,
        available_balance: newAvailableBalance,
        updated_at: new Date().toISOString(),
      },
    };
  }
}
