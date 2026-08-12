import React from 'react';
import { Order, Product } from '@/lib/supabase';
import { BarChart3, TrendingUp, Clock, Calendar, CheckCircle2, ShoppingBag } from 'lucide-react';

interface PartnerAnalyticsTabProps {
  orders: Order[];
  products: Product[];
}

export const PartnerAnalyticsTab: React.FC<PartnerAnalyticsTabProps> = ({ orders, products }) => {
  // Peak Order Hours Calculation (0-23)
  const peakHours = React.useMemo(() => {
    const hours = Array(24).fill(0);
    orders.forEach(o => {
      if (o.created_at) {
        const h = new Date(o.created_at).getHours();
        if (h >= 0 && h < 24) hours[h]++;
      }
    });
    return hours;
  }, [orders]);

  const maxHourCount = Math.max(...peakHours, 1);

  // Category breakdown
  const categoryStats = React.useMemo(() => {
    const map: Record<string, { title: string; count: number; total: number }> = {};
    orders.forEach(o => {
      if (o.status === 'iptal') return;
      let itemsArr: any[] = [];
      if (Array.isArray(o.items)) itemsArr = o.items;
      else if (typeof o.items === 'string') {
        try { itemsArr = JSON.parse(o.items); } catch(e){}
      }
      itemsArr.forEach((item: any) => {
        const cat = item.category || 'Genel';
        const qty = item.quantity || 1;
        const price = item.price || 0;
        if (!map[cat]) map[cat] = { title: cat, count: 0, total: 0 };
        map[cat].count += qty;
        map[cat].total += qty * price;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [orders]);

  const totalRevenue = orders
    .filter(o => o.status === 'tamamlandi')
    .reduce((acc, curr) => acc + curr.total_price, 0);

  const completedCount = orders.filter(o => o.status === 'tamamlandi').length;
  const completionRate = orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">İstatistikler & Performans Analizi</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Satış grafikleriniz, yoğun saat aralıklarınız ve kategorisel performansınız.</p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Toplam Ciro</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-white font-mono">{totalRevenue.toLocaleString('tr-TR')} ₺</h3>
          <p className="text-[10px] text-muted-foreground">Tüm tamamlanmış siparişlerin toplamı</p>
        </div>

        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Teslim Başarı Oranı</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-2xl font-black text-white font-mono">%{completionRate}</h3>
          <p className="text-[10px] text-muted-foreground">{completedCount} / {orders.length} sipariş tamamlandı</p>
        </div>

        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Ortalama Sipariş Tutarı</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-2xl font-black text-white font-mono">
            {completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0} ₺
          </h3>
          <p className="text-[10px] text-muted-foreground">Sipariş başı ortalama sepet büyüklüğü</p>
        </div>
      </div>

      {/* Peak Hours Histogram Graph */}
      <div className="bg-[#111113] border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Yoğun Sipariş Saatleri
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Günün hangi saatlerinde daha çok sipariş aldığınızı inceleyin.</p>
          </div>
          <span className="text-xs text-primary font-mono font-bold bg-primary/10 px-2.5 py-1 rounded-lg">Saatlik Histogram</span>
        </div>

        <div className="pt-6 pb-2 overflow-x-auto">
          <div className="flex items-end justify-between gap-1 min-w-[600px] h-40 border-b border-white/10 pb-2">
            {peakHours.map((count, hour) => {
              const heightPercent = maxHourCount > 0 ? (count / maxHourCount) * 100 : 0;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Hover tooltip */}
                  {count > 0 && (
                    <div className="absolute -top-8 bg-primary text-primary-foreground text-[10px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono pointer-events-none whitespace-nowrap">
                      Saat {hour}:00 &rarr; {count} sipariş
                    </div>
                  )}

                  <div className="w-full bg-white/[0.03] rounded-t-sm h-full flex items-end">
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        count > 0 ? 'bg-primary group-hover:bg-primary/80' : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.max(heightPercent, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <span className="text-[9px] text-muted-foreground/60 font-mono">
                    {hour < 10 ? `0${hour}` : hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-[#111113] border border-white/5 rounded-2xl p-6 space-y-4">
        <h3 className="font-extrabold text-white text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-white" /> Kategorisel Satış Dağılımı
        </h3>

        {categoryStats.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">Kategori bazlı henüz sipariş verisi bulunmuyor.</p>
        ) : (
          <div className="space-y-3">
            {categoryStats.map((cat, idx) => {
              const percent = totalRevenue > 0 ? Math.round((cat.total / totalRevenue) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-white">{cat.title} ({cat.count} ürün)</span>
                    <span className="text-primary font-mono">{cat.total} ₺ (%{percent})</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
