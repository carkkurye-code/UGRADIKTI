import React from 'react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "UĞRA nedir?",
    answer: "UĞRA, günlük koşturmacalarınızı ve şehir içi işlerinizi üstlenen profesyonel bir kişisel asistanlık servisidir. Sorumluluklarınızı devralır, en değerli kaynağınız olan zamanı size geri kazandırır."
  },
  {
    question: "Nasıl çalışır?",
    answer: "Platform üzerinden talebinizi oluşturursunuz. Konumunuza en uygun asistanımız görevi üstlenir ve işinizi güvenle tamamlar."
  },
  {
    question: "Hemen UĞRA ile Geçerken UĞRA farkı nedir?",
    answer: "Hemen UĞRA saniyelerin ve dakikaların kritik olduğu durumlar içindir; size özel atanan asistanımız doğrudan adresinize gelerek görevinizi kesintisiz yerine getirir. Geçerken UĞRA ise aciliyeti olmayan, gün içinde halledilmesi yeterli işleriniz içindir; zaten o rotada seyahat eden bir asistanımız görevi üstlenir."
  },
  {
    question: "Hangi hizmetleri sunuyor?",
    answer: "Evrak ve belge teslimatından paket alımına, anahtar ulaştırmadan unutulan eşya getirmeye, çiçek ve hediye gönderiminden kişisel şehir içi işlerinize kadar her türlü zaman gerektiren operasyonu kapsar."
  },
  {
    question: "Ücretlendirme nasıl yapılıyor?",
    answer: "Sürpriz ücret yok! Mesafeye, hizmete ve işin niteliğine göre önceden belirlenmiş şeffaf ve sabit fiyatlar uygulanır."
  },
  {
    question: "Ödeme nasıl yapılıyor?",
    answer: "Ödeme, hizmet sırasında nakit veya havale/EFT ile yapılmaktadır."
  },
  {
    question: "Hangi ürünler taşınamaz?",
    answer: "Uyuşturucu, silah, patlayıcı, yanıcı, yasa dışı veya taşınması mevzuata aykırı hiçbir ürünü taşımaz. Şüpheli durumlarda gönderi kabul edilmez ve yetkili mercilere yasal bildirim yapılır."
  },
  {
    question: "Nasıl UĞRA Asistanı olabilirim?",
    answer: "Menüdeki 'Asistan Ol' bölümünden veya başvuru formundan bilgilerinizi iletebilir, kısa bir değerlendirme ve onay sürecinin ardından ekibimize katılabilirsiniz."
  }
];

export function FAQ() {
  return (
    <section className="py-24 relative z-10 border-t border-white/5">
      <div className="container mx-auto px-6 md:px-12 max-w-3xl">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            Sıkça Sorulan Sorular
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full gap-4 flex flex-col">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                whileHover={{ 
                  y: -4, 
                  scale: 1.01,
                  boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
                }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl overflow-hidden"
              >
                <AccordionItem 
                  value={`item-${i}`} 
                  className="border border-white/10 glass-panel rounded-2xl px-6 data-[state=open]:border-white/20 transition-all duration-300"
                >
                  <AccordionTrigger className="hover:no-underline text-left text-lg md:text-xl py-6 text-[#D1D5DB] data-[state=open]:text-[#D1D5DB] transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
