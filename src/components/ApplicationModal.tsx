import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader2, ShieldCheck, Calendar, Phone } from 'lucide-react';
import { api } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useModalBackButton } from '@/hooks/useModalBackButton';

export interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleType: 'motosiklet' | 'bisiklet';
}

interface ApplicationFormData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  city: string;
  motorInfo: string;
  licenseInfo: string;
  experience: string;
  hasCompany: string;
  notes: string;
}

const initialFormData: ApplicationFormData = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  city: '',
  motorInfo: '',
  licenseInfo: '',
  experience: '',
  hasCompany: 'Evet',
  notes: ''
};

export function ApplicationModal({ isOpen, onClose, vehicleType }: ApplicationModalProps) {
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  useBodyScrollLock(isOpen);
  useModalBackButton(isOpen, onClose, 'application-modal');

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setIsSuccess(false);
    }
  }, [isOpen, vehicleType]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      toast({
        title: "Eksik Bilgi",
        description: "E-posta ve şifre alanları zorunludur.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);

    try {
      await api.createAssistantApplication({
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        vehicle_type: vehicleType
      });

      toast({
        title: "Başvuru Alındı",
        description: `${vehicleType === 'bisiklet' ? 'Bisikletli' : 'Motosikletli'} asistan başvurunuz başarıyla kaydedilmiştir. Yönetici onayından sonra belirlediğiniz e-posta ve şifre ile giriş yapabilirsiniz.`,
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error submitting application:", err);
      toast({
        title: "Hata",
        description: err.message || "Başvuru kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = vehicleType === 'bisiklet' 
    ? 'Bisikletli Asistan Başvurusu' 
    : 'Motosikletli Asistan Başvurusu';

  const vehicleInputLabel = vehicleType === 'bisiklet' 
    ? 'Bisiklet Marka / Model / Tipi' 
    : 'Motosiklet Marka / Model';

  const vehicleInputPlaceholder = vehicleType === 'bisiklet' 
    ? 'Örn: Trek FX 3 / Şehir Bisikleti' 
    : 'Örn: Honda Forza 250';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] touch-none"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="glass-panel border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-[10000] my-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col font-sans"
        >
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex justify-between items-center glass-panel backdrop-blur-xl shrink-0 sticky top-0 z-10 pr-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{vehicleType === 'bisiklet' ? '🚲' : '🛵'}</span>
              <div className="flex flex-col text-left">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h2>
                <span className="text-xs text-muted-foreground mt-0.5 font-normal">UĞRA. Saha Asistanlığı Ailesine Katılın</span>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              aria-label="Kapat"
              title="Kapat"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-grow text-left">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Personal Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Adınız Soyadınız"
                      className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                      Telefon Numarası
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="05xx xxx xx xx"
                      className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                    />
                  </div>
                </div>

                {/* Email & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                      E-Posta Adresi <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="ornek@email.com"
                      className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                      Giriş Şifresi <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Giriş şifrenizi belirleyin"
                      className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                    />
                  </div>
                </div>

                {/* City & Vehicle Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                      Şehir
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Örn: İstanbul"
                      className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                      {vehicleInputLabel}
                    </label>
                    <input
                      type="text"
                      name="motorInfo"
                      required
                      value={formData.motorInfo}
                      onChange={handleInputChange}
                      placeholder={vehicleInputPlaceholder}
                      className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                    />
                  </div>
                </div>

                {/* License & Experience: Conditionally render License field only for motosiklet */}
                <div className={`grid grid-cols-1 ${vehicleType === 'motosiklet' ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-4`}>
                  {vehicleType === 'motosiklet' && (
                    <div>
                      <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                        Ehliyet Sınıfı
                      </label>
                      <input
                        type="text"
                        name="licenseInfo"
                        required={vehicleType === 'motosiklet'}
                        value={formData.licenseInfo}
                        onChange={handleInputChange}
                        placeholder="Örn: A, A2, A1"
                        className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                      Teslimat / Saha Deneyimi
                    </label>
                    <input
                      type="text"
                      name="experience"
                      required
                      value={formData.experience}
                      onChange={handleInputChange}
                      placeholder="Örn: 1 Yıl Paket Servis veya Deneyimsiz"
                      className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all"
                    />
                  </div>
                </div>

                {/* Sole Proprietorship Option */}
                <div>
                  <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                    Faturalı Çalışabileceğiniz Şahıs Şirketiniz Var mı?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, hasCompany: 'Evet' }))}
                      className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                        formData.hasCompany === 'Evet'
                          ? 'bg-[#1C2027] border-white text-white'
                          : 'bg-[#1C2027] border-[#2A2F38] text-[#A7AFBA] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Evet, Var
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, hasCompany: 'Hayır' }))}
                      className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                        formData.hasCompany === 'Hayır'
                          ? 'bg-[#1C2027] border-white text-white'
                          : 'bg-[#1C2027] border-[#2A2F38] text-[#A7AFBA] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Hayır, Yok
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-[#A7AFBA] uppercase tracking-widest block mb-2">
                    Ek Not / Açıklama
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Varsa eklemek istediğiniz bilgiler veya sorularınız..."
                    rows={3}
                    className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#A7AFBA]/40 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all resize-none"
                  />
                </div>

                {/* Footer Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-[#A7AFBA]">
                  <div className="flex items-center gap-2 bg-[#1C2027] border border-[#2A2F38] p-2.5 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                    <span>Güvenli Başvuru</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#1C2027] border border-[#2A2F38] p-2.5 rounded-xl">
                    <Calendar className="w-4 h-4 text-white shrink-0" />
                    <span>Esnek Çalışma</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#1C2027] border border-[#2A2F38] p-2.5 rounded-xl">
                    <Phone className="w-4 h-4 text-white shrink-0" />
                    <span>Hızlı Geri Dönüş</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none shadow-md border-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      Başvuruyu Gönder
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4 text-3xl">
                  {vehicleType === 'bisiklet' ? '🚲' : '🛵'}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Başvurunuz Başarıyla Alındı!</h3>
                <p className="text-sm text-[#A7AFBA] max-w-md mb-6 leading-relaxed">
                  {title} talebiniz sistemimize kaydedildi. Ekibimiz en kısa sürede sizinle iletişime geçecektir.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white hover:bg-zinc-200 text-black font-bold px-8 py-3 rounded-xl transition-all cursor-pointer text-sm border-0"
                >
                  Tamam
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
