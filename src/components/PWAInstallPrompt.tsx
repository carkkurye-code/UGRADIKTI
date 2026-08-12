import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useModalBackButton } from '@/hooks/useModalBackButton';

export function PWAInstallPrompt() {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useBodyScrollLock(showIOSInstructions);
  useModalBackButton(showIOSInstructions, () => setShowIOSInstructions(false), 'pwa-ios-instructions');

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      return isStandaloneMedia || isIOSStandalone;
    };

    setIsStandalone(checkStandalone());

    // Check if platform is iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    setIsIOS(checkIOS());

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show if not dismissed recently and not already standalone
      const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!isDismissed && !checkStandalone()) {
        // Show after a 4-second delay for premium and natural user experience (doğru zamanda)
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS users, we can show the banner if they haven't dismissed it and are not in standalone
    if (checkIOS() && !checkStandalone()) {
      const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }

    // Custom event listener so that the user can trigger install from other buttons in the UI
    const handleManualTrigger = () => {
      if (checkStandalone()) {
        toast({
          title: "Uygulama Zaten Yüklü",
          description: "UĞRA zaten telefonunuzda veya ana ekranınızda yüklü!",
        });
        return;
      }
      setIsVisible(true);
      if (checkIOS()) {
        setShowIOSInstructions(true);
      }
    };

    window.addEventListener('trigger-pwa-install', handleManualTrigger);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowIOSInstructions(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('trigger-pwa-install', handleManualTrigger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      // If we don't have the prompt event yet (e.g. on some browsers/Safari/Firefox),
      // we can inform the user or try our best
      toast({
        title: "Manuel Yükleme Gerekli",
        description: 'Tarayıcınız otomatik yüklemeyi desteklemiyor. Lütfen tarayıcı menüsünden "Uygulamayı Yükle" veya "Ana Ekrana Ekle" seçeneğini kullanın.',
      });
      return;
    }

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user's choices
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install outcome: ${outcome}`);

    // Clear the deferred prompt variable
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for 24 hours to keep the UI clean and respect user intent
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      <AnimatePresence>
        {isVisible && !showIOSInstructions && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-[200] glass-panel border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3.5 right-3.5 text-[#7A7A82] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1A1A1E]"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5 pr-6">
              <div className="w-12 h-12 rounded-xl bg-[#0B0B0C] border border-[#242428] p-1.5 flex-shrink-0 flex items-center justify-center shadow-inner">
                <img
                  src="/favicon.svg"
                  alt="UĞRA"
                  className="w-9 h-9 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-wide">
                    UĞRA<span className="text-[#FF7A00]">.</span> Zaman Asistanı
                  </h4>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                    PWA
                  </span>
                </div>
                <p className="text-xs text-[#D6D6D6] leading-relaxed mt-0.5">
                  Tek dokunuşla sipariş verin, zamanınız size kalsın! Hemen uygulamayı yükleyin.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-200 active:scale-95 text-xs uppercase tracking-wider font-bold text-black rounded-xl transition-all shadow-lg shadow-white/10 cursor-pointer"
              >
                <Download className="w-4 h-4 text-black" />
                Uygulamayı Yükle
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 border border-[#2E2E34] bg-transparent hover:bg-[#1A1A1E] text-xs uppercase tracking-wider font-semibold text-[#D6D6D6] hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Daha Sonra
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Safari Instruction sheet / modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setShowIOSInstructions(false)} />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full sm:max-w-md glass-panel border-t sm:border border-white/10 rounded-t-[2rem] sm:rounded-3xl p-6 text-left shadow-2xl overflow-hidden flex flex-col gap-5 text-white my-auto font-sans z-50"
            >
              {/* iOS pull bar on mobile */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto sm:hidden -mt-2 mb-1" />

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
                aria-label="Kapat"
                title="Kapat"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0B0B0C] border border-[#242428] p-2 flex-shrink-0 flex items-center justify-center shadow-inner">
                  <img
                    src="/favicon.svg"
                    alt="UĞRA"
                    className="w-10 h-10 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                    Ana Ekrana Ekle <span className="text-[#FF7A00]">.</span>
                  </h3>
                  <p className="text-xs text-[#7A7A82]">
                    UĞRA'yı iPhone'unuza uygulama olarak yükleyin.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-[#161618] border border-[#242428] rounded-2xl p-5 text-sm">
                <div className="flex gap-3.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-[#D6D6D6] leading-relaxed">
                    Safari alt araç çubuğundaki <span className="inline-flex items-center gap-1 font-semibold text-white px-1.5 py-0.5 bg-white/10 border border-white/10 rounded"><Share className="w-3.5 h-3.5 text-white inline" /> Paylaş</span> simgesine dokunun.
                  </p>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-[#D6D6D6] leading-relaxed">
                    Aşağı kaydırın ve açılan listeden <span className="inline-flex items-center gap-1 font-semibold text-white px-1.5 py-0.5 bg-white/10 border border-white/10 rounded"><PlusSquare className="w-3.5 h-3.5 text-white inline" /> Ana Ekrana Ekle</span> seçeneğini seçin.
                  </p>
                </div>

                <div className="flex gap-3.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-[#D6D6D6] leading-relaxed">
                    Sağ üst köşedeki <span className="font-semibold text-white">Ekle</span> butonuna dokunarak kurulumu tamamlayın.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSInstructions(false)}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-xs uppercase tracking-wider font-bold text-black rounded-xl transition-all shadow-lg shadow-white/10 cursor-pointer"
              >
                Anladım
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
