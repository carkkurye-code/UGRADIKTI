import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Eye, MapPin, Bike, Building, CheckCircle2, Clock, 
  XCircle, RotateCcw, Volume2, VolumeX, RefreshCw, Navigation, User, Phone, X, Edit3, ArrowRight,
  Lock, Unlock, AlertCircle, Plus, Shield
} from 'lucide-react';
import { Order, Partner, Assistant, db } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import { AdminOperationsService } from '@/services/adminOperations';
import { NotificationService } from '@/services/notificationService';

interface AdminOrdersTabProps {
  orders: (Order & { partner_name?: string })[];
  partners: Partner[];
  assistants: Assistant[];
  onRefresh: () => void;
  setOrders: React.Dispatch<React.SetStateAction<(Order & { partner_name?: string })[]>>;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders,
  partners,
  assistants,
  onRefresh,
  setOrders
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Detail Modal
  const [viewingOrder, setViewingOrder] = useState<(Order & { partner_name?: string }) | null>(null);

  // Assignment Modal
  const [assigningOrder, setAssigningOrder] = useState<(Order & { partner_name?: string }) | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Lock Tracking State
  const [lockedTaskIds, setLockedTaskIds] = useState<Set<string>>(new Set());

  // Emergency Task Modal State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyCustomerId, setEmergencyCustomerId] = useState('cust-1');
  const [emergencyPartnerId, setEmergencyPartnerId] = useState('');
  const [emergencyPickupAddress, setEmergencyPickupAddress] = useState('');
  const [emergencyDeliveryAddress, setEmergencyDeliveryAddress] = useState('');
  const [emergencyPrice, setEmergencyPrice] = useState('150');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [emergencySubmitting, setEmergencySubmitting] = useState(false);
  const [emergencyError, setEmergencyError] = useState<string | null>(null);

  useModalBackButton(Boolean(viewingOrder), () => setViewingOrder(null), 'admin-view-order');
  useModalBackButton(Boolean(assigningOrder), () => setAssigningOrder(null), 'admin-assign-order');
  useModalBackButton(showEmergencyModal, () => setShowEmergencyModal(false), 'admin-emergency-task');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  // Auto Refresh Interval
  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(() => {
        onRefresh();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const filteredOrders = (orders || []).filter(o => {
    if (!o) return false;
    const idStr = String(o.id ?? '');
    const custNameStr = String(o.customer_name ?? '');
    const custPhoneStr = String(o.customer_phone ?? '');
    const partnerNameStr = String(o.partner_name ?? '');
    const termStr = String(searchTerm ?? '').toLowerCase();

    const matchesSearch = idStr.toLowerCase().includes(termStr) ||
                          custNameStr.toLowerCase().includes(termStr) ||
                          custPhoneStr.includes(searchTerm) ||
                          partnerNameStr.toLowerCase().includes(termStr);
    const matchesStatus = !selectedStatus || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Actions using AdminOperationsService
  const handleToggleLock = (taskId: string) => {
    const result = AdminOperationsService.lockTask(taskId);
    setLockedTaskIds(prev => {
      const next = new Set(prev);
      if (result.isLocked) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  };

  const handleForceComplete = (order: Order) => {
    setConfirmModal({
      isOpen: true,
      title: 'Görevi Manuel Tamamla',
      description: `Sipariş #${String(order.id || '').substring(0, 8)} yönetici inisiyatifi ile zorla tamamlanacak. Onaylıyor musunuz?`,
      action: async () => {
        const res = await AdminOperationsService.forceCompleteTask(order.id);
        if (res.success) {
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'tamamlandi' } : o));
          onRefresh();
        }
      }
    });
  };

  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    await db.updateOrderStatus(orderId, status);
    const order = orders.find(o => o.id === orderId);
    if (order?.user_id) {
      await NotificationService.sendTaskNotification(
        order.user_id,
        orderId,
        'task_updated',
        'Sipariş Güncellendi',
        `Siparişinizin durumu: ${status}`
      );
    }
  };

  const handleAssignCourier = async () => {
    if (!assigningOrder || !selectedCourierId) return;
    setAssignError(null);
    const courier = assistants.find(a => a.id === selectedCourierId);
    
    // Call Admin Operations Service reassign
    const res = await AdminOperationsService.reassignTask(
      assigningOrder.id,
      selectedCourierId
    );

    if (!res.success) {
      setAssignError(res.error || 'Atama başarısız oldu.');
      return;
    }

    setOrders(prev => prev.map(o => o.id === assigningOrder.id ? { ...o, assistant_id: selectedCourierId, assistant_name: courier?.full_name, status: 'yolda' } : o));
    await db.updateOrderStatus(assigningOrder.id, 'yolda');

    if (assigningOrder.user_id) {
      await NotificationService.sendTaskNotification(
        assigningOrder.user_id,
        assigningOrder.id,
        'task_assigned',
        'Kurye Atandı 🛵',
        `${courier?.full_name || 'Asistanımız'} siparişiniz için atandı!`
      );
    }

    setAssigningOrder(null);
    setAssignError(null);
  };

  const handleCreateEmergencyTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyPickupAddress || !emergencyDeliveryAddress) {
      setEmergencyError('Lütfen teslimat ve alış adreslerini doldurunuz.');
      return;
    }

    setEmergencySubmitting(true);
    setEmergencyError(null);

    const res = await AdminOperationsService.createEmergencyTask({
      customerId: emergencyCustomerId || 'cust-1',
      partnerId: emergencyPartnerId || partners[0]?.id || 'partner-1',
      pickupAddress: emergencyPickupAddress,
      deliveryAddress: emergencyDeliveryAddress,
      price: Number(emergencyPrice) || 150,
      notes: emergencyNotes,
    });

    setEmergencySubmitting(false);

    if (!res.success) {
      setEmergencyError(res.error || 'Acil görev oluşturulamadı.');
    } else {
      setShowEmergencyModal(false);
      setEmergencyPickupAddress('');
      setEmergencyDeliveryAddress('');
      setEmergencyNotes('');
      onRefresh();
    }
  };

  const handleStartRefund = (order: Order) => {
    setConfirmModal({
      isOpen: true,
      title: 'İade İşlemi Başlat',
      description: `Sipariş #${String(order.id || '').substring(0, 8)} için ücret iadesi sürecini başlatmak istiyor musunuz?`,
      isDanger: true,
      action: async () => {
        await AdminOperationsService.cancelTask(order.id, 'Yönetici iptali ve ücret iadesi.');
        await handleUpdateStatus(order.id, 'iptal');
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER WITH LIVE TICKER AND EMERGENCY ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111113] p-6 rounded-2xl border border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">Canlı Sipariş Operasyonu</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Canlı Takip
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Platformdaki tüm sipariş akışlarını, kurye atamalarını, kilitleri ve acil görevleri canlı yönetin.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-500/10"
          >
            <AlertCircle className="w-4 h-4" /> + Acil Görev Oluştur
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-muted-foreground'
            }`}
            title="Sesli Uyarı Zili"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              autoRefresh ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-muted-foreground'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Otomatik Akış (5sn)' : 'Durduruldu'}
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-[#111113] border border-white/5 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Sipariş No, Müşteri adı veya Partner ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#18181B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/30"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#18181B] border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-white/30"
        >
          <option value="">Tüm Sipariş Aşamaları</option>
          <option value="beklemede">Beklemede (Onay Bekliyor)</option>
          <option value="hazirlaniyor">Hazırlanıyor (Mutfak)</option>
          <option value="yolda">Kuryede / Yolda</option>
          <option value="tamamlandi">Teslim Edildi</option>
          <option value="iptal">İptal Edildi</option>
        </select>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-[#111113] border border-dashed border-white/5 rounded-2xl text-muted-foreground text-sm">
            Sipariş kaydı bulunamadı.
          </div>
        ) : (
          filteredOrders.map(order => {
            const partner = partners.find(p => p.id === order.partner_id);
            const isLocked = lockedTaskIds.has(order.id);

            return (
              <div key={order.id} className={`p-5 bg-[#111113] border rounded-2xl space-y-3 transition-all shadow-xl ${isLocked ? 'border-amber-500/40 bg-amber-500/[0.02]' : 'border-white/5 hover:border-white/10'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-foreground font-bold flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm flex items-center gap-2">
                        Sipariş #{String(order.id || '').substring(0, 8)}
                        <span className="text-[10px] font-bold text-muted-foreground font-mono">
                          {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isLocked && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> KİLİTLİ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="w-3 h-3 text-foreground" /> {order.partner_name || partner?.business_name || 'Partner'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-foreground">{order.total_price} ₺</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      order.status === 'beklemede' ? 'bg-white/10 text-white border border-white/20' :
                      order.status === 'hazirlaniyor' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      order.status === 'yolda' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      order.status === 'tamamlandi' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground font-semibold">Müşteri:</span>{' '}
                    <strong className="text-foreground">{order.customer_name}</strong> ({order.customer_phone})
                  </div>
                  <div className="truncate">
                    <span className="text-muted-foreground font-semibold">Teslimat Adresi:</span>{' '}
                    <span className="text-foreground">{order.delivery_address || 'Adres belirtilmedi'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Kurye:</span>{' '}
                    <strong className="text-blue-400">{order.assistant_name || 'Henüz Atanmadı'}</strong>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-foreground font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-foreground" /> Detay & Rota
                    </button>

                    {/* Lock / Unlock Toggle */}
                    <button
                      onClick={() => handleToggleLock(order.id)}
                      className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer flex items-center gap-1 transition-all ${
                        isLocked 
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
                          : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
                      }`}
                      title={isLocked ? 'Kilidi Aç' : 'Görevi Kilitler (Sistem Atamasını Engeller)'}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                      {isLocked ? 'Kilitli' : 'Kilitle'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Assign Courier */}
                    <button
                      onClick={() => setAssigningOrder(order)}
                      disabled={isLocked}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/20 cursor-pointer flex items-center gap-1 disabled:opacity-40"
                    >
                      <Bike className="w-3.5 h-3.5" /> Kurye Yeniden Ata
                    </button>

                    {/* Force Complete */}
                    {order.status !== 'tamamlandi' && order.status !== 'iptal' && (
                      <button
                        onClick={() => handleForceComplete(order)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/20 cursor-pointer flex items-center gap-1"
                        title="Zorla Tamamlandı İşaretle"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Manuel Tamamla
                      </button>
                    )}

                    {/* Progress Status */}
                    {order.status === 'beklemede' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'hazirlaniyor')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold hover:bg-emerald-600 cursor-pointer"
                      >
                        Hazırlanıyor Yap
                      </button>
                    )}

                    {order.status === 'hazirlaniyor' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'yolda')}
                        className="px-3 py-1.5 rounded-lg bg-purple-500 text-white font-bold hover:bg-purple-600 cursor-pointer"
                      >
                        Yola Çıkar
                      </button>
                    )}

                    {/* Cancel / Refund */}
                    {order.status !== 'iptal' && (
                      <button
                        onClick={() => handleStartRefund(order)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-bold hover:bg-red-500/20 cursor-pointer"
                      >
                        İptal / İade
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EMERGENCY TASK CREATION MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-red-500/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button onClick={() => setShowEmergencyModal(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-lg">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Acil Yüksek Öncelikli Görev Oluştur</h3>
                <p className="text-[11px] text-muted-foreground">Yönetici tarafından anında VIP kurye dağıtım motoruna sokulacak acil çağrı.</p>
              </div>
            </div>

            {emergencyError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold">
                {emergencyError}
              </div>
            )}

            <form onSubmit={handleCreateEmergencyTaskSubmit} className="space-y-3">
              <div>
                <label className="text-muted-foreground font-semibold block mb-1">Partner / İşletme Seçin</label>
                <select
                  value={emergencyPartnerId}
                  onChange={(e) => setEmergencyPartnerId(e.target.value)}
                  className="w-full bg-[#18181B] border border-white/10 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-white/30"
                >
                  <option value="">Platform Geneli / Varsayılan Partner</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.business_name} ({p.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Teslim Alma Adresi</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Atatürk Cad. No: 12"
                    value={emergencyPickupAddress}
                    onChange={(e) => setEmergencyPickupAddress(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Teslim Etme Adresi</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Çark Cad. No: 88"
                    value={emergencyDeliveryAddress}
                    onChange={(e) => setEmergencyDeliveryAddress(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Görev Tutarı (₺)</label>
                  <input
                    type="number"
                    required
                    value={emergencyPrice}
                    onChange={(e) => setEmergencyPrice(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-white/30 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground font-semibold block mb-1">Müşteri ID</label>
                  <input
                    type="text"
                    value={emergencyCustomerId}
                    onChange={(e) => setEmergencyCustomerId(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted-foreground font-semibold block mb-1">Acil Görev Notu</label>
                <textarea
                  rows={2}
                  placeholder="Kurye için acil teslimat talimatları..."
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  className="w-full bg-[#18181B] border border-white/10 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 border border-white/10 rounded-xl text-muted-foreground font-semibold hover:text-foreground"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={emergencySubmitting}
                  className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50"
                >
                  {emergencySubmitting ? 'Oluşturuluyor...' : 'Acil Görevi Başlat & Kuryeye Yayınla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAILS & MAP MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 relative text-xs">
            <button onClick={() => setViewingOrder(null)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-lg">
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-foreground">Sipariş #{String(viewingOrder.id || '').substring(0, 8)} İnceleme</h2>

            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5">
              <div className="font-bold text-foreground text-sm">Sipariş Veren: {viewingOrder.customer_name}</div>
              <div><span className="text-muted-foreground">Telefon:</span> {viewingOrder.customer_phone}</div>
              <div><span className="text-muted-foreground">Adres:</span> {viewingOrder.delivery_address || 'Kadıköy, İstanbul'}</div>
              <div><span className="text-muted-foreground">Ödeme Tipi:</span> {viewingOrder.payment_type || 'Online Kredi Kartı'}</div>
            </div>

            {/* Order Items */}
            <div className="space-y-2">
              <div className="font-bold text-foreground">Sipariş İçeriği ({viewingOrder.items?.length || 1} Kalem)</div>
              {(viewingOrder.items || [{ title: 'Sipariş Kalemi', quantity: 1, price: viewingOrder.total_price }]).map((item: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-black/40 border border-white/10 rounded-lg flex items-center justify-between">
                  <span>{item.quantity || 1}x {item.title || item.product_name || 'Ürün'}</span>
                  <span className="font-bold text-foreground">{item.price} ₺</span>
                </div>
              ))}
            </div>

            {/* Simulated Live Route Map Card */}
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
              <div className="font-bold text-purple-400 flex items-center gap-2">
                <Navigation className="w-4 h-4 animate-bounce" /> Canlı Teslimat Rota Haritası
              </div>
              <div className="w-full h-32 bg-[#18181B] rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground font-mono">
                [LIVE DELIVERY ROUTE: PARTNER ➔ COURIER ➔ CUSTOMER]
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/5">
              <button onClick={() => setViewingOrder(null)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-foreground font-semibold">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN COURIER MODAL */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button onClick={() => setAssigningOrder(null)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-lg">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-foreground">Siparişe Kurye Atayın</h3>
            <p className="text-muted-foreground">Sipariş #{String(assigningOrder.id || '').substring(0, 8)} için en yakın kuryeyi seçiniz:</p>

            {assignError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold">
                {assignError}
              </div>
            )}

            <select
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              className="w-full bg-[#18181B] border border-white/10 rounded-xl p-3 text-foreground focus:border-white/30 focus:outline-none"
            >
              <option value="">Kurye Seçiniz...</option>
              {assistants.filter(a => a.status === 'aktif').map(a => (
                <option key={a.id} value={a.id}>{a.full_name} ({a.vehicle_type} - {a.city})</option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button onClick={() => setAssigningOrder(null)} className="px-4 py-2 border border-white/10 rounded-xl text-muted-foreground font-semibold">
                İptal
              </button>
              <button onClick={handleAssignCourier} className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600">
                Kuryeyi Ata & Görevlendir
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
};
