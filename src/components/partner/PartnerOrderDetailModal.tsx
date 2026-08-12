import React from 'react';
import { Order } from '@/lib/supabase';
import { X, Printer, Phone, MapPin, Clock, DollarSign, ShoppingBag, CheckCircle2, User } from 'lucide-react';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface PartnerOrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: any) => void;
}

export const PartnerOrderDetailModal: React.FC<PartnerOrderDetailModalProps> = ({
  order,
  onClose,
  onStatusChange
}) => {
  useModalBackButton(Boolean(order), onClose, 'partner-order-detail-modal');

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  let itemsArr: any[] = [];
  if (Array.isArray(order.items)) itemsArr = order.items;
  else if (typeof order.items === 'string') {
    try { itemsArr = JSON.parse(order.items); } catch(e){}
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] touch-none animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-[10000] bg-[#171A20] border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#171A20] flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-24">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-mono text-xs bg-white/10 border border-white/10 px-2 py-0.5 rounded-md">
                #{String(order.id || '').substring(0, 8)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(order.created_at).toLocaleString('tr-TR')}
              </span>
            </div>
            <h3 className="font-bold text-white text-lg sm:text-xl tracking-tight mt-1">Sipariş Detayı & Fiş</h3>
          </div>

          <div className="flex items-center gap-2 absolute top-4 right-4 sm:top-5 sm:right-5 z-20">
            <button
              type="button"
              onClick={handlePrint}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Yazdır / Fiş Çıkar"
            >
              <Printer className="w-4.5 h-4.5 text-white" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              title="Kapat"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">

        {/* Customer Information Card */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> Müşteri Bilgileri</span>
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">
              {order.payment_type === 'kapida_nakit' && 'Kapıda Nakit'}
              {order.payment_type === 'kapida_kart' && 'Kapıda Kart'}
              {order.payment_type === 'online' && 'Online Kredi Kartı'}
            </span>
          </div>

          <h4 className="font-extrabold text-white text-base">{order.customer_name}</h4>

          <div className="space-y-1 pt-1 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 font-medium">
              <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" /> {order.customer_phone}
            </p>
            <p className="flex items-start gap-2 font-medium">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 mt-0.5" /> {order.customer_address}
            </p>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-white" /> Sipariş Kalemleri
          </h4>

          <div className="border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5 text-xs">
            {itemsArr.map((item, idx) => (
              <div key={idx} className="p-3 bg-white/[0.01] flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block">{item.title || item.name}</span>
                  {item.price && <span className="text-[10px] text-muted-foreground font-mono">{item.price} ₺ / adet</span>}
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-white block">x{item.quantity || 1}</span>
                  <span className="font-mono text-white font-semibold">{(item.price || 0) * (item.quantity || 1)} ₺</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes if any */}
        {order.notes && (
          <div className="bg-[#161618] border border-[#242428] rounded-xl p-3 text-xs text-[#D6D6D6] space-y-1">
            <strong className="block uppercase text-[10px] tracking-wider text-white">Müşteri Sipariş Notu:</strong>
            <p className="italic">"{order.notes}"</p>
          </div>
        )}

        {/* Total Price & Status Selector */}
        <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-muted-foreground block">Toplam Ödenecek Tutar</span>
            <span className="text-2xl font-black text-white font-mono">{order.total_price} ₺</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Durum:</span>
            <select
              value={order.status === 'beklemede' ? 'bekliyor' : order.status === 'yolda' ? 'hazir' : order.status === 'tamamlandi' ? 'teslim_edildi' : order.status}
              onChange={(e) => onStatusChange(order.id, e.target.value as any)}
              className="bg-[#18181b] border border-white/10 rounded-xl py-2 px-3 text-xs text-foreground outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="bekliyor">Bekliyor</option>
              <option value="hazirlaniyor">Hazırlanıyor</option>
              <option value="hazir">Hazır</option>
              <option value="teslim_edildi">Teslim Edildi</option>
              <option value="iptal">İptal</option>
            </select>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};
