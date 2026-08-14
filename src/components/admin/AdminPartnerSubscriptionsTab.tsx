import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Search, Clock, CheckCircle2, XCircle, AlertTriangle, 
  DollarSign, RefreshCw, Plus, Edit, Building, Phone, Mail, MapPin, 
  ChevronRight, AlertCircle, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import { 
  Partner, PartnerSubscription, isSupabaseConfigured, supabaseAdmin, supabase, 
  supabasePartner, supabaseCustomer, LOCAL_STORAGE_KEYS, db, getActiveSupabaseClient 
} from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { adminTheme } from './adminTheme';

interface AdminPartnerSubscriptionsTabProps {
  partners: Partner[];
  onRefresh?: () => void;
}

export const AdminPartnerSubscriptionsTab: React.FC<AdminPartnerSubscriptionsTabProps> = ({
  partners,
  onRefresh
}) => {
  const [subscriptions, setSubscriptions] = useState<PartnerSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [editingSub, setEditingSub] = useState<{
    sub: PartnerSubscription | null;
    partner: Partner | null;
    start_date: string;
    expires_at: string;
    period_days: number;
    price: number;
    payment_status: string;
    status: string;
  } | null>(null);

  const [creatingForPartner, setCreatingForPartner] = useState<Partner | null>(null);
  const [newSubForm, setNewSubForm] = useState({
    partner_id: '',
    period_days: 30,
    start_date: new Date().toISOString().split('T')[0],
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    price: 0,
    payment_status: 'paid',
    status: 'active'
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  const getAuthenticatedClient = async () => {
    const clients = [
      { name: 'supabaseAdmin', client: supabaseAdmin },
      { name: 'supabase', client: supabase },
      { name: 'supabasePartner', client: supabasePartner },
      { name: 'supabaseCustomer', client: supabaseCustomer },
    ].filter(item => Boolean(item.client));

    for (const item of clients) {
      try {
        const { data } = await item.client!.auth.getSession();
        if (data?.session) {
          return { client: item.client!, clientName: item.name, session: data.session };
        }
      } catch (_) {}
    }

    const localAdminSession = typeof window !== 'undefined' 
      ? (localStorage.getItem('ugra_auth_admin') || localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION))
      : null;

    if (localAdminSession) {
      try {
        const parsed = JSON.parse(localAdminSession);
        const u = parsed?.user || parsed?.currentSession?.user;
        if (u) {
          return {
            client: supabaseAdmin || supabase,
            clientName: 'localAdmin',
            session: { user: u, access_token: parsed?.access_token || 'mock-token' } as any
          };
        }
      } catch (e) {}
    }

    const defaultClient = supabaseAdmin || supabase;
    return { client: defaultClient, clientName: supabaseAdmin ? 'supabaseAdmin' : 'supabase', session: null };
  };

  const client = supabaseAdmin || supabase;

  // Fetch Subscriptions
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { client: activeClient } = await getAuthenticatedClient();
        const { data, error } = await activeClient
          .from('partner_subscriptions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Notice fetching partner_subscriptions, checking fallback:', error);
          const localSubs = await db.getAllPartnerSubscriptions();
          setSubscriptions(localSubs || []);
        } else {
          setSubscriptions(data || []);
        }
      } else {
        const localSubs = await db.getAllPartnerSubscriptions();
        setSubscriptions(localSubs || []);
      }
    } catch (err) {
      console.warn('Fetch error for partner subscriptions:', err);
      const localSubs = await db.getAllPartnerSubscriptions();
      setSubscriptions(localSubs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Date utilities
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

  // Find subscription corresponding to a partner
  const getSubForPartner = (partner: Partner): PartnerSubscription | undefined => {
    return subscriptions.find(s => s.partner_id === partner.id);
  };

  // Metrics Calculation
  const activeSubsCount = subscriptions.filter(s => {
    const rem = getDaysRemaining(s.expires_at);
    return s.status === 'active' && rem > 0;
  }).length;

  const renewalRequestedCount = subscriptions.filter(s => 
    s.renewal_requested && s.renewal_decision === 'pending'
  ).length;

  const nearExpiryCount = subscriptions.filter(s => {
    const rem = getDaysRemaining(s.expires_at);
    return s.status === 'active' && rem > 0 && rem <= 7;
  }).length;

  const expiredCount = subscriptions.filter(s => {
    const rem = getDaysRemaining(s.expires_at);
    return rem <= 0 || s.status === 'expired';
  }).length;

  // Filtered Partners List
  const filteredList = (partners || []).filter(partner => {
    if (!partner) return false;
    const sub = getSubForPartner(partner);
    const nameStr = String(partner.business_name ?? '');
    const phoneStr = String(partner.phone ?? '');
    const emailStr = String(partner.email ?? '');
    const catStr = String(partner.category ?? '');
    const termStr = String(searchTerm ?? '').toLowerCase();

    const searchMatch = 
      nameStr.toLowerCase().includes(termStr) ||
      phoneStr.includes(searchTerm) ||
      emailStr.toLowerCase().includes(termStr) ||
      catStr.toLowerCase().includes(termStr);

    if (!searchMatch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'no_sub') return !sub;
    if (!sub) return false;

    const remaining = getDaysRemaining(sub.expires_at);
    const isExpired = remaining <= 0 || sub.status === 'expired' || sub.status === 'inactive';

    if (statusFilter === 'renewal_requested') {
      return sub.renewal_requested && sub.renewal_decision === 'pending';
    }
    if (statusFilter === 'pending') {
      return sub.status === 'pending' || (sub.renewal_requested && sub.renewal_decision === 'pending');
    }
    if (statusFilter === 'near_expiry') {
      return !isExpired && remaining <= 7 && sub.status === 'active';
    }
    if (statusFilter === 'expired') {
      return isExpired;
    }
    if (statusFilter === 'active') {
      return !isExpired && sub.status === 'active';
    }
    if (statusFilter === 'payment_pending') {
      return sub.payment_status === 'pending';
    }

    return true;
  });

  // Handle Renewal / Approval Decision
  const handleApprovalDecision = async (
    sub: PartnerSubscription, 
    decision: 'approved' | 'rejected',
    periodDaysOverride?: number
  ) => {
    setSubmittingId(sub.id);
    const nowIso = new Date().toISOString();
    const period = periodDaysOverride || sub.period_days || 30;

    let updateData: Record<string, any> = {
      renewal_requested: false,
      renewal_decision: decision,
      updated_at: nowIso
    };

    if (decision === 'approved') {
      const todayStr = new Date().toISOString().split('T')[0];
      const expiryDate = new Date(Date.now() + period * 24 * 60 * 60 * 1000);
      const expiryStr = expiryDate.toISOString().split('T')[0];
      
      updateData = {
        ...updateData,
        status: 'active',
        payment_status: 'paid',
        period_days: period,
        start_date: todayStr,
        expires_at: expiryStr
      };
    } else {
      // If rejecting a renewal request, do not cancel an ongoing active subscription
      const rem = getDaysRemaining(sub.expires_at);
      const isStillValid = sub.status === 'active' && rem > 0;
      updateData = {
        ...updateData,
        status: isStillValid ? 'active' : 'rejected'
      };
    }

    // Optimistic local state update
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, ...updateData } : s));

    try {
      if (isSupabaseConfigured && client) {
        const { error } = await client
          .from('partner_subscriptions')
          .update(updateData)
          .eq('id', sub.id);

        if (error) console.warn('Supabase partner_subscriptions update notice:', error);
      }

      // Sync local storage fallback
      const currentSubs = await db.getAllPartnerSubscriptions();
      const updatedSubs = currentSubs.map(s => s.id === sub.id ? { ...s, ...updateData } : s);
      await db.savePartnerSubscriptions(updatedSubs);

      // Audit Log
      const partner = partners.find(p => p.id === sub.partner_id);
      await db.logAction({
        action: decision === 'approved' ? 'PARTNER_SUBSCRIPTION_APPROVED' : 'PARTNER_SUBSCRIPTION_REJECTED',
        entity_type: 'partner_subscriptions',
        entity_id: sub.id,
        partner_id: sub.partner_id,
        partner_name: partner?.business_name,
        details: {
          period_days: period,
          decision,
          expires_at: updateData.expires_at
        }
      });

      // Notification
      await db.sendNotification({
        title: decision === 'approved' ? 'Lisans Talebiniz Onaylandı' : 'Lisans Yenileme Talebiniz Reddedildi',
        body: decision === 'approved'
          ? `${partner?.business_name || 'İşletmeniz'} için ${period} günlük lisans talebiniz yönetici tarafından onaylandı. Mağazanız ${updateData.expires_at || ''} tarihine kadar aktiftir.`
          : `${partner?.business_name || 'İşletmeniz'} için lisans yenileme talebiniz yönetici tarafından onaylanmadı. Detaylı bilgi için destek ile iletişime geçebilirsiniz.`,
        target_type: 'partners',
        target_value: sub.partner_id,
        sent_by: 'admin'
      });

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Approval decision update error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Start New Period / Renew
  const handleStartNewPeriod = async (sub: PartnerSubscription, days: number = 30) => {
    setSubmittingId(sub.id);
    const selectedDays = days || sub.period_days || 30;

    let newStart = new Date();
    if (sub.expires_at) {
      const prevExpiry = new Date(sub.expires_at);
      if (!isNaN(prevExpiry.getTime())) {
        const nextDay = new Date(prevExpiry);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const now = new Date();
        // If expired more than 30 days ago, start from today
        if (now.getTime() - nextDay.getTime() > 30 * 24 * 60 * 60 * 1000) {
          newStart = now;
        } else {
          newStart = nextDay;
        }
      }
    }

    const newExpiry = new Date(newStart);
    newExpiry.setDate(newExpiry.getDate() + selectedDays);

    const startStr = newStart.toISOString().split('T')[0];
    const expiryStr = newExpiry.toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const updateData: Partial<PartnerSubscription> = {
      start_date: startStr,
      expires_at: expiryStr,
      period_days: selectedDays,
      status: 'active',
      payment_status: 'paid',
      renewal_requested: false,
      renewal_decision: 'approved',
      updated_at: nowIso
    };

    setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, ...updateData } : s));

    try {
      if (isSupabaseConfigured && client) {
        const { error } = await client
          .from('partner_subscriptions')
          .update(updateData)
          .eq('id', sub.id);

        if (error) console.warn('Supabase new period update notice:', error);
      }

      const currentSubs = await db.getAllPartnerSubscriptions();
      const updatedSubs = currentSubs.map(s => s.id === sub.id ? { ...s, ...updateData } : s);
      await db.savePartnerSubscriptions(updatedSubs);

      const partner = partners.find(p => p.id === sub.partner_id);
      await db.logAction({
        action: 'PARTNER_SUBSCRIPTION_RENEWED',
        entity_type: 'partner_subscriptions',
        entity_id: sub.id,
        partner_id: sub.partner_id,
        partner_name: partner?.business_name,
        details: {
          period_days: selectedDays,
          start_date: startStr,
          expires_at: expiryStr
        }
      });

      // Notification to Partner
      await db.sendNotification({
        title: 'Lisansınız Uzatıldı',
        body: `${partner?.business_name || 'İşletmeniz'} için ${selectedDays} günlük yeni çalışma lisansı tanımlandı. Yeni bitiş tarihi: ${expiryStr}.`,
        target_type: 'partners',
        target_value: sub.partner_id,
        sent_by: 'admin'
      });

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('New period error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle Edit Save
  const handleSaveEdit = async () => {
    if (!editingSub || !editingSub.sub) return;
    setSubmittingId(editingSub.sub.id);

    const payload: Partial<PartnerSubscription> = {
      start_date: editingSub.start_date,
      expires_at: editingSub.expires_at,
      period_days: Number(editingSub.period_days) || 30,
      price: Number(editingSub.price) || 0,
      payment_status: editingSub.payment_status,
      status: editingSub.status,
      updated_at: new Date().toISOString()
    };

    setSubscriptions(prev => prev.map(s => s.id === editingSub.sub!.id ? { ...s, ...payload } : s));

    try {
      if (isSupabaseConfigured && client) {
        const { error } = await client
          .from('partner_subscriptions')
          .update(payload)
          .eq('id', editingSub.sub.id);

        if (error) console.warn('Supabase edit save notice:', error);
      }

      const currentSubs = await db.getAllPartnerSubscriptions();
      const updatedSubs = currentSubs.map(s => s.id === editingSub.sub!.id ? { ...s, ...payload } : s);
      await db.savePartnerSubscriptions(updatedSubs);

      // Audit Log
      await db.logAction({
        action: 'PARTNER_SUBSCRIPTION_UPDATED',
        entity_type: 'partner_subscriptions',
        entity_id: editingSub.sub.id,
        partner_id: editingSub.sub.partner_id,
        partner_name: editingSub.partner?.business_name,
        details: payload
      });

      if (onRefresh) onRefresh();
      setEditingSub(null);
    } catch (err) {
      console.error('Error saving subscription edit:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle Manual Creation
  const handleCreateSubscription = async () => {
    if (!creatingForPartner) return;
    setSubmittingId('new');

    const period = Number(newSubForm.period_days) || 30;
    const today = newSubForm.start_date || new Date().toISOString().split('T')[0];
    const expiry = newSubForm.expires_at || new Date(Date.now() + period * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const payload = {
      partner_id: creatingForPartner.id,
      start_date: today,
      expires_at: expiry,
      period_days: period,
      price: Number(newSubForm.price) || 0,
      payment_status: newSubForm.payment_status || 'paid',
      status: newSubForm.status || 'active',
      renewal_requested: false,
      renewal_decision: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      let createdId = `psub_${Date.now()}`;
      if (isSupabaseConfigured && client) {
        const { data, error } = await client
          .from('partner_subscriptions')
          .insert([payload])
          .select()
          .maybeSingle();

        if (!error && data) {
          createdId = data.id;
          setSubscriptions(prev => [data, ...prev]);
        } else {
          console.warn('Supabase manual create notice, using local fallback:', error);
          const newSub: PartnerSubscription = { id: createdId, ...payload };
          setSubscriptions(prev => [newSub, ...prev]);
        }
      } else {
        const newSub: PartnerSubscription = { id: createdId, ...payload };
        setSubscriptions(prev => [newSub, ...prev]);
      }

      const currentSubs = await db.getAllPartnerSubscriptions();
      const newSub: PartnerSubscription = { id: createdId, ...payload };
      await db.savePartnerSubscriptions([newSub, ...currentSubs]);

      await db.logAction({
        action: 'PARTNER_SUBSCRIPTION_APPROVED',
        entity_type: 'partner_subscriptions',
        entity_id: createdId,
        partner_id: creatingForPartner.id,
        partner_name: creatingForPartner.business_name,
        details: {
          period_days: period,
          expires_at: expiry
        }
      });

      // Notification
      await db.sendNotification({
        title: 'Lisansınız Başlatıldı',
        body: `${creatingForPartner.business_name} için ${period} günlük çalışma lisansı tanımlandı. Bitiş: ${expiry}.`,
        target_type: 'partners',
        target_value: creatingForPartner.id,
        sent_by: 'admin'
      });

      if (onRefresh) onRefresh();
      setCreatingForPartner(null);
    } catch (err) {
      console.error('Error creating subscription:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#111111] flex items-center gap-2">
            <Building className="w-5 h-5 text-[#111111]" />
            <span>Partner Kiralama / Abonelik Yönetimi</span>
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Partner mağazaların 30, 90, 180 ve 365 günlük çalışma lisansları, süre bitişleri ve yenileme talepleri.
          </p>
        </div>

        <button
          onClick={() => {
            fetchSubscriptions();
            if (onRefresh) onRefresh();
          }}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#F2F2F3] text-[#111111] border border-[#E5E5E7] text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">Aktif Lisanslar</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#111111] mt-2">{activeSubsCount}</div>
          <div className="text-[10px] text-[#8A8A8A] mt-0.5">Sipariş almaya açık mağazalar</div>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">Yenileme Bekleyen</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{renewalRequestedCount}</div>
          <div className="text-[10px] text-[#8A8A8A] mt-0.5">Admin onayı bekleyen talep</div>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">Yakında Bitecek</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">{nearExpiryCount}</div>
          <div className="text-[10px] text-[#8A8A8A] mt-0.5">Son 7 gün içinde olanlar</div>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">Süresi Dolmuş</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">{expiredCount}</div>
          <div className="text-[10px] text-[#8A8A8A] mt-0.5">Yenilenmesi gereken mağaza</div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Partner adı, kategori, telefon veya e-posta ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F7F7F8] border border-[#E5E5E7] text-[#111111] placeholder-[#8A8A8A] rounded-xl text-xs font-medium focus:outline-none focus:border-[#111111] transition-all"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'Tüm Partnerler' },
              { id: 'renewal_requested', label: `Yenileme Bekleyen (${renewalRequestedCount})` },
              { id: 'active', label: 'Aktif Lisanslar' },
              { id: 'near_expiry', label: `Yakında Bitecek (${nearExpiryCount})` },
              { id: 'expired', label: 'Süresi Dolanlar' },
              { id: 'no_sub', label: 'Tanımsız' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  statusFilter === f.id
                    ? 'bg-[#111111] text-white border-[#111111]'
                    : 'bg-white text-[#666666] hover:text-[#111111] border-[#E5E5E7] hover:bg-[#F2F2F3]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PARTNER SUBSCRIPTIONS LIST / TABLE */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F7F8] border-b border-[#E5E5E7] text-[#666666] uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Partner Mağaza</th>
                <th className="py-3 px-3">Paket Süresi</th>
                <th className="py-3 px-3">Başlangıç</th>
                <th className="py-3 px-3">Bitiş Tarihi</th>
                <th className="py-3 px-3 text-center">Kalan Süre</th>
                <th className="py-3 px-3 text-center">Lisans Durumu</th>
                <th className="py-3 px-3 text-center">Yenileme Talebi</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8A8A8A]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#111111]" />
                    <span>Abonelik kayıtları yükleniyor...</span>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8A8A8A]">
                    <Building className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#111111]" />
                    <p className="font-semibold text-sm text-[#111111]">Filtreye uygun partner bulunamadı.</p>
                    <p className="text-xs mt-1">Arama kriterlerinizi değiştirmeyi deneyebilirsiniz.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((partner) => {
                  const sub = getSubForPartner(partner);
                  const remaining = sub ? getDaysRemaining(sub.expires_at) : 0;
                  const isExpired = !sub || remaining <= 0 || sub.status === 'expired' || sub.status === 'inactive';
                  const isNearExpiry = sub && !isExpired && remaining <= 7 && sub.status === 'active';
                  const isPendingRenewal = sub && sub.renewal_requested && sub.renewal_decision === 'pending';

                  return (
                    <tr key={partner.id} className="hover:bg-[#F2F2F3] transition-colors">
                      {/* Partner Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-sm">
                            {partner.logo ? (
                              <img referrerPolicy="no-referrer" src={partner.logo} alt={partner.business_name} className="w-full h-full object-cover" />
                            ) : (
                              partner.business_name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-[#111111] truncate flex items-center gap-1.5">
                              <span>{partner.business_name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F7F7F8] border border-[#E5E5E7] text-[#666666] font-medium">
                                {partner.category || 'Diğer'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#666666] flex items-center gap-2 mt-0.5">
                              {partner.phone && <span className="font-mono">{partner.phone}</span>}
                              {partner.email && <span className="truncate">{partner.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Package Duration */}
                      <td className="py-3 px-3">
                        {sub ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F7F7F8] border border-[#E5E5E7] text-[#111111] font-bold text-xs">
                            <Clock className="w-3 h-3 text-[#666666]" />
                            <span>{sub.period_days || 30} Gün</span>
                          </div>
                        ) : (
                          <span className="text-[#8A8A8A]">-</span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="py-3 px-3 font-mono text-xs text-[#333333]">
                        {sub?.start_date ? formatDateForDisplay(sub.start_date) : '-'}
                      </td>

                      {/* End Date */}
                      <td className="py-3 px-3 font-mono text-xs text-[#333333]">
                        {sub?.expires_at ? formatDateForDisplay(sub.expires_at) : '-'}
                      </td>

                      {/* Remaining Days */}
                      <td className="py-3 px-3 text-center">
                        {sub ? (
                          isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
                              Süresi Doldu
                            </span>
                          ) : isNearExpiry ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                              {remaining} Gün Kaldı
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {remaining} Gün Kaldı
                            </span>
                          )
                        ) : (
                          <span className="text-[#8A8A8A] text-[11px]">Kayıt Yok</span>
                        )}
                      </td>

                      {/* Subscription Status */}
                      <td className="py-3 px-3 text-center">
                        {sub ? (
                          sub.status === 'active' && !isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Aktif
                            </span>
                          ) : sub.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Clock className="w-3 h-3" />
                              Onay Bekliyor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F7F7F8] text-[#666666] border border-[#E5E5E7]">
                              Pasif
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                            Lisans Yok
                          </span>
                        )}
                      </td>

                      {/* Renewal Request Badge */}
                      <td className="py-3 px-3 text-center">
                        {isPendingRenewal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white font-extrabold text-[10px] shadow-sm animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            Yenileme Bekliyor ({sub.period_days || 30}g)
                          </span>
                        ) : sub?.renewal_decision === 'approved' ? (
                          <span className="text-[11px] text-emerald-600 font-semibold">Onaylandı</span>
                        ) : (
                          <span className="text-[#8A8A8A] text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPendingRenewal || (sub && sub.status === 'pending') ? (
                            <>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Abonelik Talebini Onayla',
                                    description: `${partner.business_name} için ${sub.period_days || 30} günlük kiralama/abonelik periyodunu onaylamak istiyor musunuz?`,
                                    action: async () => {
                                      await handleApprovalDecision(sub, 'approved');
                                    }
                                  });
                                }}
                                disabled={submittingId === sub.id}
                                className="px-2.5 py-1.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Onayla</span>
                              </button>

                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Abonelik Talebini Reddet',
                                    description: `${partner.business_name} tarafından gönderilen kiralama talebini reddetmek istiyor musunuz?`,
                                    isDanger: true,
                                    action: async () => {
                                      await handleApprovalDecision(sub, 'rejected');
                                    }
                                  });
                                }}
                                disabled={submittingId === sub.id}
                                className="px-2 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                                title="Reddet"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : sub ? (
                            <>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Yeni Dönem Başlat / Süre Uzat',
                                    description: `${partner.business_name} için lisans süresini ${sub.period_days || 30} gün uzatmak istiyor musunuz?`,
                                    action: async () => {
                                      await handleStartNewPeriod(sub, sub.period_days || 30);
                                    }
                                  });
                                }}
                                disabled={submittingId === sub.id}
                                className="px-2.5 py-1.5 bg-white hover:bg-[#F2F2F3] text-[#111111] border border-[#E5E5E7] text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3 text-[#666666]" />
                                <span>Süre Uzat</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingSub({
                                    sub,
                                    partner,
                                    start_date: sub.start_date ? sub.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
                                    expires_at: sub.expires_at ? sub.expires_at.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    period_days: sub.period_days || 30,
                                    price: sub.price || 0,
                                    payment_status: sub.payment_status || 'paid',
                                    status: sub.status || 'active'
                                  });
                                }}
                                className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F2F2F3] rounded-lg transition-colors cursor-pointer"
                                title="Düzenle"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setCreatingForPartner(partner);
                                setNewSubForm({
                                  partner_id: partner.id,
                                  period_days: 30,
                                  start_date: new Date().toISOString().split('T')[0],
                                  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                  price: 0,
                                  payment_status: 'paid',
                                  status: 'active'
                                });
                              }}
                              className="px-2.5 py-1.5 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5 text-white" />
                              <span>Lisans Tanımla</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingSub && (
        <div className={adminTheme.modalOverlay}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl border border-[#E5E5E7] text-[#111111]">
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#111111]">Partner Lisansını Düzenle</h3>
                <p className="text-xs text-[#666666] mt-0.5">{editingSub.partner?.business_name}</p>
              </div>
              <button
                onClick={() => setEditingSub(null)}
                className="w-8 h-8 rounded-lg hover:bg-[#F2F2F3] flex items-center justify-center text-[#666666]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                  Paket Süresi (Gün)
                </label>
                <select
                  value={editingSub.period_days}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    const start = new Date(editingSub.start_date);
                    const newExpiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
                    setEditingSub({
                      ...editingSub,
                      period_days: days,
                      expires_at: newExpiry.toISOString().split('T')[0]
                    });
                  }}
                  className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                >
                  <option value={30}>30 Gün (Standart)</option>
                  <option value={90}>90 Gün (3 Aylık)</option>
                  <option value={180}>180 Gün (6 Aylık)</option>
                  <option value={365}>365 Gün (1 Yıllık)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={editingSub.start_date}
                    onChange={(e) => setEditingSub({ ...editingSub, start_date: e.target.value })}
                    className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={editingSub.expires_at}
                    onChange={(e) => setEditingSub({ ...editingSub, expires_at: e.target.value })}
                    className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                    Durum
                  </label>
                  <select
                    value={editingSub.status}
                    onChange={(e) => setEditingSub({ ...editingSub, status: e.target.value })}
                    className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                  >
                    <option value="active">Aktif</option>
                    <option value="pending">Onay Bekliyor</option>
                    <option value="expired">Süresi Doldu</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                    Ödeme Durumu
                  </label>
                  <select
                    value={editingSub.payment_status}
                    onChange={(e) => setEditingSub({ ...editingSub, payment_status: e.target.value })}
                    className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                  >
                    <option value="paid">Ödendi</option>
                    <option value="pending">Beklemede</option>
                    <option value="unpaid">Ödenmedi</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E7]">
              <button
                onClick={() => setEditingSub(null)}
                className="px-4 py-2 bg-white hover:bg-[#F2F2F3] text-[#111111] border border-[#E5E5E7] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={submittingId !== null}
                className="px-4 py-2 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {submittingId ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW MODAL */}
      {creatingForPartner && (
        <div className={adminTheme.modalOverlay}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl border border-[#E5E5E7] text-[#111111]">
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#111111]">Yeni Lisans Tanımla</h3>
                <p className="text-xs text-[#666666] mt-0.5">{creatingForPartner.business_name}</p>
              </div>
              <button
                onClick={() => setCreatingForPartner(null)}
                className="w-8 h-8 rounded-lg hover:bg-[#F2F2F3] flex items-center justify-center text-[#666666]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                  Paket Süresi
                </label>
                <select
                  value={newSubForm.period_days}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    const start = new Date(newSubForm.start_date);
                    const newExpiry = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
                    setNewSubForm({
                      ...newSubForm,
                      period_days: days,
                      expires_at: newExpiry.toISOString().split('T')[0]
                    });
                  }}
                  className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                >
                  <option value={30}>30 Gün (Standart)</option>
                  <option value={90}>90 Gün (3 Aylık)</option>
                  <option value={180}>180 Gün (6 Aylık)</option>
                  <option value={365}>365 Gün (1 Yıllık)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={newSubForm.start_date}
                    onChange={(e) => {
                      const start = e.target.value;
                      const d = new Date(start);
                      const exp = new Date(d.getTime() + (newSubForm.period_days || 30) * 24 * 60 * 60 * 1000);
                      setNewSubForm({
                        ...newSubForm,
                        start_date: start,
                        expires_at: exp.toISOString().split('T')[0]
                      });
                    }}
                    className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={newSubForm.expires_at}
                    onChange={(e) => setNewSubForm({ ...newSubForm, expires_at: e.target.value })}
                    className="w-full h-10 bg-white border border-[#E5E5E7] text-[#111111] rounded-xl text-xs px-3 focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E7]">
              <button
                onClick={() => setCreatingForPartner(null)}
                className="px-4 py-2 bg-white hover:bg-[#F2F2F3] text-[#111111] border border-[#E5E5E7] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={handleCreateSubscription}
                disabled={submittingId !== null}
                className="px-4 py-2 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {submittingId ? 'Tanımlanıyor...' : 'Lisansı Başlat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmModal.action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};
