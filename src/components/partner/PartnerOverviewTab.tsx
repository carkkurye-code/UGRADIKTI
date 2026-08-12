import React, { useEffect, useState } from 'react';
import { Order, Product, Partner, isUUID } from '@/lib/supabase';
import { ShoppingBag, CircleDollarSign, TrendingUp, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Package } from 'lucide-react';
import { PartnerOperationsService } from '@/services/partnerOperations';
import { WalletService } from '@/services/walletService';
import { PartnerDashboardMetrics } from '@/types/partnerOperations';

interface PartnerOverviewTabProps {
  partner?: Partner | null;
  orders: Order[];
  products: Product[];
  onSelectOrder: (orderId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const PartnerOverviewTab: React.FC<PartnerOverviewTabProps> = ({
  partner,
  orders,
  products,
  onSelectOrder,
  onNavigateTab
}) => {
  const [metrics, setMetrics] = useState<PartnerDashboardMetrics | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    const partnerId = partner?.id || orders[0]?.partner_id;
    if (!partnerId || !isUUID(partnerId)) {
      return;
    }
    
    Promise.all([
      PartnerOperationsService.getDashboardMetrics(partnerId),
      WalletService.getWallet(partnerId),
    ]).then(([m, w]) => {
      setMetrics(m);
      if (w.data) {
        setWalletBalance(w.data.available_balance);
      }
    }).catch(err => console.error('Error fetching partner metrics:', err));
  }, [partner?.id, orders]);

  // Fallback Calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const completedOrders = orders.filter(o => o.status === 'tamamlandi');
  
  const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr));
  const todayEarnings = metrics ? metrics.totalRevenue : todayOrders
    .filter(o => o.status === 'tamamlandi')
    .reduce((acc, curr) => acc + curr.total_price, 0);

  const weeklyEarnings = completedOrders
    .filter(o => new Date(o.created_at) >= sevenDaysAgo)
    .reduce((acc, curr) => acc + curr.total_price, 0);

  const monthlyEarnings = completedOrders
    .filter(o => new Date(o.created_at) >= thirtyDaysAgo)
    .reduce((acc, curr) => acc + curr.total_price, 0);

  const pendingCount = metrics ? metrics.pendingOrderCount : orders.filter(o => o.status === 'beklemede').length;
  const preparingCount = orders.filter(o => o.status === 'hazirlaniyor').length;
  const deliveredCount = metrics ? metrics.todayOrderCount : orders.filter(o => o.status === 'tamamlandi').length;
  const cancelledCount = orders.filter(o => o.status === 'iptal').length;

  // Top Selling Products Calculation
  const topSellingProducts = React.useMemo(() => {
    const map: Record<string, { title: string; count: number; total: number }> = {};
    orders.forEach(o => {
      if (o.status === 'iptal') return;
      let itemsArr: any[] = [];
      if (Array.isArray(o.items)) itemsArr = o.items;
      else if (typeof o.items === 'string') {
        try { itemsArr = JSON.parse(o.items); } catch(e){}
      }
      itemsArr.forEach((item: any) => {
        const title = item.title || item.name || 'Bilinmeyen Ürün';
        const qty = item.quantity || 1;
        const price = item.price || 0;
        if (!map[title]) {
          map[title] = { title, count: 0, total: 0 };
        }
        map[title].count += qty;
        map[title].total += qty * price;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Financial & Operational Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Bugünkü Kazanç</span>
            <CircleDollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2 font-mono">{todayEarnings.toLocaleString('tr-TR')} ₺</h3>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-500" /> Bugünkü {todayOrders.length} siparişten
          </p>
        </div>

        <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Haftalık Kazanç</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2 font-mono">{weeklyEarnings.toLocaleString('tr-TR')} ₺</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Son 7 gün toplamı</p>
        </div>

        <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Aylık Kazanç</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2 font-mono">{monthlyEarnings.toLocaleString('tr-TR')} ₺</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Son 30 gün toplamı</p>
        </div>

        <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Bugünkü Sipariş</span>
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-2xl font-black text-white mt-2 font-mono">{todayOrders.length} adet</h3>
          <p className="text-[10px] text-muted-foreground mt-1">Toplam alınan sipariş adedi</p>
        </div>
      </div>

      {/* Order Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => onNavigateTab('orders')} 
          className="bg-[#121214] border border-[#242428] rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1E] transition-all"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-white tracking-wider">Bekleyen Sipariş</span>
            <h4 className="text-xl font-black text-white font-mono">{pendingCount}</h4>
          </div>
          <Clock className="w-5 h-5 text-white" />
        </div>

        <div 
          onClick={() => onNavigateTab('orders')} 
          className="bg-[#111113] border border-blue-500/20 bg-blue-500/5 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-blue-500/10 transition-all"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">Hazırlanan Sipariş</span>
            <h4 className="text-xl font-black text-white font-mono">{preparingCount}</h4>
          </div>
          <AlertCircle className="w-5 h-5 text-blue-400" />
        </div>

        <div 
          onClick={() => onNavigateTab('orders')} 
          className="bg-[#111113] border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-emerald-500/10 transition-all"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Teslim Edilen</span>
            <h4 className="text-xl font-black text-white font-mono">{deliveredCount}</h4>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>

        <div 
          onClick={() => onNavigateTab('orders')} 
          className="bg-[#111113] border border-red-500/20 bg-red-500/5 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-red-500/10 transition-all"
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider">İptal Edilen</span>
            <h4 className="text-xl font-black text-white font-mono">{cancelledCount}</h4>
          </div>
          <XCircle className="w-5 h-5 text-red-400" />
        </div>
      </div>

      {/* Main Grid: Son Siparişler & En Çok Satanlar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Son Siparişler (7 cols) */}
        <div className="lg:col-span-7 bg-[#111113] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-white text-base">Son Siparişler</h3>
            <button 
              onClick={() => onNavigateTab('orders')} 
              className="text-xs text-primary font-semibold hover:underline bg-transparent border-0 cursor-pointer"
            >
              Tümünü Gör ({orders.length})
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-white/5 rounded-xl">
              Henüz sipariş kaydı oluşmadı.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map(o => (
                <div 
                  key={o.id}
                  onClick={() => {
                    onNavigateTab('orders');
                    onSelectOrder(o.id);
                  }}
                  className="p-3 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{o.customer_name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">#{String(o.id || '').substring(0, 6)}</span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(o.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white">{o.total_price} ₺</span>
                    {o.status === 'beklemede' && <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold text-[10px]">Beklemede</span>}
                    {o.status === 'hazirlaniyor' && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold text-[10px]">Hazırlanıyor</span>}
                    {o.status === 'yolda' && <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold text-[10px]">Yolda</span>}
                    {o.status === 'tamamlandi' && <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">Tamamlandı</span>}
                    {o.status === 'iptal' && <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-bold text-[10px]">İptal</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* En Çok Satan Ürünler (5 cols) */}
        <div className="lg:col-span-5 bg-[#111113] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-white text-base">En Çok Satan Ürünler</h3>
            <Package className="w-4 h-4 text-primary" />
          </div>

          {topSellingProducts.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-white/5 rounded-xl">
              Satış verisi henüz yok.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topSellingProducts.map((p, i) => (
                <div key={i} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-white truncate">{p.title}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-primary font-mono block">{p.count} adet</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{p.total} ₺</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
