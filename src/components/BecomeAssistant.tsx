import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { InteractiveCard } from '@/components/ui/InteractiveCard';
import { ApplicationModal } from '@/components/ApplicationModal';

const assistants = [
  {
    icon: "🛵",
    title: "Motosiklet",
    vehicleType: "motosiklet" as const,
    description: "Motosikletiniz ile esnek saatlerde şehir içi zaman asistanı olun."
  },
  {
    icon: "🚲",
    title: "Bisiklet",
    vehicleType: "bisiklet" as const,
    description: "Bisikletiniz ile çevre dostu şehir içi zaman asistanı olun."
  }
];

export function BecomeAssistant() {
  const [selectedVehicle, setSelectedVehicle] = useState<'motosiklet' | 'bisiklet' | null>(null);

  return (
    <section className="py-24 relative z-10 border-t border-white/5 overflow-hidden bg-[#0A0A0B]">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[120px] rounded-[100%] pointer-events-none" />
      
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
          >
            Asistan Ol
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-muted-foreground text-sm max-w-md mx-auto"
          >
            Siz de UĞRA<span className="text-[#FF7A00]">.</span> ailesine katılın, esnek çalışma saatleri ile kendi işinizin patronu olun.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {assistants.map((item, i) => (
            <div 
              key={item.title} 
              onClick={() => setSelectedVehicle(item.vehicleType)}
              className="w-full h-full cursor-pointer"
            >
              <InteractiveCard
                delay={i * 0.1}
                active={true}
                className="glass-panel rounded-[2rem] p-8 flex flex-col justify-between h-[340px] w-full group transition-all duration-300 border border-white/5 relative overflow-hidden cursor-pointer"
                hoverBorderColor="rgba(255, 255, 255, 0.2)"
                hoverShadow="0 25px 50px -12px rgba(255, 255, 255, 0.05), inset 0 1px 0 0 rgba(255,255,255,0.08)"
              >
                {/* Subtle spotlight glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors duration-700 pointer-events-none" />

                <div className="flex justify-between items-start">
                  <div className="text-5xl grayscale group-hover:grayscale-0 transition-all duration-500">
                    {item.icon}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </div>
                
                <div className="relative z-10 w-full flex flex-col gap-4 mt-auto">
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-200 font-medium leading-relaxed">{item.description}</p>
                  </div>

                  <div className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98]">
                    BAŞVURUYU BAŞLAT
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </InteractiveCard>
            </div>
          ))}
        </div>
      </div>

      {/* Application Modal */}
      <ApplicationModal
        isOpen={selectedVehicle !== null}
        onClose={() => setSelectedVehicle(null)}
        vehicleType={selectedVehicle || 'motosiklet'}
      />
    </section>
  );
}


