import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, MapPin, Building2, Briefcase, Newspaper } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useModalBackButton } from '@/hooks/useModalBackButton';

const faqs = [
  {
    question: "UĞRA nedir?",
    answer: "UĞRA; bağımsız mağazalara mağaza paneli, bağımsız asistanlara ise asistan paneli kiralayan bir yazılım teknolojisi platformudur (SaaS). UĞRA satıcı, kurye firması veya komisyoncu değildir; tarafların bir araya gelmesini sağlayan dijital altyapıyı sunar."
  },
  {
    question: "Nasıl çalışır?",
    answer: "Müşteriler tamamen ücretsiz şekilde üye olur ve taleplerini (örneğin 'Hazır Olanı Al / Bırak') sunmak istedikleri ücret teklifiyle (örneğin 200 TL) yayınlar. İlan, panel abonesi asistanlara gösterilir. Kabul eden asistan müşteri ile doğrudan iletişime geçer ve hizmeti tamamlar."
  },
  {
    question: "Hemen UĞRA ile Geçerken UĞRA farkı nedir?",
    answer: "Hemen UĞRA acil durumlar için doğrudan panel abonesi asistanların anlık çağrı aldığı moddur; Geçerken UĞRA ise gün içinde aynı rotada seyahat eden panel abonesi asistanların talebi üstlenmesini sağlayan dijital ilan modülüdür."
  },
  {
    question: "Hangi hizmetleri sunuyor?",
    answer: "Platform altyapısı; evrak ve belge teslimatı, paket alımı, anahtar ulaştırma, unutulan eşya getirme ve yerel mağaza siparişlerinin taraflarca organize edilmesini sağlayan yazılım panellerini içerir."
  },
  {
    question: "Ücretlendirme ve komisyon politikası nasıl?",
    answer: "UĞRA müşterilerden hiçbir ücret veya komisyon almaz! Müşteriler tamamen ücretsiz talep oluşturur. Asistanlar kazandıkları ücretin %100'ünü doğrudan müşteriden alır. UĞRA yalnızca mağazalara ve asistanlara aylık panel yazılımı aboneliği kiralar ve bunun faturasını keser."
  },
  {
    question: "Ödeme nasıl yapılıyor?",
    answer: "UĞRA ödeme almaz, ödeme aracılığı yapmaz ve kart bilgisi tutmaz. Müşteri ile bağımsız asistan veya mağaza arasındaki hizmet bedeli ödemeleri tamamen taraflar arasında doğrudan (nakit veya havale/EFT) gerçekleştirilir."
  },
  {
    question: "Hangi ürünler taşınamaz?",
    answer: "Silah, mühimmat, patlayıcı, uyuşturucu, kanunen yasaklanmış maddeler ve muhteviyatı belirsiz tehlikeli unsurlar platform yazılımı üzerinden kesinlikle talebe konu edilemez."
  },
  {
    question: "Nasıl UĞRA Asistanı veya Mağaza Partneri olabilirim?",
    answer: "Başvuru formunu doldurarak asistan paneli veya mağaza paneli aboneliğinizi başlatabilir, dijital altyapı yazılımımızı kullanarak müşterilerin taleplerine doğrudan ulaşabilirsiniz."
  }
];

interface FooterProps {
  isCategoryPage?: boolean;
}

type InfoModalType = 'about' | 'contact' | 'career' | 'blog' | null;

export function Footer({ isCategoryPage = false }: FooterProps) {
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<InfoModalType>(null);

  useBodyScrollLock(isFaqOpen || activeInfoModal !== null);
  useModalBackButton(isFaqOpen, () => setIsFaqOpen(false), 'faq-modal');
  useModalBackButton(activeInfoModal !== null, () => setActiveInfoModal(null), 'info-modal');

  return (
    <>
      <footer className="bg-[#0B0B0C] border-t border-white/10 pt-16 pb-8 relative z-10 text-[#E4E4E7]">
        <div className="container mx-auto px-6 md:px-12">
          {/* Main 5 Columns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
            
            {/* Column 1: Şirket */}
            <div className="flex flex-col">
              <h3 className="text-white font-semibold text-base sm:text-lg mb-4 tracking-tight">
                Şirket
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoModal('about')}
                    className="text-zinc-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                  >
                    Hakkımızda
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoModal('contact')}
                    className="text-zinc-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                  >
                    İletişim
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoModal('career')}
                    className="text-zinc-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                  >
                    Kariyer
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoModal('blog')}
                    className="text-zinc-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                  >
                    Blog
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 2: Kurumsal */}
            <div className="flex flex-col">
              <h3 className="text-white font-semibold text-base sm:text-lg mb-4 tracking-tight">
                Kurumsal
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Gizlilik Politikası
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Kullanım Koşulları
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy#kvkk"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    KVKK
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy#cerezler"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Çerez Politikası
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tasima-kosullari"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Mesafeli Satış Sözleşmesi
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Yardım */}
            <div className="flex flex-col">
              <h3 className="text-white font-semibold text-base sm:text-lg mb-4 tracking-tight">
                Yardım
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => setIsFaqOpen(true)}
                    className="text-zinc-400 hover:text-white transition-colors duration-200 text-left cursor-pointer bg-transparent border-0 p-0"
                  >
                    Sık Sorulan Sorular
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveInfoModal('contact')}
                    className="text-zinc-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                  >
                    Destek Merkezi
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsFaqOpen(true)}
                    className="text-zinc-400 hover:text-white transition-colors duration-200 text-left cursor-pointer"
                  >
                    Nasıl Çalışır?
                  </button>
                </li>
                <li>
                  <Link
                    href="/privacy#kvkk"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Güvenlik
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Partner */}
            <div className="flex flex-col">
              <h3 className="text-white font-semibold text-base sm:text-lg mb-4 tracking-tight">
                Partner
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link
                    href="/partner"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Mağaza Başvurusu
                  </Link>
                </li>
                <li>
                  <Link
                    href="/asistan"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Asistan Başvurusu
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: Sosyal Medya */}
            <div className="flex flex-col">
              <h3 className="text-white font-semibold text-base sm:text-lg mb-4 tracking-tight">
                Sosyal Medya
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="https://instagram.com/ugra.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 inline-block"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://facebook.com/ugra.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 inline-block"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/ugraapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 inline-block"
                  >
                    X
                  </a>
                </li>
                <li>
                  <a
                    href="https://linkedin.com/company/ugra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 inline-block"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="https://youtube.com/@ugraapp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white transition-colors duration-200 inline-block"
                  >
                    YouTube
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Fine Separator Line */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
            <div>
              © 2026 UĞRA Teknoloji A.Ş. Tüm hakları saklıdır.
            </div>
            <div className="text-zinc-400 font-medium">
              Versiyon v1.0
            </div>
          </div>
        </div>
      </footer>

      {/* FAQ Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isFaqOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFaqOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-2xl max-h-[85vh] bg-[#111113] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto z-10"
              >
                <button
                  type="button"
                  onClick={() => setIsFaqOpen(false)}
                  className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Sık Sorulan Sorular
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    UĞRA hizmetleri hakkında merak edilen tüm sorular ve yanıtları.
                  </p>
                </div>

                <Accordion type="single" collapsible className="w-full gap-3 flex flex-col">
                  {faqs.map((faq, i) => (
                    <AccordionItem 
                      key={i} 
                      value={`item-${i}`} 
                      className="border border-white/10 bg-white/[0.02] rounded-2xl px-5 data-[state=open]:border-white/20 transition-all duration-300"
                    >
                      <AccordionTrigger className="hover:no-underline text-left text-base sm:text-lg py-4 text-[#D1D5DB] data-[state=open]:text-white transition-colors">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-zinc-400 text-sm leading-relaxed pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Corporate Info Modal (Hakkımızda, İletişim, Kariyer, Blog) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {activeInfoModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveInfoModal(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-lg bg-[#111113] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-y-auto z-10 text-white"
              >
                <button
                  type="button"
                  onClick={() => setActiveInfoModal(null)}
                  className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {activeInfoModal === 'about' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">Hakkımızda</h3>
                        <p className="text-xs text-zinc-400">UĞRA Teknoloji A.Ş.</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                      <p>
                        UĞRA Teknoloji A.Ş., bağımsız partner mağazalara mağaza paneli ve bağımsız asistanlara asistan paneli kiralayan bir yazılım teknolojisi platformudur (SaaS).
                      </p>
                      <p>
                        UĞRA satıcı, kurye firması veya komisyoncu değildir; tarafların dijital ortamda doğrudan bir araya gelmesini sağlayan teknolojik yazılım altyapısını ve iletişim panellerini sunar.
                      </p>
                    </div>
                  </div>
                )}

                {activeInfoModal === 'contact' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">İletişim & Destek</h3>
                        <p className="text-xs text-zinc-400">Bizimle dilediğiniz an iletişime geçebilirsiniz.</p>
                      </div>
                    </div>
                    <div className="space-y-4 text-sm text-zinc-300">
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                        <Mail className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white">E-Posta</div>
                          <a href="mailto:destek@ugra.app" className="text-zinc-300 hover:text-white transition-colors">destek@ugra.app</a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                        <Phone className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white">Müşteri Destek Hattı</div>
                          <a href="tel:08508880847" className="text-zinc-300 hover:text-white transition-colors">0850 888 0 847</a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5">
                        <MapPin className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-white">Genel Merkez</div>
                          <p className="text-zinc-300">Maslak Mah. Büyükdere Cad. No:123 Sarıyer / İstanbul</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeInfoModal === 'career' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">Kariyer</h3>
                        <p className="text-xs text-zinc-400">Geleceğin mobilite ve zaman asistanlığı ekibine katılın.</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                      <p>
                        UĞRA Teknoloji A.Ş., yazılım, saha operasyonları, veri analitiği ve müşteri deneyimi alanlarında dinamik yetenekleri bünyesine katmaktadır.
                      </p>
                      <p>
                        Açık pozisyonlar ve başvuru süreçleri için özgeçmişinizi <span className="text-orange-400 font-semibold">ik@ugra.app</span> adresine iletebilirsiniz.
                      </p>
                    </div>
                  </div>
                )}

                {activeInfoModal === 'blog' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        <Newspaper className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">UĞRA Blog & Haberler</h3>
                        <p className="text-xs text-zinc-400">Şehir hayatı, zaman yönetimi ve teknoloji ipuçları.</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                      <p>
                        Şehir içi lojistik, kişisel asistanlık püf noktaları ve zaman yönetimi rehberlerimiz çok yakında burada yayınlanacaktır.
                      </p>
                      <p className="text-xs text-zinc-500">
                        Sosyal medya hesaplarımızı takip ederek yeni gelişmelerden haberdar olabilirsiniz.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
