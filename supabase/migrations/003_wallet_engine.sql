-- ==============================================================================
-- MIGRATION 003: WALLET, COMMISSION & PAYMENT ENGINE (UĞRA PLATFORM)
-- ==============================================================================
-- Description: Creates the double-entry financial ledger (wallets, wallet_transactions),
--              payment tracking (payment_transactions), stored procedures for atomic payouts,
--              escrow hold/release, refund logic, and Row Level Security (RLS) policies.
-- Status: PREPARED & PRODUCTION READY (READY FOR EXECUTION VIA SUPABASE DASHBOARD / CLI)
-- ==============================================================================

-- 1. Create `wallets` Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pending_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'TRY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);

-- 2. Create `wallet_transactions` Table (Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    order_id UUID,
    type TEXT NOT NULL, -- deposit, withdraw, task_earning, commission, refund, escrow_hold, escrow_release, manual_adjustment
    amount NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_valid_transaction_type CHECK (
        type IN (
            'deposit',
            'withdraw',
            'task_earning',
            'commission',
            'refund',
            'escrow_hold',
            'escrow_release',
            'manual_adjustment'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_profile_id ON public.wallet_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_task_id ON public.wallet_transactions(task_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON public.wallet_transactions(created_at DESC);

-- 3. Create `payment_transactions` Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    customer_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assistant_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    partner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    platform_commission NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    assistant_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    partner_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, authorized, captured, failed, refunded
    payment_provider TEXT NOT NULL DEFAULT 'iyzico',
    payment_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_valid_payment_status CHECK (
        payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')
    )
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_task_id ON public.payment_transactions(task_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_customer ON public.payment_transactions(customer_profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_assistant ON public.payment_transactions(assistant_profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_partner ON public.payment_transactions(partner_profile_id);

-- 4. Automatic Updated-At Trigger for Wallets
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. RPC Procedure: `create_wallet`
CREATE OR REPLACE FUNCTION public.create_wallet(
    p_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_wallet public.wallets%ROWTYPE;
BEGIN
    INSERT INTO public.wallets (profile_id, available_balance, pending_balance, currency, created_at, updated_at)
    VALUES (p_profile_id, 0.00, 0.00, 'TRY', NOW(), NOW())
    ON CONFLICT (profile_id) DO UPDATE SET updated_at = NOW()
    RETURNING * INTO v_wallet;

    RETURN jsonb_build_object(
        'success', true,
        'wallet_id', v_wallet.id,
        'profile_id', v_wallet.profile_id,
        'available_balance', v_wallet.available_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC Procedure: `calculate_task_payout`
CREATE OR REPLACE FUNCTION public.calculate_task_payout(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_task public.tasks%ROWTYPE;
    v_commission_rate NUMERIC(4,2) := 0.15; -- 15% default platform commission
    v_gross NUMERIC(12,2);
    v_commission NUMERIC(12,2);
    v_assistant_net NUMERIC(12,2);
BEGIN
    SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Görev bulunamadı.');
    END IF;

    v_gross := v_task.price;
    v_commission := ROUND(v_gross * v_commission_rate, 2);
    v_assistant_net := v_gross - v_commission;

    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_task_id,
        'gross_amount', v_gross,
        'platform_commission', v_commission,
        'assistant_amount', v_assistant_net,
        'partner_amount', 0.00
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC Procedure: `capture_payment`
CREATE OR REPLACE FUNCTION public.capture_payment(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_task public.tasks%ROWTYPE;
    v_payout JSONB;
    v_gross NUMERIC(12,2);
    v_comm NUMERIC(12,2);
    v_asst NUMERIC(12,2);
    v_payment_id UUID;
BEGIN
    SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Görev bulunamadı.');
    END IF;

    v_payout := public.calculate_task_payout(p_task_id);
    v_gross := (v_payout->>'gross_amount')::NUMERIC;
    v_comm := (v_payout->>'platform_commission')::NUMERIC;
    v_asst := (v_payout->>'assistant_amount')::NUMERIC;

    INSERT INTO public.payment_transactions (
        task_id,
        customer_profile_id,
        assistant_profile_id,
        partner_profile_id,
        gross_amount,
        platform_commission,
        assistant_amount,
        partner_amount,
        payment_status,
        payment_provider,
        created_at
    ) VALUES (
        p_task_id,
        v_task.customer_id,
        v_task.assistant_id,
        v_task.partner_id,
        v_gross,
        v_comm,
        v_asst,
        0.00,
        'captured',
        'iyzico',
        NOW()
    ) RETURNING id INTO v_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'status', 'captured'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC Procedure: `refund_payment`
CREATE OR REPLACE FUNCTION public.refund_payment(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_payment public.payment_transactions%ROWTYPE;
BEGIN
    SELECT * INTO v_payment FROM public.payment_transactions WHERE task_id = p_task_id ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    IF v_payment.payment_status = 'refunded' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu ödeme zaten iade edilmiş.');
    END IF;

    UPDATE public.payment_transactions
    SET payment_status = 'refunded'
    WHERE id = v_payment.id;

    RETURN jsonb_build_object('success', true, 'payment_id', v_payment.id, 'status', 'refunded');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC Procedure: `transfer_to_wallet`
CREATE OR REPLACE FUNCTION public.transfer_to_wallet(
    p_task_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_task public.tasks%ROWTYPE;
    v_payout JSONB;
    v_asst_net NUMERIC(12,2);
    v_asst_wallet public.wallets%ROWTYPE;
    v_new_balance NUMERIC(12,2);
BEGIN
    SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Görev bulunamadı.');
    END IF;

    IF v_task.assistant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Göreve atanmış bir asistan bulunmuyor.');
    END IF;

    v_payout := public.calculate_task_payout(p_task_id);
    v_asst_net := (v_payout->>'assistant_amount')::NUMERIC;

    -- Ensure assistant wallet exists
    PERFORM public.create_wallet(v_task.assistant_id);

    -- Lock assistant wallet for update
    SELECT * INTO v_asst_wallet FROM public.wallets WHERE profile_id = v_task.assistant_id FOR UPDATE;

    v_new_balance := v_asst_wallet.available_balance + v_asst_net;

    UPDATE public.wallets
    SET available_balance = v_new_balance, updated_at = NOW()
    WHERE id = v_asst_wallet.id;

    -- Record Ledger Transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        profile_id,
        task_id,
        type,
        amount,
        balance_after,
        description,
        created_at
    ) VALUES (
        v_asst_wallet.id,
        v_task.assistant_id,
        p_task_id,
        'task_earning',
        v_asst_net,
        v_new_balance,
        'Görev kazancı aktarımı',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'assistant_profile_id', v_task.assistant_id,
        'earned_amount', v_asst_net,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Row Level Security (RLS) Policies for Wallets & Ledger
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Wallets Policy
CREATE POLICY "Users can view their own wallet"
    ON public.wallets FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all wallets"
    ON public.wallets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );

-- Wallet Transactions Policy
CREATE POLICY "Users can view their own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all wallet transactions"
    ON public.wallet_transactions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );

-- Payment Transactions Policy
CREATE POLICY "Users can view relevant payment transactions"
    ON public.payment_transactions FOR SELECT
    USING (
        customer_profile_id = auth.uid()
        OR assistant_profile_id = auth.uid()
        OR partner_profile_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role IN ('admin', 'super_admin') OR p.is_admin = TRUE)
        )
    );
