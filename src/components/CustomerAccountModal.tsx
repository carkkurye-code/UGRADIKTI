import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShoppingBag, 
  Inbox, 
  CreditCard, 
  User as UserIcon, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  AlertCircle,
  Phone,
  Check,
  RefreshCw,
  Store,
  ChevronRight,
  Send,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase, db, getStored, LOCAL_STORAGE_KEYS, Order, isUUID, getExactTableColumns } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useModalBackButton } from '@/hooks/useModalBackButton';

export type CustomerTab = 'taleplerim' | 'gelen_kutusu' | 'odemelerim' | 'hesap_bilgilerim';

export interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: CustomerTab;
}

export function CustomerAccountModal({
  isOpen,
  onClose,
  initialTab = 'taleplerim'
}: CustomerAccountModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<CustomerTab>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [copiedIban, setCopiedIban] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Profile Edit State
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useBodyScrollLock(isOpen);
  useModalBackButton(isOpen, onClose, 'customer-account-modal');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  // Fetch Orders for current customer
  const fetchCustomerOrders = async () => {
    if (!user || !user.id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let fetched: Order[] = [];
      if (supabase) {
        const userId = user.id;
        const phoneStr = (profile?.phone || user.phone || '').trim();
        const sanitizedPhone = phoneStr.replace(/[^0-9+]/g, '');

        const exactCols = await getExactTableColumns('orders');
        const colsSet = new Set(exactCols);

        const orParts: string[] = [];
        if (userId && isUUID(userId)) {
          if (colsSet.has('customer_id') || colsSet.size === 0) {
            orParts.push(`customer_id.eq.${userId}`);
          }
          if (colsSet.has('user_id')) {
            orParts.push(`user_id.eq.${userId}`);
          }
        }

        if (sanitizedPhone && sanitizedPhone.length >= 7) {
          if (colsSet.has('customer_phone') || colsSet.size === 0) {
            orParts.push(`customer_phone.eq.${sanitizedPhone}`);
          }
        }

        if (orParts.length > 0) {
          let query = supabase.from('orders').select('*');
          if (orParts.length === 1) {
            const part = orParts[0];
            if (part.startsWith('customer_id.eq.')) {
              query = query.eq('customer_id', userId);
            } else if (part.startsWith('user_id.eq.')) {
              query = query.eq('user_id', userId);
            } else {
              query = query.eq('customer_phone', sanitizedPhone);
            }
          } else {
            query = query.or(orParts.join(','));
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) {
            console.warn('Supabase fetchCustomerOrders notice:', error.message || error);
          } else if (data) {
            fetched = data as Order[];
          }
        }
      }

      // Merge with local storage fallback
      const localOrders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
      const userPhone = (profile?.phone || user.phone || '').trim();
      const localFiltered = localOrders.filter(
        (o) =>
          o.customer_id === user.id ||
          o.user_id === user.id ||
          (userPhone && o.customer_phone === userPhone)
      );

      // Combine and deduplicate by id
      const map = new Map<string, Order>();
      [...fetched, ...localFiltered].forEach((o) => {
        if (o.id && !map.has(o.id)) {
          map.set(o.id, o);
        }
      });

      const sorted = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      setOrders(sorted);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Notifications for current customer
  const fetchCustomerNotifications = async () => {
    if (!user || !user.id || !supabase) {
      setNotifications([]);
      return;
    }
    try {
      const exactCols = await getExactTableColumns('notifications');
      const colsSet = new Set(exactCols);

      const orParts: string[] = [];
      if (colsSet.has('user_id') || colsSet.size === 0) {
        orParts.push(`user_id.eq.${user.id}`);
      }
      if (colsSet.has('recipient_id')) {
        orParts.push(`recipient_id.eq.${user.id}`);
      }
      if (colsSet.has('recipient_profile_id')) {
        orParts.push(`recipient_profile_id.eq.${user.id}`);
      }

      let query = supabase.from('notifications').select('*');
      if (orParts.length > 1) {
        query = query.or(orParts.join(','));
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn('Error fetching customer notifications:', err);
    }
  };

  const handleCopyText = (text: string, label: string, notifId: string) => {
    try {
      navigator.clipboard.writeText(text.replace(/\s+/g, ' '));
      setCopiedField(`${notifId}_${label}`);
      toast({
        title: `${label} Kopyalandı`,
        description: `${label} bilgisi panoya kopyalandı.`,
        variant: 'plain'
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchCustomerOrders();
      fetchCustomerNotifications();
      const interval = setInterval(() => {
        fetchCustomerOrders();
        fetchCustomerNotifications();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user]);

  // Handle Reporting Payment ("Ödemeyi Gönderdim")
  const handleReportPayment = async (order: Order) => {
    setSubmittingOrderId(order.id);
    try {
      const nowIso = new Date().toISOString();
      if (supabase) {
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'odeme_bildirildi',
            updated_at: nowIso
          })
          .eq('id', order.id);

        if (error) {
          console.warn('Supabase update status notice:', error.message);
        }
      }

      // Local state update
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'odeme_bildirildi' } : o))
      );

      toast({
        title: 'Ödeme Bildirimi Gönderildi',
        description: 'Ödemenizi ilettiğiniz asistana bildirildi. Asistan kontrol edip siparişi hazırlayacaktır.',
        variant: 'plain'
      });

      setSelectedOrderForPayment(null);
      await fetchCustomerOrders();
    } catch (err: any) {
      toast({
        title: 'Hata',
        description: 'Ödeme bildirimi iletilemedi: ' + (err?.message || ''),
        variant: 'destructive'
      });
    } finally {
      setSubmittingOrderId(null);
    }
  };

  // Copy IBAN Helper
  const handleCopyIban = (ibanStr: string) => {
    try {
      navigator.clipboard.writeText(ibanStr.replace(/\s+/g, ''));
      setCopiedIban(true);
      toast({
        title: 'IBAN Kopyalandı',
        description: 'Asistan IBAN adresi panoya kopyalandı.',
        variant: 'plain'
      });
      setTimeout(() => setCopiedIban(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  // Handle Saving Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      if (supabase) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            updated_at: new Date().toISOString()
          });
      }
      if (refreshProfile) {
        await refreshProfile();
      }
      toast({
        title: 'Profil Güncellendi',
        description: 'Hesap bilgileriniz başarıyla kaydedildi.',
        variant: 'plain'
      });
    } catch (err: any) {
      toast({
        title: 'Hata',
        description: 'Profil güncellenirken hata oluştu: ' + (err?.message || ''),
        variant: 'destructive'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Status Helpers
  const getStatusInfo = (statusRaw?: string) => {
    const s = (statusRaw || '').toLowerCase();
    if (['pending', 'created', 'bekliyor', 'asistan_araniyor', 'created'].includes(s)) {
      return {
        label: 'Asistan aranıyor',
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        step: 1
      };
    }
    if (['accepted', 'assigned', 'asistan_kabul_etti'].includes(s)) {
      return {
        label: 'Asistan kabul etti',
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        step: 2
      };
    }
    if (['payment_pending', 'odeme_bekleniyor'].includes(s)) {
      return {
        label: 'Ödeme bekleniyor',
        color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        step: 3
      };
    }
    if (['payment_reported', 'odeme_bildirildi'].includes(s)) {
      return {
        label: 'Ödeme bildirildi',
        color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        step: 4
      };
    }
    if (['purchasing', 'hazirlaniyor', 'urunler_aliniyor', 'dogrulandi'].includes(s)) {
      return {
        label: 'Ürünler alınıyor',
        color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        step: 5
      };
    }
    if (['delivering', 'on_the_way', 'yolda', 'teslimata_cikti'].includes(s)) {
      return {
        label: 'Teslimata çıktı',
        color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        step: 6
      };
    }
    if (['completed', 'teslim_edildi', 'tamamlandi'].includes(s)) {
      return {
        label: 'Teslim edildi',
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        step: 7
      };
    }
    if (['cancelled', 'iptal', 'iptal_edildi'].includes(s)) {
      return {
        label: 'İptal edildi',
        color: 'bg-red-500/10 text-red-400 border-red-500/20',
        step: 8
      };
    }
    return {
      label: 'İşleniyor',
      color: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
      step: 1
    };
  };

  if (!isOpen) return null;

  // Filter Orders Requiring Payment
  const pendingPaymentOrders = orders.filter((o) =>
    ['accepted', 'asistan_kabul_etti', 'payment_pending', 'odeme_bekleniyor', 'payment_reported', 'odeme_bildirildi'].includes(
      (o.status || '').toLowerCase()
    )
  );

  return typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 md:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 260 }}
                className="relative z-10 w-full max-w-3xl bg-[#0F0F12] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/60 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00]">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <span>{profile?.full_name || user?.email || 'Müşteri Hesabı'}</span>
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Siparişlerinizi, bildirimlerinizi ve ödemelerinizi yönetin.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-3 border-b border-white/10 bg-black/40 overflow-x-auto scrollbar-none shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('taleplerim')}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'taleplerim'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Taleplerim</span>
                    {orders.length > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'taleplerim' ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>
                        {orders.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('gelen_kutusu')}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'gelen_kutusu'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Inbox className="w-4 h-4" />
                    <span>Gelen Kutusu</span>
                    {pendingPaymentOrders.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('odemelerim')}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'odemelerim'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Ödemelerim</span>
                    {pendingPaymentOrders.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#FF7A00] text-black font-extrabold">
                        {pendingPaymentOrders.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('hesap_bilgilerim')}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'hesap_bilgilerim'
                        ? 'bg-white text-black shadow-md'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Hesap Bilgilerim</span>
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                  {/* TAB 1: TALEPLERİM */}
                  {activeTab === 'taleplerim' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Oluşturduğunuz Asistan Talepleri ({orders.length})
                        </span>
                        <button
                          type="button"
                          onClick={fetchCustomerOrders}
                          className="text-xs text-[#FF7A00] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                          <span>Yenile</span>
                        </button>
                      </div>

                      {loading && orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400 space-y-3">
                          <Loader2 className="w-7 h-7 animate-spin text-[#FF7A00]" />
                          <p className="text-xs font-medium">Talepleriniz yükleniyor...</p>
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl space-y-3 p-6">
                          <Package className="w-10 h-10 text-zinc-500 mx-auto" />
                          <h3 className="text-sm font-bold text-white">Henüz Bir Asistan Talebiniz Yok</h3>
                          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                            Mağaza veya kurye sayfalarımızdan dilediğiniz zaman asistan talebi oluşturabilirsiniz.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.map((order) => {
                            const statusInfo = getStatusInfo(order.status);
                            const itemsList = order.items || [];
                            const productsTotal = Number(order.total_price || 0);
                            const assistantFee = Number(order.courier_net || 100);
                            const grandTotal = productsTotal + assistantFee;

                            return (
                              <div
                                key={order.id}
                                className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 transition-all hover:border-white/20"
                              >
                                {/* Header Info */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-bold text-white">
                                        #UG-{order.id.slice(0, 8).toUpperCase()}
                                      </span>
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.color}`}
                                      >
                                        {statusInfo.label}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400">
                                      {order.created_at
                                        ? new Date(order.created_at).toLocaleString('tr-TR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : 'Yeni Talep'}
                                    </p>
                                  </div>

                                  {/* Store Name Badge */}
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-200 font-semibold">
                                    <Store className="w-3.5 h-3.5 text-[#FF7A00]" />
                                    <span>{order.partner_name || 'Mağaza Talebi'}</span>
                                  </div>
                                </div>

                                {/* Items List */}
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    Seçilen Ürünler
                                  </span>
                                  <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1.5">
                                    {itemsList.length > 0 ? (
                                      itemsList.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between text-xs text-zinc-300"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#FF7A00]">{item.quantity}x</span>
                                            <span>{item.title || item.name || 'Ürün'}</span>
                                          </div>
                                          <span className="font-semibold text-white">
                                            {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('tr-TR')} ₺
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-zinc-400 italic">
                                        {order.notes || order.task_description || 'Ürün detayları belirtilmedi.'}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Financial Breakdown */}
                                <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 border border-white/5 rounded-xl text-xs">
                                  <div>
                                    <span className="text-[10px] text-zinc-400 block font-medium">Ürün Toplamı</span>
                                    <span className="font-bold text-white">{productsTotal.toLocaleString('tr-TR')} ₺</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-zinc-400 block font-medium">Asistan Hizmeti</span>
                                    <span className="font-bold text-amber-400">{assistantFee.toLocaleString('tr-TR')} ₺</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-zinc-400 block font-medium">Genel Toplam</span>
                                    <span className="font-extrabold text-white text-sm">{grandTotal.toLocaleString('tr-TR')} ₺</span>
                                  </div>
                                </div>

                                {/* Assistant Info */}
                                <div className="flex items-center justify-between text-xs pt-1">
                                  <div className="flex items-center gap-2 text-zinc-400">
                                    <UserIcon className="w-4 h-4 text-zinc-500" />
                                    <span>
                                      Atanan Asistan:{' '}
                                      <strong className="text-white font-semibold">
                                        {order.assistant_name || 'En yakın asistan aranıyor...'}
                                      </strong>
                                    </span>
                                  </div>

                                  {/* Direct Payment Action */}
                                  {['accepted', 'asistan_kabul_etti', 'payment_pending', 'odeme_bekleniyor'].includes(
                                    (order.status || '').toLowerCase()
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedOrderForPayment(order);
                                        setActiveTab('odemelerim');
                                      }}
                                      className="px-3.5 py-1.5 rounded-xl bg-[#FF7A00] hover:bg-[#e66e00] text-black font-extrabold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      <span>Ödeme Yap</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: GELEN KUTUSU */}
                  {activeTab === 'gelen_kutusu' && (
                    <div className="space-y-4">
                      <div className="pb-2 border-b border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Sipariş & Ödeme Bildirimleriniz
                        </span>
                      </div>

                      {pendingPaymentOrders.length === 0 && orders.length === 0 && notifications.filter(n => n.type === 'iban_details' || (n.message && n.message.includes('IBAN:'))).length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                          <Inbox className="w-10 h-10 text-zinc-500 mx-auto" />
                          <h3 className="text-sm font-bold text-white">Gelen Kutunuz Boş</h3>
                          <p className="text-xs text-zinc-400">
                            Asistanınız talebinizi kabul ettiğinde ödeme ve durum bildirimleri buraya gelecektir.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* IBAN Notifications */}
                          {notifications.map((notif) => {
                            const isIbanDetails = notif.type === 'iban_details' || (notif.message && notif.message.includes('IBAN:'));
                            if (!isIbanDetails) return null;

                            const msg = notif.message || notif.body || '';
                            const accountHolderMatch = msg.match(/Hesap Sahibi:\s*([^\n\r]+)/i);
                            const bankNameMatch = msg.match(/Banka:\s*([^\n\r]+)/i);
                            const ibanMatch = msg.match(/IBAN:\s*([^\n\r]+)/i);

                            const accountHolder = accountHolderMatch ? accountHolderMatch[1].trim() : null;
                            const bankName = bankNameMatch ? bankNameMatch[1].trim() : null;
                            const iban = ibanMatch ? ibanMatch[1].trim() : null;

                            return (
                              <div
                                key={notif.id}
                                className="p-4 bg-zinc-900 border border-white/10 rounded-2xl space-y-3"
                              >
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                                    <CreditCard className="w-4 h-4" />
                                    <span>{notif.title || 'Asistan Ödeme Bilgilerini Gönderdi'}</span>
                                  </div>
                                  {notif.created_at && (
                                    <span className="text-[10px] text-zinc-400">
                                      {new Date(notif.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-2 text-xs">
                                  {accountHolder && (
                                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Hesap Sahibi</span>
                                        <span className="text-white font-semibold text-xs truncate block">{accountHolder}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(accountHolder, 'Hesap Sahibi', notif.id)}
                                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white font-bold text-[11px] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        {copiedField === `${notif.id}_Hesap Sahibi` ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>Kopyala</span>
                                      </button>
                                    </div>
                                  )}

                                  {bankName && (
                                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Banka</span>
                                        <span className="text-white font-semibold text-xs truncate block">{bankName}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(bankName, 'Banka', notif.id)}
                                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white font-bold text-[11px] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        {copiedField === `${notif.id}_Banka` ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>Kopyala</span>
                                      </button>
                                    </div>
                                  )}

                                  {iban && (
                                    <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">IBAN</span>
                                        <span className="text-white font-mono font-semibold text-xs tracking-wider break-all block">{iban}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(iban, 'IBAN', notif.id)}
                                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white font-bold text-[11px] transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        {copiedField === `${notif.id}_IBAN` ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                        <span>Kopyala</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {orders.map((order) => {
                            const statusStr = (order.status || '').toLowerCase();
                            const isAccepted = ['accepted', 'asistan_kabul_etti', 'payment_pending', 'odeme_bekleniyor'].includes(statusStr);
                            const isReported = ['payment_reported', 'odeme_bildirildi'].includes(statusStr);
                            const isPurchasing = ['purchasing', 'hazirlaniyor', 'urunler_aliniyor'].includes(statusStr);
                            const isDelivering = ['delivering', 'on_the_way', 'yolda', 'teslimata_cikti'].includes(statusStr);
                            const isCompleted = ['completed', 'teslim_edildi'].includes(statusStr);

                            return (
                              <div
                                key={order.id}
                                className="p-4 bg-zinc-900 border border-white/10 rounded-2xl space-y-3"
                              >
                                {isAccepted && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                      <span>🎉 Asistan Talebinizi Kabul Etti!</span>
                                    </div>
                                    <p className="text-xs text-zinc-300 leading-relaxed">
                                      <strong className="text-white">{order.assistant_name || 'Uğra Asistanı'}</strong> talebinizi kabul etti. Siparişinizin hazırlanmaya başlaması için toplam{' '}
                                      <strong className="text-white font-bold">
                                        {(Number(order.total_price || 0) + Number(order.courier_net || 100)).toLocaleString('tr-TR')} ₺
                                      </strong>{' '}
                                      tutarını doğrudan asistanın IBAN hesabına aktarıp 'Ödemeyi Gönderdim' butonuna basınız.
                                    </p>
                                    <div className="pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedOrderForPayment(order);
                                          setActiveTab('odemelerim');
                                        }}
                                        className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2"
                                      >
                                        <CreditCard className="w-4 h-4" />
                                        <span>Ödeme Ekranını Aç</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {isReported && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>💳 Ödeme Bildirimi Gönderildi</span>
                                    </div>
                                    <p className="text-xs text-zinc-300">
                                      Ödemeyi gönderdiğinizi asistana ilettik. Asistanınız kontrol ettikten sonra mağazadan ürünleri satın almak üzere harekete geçecektir.
                                    </p>
                                  </div>
                                )}

                                {isPurchasing && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                                      <Package className="w-4 h-4" />
                                      <span>🛍️ Ürünler Alınıyor</span>
                                    </div>
                                    <p className="text-xs text-zinc-300">
                                      Asistanınız <strong className="text-white">{order.partner_name || 'Mağaza'}</strong> noktasından seçtiğiniz ürünleri tedarik ediyor.
                                    </p>
                                  </div>
                                )}

                                {isDelivering && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                                      <Truck className="w-4 h-4" />
                                      <span>🛵 Teslimata Çıktı</span>
                                    </div>
                                    <p className="text-xs text-zinc-300">
                                      Asistanınız siparişinizi teslim etmek üzere verdiğiniz konuma doğru yola çıktı.
                                    </p>
                                  </div>
                                )}

                                {isCompleted && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>✅ Teslim Edildi</span>
                                    </div>
                                    <p className="text-xs text-zinc-300">
                                      Siparişiniz başarıyla teslim edilmiştir. UĞRA'yı tercih ettiğiniz için teşekkür ederiz!
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: ÖDEMELERİM */}
                  {activeTab === 'odemelerim' && (
                    <div className="space-y-4">
                      <div className="pb-2 border-b border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Doğrudan Asistan IBAN Transfer Ekranı
                        </span>
                      </div>

                      {pendingPaymentOrders.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                          <h3 className="text-sm font-bold text-white">Bekleyen Ödemeniz Bulunmuyor</h3>
                          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                            Tüm asistan ödemeleriniz günceldir. Bir asistan talebinizi kabul ettiğinde IBAN detayları burada görünecektir.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {pendingPaymentOrders.map((order) => {
                            const productsTotal = Number(order.total_price || 0);
                            const assistantFee = Number(order.courier_net || 100);
                            const grandTotal = productsTotal + assistantFee;
                            const assistantName = order.assistant_name || 'UĞRA Asistanı';
                            const ibanStr = order.notes?.match(/IBAN:\s*(TR[0-9\s]+)/i)?.[1] || 'TR56 0006 2000 0000 0000 1234 56';
                            const isReported = ['payment_reported', 'odeme_bildirildi'].includes((order.status || '').toLowerCase());

                            return (
                              <div
                                key={order.id}
                                className="bg-gradient-to-br from-zinc-900 to-black border border-white/15 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl"
                              >
                                {/* Header */}
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                  <div>
                                    <span className="text-xs font-mono font-bold text-[#FF7A00]">
                                      #UG-{order.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <h3 className="text-sm font-bold text-white mt-0.5">
                                      {order.partner_name || 'Asistan Siparişi'}
                                    </h3>
                                  </div>
                                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#FF7A00]/10 text-[#FF7A00] border border-[#FF7A00]/20">
                                    Ödeme Bekleniyor
                                  </span>
                                </div>

                                {/* Financial Details Table */}
                                <div className="space-y-2 bg-white/5 border border-white/10 rounded-xl p-4">
                                  <div className="flex items-center justify-between text-xs text-zinc-300">
                                    <span>Ürün Toplamı</span>
                                    <span className="font-bold text-white">{productsTotal.toLocaleString('tr-TR')} ₺</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-zinc-300">
                                    <span>Asistan Hizmet Bedeli</span>
                                    <span className="font-bold text-white">{assistantFee.toLocaleString('tr-TR')} ₺</span>
                                  </div>
                                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm font-extrabold text-white">
                                    <span>Ödenecek Toplam Tutar</span>
                                    <span className="text-base text-[#FF7A00]">{grandTotal.toLocaleString('tr-TR')} ₺</span>
                                  </div>
                                </div>

                                {/* IBAN & Assistant Details */}
                                <div className="space-y-3 bg-zinc-900/90 border border-white/10 rounded-xl p-4">
                                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                                    Alıcı Asistan Hesabı
                                  </span>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <span className="text-zinc-500 block text-[10px]">Alıcı İsim Soyisim</span>
                                      <span className="font-bold text-white">{assistantName}</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-500 block text-[10px]">Transfer Tipi</span>
                                      <span className="font-bold text-emerald-400">Doğrudan IBAN Transferi</span>
                                    </div>
                                  </div>

                                  {/* IBAN Copy Box */}
                                  <div className="pt-1">
                                    <span className="text-zinc-500 block text-[10px] mb-1">Asistan IBAN Numarası</span>
                                    <div className="flex items-center gap-2 bg-black border border-white/20 rounded-xl p-3">
                                      <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider flex-1 select-all break-all">
                                        {ibanStr}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyIban(ibanStr)}
                                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                                      >
                                        {copiedIban ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Kopyalandı</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Kopyala</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Button */}
                                <div>
                                  {isReported ? (
                                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center gap-2 text-purple-300 font-bold text-xs text-center">
                                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                                      <span>Ödemeniz Gönderildi Olarak Bildirildi • Asistan Onayı Bekleniyor</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={submittingOrderId === order.id}
                                      onClick={() => handleReportPayment(order)}
                                      className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 border-0"
                                    >
                                      {submittingOrderId === order.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                                      ) : (
                                        <>
                                          <Send className="w-4 h-4" />
                                          <span>Ödemeyi Gönderdim</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: HESAP BİLGİLERİM */}
                  {activeTab === 'hesap_bilgilerim' && (
                    <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg mx-auto">
                      <div className="pb-2 border-b border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Müşteri Profil Bilgileriniz
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-300 block">Ad Soyad</label>
                        <input
                          type="text"
                          required
                          placeholder="Adınız Soyadınız"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 focus:border-[#FF7A00] outline-none rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-300 block">Telefon Numarası</label>
                        <input
                          type="tel"
                          required
                          placeholder="05xx xxx xx xx"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 focus:border-[#FF7A00] outline-none rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-300 block">E-posta Adresi</label>
                        <input
                          type="email"
                          disabled
                          value={user?.email || ''}
                          className="w-full bg-zinc-900/50 border border-white/5 outline-none rounded-xl p-3 text-xs text-zinc-400 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-300 block">Varsayılan Teslimat Adresi</label>
                        <textarea
                          rows={3}
                          placeholder="Siparişlerinizin teslim edileceği açık adres..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 focus:border-[#FF7A00] outline-none rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 transition-all resize-none"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border-0"
                        >
                          {savingProfile ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Bilgilerimi Güncelle</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;
}
