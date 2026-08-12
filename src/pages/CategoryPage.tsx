import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { db, Partner, categorySlugToName, normalizeCategory, getCategoryDefaultImage } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader2, ArrowLeft } from 'lucide-react';

export function CategoryPage() {
  const [, params] = useRoute('/kategori/:slug');
  const [, setLocation] = useLocation();
  const rawSlug = params?.slug || '';

  const handleBack = () => {
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

  const categoryName = categorySlugToName(rawSlug);
  const normCatName = normalizeCategory(categoryName);
  const displayTitle = (normCatName === 'Kahve' || categoryName === 'Kafe' || rawSlug === 'kafe' || rawSlug === 'kahve' || rawSlug === 'kafe-kahve') 
    ? 'Kafe & Kahve' 
    : (normCatName || categoryName || 'Kategori');

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (rawSlug === 'senin-dukkanin' || rawSlug === 'bireysel-satici' || rawSlug === 'bireysel-yerel-uretici' || normCatName === 'Bireysel Satıcı' || normCatName === 'Bireysel & Yerel Üretici') {
      setLocation('/senin-dukkanin');
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const approved = await db.getApprovedPartners(normCatName);
        if (isMounted) {
          setPartners(approved);
        }
      } catch (err) {
        console.error('Error loading category partners:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    const handlePartnerUpdate = () => {
      loadData();
    };

    window.addEventListener('ugra_partners_updated', handlePartnerUpdate);
    window.addEventListener('storage', handlePartnerUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('ugra_partners_updated', handlePartnerUpdate);
      window.removeEventListener('storage', handlePartnerUpdate);
    };
  }, [normCatName, rawSlug, setLocation]);

  return (
    <div className="min-h-screen bg-transparent text-white font-sans flex flex-col justify-between selection:bg-white/20">
      <Header />

      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto w-full">
          {/* Back Line - OUTSIDE Card */}
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2.5 text-2xl font-bold tracking-wider text-white hover:text-white/90 transition-colors mb-6 cursor-pointer group text-left"
          >
            <ArrowLeft className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
            <span>
              UĞRA<span className="text-[#FF7A00]">.</span>
            </span>
          </button>

          <div className="glass-panel border border-[#1A1A1E] rounded-3xl p-6 sm:p-10 shadow-2xl">
            {/* Store List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-white/70" />
                <p className="text-xs text-[#A7AFBA] font-medium">Yükleniyor...</p>
              </div>
            ) : partners.length === 0 ? (
              <div className="py-12 text-center text-[#A7AFBA] text-sm font-medium">
                Bu kategoride henüz aktif mağaza bulunmuyor.
              </div>
            ) : (
              <div className="divide-y divide-[#1F2228]">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    onClick={() => setLocation(`/${partner.slug}`)}
                    className="py-4 sm:py-5 flex items-center gap-4 sm:gap-5 cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] transition-all rounded-xl px-2 group"
                  >
                    {/* Store Logo */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#121214] border border-[#242428] flex items-center justify-center shrink-0 overflow-hidden p-1 group-hover:border-white/30 transition-colors">
                      <img
                        referrerPolicy="no-referrer"
                        src={partner.logo || getCategoryDefaultImage(partner.category || normCatName)}
                        alt={partner.business_name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>

                    {/* Store Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="font-bold text-white text-base sm:text-lg tracking-tight truncate group-hover:text-white/90 transition-colors">
                        {partner.business_name}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#A7AFBA] line-clamp-2 leading-relaxed font-normal">
                        {partner.description || 'Kaliteli hizmet ve taze lezzetlerle yanınızdayız.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer isCategoryPage={true} />
    </div>
  );
}


