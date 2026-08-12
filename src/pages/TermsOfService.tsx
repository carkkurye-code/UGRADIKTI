import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { X, FileText, ShieldOff, AlertTriangle, Cpu, Users, Scale, Ban, CheckCircle2, DollarSign, Store, ShoppingBag } from 'lucide-react';
import { useLocation } from 'wouter';

export function TermsOfService() {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const sections = [
    {
      id: "dijital-altyapi-modeli",
      icon: Cpu,
      title: "1. Dijital Yazılım Altyapısı ve SaaS İş Modeli",
      paragraphs: [
        "UĞRA Teknoloji A.Ş. (\"UĞRA\"), yalnızca bağımsız partner mağazalara mağaza paneli ve bağımsız asistanlara asistan paneli kiralayan bir yazılım ve teknoloji platformudur (SaaS - Software as a Service).",
        "UĞRA'nın tek ticari faaliyeti ve tek gelir kaynağı; Mağaza Paneli ve Asistan Paneli için tahsil edilen aylık/yıllık yazılım abonelik kullanım ücretleridir. UĞRA bu abonelik kiralama hizmetleri karşılığında ilgili firmalara ve kullanıcılara yazılım faturası kesmektedir.",
        "UĞRA kesinlikle satıcı, hizmet sağlayıcı, kurye şirketi, teslimat firması, komisyoncu, pazar yeri işletmecisi, ödeme kuruluşu veya elektronik para kuruluşu DEĞİLDİR.",
        "UĞRA; platform üzerinden ilan edilen veya gerçekleşen hiçbir siparişin, hiçbir ürün satışının, hiçbir hizmetin, hiçbir teslimatın, hiçbir ödeme işleminin ve taraflar arasında akdedilen hiçbir ticari sözleşmenin tarafı, aracı veya komisyoncusu değildir."
      ]
    },
    {
      id: "taraflar-ve-ucret-politikasi",
      icon: DollarSign,
      title: "2. Tarafların Rolleri ve Sıfır Komisyon Politikası",
      paragraphs: [
        "Platform üzerindeki tarafların hak ve yükümlülükleri ile yazılım kullanım şartları aşağıda açıkça düzenlenmiştir:"
      ],
      items: [
        "Müşteriler (Kullanıcılar): Platformu tamamen ÜCRETSİZ kullanırlar. Üyelik oluşturmak, ilan/talep yayınlamak veya mağazaları incelemek ücretsizdir. UĞRA müşterilerden hiçbir ad altında ücret veya hizmet bedeli almaz.",
        "Asistanlar (Bağımsız Hizmet Sağlayıcılar): Yalnızca Asistan Paneli yazılım kullanım abonelik ücreti öderler. Kabul ettikleri görevlerden elde ettikleri ücretin %100'ü kendilerine aittir. UĞRA asistan kazançlarından hiçbir komisyon, kesinti veya hizmet bedeli almaz.",
        "Partner Mağazalar (Bağımsız Satıcılar): Yalnızca Mağaza Paneli yazılım kullanım abonelik ücreti öderler. UĞRA, mağazaların ürün satışlarından veya siparişlerinden pay/komisyon almaz, mağaza gelirlerine ortak değildir."
      ]
    },
    {
      id: "talep-ve-siparis-akis-kurallari",
      icon: ShoppingBag,
      title: "3. Talep ve Sipariş Akış Esasları",
      paragraphs: [
        "Platform üzerindeki dijital etkileşimler tamamen bağımsız taraflar arasında yürütülmektedir:"
      ],
      items: [
        "Kişisel Talep Akışı (\"Hazır Olanı Al\" / \"Hazır Olanı Bırak\"): Müşteri talep oluşturur ve sunacağı hizmet bedelini kendisi belirler (Örn: 200 TL). Bu talep yalnızca yazılım paneli aktif olan asistanlara ilan edilir. İsteyen bağımsız asistan talebi kabul eder. Müşteri ile asistan doğrudan iletişime geçer ve hizmeti gerçekleştirir. Ödeme tamamen müşteri ile asistan arasındadır; UĞRA bu sürecin hiçbir aşamasına müdahil olmaz.",
        "Mağaza Sipariş Akışı: Müşteri platform üzerinden partner mağazanın ürünlerini görüntüler ve sipariş oluşturur. Sipariş doğrudan mağaza paneline düşer. Mağaza siparişi ister kendi imkanlarıyla teslim eder, ister paneldeki bağımsız bir asistan ile anlaşarak teslim ettirir. Süreç tamamen mağaza, asistan ve müşteri arasındadır."
      ]
    },
    {
      id: "taraflar-arasi-bagimsiz-iliski",
      icon: Users,
      title: "4. Taraflar Arası Bağımsız Hukuki İlişkiler",
      paragraphs: [
        "Platform üzerinde kurulabilecek tüm hukuki ve ticari ilişkiler münhasıran ve doğrudan bağımsız taraflar arasında teşekkül eder:",
      ],
      items: [
        "Talep Oluşturan (Müşteri) ↔ Asistan (Bağımsız Hizmet Sağlayıcı)",
        "Talep Oluşturan (Müşteri) ↔ Partner Mağaza (Bağımsız Satıcı)",
        "Asistan (Bağımsız Hizmet Sağlayıcı) ↔ Partner Mağaza (Bağımsız Satıcı)"
      ],
      outro: "UĞRA yukarıda sayılan ilişkilerin hiçbirinde taraf, temsilci, acente, kefil, komisyoncu veya garantör sıfatını haiz değildir. Platform sadece tarafların birbirini bulmasını sağlayan yazılım altyapısını sunar."
    },
    {
      id: "sorumluluk-reddi",
      icon: ShieldOff,
      title: "5. EKSİKSİZ SORUMLULUK REDDİ (Yasal Beyan)",
      isHighlighted: true,
      paragraphs: [
        "UĞRA Teknoloji A.Ş., platform üzerinden gerçekleşen hiçbir ticari veya fiziki işlemden dolayı hukuki, idari, mali veya cezai sorumluluk kabul etmez. Aşağıdaki hususlar eksiksiz olarak UĞRA'nın sorumluluk alanı dışındadır:"
      ],
      disclaimerList: [
        "UĞRA satıcı değildir, ürün satışı yapmaz.",
        "UĞRA hizmet sağlayıcı değildir, sahada hizmet vermez.",
        "UĞRA kurye veya teslimat firması değildir, taşıma taahhüdünde bulunmaz.",
        "UĞRA ödeme kuruluşu veya elektronik para kuruluşu değildir, aracı ödeme hizmeti sunmaz.",
        "UĞRA komisyoncu değildir, satışlardan komisyon veya pay almaz.",
        "UĞRA ürünlerin, hizmetlerin, gıdaların veya teslimatların kalitesinden, tazeliğinden ve ayıplarından sorumlu değildir.",
        "UĞRA partner mağazaların ve asistanların eylem, işlem, ihmal veya davranışlarından sorumlu değildir.",
        "UĞRA teslim edilmeyen, geciken, eksik veya hasarlı teslimatlardan ve oluşan zararlardan sorumlu değildir.",
        "UĞRA kullanıcılar, mağazalar ve asistanlar arasında doğabilecek ödeme anlaşmazlıklarından, borç-alacak ilişkilerinden ve ticari uyuşmazlıklardan sorumlu değildir.",
        "UĞRA tarafların vergi yükümlülüklerinden (KDV, stopaj, faturalandırma vb.) sorumlu değildir; taraflar kendi vergi ve fatura yükümlülüklerinden kendileri sorumludur."
      ]
    },
    {
      id: "yasakli-faaliyetler",
      icon: Ban,
      title: "6. Yasaklı Kullanım ve Yazılım Erişim İptali",
      paragraphs: [
        "UĞRA yazılım altyapısı mevzuata aykırı, tehlikeli veya kötü niyetli amaçlarla kullanılamaz:"
      ],
      items: [
        "Uyuşturucu, silah, mühimmat, yanıcı/patlayıcı maddeler ve taşınması kanunen yasaklanmış hiçbir unsur taleplere konu edilemez.",
        "Sahte hesap açılması, yanıltıcı ilan oluşturulması veya yazılım altyapısına zarar verilmesi durumunda UĞRA ilgili kullanıcının, mağazanın veya asistanın panel erişimini tek taraflı ve ihbarsız sonlandırma hakkına sahiptir."
      ]
    },
    {
      id: "yururluk-ve-yetki",
      icon: CheckCircle2,
      title: "7. Uygulanacak Hukuk ve Yetkili Mahkeme",
      paragraphs: [
        "İşbu Kullanım Koşulları Türkiye Cumhuriyeti mevzuatına tabidir.",
        "Yazılım altyapısının kullanımı ve abonelik hizmetleriyle ilgili olarak UĞRA Teknoloji A.Ş. ile yaşanabilecek olası hukuki uyuşmazlıklarda İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri münhasıran yetkilidir."
      ]
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-[#E4E4E7] font-sans relative overflow-hidden selection:bg-white/10 selection:text-white">
      {/* Background ambient glow */}
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-96 h-96 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

      <Header />

      <main className="container mx-auto px-6 md:px-12 pt-32 pb-24 relative z-10 max-w-4xl">
        {/* Top Header */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex items-start justify-between gap-6 border-b border-white/10 pb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-orange-400 font-medium mb-3">
              <FileText className="w-3.5 h-3.5" />
              <span>SaaS Yazılım Altyapısı ve Yasal Şartlar</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
              Kullanım Koşulları
            </h1>
            <p className="text-zinc-400 leading-relaxed max-w-2xl text-sm sm:text-base">
              UĞRA Teknoloji A.Ş. panel kiralama ve yazılım platformu kullanım şartları, hizmet kuralları ve eksiksiz yasal sorumluluk reddi beyanı.
            </p>
            <p className="text-xs text-zinc-500 mt-2">Son Güncelleme: 1 Ocak 2026</p>
          </div>

          <button
            type="button"
            onClick={handleBack}
            aria-label="Kapat"
            title="Kapat"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-1"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </motion.div>

        {/* Policy Sections */}
        <div className="space-y-8">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.section 
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`rounded-2xl p-6 md:p-8 border ${
                  section.isHighlighted 
                    ? 'border-orange-500/30 bg-orange-950/10 shadow-lg' 
                    : 'border-white/10 bg-[#121215]'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${
                    section.isHighlighted 
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' 
                      : 'bg-white/5 border-white/10 text-orange-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${
                    section.isHighlighted ? 'text-orange-400' : 'text-white'
                  }`}>
                    {section.title}
                  </h2>
                </div>

                {section.paragraphs && (
                  <div className="space-y-3">
                    {section.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="text-zinc-300 text-sm md:text-base leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>
                )}

                {section.items && (
                  <ul className="mt-4 space-y-2.5">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-3 text-sm text-zinc-300 bg-black/40 border border-white/5 rounded-xl p-3.5">
                        <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.disclaimerList && (
                  <div className="mt-5 grid grid-cols-1 gap-2.5">
                    {section.disclaimerList.map((disc, discIdx) => (
                      <div key={discIdx} className="flex items-start gap-3 text-sm text-zinc-200 bg-black/60 border border-orange-500/20 rounded-xl p-3.5">
                        <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{disc}</span>
                      </div>
                    ))}
                  </div>
                )}

                {section.outro && (
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mt-4 pt-3 border-t border-white/5 italic">
                    {section.outro}
                  </p>
                )}
              </motion.section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
