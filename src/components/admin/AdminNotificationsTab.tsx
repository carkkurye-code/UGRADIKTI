import React, { useState } from 'react';
import { 
  Bell, Send, Users, Building, Bike, MapPin, Layers, CheckCircle2
} from 'lucide-react';
import { Partner, Assistant, OFFICIAL_PARTNER_CATEGORIES, db } from '@/lib/supabase';
import { adminTheme } from './adminTheme';

interface AdminNotificationsTabProps {
  partners: Partner[];
  assistants: Assistant[];
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  partners,
  assistants
}) => {
  const [targetType, setTargetType] = useState<'all' | 'partners' | 'assistants' | 'city' | 'category'>('all');
  const [selectedCity, setSelectedCity] = useState('İstanbul');
  const [selectedCategory, setSelectedCategory] = useState(OFFICIAL_PARTNER_CATEGORIES[0] || 'Kahve');

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    await db.logAction({
      action: 'PUSH_NOTIFICATION_SENT',
      entity_type: 'notification',
      details: {
        target: targetType,
        city: targetType === 'city' ? selectedCity : undefined,
        category: targetType === 'category' ? selectedCategory : undefined,
        title,
        message
      }
    });

    setSuccessMsg(`Push bildirim başarıyla ${
      targetType === 'all' ? 'Tüm Kullanıcılara' :
      targetType === 'partners' ? 'Tüm Partner Mağazalara' :
      targetType === 'assistants' ? 'Tüm Kuryelere' :
      targetType === 'city' ? `${selectedCity} Şehrindeki Kullanıcılara` :
      `${selectedCategory} Kategorisindeki Mağazalara`
    } gönderildi!`);

    setTitle('');
    setMessage('');

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Push & Mobil Bildirim Merkezi</h1>
          <p className="text-sm text-[#666666] mt-1">Platform genelindeki müşterilere, bayi mağazalarına veya kuryelere anlık bildirim gönderin.</p>
        </div>
        <div className="px-3.5 py-2 bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl text-[#111111] font-bold text-xs flex items-center gap-1.5 shrink-0">
          <Bell className="w-4 h-4 text-[#111111]" /> Anlık Duyuru Servisi
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-2 bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="font-bold text-base text-[#111111] border-b border-[#E5E5E7] pb-3">Bildirim Detayları</h2>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSendNotification} className="space-y-4 text-xs font-medium">
            {/* Target Selection */}
            <div className="space-y-2">
              <label className="text-[#666666] uppercase tracking-wider font-bold text-[10px]">Hedef Kitle</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                    targetType === 'all' ? 'bg-[#111111] border-[#111111] text-white font-bold' : 'bg-[#F7F7F8] border-[#E5E5E7] text-[#666666] hover:bg-[#F2F2F3] hover:text-[#111111]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Tüm Platform</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('partners')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                    targetType === 'partners' ? 'bg-[#111111] border-[#111111] text-white font-bold' : 'bg-[#F7F7F8] border-[#E5E5E7] text-[#666666] hover:bg-[#F2F2F3] hover:text-[#111111]'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Sadece Partnerler</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('assistants')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                    targetType === 'assistants' ? 'bg-[#111111] border-[#111111] text-white font-bold' : 'bg-[#F7F7F8] border-[#E5E5E7] text-[#666666] hover:bg-[#F2F2F3] hover:text-[#111111]'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>Sadece Kuryeler</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('city')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                    targetType === 'city' ? 'bg-[#111111] border-[#111111] text-white font-bold' : 'bg-[#F7F7F8] border-[#E5E5E7] text-[#666666] hover:bg-[#F2F2F3] hover:text-[#111111]'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Belirli Şehir</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('category')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                    targetType === 'category' ? 'bg-[#111111] border-[#111111] text-white font-bold' : 'bg-[#F7F7F8] border-[#E5E5E7] text-[#666666] hover:bg-[#F2F2F3] hover:text-[#111111]'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Belirli Kategori</span>
                </button>
              </div>
            </div>

            {/* City Dropdown if target city */}
            {targetType === 'city' && (
              <div className="space-y-1">
                <label className="text-[#666666] font-semibold">Şehir Seçin</label>
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="İstanbul">İstanbul</option>
                  <option value="Ankara">Ankara</option>
                  <option value="İzmir">İzmir</option>
                  <option value="Bursa">Bursa</option>
                  <option value="Antalya">Antalya</option>
                </select>
              </div>
            )}

            {/* Category Dropdown if target category */}
            {targetType === 'category' && (
              <div className="space-y-1">
                <label className="text-[#666666] font-semibold">Kategori Seçin</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  {OFFICIAL_PARTNER_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <label className="text-[#666666] font-semibold">Bildirim Başlığı</label>
              <input
                type="text"
                required
                placeholder="Örn: Hafta Sonu Fırsatı Geldi! 🚀"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border border-[#E5E5E7] rounded-xl p-3 text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111]"
              />
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="text-[#666666] font-semibold">Bildirim İçeriği</label>
              <textarea
                rows={4}
                required
                placeholder="Tüm siparişlerinizde geçerli %20 indirim kuponunuz tanımlandı. Hemen sipariş verin!"
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-white border border-[#E5E5E7] rounded-xl p-3 text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#111111] resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="bg-[#111111] hover:bg-[#222222] text-white font-extrabold px-6 py-3 rounded-xl flex items-center gap-2 border-0 cursor-pointer transition-all shadow-sm"
              >
                <Send className="w-4 h-4 text-white" /> Bildirimi Şimdi Gönder
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-xs text-[#666666] uppercase tracking-wider">Mobil Önizleme</h3>
          <div className="bg-[#F7F7F8] border border-[#E5E5E7] rounded-2xl p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-[#666666]">
              <div className="flex items-center gap-1.5 font-bold text-[#111111]">
                <div className="w-5 h-5 rounded-lg bg-[#111111] text-white flex items-center justify-center font-black text-[9px]">U</div>
                UĞRA
              </div>
              <span>şimdi</span>
            </div>
            <div className="font-extrabold text-sm text-[#111111] leading-snug">
              {title || 'Bildirim Başlığı Buraya Gelir'}
            </div>
            <p className="text-xs text-[#666666] leading-relaxed">
              {message || 'Bildirim açıklaması ve detayları burada görüntülenecektir.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

