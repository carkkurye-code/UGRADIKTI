import React from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { X, Store } from 'lucide-react';

export function SeninDukkaninPage() {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground font-sans flex flex-col justify-between selection:bg-primary/30">
      <Header />

      <main className="flex-1 pt-28 pb-20 flex items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-8 w-full">
          
          <div className="flex items-center justify-end">
            <button 
              type="button"
              onClick={handleBack}
              aria-label="Kapat"
              title="Kapat"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="glass-panel border border-white/10 rounded-3xl p-8 sm:p-14 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 border border-white/20 p-0.5 shadow-xl">
              <div className="w-full h-full bg-white/5 rounded-[22px] flex items-center justify-center text-white">
                <Store className="w-10 h-10" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Senin Dükkanın
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              "Çok Yakında"
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
