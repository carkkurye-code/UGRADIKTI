import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { X, ShieldAlert, Cpu, Scale, Ban, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';

export function TasimaKosullari() {
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
      id: "1",
      title: "1. Yazılım Altyapısı Şartları ve Hizmet Niteliği",
      paragraphs: [
        "UĞRA Teknoloji A.Ş. (\"UĞRA\"), bağımsız partner mağazalara mağaza paneli ve bağımsız asistanlara asistan paneli kiralayan bir yazılım teknolojisi sağlayıcısıdır.",
        "UĞRA kesinlikle kurye şirketi, taşıyıcı, nakliyeci, teslimat firması, satıcı veya hizmet sağlayıcı DEĞİLDİR. Platform yalnızca bağımsız tarafların dijital ortamda ilan ve talep paylaşmasını sağlayan yazılım altyapısını sunar."
      ]
    },
    {
      id: "2",
      title: "2. Talep ve Teslimat Süreçlerinin Taraf Bağımsızlığı",
      paragraphs: [
        "Müşteriler tarafından yayınlanan talepler (\"Hazır Olanı Al\" / \"Hazır Olanı Bırak\") ve Mağaza Siparişleri tamamen bağımsız asistanlar ve mağazalar tarafından yürütülür.",
        "UĞRA teslimat operasyonlarının, taşıma sürelerinin, rota tercihlerinin veya saha eylemlerinin tarafı, yönlendiricisi veya garantörü değildir. Tüm iletişim ve anlaşma doğrudan taraflar arasında gerçekleşir."
      ]
    },
    {
      id: "3",
      title: "3. Yasaklı Ürün ve Maddeler",
      intro: "Platform yazılımı üzerinden aşağıdaki içerik, ürün ve eşyaların talebe konu edilmesi kesinlikle yasaktır:",
      items: [
        "Türk Ceza Kanunu ve ilgili mevzuata aykırı tüm yasa dışı maddeler",
        "Ateşli silahlar, mühimmat, bıçak ve patlayıcı düzenekler",
        "Uyuşturucu, uyarıcı maddeler ve reçetesiz satışı yasak ilaçlar",
        "Yanıcı, parlayıcı, zehirli ve tehlikeli kimyasal maddeler",
        "Canlı hayvanlar ve insan organ/doku örnekleri",
        "Mevzuat uyarınca nakli ve satışı özel izne tabi diğer unsurlar"
      ],
      outro: "Yasaklı madde talebinde bulunan veya taşıyan tarafların panel abonelikleri derhal ve tek taraflı olarak iptal edilir, gerekli hallerde adli mercilere bildirim yapılır."
    },
    {
      id: "4",
      title: "4. Ücretlendirme, Komisyonsuzluk ve Ödeme Beyanı",
      paragraphs: [
        "UĞRA müşterilerden hiçbir ad altında taşıma veya hizmet ücreti almaz.",
        "Müşterinin teklif ettiği hizmet bedeli %100 oranında görevi üstlenen bağımsız asistana veya anlaşmalı mağazaya aittir. UĞRA taşıma veya teslimat işlemlerinden komisyon veya pay almaz.",
        "Ödemeler tamamen taraflar arasında doğrudan (nakit veya havale/EFT) gerçekleştirilir. UĞRA ödeme almaz ve ödeme aracılığı yapmaz."
      ]
    },
    {
      id: "5",
      title: "5. Eksiksiz Sorumluluk Sınırlandırması",
      paragraphs: [
        "UĞRA Teknoloji A.Ş.; taşınan ürünlerin kırılması, kaybolması, çalınması, bozulması, gecikmesi veya hasar görmesinden hiçbir hukuki veya maddi sorumluluk kabul etmez.",
        "Ürün ayıpları, teslimat gecikmeleri, hatalı adres bildirimleri ve taraflar arasında doğabilecek uyuşmazlıklar doğrudan ve münhasıran ilgili Müşteri, Mağaza ve Asistanın sorumluluğundadır."
      ]
    },
    {
      id: "6",
      title: "6. Uygulanacak Hukuk",
      paragraphs: [
        "İşbu Kullanım Şartları Türkiye Cumhuriyeti kanunlarına tabidir. Doğabilecek uyuşmazlıklarda İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri yetkilidir."
      ]
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-[#E4E4E7] font-sans relative overflow-hidden selection:bg-white/10 selection:text-white">
      {/* Background glow decorations */}
      <div className="absolute top-40 left-10 w-96 h-96 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

      <Header />

      <main className="container mx-auto px-6 md:px-12 pt-32 pb-20 relative z-10 max-w-4xl">
        {/* Main Title with Top-Right Close Button */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 flex items-start justify-between gap-4 border-b border-white/10 pb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-orange-400 font-medium mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>Yazılım Altyapısı Şartları</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
              Dijital Altyapı ve Taşıma Koşulları
            </h1>
            <p className="text-zinc-400 leading-relaxed max-w-2xl text-sm sm:text-base font-light">
              UĞRA Teknoloji A.Ş. yazılım platformu üzerinden paylaşılan talep ve teslimat süreçlerine ilişkin taraf sorumluluk sınırları.
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

        {/* Section List */}
        <div className="space-y-6">
          {sections.map((section, idx) => {
            return (
              <motion.section 
                key={section.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.04 }}
                className="rounded-2xl p-6 md:p-8 border border-white/10 bg-[#121215]"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white tracking-tight">
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

                {section.intro && (
                  <p className="text-zinc-300 text-sm md:text-base leading-relaxed mb-3">
                    {section.intro}
                  </p>
                )}

                {section.items && (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-center gap-2.5 text-sm text-zinc-300 bg-black/40 border border-white/5 rounded-xl p-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.outro && (
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mt-3 pt-3 border-t border-white/5 font-medium">
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
