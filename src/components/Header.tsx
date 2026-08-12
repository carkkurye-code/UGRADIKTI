import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Link } from 'wouter';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { CustomerAccountModal, CustomerTab } from '@/components/CustomerAccountModal';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalTab, setCustomerModalTab] = useState<CustomerTab>('taleplerim');

  const { user, profile, signOut } = useAuth();

  useBodyScrollLock(isOpen);
  useModalBackButton(isOpen, () => setIsOpen(false), 'hamburger-menu');

  useEffect(() => {
    const handleOpenCustomerModalEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ tab?: CustomerTab }>;
      if (customEv.detail?.tab) {
        setCustomerModalTab(customEv.detail.tab);
      }
      setCustomerModalOpen(true);
    };

    window.addEventListener('open-customer-account-modal', handleOpenCustomerModalEvent);
    return () => {
      window.removeEventListener('open-customer-account-modal', handleOpenCustomerModalEvent);
    };
  }, []);

  const openAuthModal = () => {
    setAuthModalOpen(true);
    setIsOpen(false);
  };

  const handleOpenCustomerTab = (tab: CustomerTab) => {
    setIsOpen(false);
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setCustomerModalTab(tab);
    setCustomerModalOpen(true);
  };

  return (
    <>
      <header 
        className="absolute top-0 left-0 right-0 z-50 safe-top py-6 bg-transparent"
      >
        <div className="container mx-auto px-5 sm:px-6 md:px-12 flex justify-between items-center">
          {/* Brand Mark */}
          <Link href="/" className="group flex flex-col items-start gap-0.5 z-50 relative cursor-pointer">
            <span className="text-2xl font-bold tracking-wider text-white group-hover:text-white/90 transition-colors">
              UĞRA<span className="text-[#FF7A00]">.</span>
            </span>
            <span className="text-xs uppercase tracking-wider text-zinc-200 font-semibold opacity-90">
              Şehir İçi Zaman Asistanınız
            </span>
          </Link>

          {/* Right Header: Hamburger Menu Icon Only */}
          <div className="flex items-center z-50 relative">
            <button 
              onClick={() => setIsOpen(true)}
              className="text-white hover:text-white/80 transition-colors p-2 -mr-2 cursor-pointer"
              aria-label="Menu"
            >
              <Menu className="w-7 h-7 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Customer Account Modal */}
      <CustomerAccountModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        initialTab={customerModalTab}
      />

      {/* Right to Left Drawer Menu */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Clickable Backdrop with backdrop blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[9990] bg-black/75 backdrop-blur-md"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="fixed inset-y-0 right-0 z-[9995] bg-[#0A0A0C]/95 backdrop-blur-2xl flex flex-col justify-center items-center shadow-2xl border-l border-white/10 w-[85%] sm:w-[70%] md:w-[50%] lg:w-[35%] xl:w-[28%] max-w-[420px] h-full"
              >
                {/* Close Button: Top 24px, Right 24px */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute text-zinc-400 hover:text-white transition-colors p-2 cursor-pointer z-10"
                  style={{ top: '24px', right: '24px' }}
                  aria-label="Kapat"
                >
                  <X className="w-7 h-7" />
                </button>
                
                <div className="flex flex-col items-center justify-center text-center px-8 max-w-sm mx-auto w-full space-y-4">
                  {/* UĞRA. Logo */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.05, duration: 0.3 }}
                  >
                    <h2 className="text-4xl sm:text-5xl font-extrabold tracking-widest text-white select-none">
                      UĞRA<span className="text-[#FF7A00]">.</span>
                    </h2>
                  </motion.div>

                  {/* Slogan */}
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.08, duration: 0.3 }}
                    className="text-sm md:text-base text-zinc-300 font-medium tracking-wide select-none"
                  >
                    Zamanın sana kalsın.
                  </motion.p>

                  {/* Divider 1 */}
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: 0.12, duration: 0.3 }}
                    className="w-full h-[1px] bg-white/10 my-1"
                  />

                  {/* Section: HESAP */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="w-full flex flex-col items-center space-y-2.5"
                  >
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF7A00] select-none">
                      HESAP
                    </span>
                    {user ? (
                      <div className="flex flex-col items-center space-y-2 w-full">
                        {/* User Name */}
                        <span className="text-sm font-extrabold text-white py-0.5">
                          {profile?.full_name || user.email?.split('@')[0] || 'Müşteri'}
                        </span>

                        {/* Taleplerim */}
                        <button
                          type="button"
                          onClick={() => handleOpenCustomerTab('taleplerim')}
                          className="text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer py-1"
                        >
                          Taleplerim
                        </button>

                        {/* Gelen Kutusu */}
                        <button
                          type="button"
                          onClick={() => handleOpenCustomerTab('gelen_kutusu')}
                          className="text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer py-1"
                        >
                          Gelen Kutusu
                        </button>

                        {/* Ödemelerim */}
                        <button
                          type="button"
                          onClick={() => handleOpenCustomerTab('odemelerim')}
                          className="text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer py-1"
                        >
                          Ödemelerim
                        </button>

                        {/* Hesap Bilgilerim */}
                        <button
                          type="button"
                          onClick={() => handleOpenCustomerTab('hesap_bilgilerim')}
                          className="text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer py-1"
                        >
                          Hesap Bilgilerim
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2 w-full">
                        <button
                          type="button"
                          onClick={openAuthModal}
                          className="text-base font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer py-1"
                        >
                          Giriş Yap
                        </button>
                      </div>
                    )}
                  </motion.div>

                  {/* Divider 2 */}
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.3 }}
                    className="w-full h-[1px] bg-white/10 my-1"
                  />

                  {/* Section: İş Ortakları */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.21, duration: 0.3 }}
                    className="w-full flex justify-center"
                  >
                    <Link 
                      href="/partner" 
                      onClick={() => setIsOpen(false)} 
                      className="text-base font-medium text-zinc-200 hover:text-white transition-colors py-1 cursor-pointer"
                    >
                      İş Ortakları
                    </Link>
                  </motion.div>

                  {/* Section: Uygulamayı Yükle */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.24, duration: 0.3 }}
                    className="w-full flex justify-center"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        window.dispatchEvent(new CustomEvent('trigger-pwa-install'));
                      }}
                      className="text-base font-medium text-zinc-200 hover:text-white transition-colors py-1 cursor-pointer"
                    >
                      Uygulamayı Yükle
                    </button>
                  </motion.div>

                  {/* Logout Button if Logged In */}
                  {user && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.27, duration: 0.3 }}
                      className="w-full flex justify-center pt-1"
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          setIsOpen(false);
                          await signOut();
                        }}
                        className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors cursor-pointer py-1"
                      >
                        Çıkış Yap
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}


