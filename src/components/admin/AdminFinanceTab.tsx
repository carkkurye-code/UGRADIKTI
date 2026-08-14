import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, ArrowUpRight, 
  Bike, RefreshCw, Coins
} from 'lucide-react';
import { Order, Partner, Assistant } from '@/lib/supabase';

interface AdminFinanceTabProps {
  orders: Order[];
  partners: Partner[];
  assistants: Assistant[];
  onRefresh: () => void;
}

export const AdminFinanceTab: React.FC<AdminFinanceTabProps> = ({
  orders,
  partners,
  assistants,
  onRefresh
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const platformCommissionRate = 0; // UĞRA does not take order commission

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 86400000;
  const monthStart = todayStart - 30 * 86400000;

  const activePeriodStart = selectedPeriod === 'daily' ? todayStart : selectedPeriod === 'weekly' ? weekStart : monthStart;

  const validOrders = orders.filter(o => (o.status as string) !== 'iptal' && (o.status as string) !== 'cancelled' && new Date(o.created_at || '').getTime() >= activePeriodStart);

  // Financial calculations based on real orders
  const totalVolume = validOrders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
  const assistantEarningsTotal = totalVolume; // 100% goes to assistants

  // Partner Wise Earnings
  const partnerFinanceMap: Record<string, { name: string; totalVolume: number; commission: number; netPayout: number; orderCount: number }> = {};
  
  validOrders.forEach(o => {
    const pid = o.partner_id || 'unknown';
    const p = partners.find(item => item.id === pid);
    const pName = p?.business_name || 'Partner Mağaza';
    if (!partnerFinanceMap[pid]) {
      partnerFinanceMap[pid] = { 
        name: pName, 
        totalVolume: 0, 
        commission: 0, 
        netPayout: 0, 
        orderCount: 0,
      };
    }
    const val = Number(o.total_price) || 0;
    const pComm = 0;
    const pNet = val;

    partnerFinanceMap[pid].totalVolume += val;
    partnerFinanceMap[pid].commission += pComm;
    partnerFinanceMap[pid].netPayout += pNet;
    partnerFinanceMap[pid].orderCount += 1;
  });

  const partnerFinanceList = Object.values(partnerFinanceMap).sort((a, b) => b.totalVolume - a.totalVolume);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Finans & Hakediş Yönetimi</h1>
          <p className="text-sm text-[#666666] mt-1">Sipariş hacmi, mağaza ciroları ve asistan hakediş dökümü.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onRefresh()}
            className="px-3.5 py-2 rounded-xl bg-[#F7F7F8] border border-[#E5E5E7] hover:bg-[#F2F2F3] text-xs font-bold text-[#111111] flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#111111]" />
            Yenile
          </button>

          <div className="flex items-center gap-1 bg-[#F7F7F8] p-1 rounded-xl border border-[#E5E5E7]">
            <button
              onClick={() => setSelectedPeriod('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                selectedPeriod === 'daily' ? 'bg-[#111111] text-white font-bold' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Günlük
            </button>
            <button
              onClick={() => setSelectedPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                selectedPeriod === 'weekly' ? 'bg-[#111111] text-white font-bold' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Haftalık
            </button>
            <button
              onClick={() => setSelectedPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                selectedPeriod === 'monthly' ? 'bg-[#111111] text-white font-bold' : 'text-[#666666] hover:text-[#111111]'
              }`}
            >
              Aylık
            </button>
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Toplam İşlem Hacmi (Ciro)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {validOrders.length} Tamamlanan Sipariş
          </span>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Sipariş Komisyonu (%0)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            0,00 ₺
          </div>
          <span className="text-[11px] text-[#666666]">Komisyonsuz Abonelik Modeli</span>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Müşteri Teklif Hacmi</span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
          <span className="text-[11px] text-blue-700 font-bold">Toplam Müşteri Teklifleri</span>
        </div>

        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-[#666666] text-xs font-semibold">
            <span>Asistan Hakediş Havuzu (%100)</span>
            <Bike className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-[#111111] font-mono">
            {assistantEarningsTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </div>
          <span className="text-[11px] text-purple-700 font-bold">Aktif {assistants.length} Asistana %100 Aktarım</span>
        </div>
      </div>

      {/* PARTNER PAYOUT TABLE */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#E5E5E7] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[#111111]">Mağaza Hakediş Raporu</h3>
            <p className="text-xs text-[#666666]">Seçili periyoddaki mağaza başı ciro, sipariş sayısı ve net hakediş dökümü.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111111]">
            <thead className="bg-[#F7F7F8] border-b border-[#E5E5E7] text-[#666666] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Partner Mağaza</th>
                <th className="px-5 py-3.5">Sipariş Sayısı</th>
                <th className="px-5 py-3.5">Toplam Ciro</th>
                <th className="px-5 py-3.5">Komisyon (%{Math.round(platformCommissionRate * 100)})</th>
                <th className="px-5 py-3.5 text-right">Net Hakediş</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {partnerFinanceList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#666666]">
                    Seçili periyodda finansal işlem kaydı bulunmuyor.
                  </td>
                </tr>
              ) : (
                partnerFinanceList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F2F2F3] transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#111111]">{row.name}</td>
                    <td className="px-5 py-3.5 font-mono text-[#666666]">{row.orderCount} Sipariş</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-[#111111]">
                      {row.totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="px-5 py-3.5 font-mono text-red-600 font-bold">
                      -{row.commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="px-5 py-3.5 font-mono font-black text-right text-emerald-700">
                      {row.netPayout.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
