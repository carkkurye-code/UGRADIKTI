import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Store, MapPin, Phone, ArrowRight, ShieldCheck, 
  Clock, CheckCircle2, Building, Sparkles, AlertCircle, ExternalLink, ArrowLeft
} from 'lucide-react';
import { Partner, db, normalizeCategory, getCategoryDefaultImage, isStoreOpen } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { useModalBackButton, dismissModalWithoutHistoryPop } from '@/hooks/useModalBackButton';

interface CategoryPartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryImage?: string;
}

export function CategoryPartnersModal({
  isOpen,
  onClose,
  categoryName,
  categoryImage
}: CategoryPartnersModalProps) {
  const [, setLocation] = useLocation();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useModalBackButton(isOpen, onClose, 'category-partners');

  const normCatName = normalizeCategory(categoryName);
  const displayTitle = (normCatName === 'Kahve' || categoryName === 'Kafe') ? 'Kafe & Kahve' : normCatName;

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;

    const prevBodyPosition = bodyStyle.position;
    const prevBodyTop = bodyStyle.top;
    const prevBodyWidth = bodyStyle.width;
    const prevBodyOverflow = bodyStyle.overflow;
    const prevHtmlOverflow = htmlStyle.overflow;

    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';
    bodyStyle.overflow = 'hidden';
    htmlStyle.overflow = 'hidden';

    return () => {
      bodyStyle.position = prevBodyPosition;
      bodyStyle.top = prevBodyTop;
      bodyStyle.width = prevBodyWidth;
      bodyStyle.overflow = prevBodyOverflow;
      htmlStyle.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const loadCategoryPartners = async () => {
      try {
        const approved = await db.getApprovedPartners(normCatName);
        if (isMounted) {
          setPartners(approved);
        }
      } catch (err) {
        console.error('Error loading partners for category:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCategoryPartners();

    const handlePartnerUpdate = () => {
      loadCategoryPartners();
    };

    window.addEventListener('ugra_partners_updated', handlePartnerUpdate);
    window.addEventListener('storage', handlePartnerUpdate);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('ugra_partners_updated', handlePartnerUpdate);
      window.removeEventListener('storage', handlePartnerUpdate);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, normCatName, onClose]);

  const filteredPartners = partners.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.business_name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    );
  });

  const handleBack = () => {
    dismissModalWithoutHistoryPop('category-partners');
    onClose();
    if (typeof window !== 'undefined' && window.history.length > 1) {
      const currentPath = window.location.pathname;
      try {
        window.history.back();
      } catch (e) {
        setLocation('/');
        return;
      }
      setTimeout(() => {
        if (window.location.pathname === currentPath) {
          setLocation('/');
        }
      }, 200);
    } else {
      setLocation('/');
    }
  };

  const handleNavigateToStore = (slug: string) => {
    try {
      sessionStorage.setItem('ugra_last_category_modal', categoryName);
    } catch (e) {
      // ignore
    }
    dismissModalWithoutHistoryPop('category-partners');
    onClose();
    setLocation(`/${slug}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-4xl glass-panel border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden z-50 max-h-[90vh] sm:max-h-[85vh] flex flex-col my-auto font-sans"
        >
          {/* Header */}
          <div className="relative p-5 sm:p-6 border-b border-white/10 glass-panel backdrop-blur-xl flex items-center justify-between sticky top-0 z-10 pr-16 sm:pr-20">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2.5 text-xl sm:text-2xl font-bold tracking-wider text-white hover:text-white/90 transition-colors cursor-pointer group text-left"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:-translate-x-1 transition-transform" />
              <span>
                UĞRA<span className="text-[#FF7A00]">.</span>
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              title="Kapat"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Search Bar & Filters */}
          <div className="p-4 border-b border-[#2A2F38] bg-[#171A20]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#A7AFBA] absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder={`${displayTitle} kategorisindeki mağazalarda veya adreste ara...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1C2027] border border-[#2A2F38] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#A7AFBA]/50 focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Modal Body / Partner List */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 max-h-[60vh] custom-scrollbar">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="p-4 bg-white/5 border border-white/5 rounded-2xl animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/10 rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-white/10 rounded w-2/3" />
                        <div className="h-3 bg-white/5 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-3 bg-white/5 rounded w-full" />
                    <div className="h-8 bg-white/10 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[#1C2027] border border-dashed border-[#2A2F38] rounded-3xl flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-lg font-bold text-white">
                    {searchQuery ? 'Aramanıza Uygun Mağaza Bulunamadı' : 'Henüz aktif mağaza bulunmuyor.'}
                  </h3>
                  <p className="text-xs text-[#A7AFBA]">
                    {searchQuery 
                      ? 'Farklı bir arama terimi deneyebilir veya aramayı temizleyebilirsiniz.' 
                      : `Şu anda ${normCatName} kategorisinde onaylı aktif bir mağaza henüz listelenmedi.`}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setLocation('/partner');
                    }}
                    className="mt-2 px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 border-0"
                  >
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>İlk Partner Siz Olun</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {filteredPartners.map((partner) => {
                  const statusInfo = isStoreOpen(partner);
                  const isOpen = statusInfo.isOpen;

                  return (
                    <div
                      key={partner.id}
                      className={`bg-[#1C2027] border rounded-2xl p-4 transition-all duration-200 shadow-lg flex flex-col justify-between group ${
                        isOpen 
                          ? 'border-[#2A2F38] hover:border-white/20 hover:bg-[#232832] opacity-100' 
                          : 'border-[#2A2F38]/50 opacity-60 bg-[#16181F]'
                      }`}
                    >
                      <div>
                        {/* Top Row: Logo & Badges */}
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={partner.logo || categoryImage || getCategoryDefaultImage(partner.category || normCatName)}
                            alt={partner.business_name}
                            className={`w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 shadow-sm transition-all ${
                              !isOpen ? 'blur-[1.5px] grayscale-[20%]' : ''
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="text-[10px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                                {partner.category || normCatName}
                              </span>
                              
                              {isOpen ? (
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Açık
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  {statusInfo.label}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-white text-base tracking-tight truncate mt-1">
                              {partner.business_name}
                            </h4>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-[#A7AFBA] line-clamp-2 mb-3 leading-relaxed">
                          {partner.description || 'Kaliteli ürünler ve hızlı teslimat güvencesi ile kapınızda.'}
                        </p>

                        {/* Location & Contact Info */}
                        {partner.address && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#A7AFBA]/80 mb-3 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#A7AFBA] shrink-0" />
                            <span className="truncate">{partner.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Button */}
                      {isOpen ? (
                        <button
                          type="button"
                          onClick={() => handleNavigateToStore(partner.slug)}
                          className="w-full py-2.5 px-3 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 border-0 transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]"
                        >
                          <span>Mağazayı İncele & Sipariş Ver</span>
                          <ArrowRight className="w-4 h-4 text-black" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-3 bg-[#222630] text-zinc-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-white/5 cursor-not-allowed opacity-80"
                        >
                          <span>Şu anda hizmet vermiyor</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Notice */}
          <div className="p-4 border-t border-white/5 bg-[#0f0f12] text-center flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Tüm partnerler UĞRA kalite & hijyen standartlarına uygundur.
            </span>
            <span className="text-[11px] text-zinc-600">
              Soru ve destek için: <a href="mailto:destek@ugra.app" className="hover:underline text-zinc-400">destek@ugra.app</a>
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
