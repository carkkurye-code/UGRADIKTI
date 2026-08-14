import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Eye, MapPin, Bike, Building, CheckCircle2, Clock, 
  XCircle, RotateCcw, Volume2, VolumeX, RefreshCw, Navigation, User, Phone, X, Edit3, ArrowRight,
  Lock, Unlock, AlertCircle, Plus, Shield, Zap, Calendar, ArrowUpRight
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
  const [selectedType, setSelectedType] = useState<'all' | 'al' | 'birak' | 'gecerken'>('all');

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

  const getOrderOperationType = (order: Order): 'al' | 'birak' | 'gecerken' => {
    if ((order as any).scheduled_time || order.service_type === 'gecerken') return 'gecerken';
    if (order.service_type === 'birak' || order.service_type === 'hemen' || (!order.partner_id && order.pickup_address)) return 'birak';
    return 'al';
  };

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

    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'bekliyor' ? (o.status === 'beklemede' || o.status === 'bekliyor' || o.status === 'created' || o.status === 'broadcasted') :
       selectedStatus === 'hazirlaniyor' ? (o.status === 'hazirlaniyor' || o.status === 'accepted') :
       selectedStatus === 'yolda' ? (o.status === 'yolda') :
       selectedStatus === 'tamamlandi' ? (o.status === 'tamamlandi' || o.status === 'teslim_edildi' || o.status === 'completed') :
       selectedStatus === 'iptal' ? (o.status === 'iptal' || o.status === 'cancelled') :
       o.status === selectedStatus);

    const opType = getOrderOperationType(o);
    const matchesType = selectedType === 'all' || opType === selectedType;

    return matchesSearch && matchesStatus && matchesType;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#111111]">Sipariş & Görev Takibi</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Canlı Takip
            </span>
          </div>
          <p className="text-sm text-[#666666] mt-1">Mağazadan siparişler, Hemen UĞRA ve Geçerken UĞRA operasyonlarını tek merkezden yönetin.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Acil Görev Başlat
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled ? 'bg-white border-[#E5E7EB] text-[#111111]' : 'bg-[#F7F7F8] border-[#E5E7EB] text-[#8A8A8A]'
            }`}
            title="Sesli Uyarı"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              autoRefresh ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-[#F7F7F8] border-[#E5E7EB] text-[#666666]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Otomatik (5s)' : 'Durduruldu'}
          </button>
        </div>
      </div>

      {/* QUICK OPERATION TABS & SEARCH */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#E5E7EB]">
          <span className="text-[11px] font-extrabold uppercase text-[#8A8A8A] mr-1">Operasyon:</span>
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              selectedType === 'all' ? 'bg-[#111111] text-white' : 'bg-[#F7F7F8] text-[#666666] hover:text-[#111111] border border-[#E5E7EB]'
            }`}
          >
            Tümü ({orders.length})
          </button>
          <button
            onClick={() => setSelectedType('al')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedType === 'al' ? 'bg-[#111111] text-white' : 'bg-[#F7F7F8] text-[#666666] hover:text-[#111111] border border-[#E5E7EB]'
            }`}
          >
            <Building className="w-3 h-3" /> Mağazadan Al ({orders.filter(o => getOrderOperationType(o) === 'al').length})
          </button>
          <button
            onClick={() => setSelectedType('birak')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedType === 'birak' ? 'bg-[#111111] text-white' : 'bg-[#F7F7F8] text-[#666666] hover:text-[#111111] border border-[#E5E7EB]'
            }`}
          >
            <Zap className="w-3 h-3" /> Hemen UĞRA ({orders.filter(o => getOrderOperationType(o) === 'birak').length})
          </button>
          <button
            onClick={() => setSelectedType('gecerken')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              selectedType === 'gecerken' ? 'bg-[#111111] text-white' : 'bg-[#F7F7F8] text-[#666666] hover:text-[#111111] border border-[#E5E7EB]'
            }`}
          >
            <Calendar className="w-3 h-3" /> Geçerken UĞRA ({orders.filter(o => getOrderOperationType(o) === 'gecerken').length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Sipariş No, Müşteri adı veya Partner ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] transition-all"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#111111] font-semibold"
          >
            <option value="">Tüm Durumlar</option>
            <option value="bekliyor">Bekliyor / Yeni Çağrı</option>
            <option value="hazirlaniyor">Hazırlanıyor / Kabul Edildi</option>
            <option value="yolda">Kuryede / Yolda</option>
            <option value="tamamlandi">Teslim Edildi</option>
            <option value="iptal">İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed border-[#E5E7EB] rounded-2xl text-[#666666] text-xs">
            Arama kriterine uygun sipariş veya görev kaydı bulunamadı.
          </div>
        ) : (
          filteredOrders.map(order => {
            const partner = partners.find(p => p.id === order.partner_id);
            const isLocked = lockedTaskIds.has(order.id);
            const opType = getOrderOperationType(order);

            return (
              <div key={order.id} className={`p-5 bg-white border rounded-2xl space-y-3 transition-all shadow-sm ${isLocked ? 'border-amber-400 bg-amber-50/20' : 'border-[#E5E7EB] hover:border-[#111111]/30'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB] text-[#111111] font-bold flex items-center justify-center shrink-0">
                      {opType === 'birak' ? <Zap className="w-5 h-5 text-amber-600" /> : opType === 'gecerken' ? <Calendar className="w-5 h-5 text-blue-600" /> : <ShoppingBag className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-[#111111] text-sm flex items-center gap-2">
                        Sipariş #{String(order.id || '').substring(0, 8)}
                        <span className="text-[10px] font-bold text-[#8A8A8A] font-mono">
                          {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          opType === 'birak' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          opType === 'gecerken' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-gray-100 text-[#666666] border border-[#E5E7EB]'
                        }`}>
                          {opType === 'birak' ? 'Hemen UĞRA' : opType === 'gecerken' ? 'Geçerken UĞRA' : 'Mağazadan Al'}
                        </span>
                        {isLocked && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> KİLİTLİ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#666666] flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-[#111111]" /> {order.partner_name || partner?.business_name || (opType === 'birak' ? 'Doğrudan Görev (Hemen UĞRA)' : 'Doğrudan Talep')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-[#111111] font-mono">{order.total_price} ₺</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      order.status === 'beklemede' || order.status === 'bekliyor' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      order.status === 'hazirlaniyor' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      order.status === 'yolda' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      order.status === 'tamamlandi' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[#8A8A8A] font-medium">Müşteri:</span>{' '}
                    <strong className="text-[#111111]">{order.customer_name}</strong> ({order.customer_phone || 'Tel yok'})
                  </div>
                  <div className="truncate">
                    <span className="text-[#8A8A8A] font-medium">Teslimat Adresi:</span>{' '}
                    <span className="text-[#111111]">{order.delivery_address || 'Adres belirtilmedi'}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8A8A] font-medium">Kurye / Asistan:</span>{' '}
                    <strong className="text-blue-700">{order.assistant_name || 'Henüz Atanmadı'}</strong>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB] text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingOrder(order)}
                      className="px-3 py-1.5 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB] hover:bg-[#F2F2F3] text-[#111111] font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#111111]" /> Detay
                    </button>

                    {/* Lock / Unlock Toggle */}
                    <button
                      onClick={() => handleToggleLock(order.id)}
                      className={`px-3 py-1.5 rounded-xl border font-bold cursor-pointer flex items-center gap-1 transition-all ${
                        isLocked 
                          ? 'bg-amber-100 border-amber-300 text-amber-800' 
                          : 'bg-[#F7F7F8] border-[#E5E7EB] text-[#666666] hover:text-[#111111]'
                      }`}
                      title={isLocked ? 'Kilidi Aç' : 'Görevi Kilitler'}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5" />}
                      {isLocked ? 'Kilitli' : 'Kilitle'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Assign Courier */}
                    <button
                      onClick={() => setAssigningOrder(order)}
                      disabled={isLocked}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold hover:bg-blue-100 cursor-pointer flex items-center gap-1 disabled:opacity-40"
                    >
                      <Bike className="w-3.5 h-3.5" /> Kurye Ata
                    </button>

                    {/* Force Complete */}
                    {order.status !== 'tamamlandi' && order.status !== 'iptal' && (
                      <button
                        onClick={() => handleForceComplete(order)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 cursor-pointer flex items-center gap-1"
                        title="Zorla Tamamlandı İşaretle"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Manuel Tamamla
                      </button>
                    )}

                    {/* Progress Status */}
                    {(order.status === 'beklemede' || order.status === 'bekliyor') && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'hazirlaniyor')}
                        className="px-3 py-1.5 rounded-xl bg-[#111111] text-white font-bold hover:bg-[#222222] cursor-pointer"
                      >
                        Hazırlanıyor Yap
                      </button>
                    )}

                    {order.status === 'hazirlaniyor' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'yolda')}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer"
                      >
                        Yola Çıkar
                      </button>
                    )}

                    {/* Cancel / Refund */}
                    {order.status !== 'iptal' && (
                      <button
                        onClick={() => handleStartRefund(order)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold hover:bg-red-100 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button onClick={() => setShowEmergencyModal(false)} className="absolute top-4 right-4 p-2 text-[#8A8A8A] hover:text-[#111111] bg-[#F7F7F8] hover:bg-[#F2F2F3] rounded-xl cursor-pointer">
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Acil Görev / Sipariş Başlat</h3>
                <p className="text-[11px] text-[#666666]">Yönetici paneli üzerinden anında kurye çağırma ve görev oluşturma.</p>
              </div>
            </div>

            {emergencyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">
                {emergencyError}
              </div>
            )}

            <form onSubmit={handleCreateEmergencyTaskSubmit} className="space-y-3">
              <div>
                <label className="text-[#666666] font-semibold block mb-1">İlgili Mağaza / Partner (İsteğe Bağlı)</label>
                <select
                  value={emergencyPartnerId}
                  onChange={(e) => setEmergencyPartnerId(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-2.5 text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="">Bağımsız Görev (Mağaza Yok / Hemen UĞRA)</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.business_name} ({p.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#666666] font-semibold block mb-1">Teslim Alma Adresi</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Atatürk Cad. No: 12"
                    value={emergencyPickupAddress}
                    onChange={(e) => setEmergencyPickupAddress(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-2.5 text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="text-[#666666] font-semibold block mb-1">Teslim Etme Adresi</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Çark Cad. No: 88"
                    value={emergencyDeliveryAddress}
                    onChange={(e) => setEmergencyDeliveryAddress(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-2.5 text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#666666] font-semibold block mb-1">Görev Tutarı (₺)</label>
                  <input
                    type="number"
                    required
                    value={emergencyPrice}
                    onChange={(e) => setEmergencyPrice(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-2.5 text-[#111111] focus:outline-none focus:border-[#111111] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[#666666] font-semibold block mb-1">Müşteri ID / Ad</label>
                  <input
                    type="text"
                    value={emergencyCustomerId}
                    onChange={(e) => setEmergencyCustomerId(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-2.5 text-[#111111] focus:outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#666666] font-semibold block mb-1">Görev Talimatı</label>
                <textarea
                  rows={2}
                  placeholder="Kurye için teslimat talimatları..."
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-2.5 text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-xl text-[#666666] font-bold hover:text-[#111111] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={emergencySubmitting}
                  className="px-4 py-2 bg-[#111111] text-white font-bold rounded-xl hover:bg-[#222222] disabled:opacity-50 cursor-pointer"
                >
                  {emergencySubmitting ? 'Oluşturuluyor...' : 'Görevi Başlat & Kuryelere İlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 relative text-xs">
            <button onClick={() => setViewingOrder(null)} className="absolute top-4 right-4 p-2 text-[#8A8A8A] hover:text-[#111111] bg-[#F7F7F8] hover:bg-[#F2F2F3] rounded-xl cursor-pointer">
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-black text-[#111111]">Sipariş #{String(viewingOrder.id || '').substring(0, 8)} İnceleme</h2>

            <div className="p-4 bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl space-y-1.5">
              <div className="font-bold text-[#111111] text-sm">Sipariş Veren: {viewingOrder.customer_name}</div>
              <div><span className="text-[#666666]">Telefon:</span> {viewingOrder.customer_phone || 'Belirtilmedi'}</div>
              <div><span className="text-[#666666]">Adres:</span> {viewingOrder.delivery_address || 'Adres belirtilmedi'}</div>
              <div><span className="text-[#666666]">Ödeme Yöntemi:</span> {viewingOrder.payment_type || 'Nakit / IBAN'}</div>
            </div>

            {/* Order Items */}
            <div className="space-y-2">
              <div className="font-bold text-[#111111]">Sipariş İçeriği ({viewingOrder.items?.length || 1} Kalem)</div>
              {(viewingOrder.items || [{ title: 'Sipariş Kalemi', quantity: 1, price: viewingOrder.total_price }]).map((item: any, idx: number) => (
                <div key={idx} className="p-3 bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl flex items-center justify-between">
                  <span className="font-semibold text-[#111111]">{item.quantity || 1}x {item.title || item.product_name || 'Ürün / Talep'}</span>
                  <span className="font-black text-[#111111] font-mono">{item.price} ₺</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E5E7EB]">
              <button onClick={() => setViewingOrder(null)} className="px-4 py-2 bg-[#111111] text-white font-bold rounded-xl cursor-pointer">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN COURIER MODAL */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button onClick={() => setAssigningOrder(null)} className="absolute top-4 right-4 p-2 text-[#8A8A8A] hover:text-[#111111] bg-[#F7F7F8] hover:bg-[#F2F2F3] rounded-xl cursor-pointer">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-[#111111]">Siparişe Kurye / Asistan Ata</h3>
            <p className="text-[#666666]">Sipariş #{String(assigningOrder.id || '').substring(0, 8)} için asistan seçin:</p>

            {assignError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">
                {assignError}
              </div>
            )}

            <select
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-3 text-[#111111] focus:border-[#111111] focus:outline-none font-semibold"
            >
              <option value="">Asistan / Kurye Seçiniz...</option>
              {assistants.map(a => (
                <option key={a.id} value={a.id}>{a.full_name} ({a.vehicle_type || 'Kurye'} - {a.city || 'Genel'})</option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button onClick={() => setAssigningOrder(null)} className="px-4 py-2 border border-[#E5E7EB] rounded-xl text-[#666666] font-bold cursor-pointer">
                İptal
              </button>
              <button onClick={handleAssignCourier} className="px-4 py-2 bg-[#111111] text-white font-bold rounded-xl hover:bg-[#222222] cursor-pointer">
                Kuryeyi Ata & Bildir
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
