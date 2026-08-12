import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { motion } from 'framer-motion';
import { X, ShieldCheck, Lock, Database, MapPin, Cookie, FileText, CreditCard, AlertCircle, ShieldAlert } from 'lucide-react';
import { useLocation } from 'wouter';

export function PrivacyPolicy() {
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
      id: "kvkk-veri-sorumlusu",
      icon: ShieldCheck,
      title: "1. KVKK Kapsamında Veri Sorumluluğu Sınırları",
      paragraphs: [
        "UĞRA Teknoloji A.Ş. (\"UĞRA\"), 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca yalnızca dijital platform yazılımının işletilmesi ve kullanıcı hesaplarının yönetimi kapsamında işlenen kişisel veriler bakımından Veri Sorumlusudur.",
        "ÖNEMLİ VE AÇIK BEYAN: UĞRA'nın Veri Sorumlusu sıfatı yalnızca dijital platform yazılımının kullanılması için gerekli teknik, üyelik ve kimlik verileri ile sınırlıdır.",
        "Bu Veri Sorumluluğu tanımı; taraflar arasındaki siparişlerin, ödemelerin, teslimatların, ürün satışlarının veya hizmetlerin içeriğine ilişkin hiçbir hukuki veya maddi sorumluluk doğurmaz ve anlamına gelmez. UĞRA, bağımsız taraflar arasındaki ticari ve fiziki işlemlerin tarafı değildir."
      ]
    },
    {
      id: "toplanan-veriler",
      icon: Database,
      title: "2. Toplanan Veriler ve İşleme Amaçları",
      paragraphs: [
        "Sistemin güvenli bir şekilde çalışabilmesi, yazılım panellerinin işletilmesi ve oturum yönetiminin sağlanabilmesi için sadece gerekli asgari kişisel veriler işlenmektedir:"
      ],
      items: [
        "Profil ve İletişim Bilgileri: Ad, soyad, e-posta adresi ve telefon numarası.",
        "Oturum ve Kimlik Doğrulama Verileri: Google Login ve Supabase Auth tarafından sağlanan benzersiz kullanıcı kimliği (UID) ve yetkilendirme jetonları (tokens).",
        "Sistem ve Güvenlik Logları: IP adresi, erişim tarih/saati, tarayıcı türü ve yazılım güvenlik kayıtları."
      ]
    },
    {
      id: "google-login-ve-supabase",
      icon: Lock,
      title: "3. Google Login ve Supabase Altyapı Güvenliği",
      paragraphs: [
        "UĞRA, güvenli kimlik doğrulama için Google OAuth 2.0 protokolünü ve Supabase (PostgreSQL/Auth) bulut yazılım altyapısını kullanır.",
        "Google ile giriş yapıldığında, yalnızca e-posta adresiniz, ad-soyad bilginiz ve profil görseliniz alınır. Google hesap şifreniz asla UĞRA sunucularına iletilmez ve saklanmaz.",
        "Kullanıcı hesapları ve sistem kayıtları, Supabase Row Level Security (RLS) politikaları ve SSL/TLS şifrelemeli veri iletimi ile üçüncü tarafların yetkisiz erişimlerine karşı korunmaktadır."
      ]
    },
    {
      id: "odeme-ve-bankacilik-bilgileri",
      icon: CreditCard,
      title: "4. Ödeme ve Finansal Veri Tutulmaması Beyanı",
      isHighlighted: true,
      paragraphs: [
        "UĞRA Teknoloji A.Ş. ödeme kuruluşu veya elektronik para kuruluşu değildir; aracı ödeme hizmeti veya ödeme tahsilatı sunmaz.",
        "UĞRA platform bünyesinde hiçbir şekilde kredi kartı bilgisi, kart numarası, CVC kodu, banka hesap şifresi veya finansal kart detayı toplanmaz, işlenmez ve saklanmaz.",
        "UĞRA bankacılık işlemi veya ödeme aracılığı gerçekleştirmez. Müşteriler, asistanlar ve partner mağazalar arasındaki tüm ticari ödemeler tamamen tarafların kendi aralarında doğrudan yürütülür."
      ]
    },
    {
      id: "konum-verisi",
      icon: MapPin,
      title: "5. Konum Verilerinin Kullanım Amacı",
      paragraphs: [
        "Konum verileri yalnızca kullanıcıların harita altyapısı üzerinde bağımsız taraflarla bir araya gelebilmesi amacıyla anlık olarak işlenir.",
        "UĞRA, aktif uygulama kullanımı dışında arka planda izinsiz takip yapmaz ve konum verilerini ticari amaçlarla üçüncü şahıslara satmaz veya aktarmaz."
      ]
    },
    {
      id: "cerezler",
      icon: Cookie,
      title: "6. Çerezler (Cookies) ve Yerel Depolama",
      paragraphs: [
        "Oturumunuzun açık kalmasını sağlamak ve sistem performansını korumak amacıyla zorunlu çerezler ve tarayıcı yerel depolama (LocalStorage) teknolojileri kullanılmaktadır.",
        "Kullanıcı kişisel verileri hiçbir koşulda üçüncü kişilere satılmaz, pazarlama amacıyla paylaşılmaz veya ticari meta haline getirilemez."
      ]
    },
    {
      id: "kvkk-haklari",
      icon: FileText,
      title: "7. KVKK Kapsamındaki Haklarınız ve Başvuru",
      paragraphs: [
        "KVKK'nın 11. maddesi uyarınca veri sahipleri; kişisel verilerinin işlenip işlenmediğini öğrenme, silinmesini, anonim hale getirilmesini veya düzeltilmesini talep etme haklarına sahiptir.",
        "Veri sorumlusu sıfatıyla UĞRA Teknoloji A.Ş.'ye başvurularınızı kvkk@ugra.app e-posta adresi üzerinden iletebilirsiniz."
      ]
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#0B0B0C] text-[#E4E4E7] font-sans relative overflow-hidden selection:bg-white/10 selection:text-white">
      {/* Background ambient glow */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

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
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>KVKK ve Dijital Veri Güvenliği</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
              Gizlilik Politikası
            </h1>
            <p className="text-zinc-400 leading-relaxed max-w-2xl text-sm sm:text-base">
              UĞRA Teknoloji A.Ş. yazılım platformunda işlenen kişisel verilerin korunması, Google Login, Supabase altyapısı ve KVKK Veri Sorumlusu bildirimi.
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
              </motion.section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
