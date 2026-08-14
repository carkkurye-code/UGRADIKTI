import React, { useState, useEffect, useCallback } from 'react';
import { 
  Partner, PartnerSubscription, isSupabaseConfigured, supabaseAdmin, supabase, 
  supabasePartner, db, getActiveSupabaseClient 
} from '@/lib/supabase';
import { 
  Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, 
  ShieldCheck, RefreshCw, AlertCircle, ArrowRight, Sparkles, Building
} from 'lucide-react';

interface PartnerSubscriptionTabProps {
  partner: Partner;
  onRefreshPartner?: () => void;
}

export const PartnerSubscriptionTab: React.FC<PartnerSubscriptionTabProps> = ({
  partner,
  onRefreshPartner
}) => {
  const [subscription, setSubscription] = useState<PartnerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!partner?.id) return;
    setLoading(true);
    try {
      const sub = await db.getPartnerSubscription(partner.id);
      setSubscription(sub);
      if (sub?.period_days) {
        setSelectedPeriod(sub.period_days);
      }
    } catch (err) {
      console.warn('Error fetching partner subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [partner?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const getDaysRemaining = (expiresAtStr?: string) => {
    if (!expiresAtStr) return 0;
    try {
      const expiry = new Date(expiresAtStr);
      const now = new Date();
      const expiryUtc = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth(), expiry.getUTCDate());
      const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const diffMs = expiryUtc - nowUtc;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 0;
    }
  };

  const formatDateForDisplay = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return '-';
    }
  };

  const remainingDays = getDaysRemaining(subscription?.expires_at);
  const isExpired = !subscription || remainingDays <= 0 || subscription.status === 'expired' || subscription.status === 'inactive';
  const isNearExpiry = subscription && !isExpired && remainingDays <= 7 && subscription.status === 'active';
  const isPendingApproval = subscription && (
    subscription.status === 'pending' || 
    (subscription.renewal_requested && subscription.renewal_decision === 'pending')
  );

  const handleRequestRenewal = async () => {
    if (!partner?.id) return;
    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      const updatedSub = await db.requestPartnerSubscription(partner.id, selectedPeriod);
      setSubscription(updatedSub);

      // Audit Log
      await db.logAction({
        action: 'PARTNER_SUBSCRIPTION_REQUESTED',
        entity_type: 'partner_subscriptions',
        entity_id: updatedSub?.id || partner.id,
        partner_id: partner.id,
        partner_name: partner.business_name,
        details: {
          period_days: selectedPeriod
        }
      });

      // Notification to Admin
      await db.sendNotification({
        title: 'Yeni Partner Lisans Talebi',
        body: `${partner.business_name} işletmesi ${selectedPeriod} günlük lisans talebinde bulundu.`,
        target_type: 'all',
        target_value: 'admin',
        sent_by: partner.id
      });

      setFeedbackMsg({
        type: 'success',
        text: 'Abonelik / yenileme talebiniz yönetime başarıyla iletildi. Onaylandığında lisans süreniz güncellenecektir.'
      });
      if (onRefreshPartner) onRefreshPartner();
    } catch (err: any) {
      console.error('Error submitting renewal request:', err);
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Talep gönderilirken bir hata oluştu. Lütfen tekrar deneyin.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const periodOptions = [
    { days: 30, title: '30 Gün', desc: '1 Aylık Standart Lisans' },
    { days: 90, title: '90 Gün', desc: '3 Aylık Çeyrek Dönem' },
    { days: 180, title: '180 Gün', desc: '6 Aylık Yarım Yıl' },
    { days: 365, title: '365 Gün', desc: '1 Yıllık Tam Sezon' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white" />
            <span>Partner Kiralama / Abonelik Durumu</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            İşletmenizin UĞRA platformundaki aktif çalışma lisansı ve süre takibi.
          </p>
        </div>

        <button
          onClick={fetchSubscription}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* WARNING BANNERS */}
      {isPendingApproval && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs text-amber-200">
            <span className="font-bold block text-sm text-amber-400 mb-0.5">Abonelik Talebiniz Yönetici Onayında</span>
            Seçtiğiniz {subscription?.period_days || selectedPeriod} günlük lisans periyodu için talebiniz inceleniyor. Onay verildiğinde mağazanız aktif kalmaya devam edecektir.
          </div>
        </div>
      )}

      {isNearExpiry && !isPendingApproval && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <span className="font-bold block text-sm text-amber-400 mb-0.5">Lisans Bitişine {remainingDays} Gün Kaldı!</span>
            Mevcut kiralama süreniz yakında sona erecektir. Sipariş alımının kesintiye uğramaması için aşağıdan yenileme talebinizi iletebilirsiniz.
          </div>
        </div>
      )}

      {isExpired && !isPendingApproval && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-200">
            <span className="font-bold block text-sm text-red-400 mb-0.5">Lisans Süreniz Sona Ermiştir</span>
            Mağazanızın kiralama süresi dolduğu için yeni sipariş alımı geçici olarak durdurulmuştur. Lütfen aşağıdaki seçeneklerden birini seçip yenileme talebinde bulunun.
          </div>
        </div>
      )}

      {/* FEEDBACK MSG */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* CURRENT STATUS HERO CARD */}
      <div className="glass-panel border border-white/5 rounded-2xl p-6 relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
              <Building className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white">{partner.business_name}</h3>
                {subscription?.status === 'active' && !isExpired ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    Aktif Lisans
                  </span>
                ) : isPendingApproval ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    Onay Bekliyor
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                    Süresi Doldu / Pasif
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kategori: <span className="text-white font-medium">{partner.category || 'Genel'}</span>
              </p>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kalan Lisans Süresi</div>
            <div className={`text-2xl font-black mt-0.5 ${
              isExpired ? 'text-red-400' : isNearExpiry ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {isExpired ? 'Süresi Doldu' : `${remainingDays} Gün`}
            </div>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Başlangıç Tarihi</span>
            <span className="font-mono text-sm font-bold text-white mt-1 block">
              {subscription?.start_date ? formatDateForDisplay(subscription.start_date) : '-'}
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Bitiş Tarihi</span>
            <span className="font-mono text-sm font-bold text-white mt-1 block">
              {subscription?.expires_at ? formatDateForDisplay(subscription.expires_at) : '-'}
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Paket Süresi</span>
            <span className="text-sm font-bold text-white mt-1 block">
              {subscription?.period_days ? `${subscription.period_days} Gün` : '-'}
            </span>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Ödeme Durumu</span>
            <span className="text-sm font-bold text-white mt-1 block">
              {subscription?.payment_status === 'paid' ? 'Ödendi' : subscription?.payment_status === 'pending' ? 'Beklemede' : 'Tanımsız'}
            </span>
          </div>
        </div>
      </div>

      {/* RENEWAL REQUEST SECTION */}
      <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>Lisans Yenileme / Dönem Seçimi</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Çalışmak istediğiniz lisans süresini seçerek yönetime onay talebi iletin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {periodOptions.map((opt) => {
            const isSelected = selectedPeriod === opt.days;
            return (
              <div
                key={opt.days}
                onClick={() => setSelectedPeriod(opt.days)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected 
                    ? 'bg-white text-black border-white shadow-md' 
                    : 'bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-base font-extrabold ${isSelected ? 'text-black' : 'text-white'}`}>
                    {opt.title}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-black" />}
                </div>
                <div className={`text-xs ${isSelected ? 'text-neutral-700' : 'text-muted-foreground'}`}>
                  {opt.desc}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5">
          <div className="text-xs text-muted-foreground">
            {isPendingApproval ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Mevcut talebiniz yönetici onayındadır.
              </span>
            ) : (
              <span>Talebiniz yönetici tarafından incelenip onaylandığında lisans süreniz uzatılacaktır.</span>
            )}
          </div>

          <button
            onClick={handleRequestRenewal}
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>İletiliyor...</span>
              </>
            ) : isPendingApproval ? (
              <>
                <RefreshCw className="w-4 h-4 text-black" />
                <span>Talebi Güncelle</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 text-black" />
                <span>{selectedPeriod} Günlük Lisans Talebi Gönder</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* HOW IT WORKS / RULES */}
      <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Partner Lisanslama Sistemi Hakkında</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="font-bold text-white block">1. Kesintisiz Sipariş</span>
            <p>Aktif lisansı bulunan mağazalar sistemde müşteriler tarafından görülebilir ve anında sipariş alabilir.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="font-bold text-white block">2. 7 Gün Kala Uyarı</span>
            <p>Lisans bitimine 7 gün kaldığında sistem panelinizde ve bildirimlerde yenileme hatırlatması yapar.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="font-bold text-white block">3. Hızlı Yönetici Onayı</span>
            <p>Yenileme talebiniz doğrudan UĞRA operasyon ekibine ulaşır ve onaylanınca süreniz kesintisiz uzar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
