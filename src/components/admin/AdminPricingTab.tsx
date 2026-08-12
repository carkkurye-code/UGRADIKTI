import React from 'react';
import { 
  Calculator, Zap, Coins
} from 'lucide-react';

export function AdminPricingTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#F7F7F8] text-[#111111] border border-[#E5E5E7]">
              <Calculator className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-[#111111]">Fiyatlandırma & İş Modeli</h1>
          </div>
          <p className="text-sm text-[#666666] mt-1">
            UĞRA Müşteri Teklifi ve Asistan Abonelik Modeli Bilgilendirme ve Yönetim Paneli.
          </p>
        </div>
      </div>

      {/* MÜŞTERİ TEKLİFİ VE ABONELİK MODELİ ÖZET BİLGİ KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KART 1: MÜŞTERİ TEKLİF MODELİ */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[#E5E5E7] pb-3">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-[#111111]">Müşteri Teklif Modeli</h3>
              <p className="text-xs text-[#666666]">Serbest Piyasa & Müşteri Odaklı Fiyatlandırma</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#666666] leading-relaxed">
            <p className="text-[#111111] font-bold">
              Platformumuzda otomatik fiyat hesaplama, sabit hizmet bedeli ve komisyon kesintisi kaldırılmıştır.
            </p>
            <ul className="space-y-2 list-disc list-inside text-[#333333]">
              <li>Müşteriler sipariş oluştururken kendi tekliflerini serbestçe belirler.</li>
              <li>Sistemde belirlenmiş minimum teklif tutarı <strong className="text-emerald-700 font-black">100 TL</strong>'dir.</li>
              <li>Asistanlar gelen müşteri tekliflerini "Bekleyen Görevler" sekmesinde inceler ve diledikleri teklifi kabul ederler.</li>
              <li>Kabul edilen teklif tutarının <strong className="text-emerald-700 font-black">%100'ü</strong> doğrudan asistana aittir.</li>
            </ul>
          </div>
        </div>

        {/* KART 2: ASİSTAN ABONELİK MODELİ */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-[#E5E5E7] pb-3">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Coins className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-[#111111]">Asistan Abonelik Gelir Modeli</h3>
              <p className="text-xs text-[#666666]">Komisyonsuz Platform Gelir Yapısı</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#666666] leading-relaxed">
            <p className="text-[#111111] font-bold">
              UĞRA, işlemlerden komisyon almaz; yalnızca müşteri ve asistanı buluşturan bağımsız bir teknoloji platformudur.
            </p>
            <ul className="space-y-2 list-disc list-inside text-[#333333]">
              <li>Platform geliri sipariş komisyonlarıyla değil, Asistan Paneli aylık abonelik sistemiyle sağlanır.</li>
              <li>Asistanlar aylık sabitleşmiş abonelik bedelini ödeyerek sınırsız sipariş alma hakkına sahip olurlar.</li>
              <li>Sistem içerisinde komisyon veya kesinti hesaplamaları yapılmaz.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

