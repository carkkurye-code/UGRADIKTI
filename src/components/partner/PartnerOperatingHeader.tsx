import React from 'react';
import { Partner } from '@/lib/supabase';
import { Clock, Zap, AlertTriangle, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

interface PartnerOperatingHeaderProps {
  partner: Partner;
  operatingStatus: 'open' | 'closed' | 'busy' | 'temp_closed';
  prepTime: number | string;
  onStatusChange: (status: 'open' | 'closed' | 'busy' | 'temp_closed') => void;
  onPrepTimeChange: (mins: number) => void;
}

export const PartnerOperatingHeader: React.FC<PartnerOperatingHeaderProps> = ({
  partner,
  operatingStatus,
  prepTime,
  onStatusChange,
  onPrepTimeChange
}) => {
  return (
    <div className="bg-[#111113] border border-white/5 rounded-2xl p-4 md:p-5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
      {/* Store Status Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-white" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">İşletme Çalışma Durumu</span>
          {operatingStatus === 'busy' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-[#D6D6D6] border border-[#242428] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-white" />
              Müşterilere +15 dk ek hazırlama süresi gösterilir
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onStatusChange('open')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              operatingStatus === 'open'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/10'
                : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            Açık
          </button>

          <button
            type="button"
            onClick={() => onStatusChange('busy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              operatingStatus === 'busy'
                ? 'bg-white/15 border-white/30 text-white shadow-md shadow-white/5'
                : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
            Yoğun Modu
          </button>

          <button
            type="button"
            onClick={() => onStatusChange('temp_closed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              operatingStatus === 'temp_closed'
                ? 'bg-slate-500/20 border-slate-500/50 text-slate-300 shadow-md shadow-slate-500/10'
                : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Geçici Kapalı
          </button>

          <button
            type="button"
            onClick={() => onStatusChange('closed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              operatingStatus === 'closed'
                ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-md shadow-red-500/10'
                : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Kapalı
          </button>
        </div>
      </div>

      {/* Preparation Time Selector */}
      <div className="space-y-2 border-t lg:border-t-0 lg:border-l border-white/5 pt-3 lg:pt-0 lg:pl-6">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Varsayılan Hazırlama Süresi</span>
        </div>

        <div className="flex items-center gap-1.5">
          {[10, 20, 30, 45, 60].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => onPrepTimeChange(mins)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border ${
                prepTime === mins
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]'
              }`}
            >
              {mins} dk
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
