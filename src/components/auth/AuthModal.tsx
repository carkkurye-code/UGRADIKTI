import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'login' | 'register';
  title?: string;
  description?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Müşteri Girişi",
  description = "Sipariş vermek ve taleplerinizi iletmek için Google hesabınızla giriş yapın."
}) => {
  const { user, profile, signInWithGoogle, signOut, loading: authLoading } = useCustomerAuth();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useBodyScrollLock(isOpen);
  useModalBackButton(isOpen, onClose, 'auth-modal');

  // Focus management and ESC key listener
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      // Ensure body pointer events are enabled in case previous dialog had lock
      document.body.style.pointerEvents = 'auto';

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await signInWithGoogle();
      setSubmitting(false);

      if (res.cancelled) {
        // User closed the popup window manually. Clean exit without error logs.
        return;
      }

      if (!res.success) {
        setErrorMsg(res.error || 'Google ile giriş yapılırken bir hata oluştu.');
        return;
      }

      setSuccessMsg('Giriş başarılı! Kaldığınız yerden devam ediliyor...');
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 500);
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err?.message || 'Google ile giriş başarısız oldu.');
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    await signOut();
    setSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop with blur & darken */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-[rgba(0,0,0,0.75)] backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md glass-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 text-white my-auto"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute text-zinc-400 hover:text-white transition-colors p-2 cursor-pointer z-20 rounded-full hover:bg-white/5"
                style={{ top: '20px', right: '20px' }}
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="pt-8 pb-4 px-6 text-center border-b border-white/5">
                <h2 className="text-3xl font-extrabold tracking-wider text-white select-none">
                  UĞRA<span className="text-[#FF7A00]">.</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1 font-medium">
                  Zamanın sana kalsın.
                </p>
              </div>

              {/* Body */}
              {user ? (
                <div className="p-6 space-y-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-300">
                    <User className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">
                      {profile?.full_name || 'Müşteri'}
                    </h3>
                    <p className="text-sm text-zinc-400">{user.email}</p>
                  </div>

                  <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Müşteri Hesabı
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={submitting}
                      className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6 text-center">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">
                      {title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                      {description}
                    </p>
                  </div>

                  {/* Feedback Banners */}
                  {errorMsg && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs text-left leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-emerald-400 text-xs text-left leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Google Login Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={submitting || authLoading}
                      className="w-full py-3.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                      ) : (
                        <>
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Google ile Devam Et</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Devam ederek UĞRA Kullanıcı Sözleşmesi ve Gizlilik Politikası'nı kabul etmiş olursunuz.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )
    : null;
};
