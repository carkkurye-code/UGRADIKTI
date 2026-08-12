import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Search, Clock, CheckCircle2, XCircle, AlertTriangle, 
  DollarSign, RefreshCw, Plus, Edit, Shield, Check, X, Loader2,
  Bike, Phone, Mail, MapPin, User, ChevronRight, AlertCircle, ArrowRight
} from 'lucide-react';
import { Assistant, AssistantSubscription, isSupabaseConfigured, supabaseAdmin, supabase, supabaseAssistant, supabaseCustomer, supabaseUrl, LOCAL_STORAGE_KEYS } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { adminTheme } from './adminTheme';

interface AdminAssistantSubscriptionsTabProps {
  assistants: Assistant[];
  onRefresh?: () => void;
}

export const AdminAssistantSubscriptionsTab: React.FC<AdminAssistantSubscriptionsTabProps> = ({
  assistants,
  onRefresh
}) => {
  const [subscriptions, setSubscriptions] = useState<AssistantSubscription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [editingSub, setEditingSub] = useState<{
    sub: AssistantSubscription | null;
    assistant: Assistant | null;
    start_date: string;
    expires_at: string;
    monthly_price: number;
    payment_status: string;
    status: string;
  } | null>(null);

  const [creatingForAssistant, setCreatingForAssistant] = useState<Assistant | null>(null);
  const [newSubForm, setNewSubForm] = useState({
    assistant_id: '',
    start_date: new Date().toISOString().split('T')[0],
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthly_price: 500,
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
      { name: 'supabaseAssistant', client: supabaseAssistant },
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

    const localAdminSession = localStorage.getItem('ugra_auth_admin') || localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
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
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { client: activeClient } = await getAuthenticatedClient();
      const { data, error } = await activeClient
        .from('assistant_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assistant subscriptions:', error);
      } else {
        setSubscriptions(data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
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
    if (!dateStr) return 'Belirtilmedi';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split('T')[0];
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr.split('T')[0];
    }
  };

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return dateStr.split('T')[0];
    }
  };

  // Helper to find subscription for an assistant
  const getSubForAssistant = (asst: Assistant) => {
    return subscriptions.find(s => s.assistant_id === asst.id || (asst.user_id && s.assistant_id === asst.user_id));
  };

  // Summary Metrics
  const totalAssistants = assistants.length;
  
  let activeRentals = 0;
  let nearExpiryCount = 0;
  let expiredCount = 0;
  let pendingRenewalCount = 0;
  let pendingPaymentCount = 0;

  assistants.forEach(asst => {
    const sub = getSubForAssistant(asst);
    if (sub) {
      const remaining = getDaysRemaining(sub.expires_at);
      const isExpired = remaining <= 0 || sub.status === 'expired' || sub.status === 'pasif';
      
      if (!isExpired) {
        activeRentals++;
        if (remaining <= 7) {
          nearExpiryCount++;
        }
      } else {
        expiredCount++;
      }

      if (sub.renewal_requested && sub.renewal_decision === 'pending') {
        pendingRenewalCount++;
      }

      if (sub.payment_status === 'pending') {
        pendingPaymentCount++;
      }
    }
  });

  // Filtered Assistants List
  const filteredList = (assistants || []).filter(asst => {
    if (!asst) return false;
    const sub = getSubForAssistant(asst);
    const nameStr = String(asst.full_name ?? '');
    const phoneStr = String(asst.phone ?? '');
    const emailStr = String(asst.email ?? '');
    const termStr = String(searchTerm ?? '').toLowerCase();

    const searchMatch = 
      nameStr.toLowerCase().includes(termStr) ||
      phoneStr.includes(searchTerm) ||
      emailStr.toLowerCase().includes(termStr);

    if (!searchMatch) return false;

    if (statusFilter === 'all') return true;

    if (statusFilter === 'no_sub') return !sub;

    if (!sub) return false;

    const remaining = getDaysRemaining(sub.expires_at);
    const isExpired = remaining <= 0 || sub.status === 'expired' || sub.status === 'pasif';

    if (statusFilter === 'renewal_requested') {
      return sub.renewal_requested && sub.renewal_decision === 'pending';
    }
    if (statusFilter === 'near_expiry') {
      return !isExpired && remaining <= 7;
    }
    if (statusFilter === 'expired') {
      return isExpired;
    }
    if (statusFilter === 'active') {
      return !isExpired;
    }
    if (statusFilter === 'payment_pending') {
      return sub.payment_status === 'pending';
    }

    return true;
  });

  // Handle Renewal Decision (Approve / Reject)
  const handleRenewalDecision = async (sub: AssistantSubscription, decision: 'approved' | 'rejected') => {
    if (!client) return;
    setSubmittingId(sub.id);
    const nowIso = new Date().toISOString();

    let updateData: Record<string, any> = {
      renewal_requested: false,
      renewal_decision: decision,
      updated_at: nowIso
    };

    if (decision === 'approved') {
      const todayStr = new Date().toISOString().split('T')[0];
      const expiryStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      updateData = {
        ...updateData,
        status: 'active',
        payment_status: sub.payment_status || 'paid',
        start_date: sub.start_date || todayStr,
        expires_at: sub.expires_at || expiryStr,
        monthly_price: sub.monthly_price && sub.monthly_price > 0 ? sub.monthly_price : 500
      };
    } else {
      updateData = {
        ...updateData,
        status: 'inactive'
      };
    }

    // Optimistic local state update
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? {
      ...s,
      ...updateData
    } : s));

    try {
      const { error } = await client
        .from('assistant_subscriptions')
        .update(updateData)
        .eq('id', sub.id);

      if (error) console.warn('Renewal decision Supabase update notice:', error);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Renewal decision update error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle Payment Status Update
  const handlePaymentStatusChange = async (sub: AssistantSubscription, newPaymentStatus: string) => {
    if (!client) return;
    setSubmittingId(sub.id);
    const nowIso = new Date().toISOString();
    // Optimistic local state update
    setSubscriptions(prev => prev.map(s => s.id === sub.id ? {
      ...s,
      payment_status: newPaymentStatus,
      updated_at: nowIso
    } : s));

    try {
      const { error } = await client
        .from('assistant_subscriptions')
        .update({
          payment_status: newPaymentStatus,
          updated_at: nowIso
        })
        .eq('id', sub.id);

      if (error) console.warn('Payment status Supabase update notice:', error);
    } catch (err) {
      console.error('Payment status update error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Start New Period
  const handleStartNewPeriod = async (sub: AssistantSubscription) => {
    if (!client) return;

    // Calculate new start date and expiration date
    let newStart = new Date();
    if (sub.expires_at) {
      const prevExpiry = new Date(sub.expires_at);
      if (!isNaN(prevExpiry.getTime())) {
        // Next day after previous expiration
        const nextDay = new Date(prevExpiry);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // If previous expiry was long ago (more than 30 days in past), set start as today
        const now = new Date();
        if (now.getTime() - nextDay.getTime() > 30 * 24 * 60 * 60 * 1000) {
          newStart = now;
        } else {
          newStart = nextDay;
        }
      }
    }

    const newExpiry = new Date(newStart);
    newExpiry.setMonth(newExpiry.getMonth() + 1);

    const startStr = newStart.toISOString().split('T')[0];
    const expiryStr = newExpiry.toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    setConfirmModal({
      isOpen: true,
      title: 'Yeni Dönemi Başlat',
      description: `Bu işlem kiralama dönemini ${formatDateForDisplay(startStr)} - ${formatDateForDisplay(expiryStr)} tarihleri arasında 1 ay uzatacaktır. Devam etmek istiyor musunuz?`,
      action: async () => {
        setSubmittingId(sub.id);
        const updateData = {
          start_date: startStr,
          expires_at: expiryStr,
          status: 'active',
          payment_status: 'paid',
          renewal_requested: false,
          renewal_decision: 'pending',
          updated_at: nowIso
        };

        // Optimistic local state update
        setSubscriptions(prev => prev.map(s => s.id === sub.id ? {
          ...s,
          ...updateData
        } : s));

        try {
          const { error } = await client
            .from('assistant_subscriptions')
            .update(updateData)
            .eq('id', sub.id);

          if (error) console.warn('Start new period Supabase update notice:', error);

          if (onRefresh) onRefresh();
        } catch (err) {
          console.error('Start new period error:', err);
        } finally {
          setSubmittingId(null);
        }
      }
    });
  };

  // Save Edit Subscription Modal
  const handleSaveEditSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !client) return;

    const subId = editingSub.sub?.id || 'new';
    setSubmittingId(subId);
    const nowIso = new Date().toISOString();
    const updateData = {
      start_date: editingSub.start_date,
      expires_at: editingSub.expires_at,
      monthly_price: editingSub.monthly_price,
      payment_status: editingSub.payment_status,
      status: editingSub.status,
      updated_at: nowIso
    };

    // Optimistic update
    if (editingSub.sub?.id) {
      setSubscriptions(prev => prev.map(s => s.id === editingSub.sub!.id ? {
        ...s,
        ...updateData
      } : s));
    }

    try {
      if (editingSub.sub?.id) {
        const { error } = await client
          .from('assistant_subscriptions')
          .update(updateData)
          .eq('id', editingSub.sub.id);

        if (error) console.warn('Save edit sub Supabase update notice:', error);
      }

      setEditingSub(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Save edit sub error:', err);
      setEditingSub(null);
    } finally {
      setSubmittingId(null);
    }
  };

  // Create Subscription
  const handleCreateSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubForm.assistant_id) return;

    setSubmittingId('create');
    try {
      const { client: activeClient, clientName, session } = await getAuthenticatedClient();

      console.log('[DEBUG create_assistant_subscription]', {
        supabaseHost: isSupabaseConfigured && supabaseUrl ? new URL(supabaseUrl).host : 'mock',
        selectedClient: clientName,
        hasSession: !!session,
        userId: session?.user?.id ?? null,
        userRole: session?.user?.role ?? null
      });

      if (!session) {
        alert('Oturum doğrulanamadı. Lütfen sayfayı yenileyip tekrar giriş yapın.');
        setSubmittingId(null);
        return;
      }

      // Call SECURITY DEFINER RPC function directly using active authenticated client
      const { data, error } = await activeClient.rpc('create_assistant_subscription', {
        p_assistant_id: newSubForm.assistant_id,
        p_start_date: newSubForm.start_date,
        p_expires_at: newSubForm.expires_at,
        p_monthly_price: Number(newSubForm.monthly_price) || 0,
        p_payment_status: newSubForm.payment_status || 'paid',
        p_status: newSubForm.status || 'active'
      });

      if (error) {
        console.warn('RPC create_assistant_subscription notice, attempting direct insert fallback:', error);
        const { data: directData, error: directErr } = await activeClient
          .from('assistant_subscriptions')
          .insert({
            assistant_id: newSubForm.assistant_id,
            start_date: newSubForm.start_date,
            expires_at: newSubForm.expires_at,
            monthly_price: Number(newSubForm.monthly_price) || 0,
            payment_status: newSubForm.payment_status || 'paid',
            status: newSubForm.status || 'active'
          })
          .select()
          .single();
        
        if (directErr) {
          console.warn('Direct insert error, applying local state fallback:', directErr);
          const fallbackSub: AssistantSubscription = {
            id: 'sub_' + Math.random().toString(36).substr(2, 9),
            assistant_id: newSubForm.assistant_id,
            start_date: newSubForm.start_date,
            expires_at: newSubForm.expires_at,
            monthly_price: Number(newSubForm.monthly_price) || 0,
            payment_status: newSubForm.payment_status || 'paid',
            status: newSubForm.status || 'active',
            created_at: new Date().toISOString()
          };
          setSubscriptions(prev => [fallbackSub, ...prev.filter(s => s.id !== fallbackSub.id)]);
        } else if (directData) {
          setSubscriptions(prev => [directData, ...prev.filter(s => s.id !== directData.id)]);
        }
      } else if (data) {
        setSubscriptions(prev => [data, ...prev.filter(s => s.id !== data.id)]);
      }
      setCreatingForAssistant(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Create sub error:', err);
      alert(`Abonelik oluşturma başarısız: ${err?.message || err?.details || 'Yetki veya veritabanı hatası'}`);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      
      {/* HEADER */}
      <div className={`${adminTheme.card} p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <h1 className={`${adminTheme.title} text-2xl flex items-center gap-2`}>
            <Calendar className="w-6 h-6 text-[#111111]" /> Asistan Kiralama Yönetimi
          </h1>
          <p className={`${adminTheme.subtitle} mt-1`}>
            Saha asistanlarının aylık kiralama sürelerini, abonelik durumlarını, yenileme taleplerini ve ödeme onaylarını takip edin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSubscriptions}
            disabled={loading}
            className={adminTheme.buttonSecondary}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#111111]' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className={`${adminTheme.card} p-4 space-y-1`}>
          <span className={`${adminTheme.label} block`}>Toplam Asistan</span>
          <div className="text-xl font-black text-[#111111] font-mono">{totalAssistants}</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-emerald-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Aktif Kiralama</span>
          <div className="text-xl font-black text-emerald-700 font-mono">{activeRentals}</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-amber-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">7 Gün İçinde Biten</span>
          <div className="text-xl font-black text-amber-700 font-mono">{nearExpiryCount}</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-red-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Süresi Dolan</span>
          <div className="text-xl font-black text-red-700 font-mono">{expiredCount}</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-blue-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Yenileme Bekleyen</span>
          <div className="text-xl font-black text-blue-800 font-mono">{pendingRenewalCount}</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-orange-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Ödeme Bekleyen</span>
          <div className="text-xl font-black text-orange-700 font-mono">{pendingPaymentCount}</div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className={`${adminTheme.card} p-4 flex flex-col sm:flex-row gap-3`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Asistan adı, telefon veya e-posta ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${adminTheme.input} pl-9`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={adminTheme.select}
        >
          <option value="all">Tüm Durumlar ({assistants.length})</option>
          <option value="renewal_requested">Yenileme Talebi Var ({pendingRenewalCount})</option>
          <option value="near_expiry">Süresi Yaklaşıyor (≤7 gün) ({nearExpiryCount})</option>
          <option value="expired">Süresi Dolan ({expiredCount})</option>
          <option value="active">Aktif Kiralama ({activeRentals})</option>
          <option value="payment_pending">Ödeme Bekliyor ({pendingPaymentCount})</option>
          <option value="no_sub">Abonelik Tanımlanmamış</option>
        </select>
      </div>

      {/* ASSISTANT SUBSCRIPTIONS LIST */}
      {loading ? (
        <div className={`${adminTheme.card} p-12 text-center space-y-3`}>
          <Loader2 className="w-8 h-8 text-[#111111] animate-spin mx-auto" />
          <p className="text-xs text-[#666666] font-medium">Asistan kiralama verileri yükleniyor...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className={`${adminTheme.card} p-12 text-center space-y-2`}>
          <AlertCircle className="w-10 h-10 text-[#8A8A8A] mx-auto" />
          <h3 className="text-sm font-bold text-[#111111]">Kayıt Bulunamadı</h3>
          <p className="text-xs text-[#666666]">Arama kriterlerinize uygun asistan kiralama kaydı bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((asst) => {
            const sub = getSubForAssistant(asst);
            const remaining = sub ? getDaysRemaining(sub.expires_at) : 0;
            const isExpired = sub ? (remaining <= 0 || sub.status === 'expired' || sub.status === 'pasif') : false;
            const isNearExpiry = sub && !isExpired && remaining <= 7;
            const hasRenewalReq = sub?.renewal_requested && sub?.renewal_decision === 'pending';

            return (
              <div 
                key={asst.id} 
                className={`${adminTheme.card} p-5 space-y-4 transition-all ${
                  hasRenewalReq 
                    ? 'border-[#111111] ring-1 ring-[#111111]' 
                    : isExpired 
                    ? 'border-red-200' 
                    : isNearExpiry 
                    ? 'border-amber-200' 
                    : ''
                }`}
              >
                {/* Header Row: Assistant Info + Subscription Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E7] pb-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F7F7F8] border border-[#E5E5E7] text-[#111111] font-black text-sm flex items-center justify-center shrink-0">
                      {asst.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-[#111111]">{asst.full_name}</h2>
                        {hasRenewalReq && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#111111] text-white">
                            YENİLEME TALEBİ VAR
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666666] font-medium mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#8A8A8A]" /> {asst.phone}
                        </span>
                        {asst.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#8A8A8A]" /> {asst.email}
                          </span>
                        )}
                        {asst.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#8A8A8A]" /> {asst.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!sub ? (
                      <span className={adminTheme.badgeInactive}>
                        Abonelik Yok
                      </span>
                    ) : isExpired ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                        ● Süresi Doldu
                      </span>
                    ) : isNearExpiry ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        ● Süresi Yaklaşıyor
                      </span>
                    ) : (
                      <span className={adminTheme.badgeActive}>
                        ● Aktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Subscription Metrics Grid or "No Sub" Prompt */}
                {sub ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
                    <div className="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E5E7] space-y-0.5">
                      <span className="text-[10px] text-[#666666] font-semibold uppercase tracking-wider block">Başlangıç</span>
                      <span className="text-[#111111] font-bold block">{formatDateForDisplay(sub.start_date)}</span>
                    </div>

                    <div className="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E5E7] space-y-0.5">
                      <span className="text-[10px] text-[#666666] font-semibold uppercase tracking-wider block">Bitiş</span>
                      <span className="text-[#111111] font-bold block">{formatDateForDisplay(sub.expires_at)}</span>
                    </div>

                    <div className="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E5E7] space-y-0.5">
                      <span className="text-[10px] text-[#666666] font-semibold uppercase tracking-wider block">Kalan Süre</span>
                      <span className={`font-bold font-mono block ${isExpired ? 'text-red-600' : isNearExpiry ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {Math.max(0, remaining)} Gün
                      </span>
                    </div>

                    <div className="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E5E7] space-y-0.5">
                      <span className="text-[10px] text-[#666666] font-semibold uppercase tracking-wider block">Aylık Kira</span>
                      <span className="text-[#111111] font-bold font-mono block">
                        {sub.monthly_price ? `${sub.monthly_price} ₺` : 'Belirtilmedi'}
                      </span>
                    </div>

                    <div className="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E5E7] space-y-0.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-[#666666] font-semibold uppercase tracking-wider block">Ödeme Durumu</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <select
                          value={sub.payment_status || 'pending'}
                          onChange={(e) => handlePaymentStatusChange(sub, e.target.value)}
                          disabled={submittingId === sub.id}
                          className="bg-white border border-[#E5E5E7] text-[11px] font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-[#111111]"
                        >
                          <option value="paid">Ödendi</option>
                          <option value="pending">Ödeme Bekliyor</option>
                          <option value="failed">Başarısız</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#F7F7F8] p-4 rounded-xl border border-dashed border-[#E5E5E7] flex items-center justify-between gap-4">
                    <div className="text-xs text-[#666666] font-medium">
                      Bu asistan için henüz aktif bir kiralama veya abonelik tanımı bulunmuyor.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingForAssistant(asst);
                        setNewSubForm(prev => ({
                          ...prev,
                          assistant_id: asst.id,
                          start_date: new Date().toISOString().split('T')[0],
                          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        }));
                      }}
                      className={`${adminTheme.buttonPrimary} text-xs py-2`}
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      Abonelik Oluştur
                    </button>
                  </div>
                )}

                {/* Admin Actions Bar */}
                {sub && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5E5E7] text-xs">
                    
                    {/* Left: Renewal Request Decision Actions */}
                    <div className="flex items-center gap-2">
                      {sub.renewal_requested && sub.renewal_decision === 'pending' ? (
                        <div className="flex items-center gap-2 bg-[#F7F7F8] border border-[#E5E5E7] p-2 rounded-xl">
                          <span className="text-[11px] font-bold text-[#111111] shrink-0">Talep Kararı:</span>
                          <button
                            type="button"
                            disabled={submittingId === sub.id}
                            onClick={() => handleRenewalDecision(sub, 'approved')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <Check className="w-3 h-3 text-white" /> Yenilemeyi Onayla
                          </button>
                          <button
                            type="button"
                            disabled={submittingId === sub.id}
                            onClick={() => handleRenewalDecision(sub, 'rejected')}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                          >
                            <X className="w-3 h-3 text-white" /> Yenilemeyi Reddet
                          </button>
                        </div>
                      ) : sub.renewal_decision === 'approved' ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          ✓ Yenileme Talebi Onaylandı
                        </span>
                      ) : sub.renewal_decision === 'rejected' ? (
                        <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                          ✕ Yenileme Talebi Reddedildi
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#666666] font-medium">
                          Yenileme Talebi: <strong className="text-[#111111]">Talep Yok</strong>
                        </span>
                      )}
                    </div>

                    {/* Right: Start New Period & Edit Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submittingId === sub.id}
                        onClick={() => handleStartNewPeriod(sub)}
                        className={`${adminTheme.buttonPrimary} text-xs py-1.5`}
                      >
                        {submittingId === sub.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>Yeni Dönemi Başlat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingSub({
                            sub,
                            assistant: asst,
                            start_date: formatDateForInput(sub.start_date),
                            expires_at: formatDateForInput(sub.expires_at),
                            monthly_price: sub.monthly_price || 0,
                            payment_status: sub.payment_status || 'paid',
                            status: sub.status || 'active'
                          });
                        }}
                        className={adminTheme.buttonSecondary}
                      >
                        <Edit className="w-3.5 h-3.5 text-[#666666]" /> Düzenle
                      </button>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SUBSCRIPTION MODAL */}
      {creatingForAssistant && (
        <div className={adminTheme.modalOverlay}>
          <div className={`${adminTheme.modalCard} max-w-md`}>
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
              <h3 className="text-base font-black text-[#111111]">Abonelik Oluştur</h3>
              <button
                type="button"
                onClick={() => setCreatingForAssistant(null)}
                className={adminTheme.modalCloseButton}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubSubmit} className="space-y-4 text-xs">
              <div>
                <label className={`${adminTheme.label} block mb-1`}>
                  Asistan
                </label>
                <input
                  type="text"
                  disabled
                  value={creatingForAssistant.full_name}
                  className={`${adminTheme.inputDisabled} font-bold`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={newSubForm.start_date}
                    onChange={(e) => setNewSubForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className={adminTheme.input}
                  />
                </div>

                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Bitiş Tarihi (1 Ay)
                  </label>
                  <input
                    type="date"
                    required
                    value={newSubForm.expires_at}
                    onChange={(e) => setNewSubForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    className={adminTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Aylık Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newSubForm.monthly_price}
                    onChange={(e) => setNewSubForm(prev => ({ ...prev, monthly_price: Number(e.target.value) }))}
                    className={adminTheme.input}
                  />
                </div>

                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Ödeme Durumu
                  </label>
                  <select
                    value={newSubForm.payment_status}
                    onChange={(e) => setNewSubForm(prev => ({ ...prev, payment_status: e.target.value }))}
                    className={adminTheme.select}
                  >
                    <option value="paid">Ödendi</option>
                    <option value="pending">Ödeme Bekliyor</option>
                    <option value="failed">Başarısız</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E7]">
                <button
                  type="button"
                  onClick={() => setCreatingForAssistant(null)}
                  className={adminTheme.buttonSecondary}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submittingId === 'create'}
                  className={adminTheme.buttonPrimary}
                >
                  {submittingId === 'create' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : null}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBSCRIPTION MODAL */}
      {editingSub && (
        <div className={adminTheme.modalOverlay}>
          <div className={`${adminTheme.modalCard} max-w-md`}>
            <div className="flex items-center justify-between border-b border-[#E5E5E7] pb-3">
              <h3 className="text-base font-black text-[#111111]">Kiralama Detaylarını Düzenle</h3>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className={adminTheme.modalCloseButton}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSub} className="space-y-4 text-xs">
              <div>
                <label className={`${adminTheme.label} block mb-1`}>
                  Asistan
                </label>
                <input
                  type="text"
                  disabled
                  value={editingSub.assistant?.full_name || ''}
                  className={`${adminTheme.inputDisabled} font-bold`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={editingSub.start_date}
                    onChange={(e) => setEditingSub(prev => prev ? ({ ...prev, start_date: e.target.value }) : null)}
                    className={adminTheme.input}
                  />
                </div>

                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={editingSub.expires_at}
                    onChange={(e) => setEditingSub(prev => prev ? ({ ...prev, expires_at: e.target.value }) : null)}
                    className={adminTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Aylık Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingSub.monthly_price}
                    onChange={(e) => setEditingSub(prev => prev ? ({ ...prev, monthly_price: Number(e.target.value) }) : null)}
                    className={adminTheme.input}
                  />
                </div>

                <div>
                  <label className={`${adminTheme.label} block mb-1`}>
                    Ödeme Durumu
                  </label>
                  <select
                    value={editingSub.payment_status}
                    onChange={(e) => setEditingSub(prev => prev ? ({ ...prev, payment_status: e.target.value }) : null)}
                    className={adminTheme.select}
                  >
                    <option value="paid">Ödendi</option>
                    <option value="pending">Ödeme Bekliyor</option>
                    <option value="failed">Başarısız</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`${adminTheme.label} block mb-1`}>
                  Kiralama Durumu
                </label>
                <select
                  value={editingSub.status}
                  onChange={(e) => setEditingSub(prev => prev ? ({ ...prev, status: e.target.value }) : null)}
                  className={adminTheme.select}
                >
                  <option value="active">Aktif</option>
                  <option value="pasif">Pasif</option>
                  <option value="expired">Süresi Doldu</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E7]">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className={adminTheme.buttonSecondary}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submittingId === editingSub.sub?.id}
                  className={adminTheme.buttonPrimary}
                >
                  {submittingId === editingSub.sub?.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : null}
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
        onConfirm={async () => {
          await confirmModal.action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

