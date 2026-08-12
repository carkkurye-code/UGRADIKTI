import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveCard } from '@/components/ui/InteractiveCard';

interface ServiceItem {
  id: string;
  lines: string[];
}

const mainServices: ServiceItem[] = [
  { id: "Evrak Teslim Ettir", lines: ["Evrak Teslim", "Ettir"] },
  { id: "Yedek Parça Getirt", lines: ["Parça Getirt"] },
  { id: "Hediye Gönder", lines: ["Hediye Gönder"] },
  { id: "Paket Ulaştır", lines: ["Paket Gönder"] },
  { id: "Alışveriş Yaptır", lines: ["Alışveriş Yaptır"] },
  { id: "Unuttuğumu Getirt", lines: ["Unuttuğumu", "Getirt"] }
];

const customService: ServiceItem = {
  id: "Farklı Bir Talebim Var",
  lines: ["Diğer Talep"]
};

interface ServicesProps {
  onServiceClick: (service: string) => void;
}

export function Services({ onServiceClick }: ServicesProps) {
  const [index, setIndex] = useState(0);
  const texts = ["Senin için UĞRA'yalım", "Senin yerine UĞRA'yalım"];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="services" className="py-20 relative z-10 border-t border-white/5">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-2"
          >
            UĞRA<span className="text-[#FF7A00]">.</span>
          </motion.h2>
          <div className="flex items-center justify-center gap-2 h-8 w-full mx-auto translate-x-1 sm:translate-x-1.5">
            <span className="w-2 h-2 rounded-full bg-white shrink-0" />
            <div className="relative h-8 w-[190px] sm:w-[215px] overflow-hidden flex items-center justify-start">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute inset-y-0 left-0 flex items-center text-base sm:text-lg md:text-xl text-muted-foreground font-light whitespace-nowrap"
                >
                  <span>{texts[index]}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md sm:max-w-xl mx-auto">
          {mainServices.map((service, i) => (
            <InteractiveCard
              key={service.id}
              delay={i * 0.05}
              onClick={() => onServiceClick(service.id)}
              className="glass-panel rounded-2xl py-6 px-4 sm:p-6 flex items-center justify-center text-center group cursor-pointer h-full min-h-[96px] border border-white/5 transition-all duration-300 relative overflow-hidden"
              hoverBorderColor="rgba(255, 255, 255, 0.2)"
              hoverShadow="0 20px 40px -10px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255,255,255,0.1)"
            >
              <div className="inline-flex items-center justify-center relative z-10 text-center">
                <span className="text-base sm:text-lg font-bold text-white leading-tight flex flex-col items-center justify-center">
                  {service.lines.map((line, idx) => (
                    <span key={idx}>{line}</span>
                  ))}
                </span>
              </div>
            </InteractiveCard>
          ))}

          {/* Farklı Bir Talebim Var - En altta tam genişlikte kart */}
          <InteractiveCard
            key={customService.id}
            delay={mainServices.length * 0.05}
            onClick={() => onServiceClick(customService.id)}
            wrapperClassName="col-span-2 col-span-full w-full"
            className="w-full glass-panel rounded-2xl py-6 px-4 sm:p-6 flex items-center justify-center text-center group cursor-pointer h-full min-h-[72px] border border-white/5 transition-all duration-300 relative overflow-hidden"
            hoverBorderColor="rgba(255, 255, 255, 0.2)"
            hoverShadow="0 20px 40px -10px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255,255,255,0.1)"
          >
            <div className="inline-flex items-center justify-center relative z-10 text-center">
              <span className="text-base sm:text-lg font-bold text-white leading-tight">
                {customService.lines[0]}
              </span>
            </div>
          </InteractiveCard>
        </div>
      </div>
    </section>
  );
}

