import React, { useState } from 'react';
import { Campaign } from '@/lib/supabase';
import { Megaphone, Plus, Percent, Calendar, CheckCircle2, X, Trash2, Tag } from 'lucide-react';

interface PartnerCampaignsTabProps {
  campaigns: Campaign[];
  onSaveCampaign: (data: { title: string; discount_rate: number; start_date: string; end_date: string }) => void;
  onToggleCampaign: (campaignId: string, active: boolean) => void;
  onDeleteCampaign: (campaignId: string) => void;
}

export const PartnerCampaignsTab: React.FC<PartnerCampaignsTabProps> = ({
  campaigns,
  onSaveCampaign,
  onToggleCampaign,
  onDeleteCampaign
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [discountRate, setDiscountRate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSaveCampaign({
      title,
      discount_rate: parseFloat(discountRate) || 10,
      start_date: startDate,
      end_date: endDate
    });
    setShowModal(false);
    setTitle('');
    setDiscountRate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">İndirim & Kampanya Yönetimi</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Müşterilerinizi çekmek için özel indirim kuponları ve mağaza kampanyaları düzenleyin.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all border-0 shadow-md shadow-primary/10"
        >
          <Plus className="w-4 h-4" /> Yeni Kampanya Başlat
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 bg-[#111113] border border-white/5 rounded-2xl">
          <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium">Henüz kampanya oluşturmadınız.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map(cmp => (
            <div key={cmp.id} className="bg-[#111113] border border-white/5 rounded-2xl p-5 space-y-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black font-mono text-lg shrink-0">
                    %{cmp.discount_rate}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{cmp.title}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-muted-foreground/60" /> {cmp.start_date} &rarr; {cmp.end_date}
                    </span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  cmp.active 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}>
                  {cmp.active ? 'Aktif Kampanya' : 'Sona Erdi'}
                </span>
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => onToggleCampaign(cmp.id, !cmp.active)}
                  className="text-xs text-primary font-semibold hover:underline bg-transparent border-0 cursor-pointer"
                >
                  {cmp.active ? 'Kampanyayı Durdur' : 'Kampanyayı Yeniden Başlat'}
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteCampaign(cmp.id)}
                  className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-400 cursor-pointer border border-red-500/10"
                  title="Kampanyayı Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campaign Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-white/5 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" /> Yeni Kampanya Tanımla
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kampanya Başlığı</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kampanya Başlığı"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">İndirim Oranı (%)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={90}
                  value={discountRate}
                  onChange={(e) => setDiscountRate(e.target.value)}
                  placeholder="20"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Başlangıç</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#111113] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3 text-xs text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bitiş Tarihi</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#111113] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3 text-xs text-foreground"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-foreground font-semibold rounded-xl text-xs cursor-pointer border-0"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs cursor-pointer border-0"
                >
                  Kampanyayı Yayınla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
