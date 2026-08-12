import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { CategoryPartnersModal } from '@/components/CategoryPartnersModal';
import { db, categoryNameToSlug } from '@/lib/supabase';
import { CATEGORY_STUDIO_IMAGES } from '@/lib/categoryImages';
import { useLocation } from 'wouter';
import { InteractiveCard } from '@/components/ui/InteractiveCard';

export interface HeroProps {
  onSelectType?: (type: 'hemen' | 'gecerken') => void;
  onServiceClick?: (service: string) => void;
}

export function Hero({ onSelectType, onServiceClick }: HeroProps = {}) {
  const handleSelectType = (type: 'hemen' | 'gecerken') => {
    if (onSelectType) {
      onSelectType(type);
    }
  };

  return (
    <section className="pt-24 sm:pt-28 pb-10 sm:pb-14 flex flex-col justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 md:px-12 z-10 relative">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light max-w-xl mb-6 sm:mb-8"
          >
            Gitmeye vakit bulamadığın her yere senin için <span className="text-foreground font-medium">UĞRA'yalım.</span>
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl sm:max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-left"
          >
            {/* Hemen UĞRA Card */}
            <InteractiveCard
              animateOnScroll={false}
              onClick={() => handleSelectType('hemen')}
              hoverBorderColor="rgba(255, 255, 255, 0.2)"
              hoverShadow="0 20px 40px -10px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255,255,255,0.1)"
              className="glass-panel rounded-2xl p-6 relative overflow-hidden group cursor-pointer border border-white/5 transition-all duration-300 flex flex-col justify-between min-h-[180px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full group-hover:bg-white/10 pointer-events-none" />

              <div>
                <h4 className="text-lg font-bold mb-2 flex items-center gap-1.5 text-foreground">
                  Hemen UĞRA
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Şimdi çözülmesi gereken işlerin için.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-200 font-bold mt-4 group-hover:translate-x-1.5 transition-transform duration-300">
                Seç ve İlet <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </InteractiveCard>

            {/* Geçerken UĞRA Card */}
            <InteractiveCard
              animateOnScroll={false}
              onClick={() => handleSelectType('gecerken')}
              hoverBorderColor="rgba(255, 255, 255, 0.2)"
              hoverShadow="0 20px 40px -10px rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255,255,255,0.1)"
              className="glass-panel rounded-2xl p-6 relative overflow-hidden group cursor-pointer border border-white/5 transition-all duration-300 flex flex-col justify-between min-h-[180px]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full group-hover:bg-white/10 pointer-events-none" />

              <div>
                <h4 className="text-lg font-bold mb-2 flex items-center gap-1.5 text-foreground">
                  Geçerken UĞRA
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gün içinde halledilebilecek işlerin için.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-200 font-bold mt-4 group-hover:translate-x-1.5 transition-transform duration-300">
                Seç ve İlet <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </InteractiveCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PartnerHeader() {
  const [index, setIndex] = useState(0);
  const texts = ["Senin için UĞRA'yalım", "Senin yerine UĞRA'yalım"];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  return (
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
  );
}

export function SeciliMekanlar() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<{ name: string; image?: string } | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const counts = await db.getCategoryPartnerCounts();
        if (isMounted) {
          setCategoryCounts(counts);
        }
      } catch (e) {
        console.error('Error fetching category counts:', e);
      }
    };
    fetchCounts();

    const handlePartnerUpdate = () => {
      fetchCounts();
    };

    window.addEventListener('ugra_partners_updated', handlePartnerUpdate);
    window.addEventListener('storage', handlePartnerUpdate);

    try {
      const savedCat = sessionStorage.getItem('ugra_last_category_modal');
      if (savedCat) {
        const venue = venues.find(v => v.name === savedCat || v.category === savedCat);
        setSelectedCategory({ name: savedCat, image: venue?.image });
        setIsCategoryModalOpen(true);
      }
    } catch (e) {
      // ignore storage errors
    }

    return () => {
      isMounted = false;
      window.removeEventListener('ugra_partners_updated', handlePartnerUpdate);
      window.removeEventListener('storage', handlePartnerUpdate);
    };
  }, []);

  const handleCloseCategoryModal = () => {
    try {
      sessionStorage.removeItem('ugra_last_category_modal');
    } catch (e) {
      // ignore
    }
    setIsCategoryModalOpen(false);
  };

  const handleCategoryClick = (categoryName: string, categoryImage?: string, slug?: string) => {
    if (slug === 'senin-dukkanin' || categoryName === 'Bireysel Satıcı' || categoryName === 'Bireysel & Yerel Üretici' || categoryName === 'Senin Dükkanın') {
      setLocation('/senin-dukkanin');
      return;
    }
    const targetSlug = slug || categoryNameToSlug(categoryName);
    setLocation(`/kategori/${targetSlug}`);
  };

  const venues = [
    {
      id: "senin-dukkanin",
      slug: "senin-dukkanin",
      name: "Senin Dükkanın",
      category: "Bireysel Satıcı",
      description: "Bireysel ve yerel üreticilerin ürünleri",
      image: CATEGORY_STUDIO_IMAGES['Senin Dükkanın'],
    },
    {
      id: "coffee",
      slug: "kafe",
      name: "Kafe",
      category: "Kahve",
      description: "Şehrin en iyi kahvecileri ve kafeleri",
      image: CATEGORY_STUDIO_IMAGES['Kahve'],
    },
    {
      id: "store",
      slug: "giyim",
      name: "Giyim",
      category: "Giyim",
      description: "Butikler ve kıyafet mağazaları",
      image: CATEGORY_STUDIO_IMAGES['Giyim'],
    },
    {
      id: "cosmetic",
      slug: "kozmetik",
      name: "Kozmetik",
      category: "Kozmetik",
      description: "Kişisel bakım ve güzellik ürünleri",
      image: CATEGORY_STUDIO_IMAGES['Kozmetik'],
    },
    {
      id: "perfume",
      slug: "parfum-parfumeri",
      name: "Parfüm & Parfümeri",
      category: "Parfüm & Parfümeri",
      description: "Özel koku ve esans çeşitleri",
      image: CATEGORY_STUDIO_IMAGES['Parfüm & Parfümeri'],
    },
    {
      id: "health",
      slug: "saglik-medikal",
      name: "Sağlık & Medikal",
      category: "Sağlık & Medikal",
      description: "Medikal ve kişisel sağlık ürünleri",
      image: CATEGORY_STUDIO_IMAGES['Sağlık & Medikal'],
    },
    {
      id: "petshop",
      slug: "petshop",
      name: "Petshop",
      category: "Petshop",
      description: "Sevimli dostlarınız için her şey",
      image: CATEGORY_STUDIO_IMAGES['Petshop'],
    },
    {
      id: "jewelry",
      slug: "taki-aksesuar",
      name: "Takı & Aksesuar",
      category: "Takı & Aksesuar",
      description: "Şık takı, saat ve aksesuarlar",
      image: CATEGORY_STUDIO_IMAGES['Takı & Aksesuar'],
    },
    {
      id: "gift",
      slug: "hediyelik",
      name: "Hediyelik",
      category: "Hediyelik",
      description: "Özel günler için sürpriz hediyeler",
      image: CATEGORY_STUDIO_IMAGES['Hediyelik'],
    },
    {
      id: "florist",
      slug: "cicekci",
      name: "Çiçekçi",
      category: "Çiçekçi",
      description: "Taze çiçek ve özel aranjmanlar",
      image: CATEGORY_STUDIO_IMAGES['Çiçekçi'],
    },
    {
      id: "bags",
      slug: "canta-valiz",
      name: "Çanta & Valiz",
      category: "Çanta & Valiz",
      description: "Deriden seyahat çantalarına",
      image: CATEGORY_STUDIO_IMAGES['Çanta & Valiz'],
    },
    {
      id: "optic",
      slug: "optik",
      name: "Optik",
      category: "Optik",
      description: "Güneş gözlükleri ve çerçeveler",
      image: CATEGORY_STUDIO_IMAGES['Optik'],
    },
    {
      id: "baby",
      slug: "bebek",
      name: "Bebek",
      category: "Bebek",
      description: "Bebek giyim ve bakım ürünleri",
      image: CATEGORY_STUDIO_IMAGES['Bebek'],
    },
    {
      id: "technology",
      slug: "teknoloji",
      name: "Teknoloji",
      category: "Teknoloji",
      description: "Elektronik cihaz ve aksesuarlar",
      image: CATEGORY_STUDIO_IMAGES['Teknoloji'],
    },
    {
      id: "stationery",
      slug: "kirtasiye",
      name: "Kırtasiye",
      category: "Kırtasiye",
      description: "Okul ve ofis gereçleri",
      image: CATEGORY_STUDIO_IMAGES['Kırtasiye'],
    },
    {
      id: "hardware",
      slug: "nalbur",
      name: "Yapı Market",
      category: "Yapı Market",
      description: "Nalbur ve hırdavat malzemeleri",
      image: CATEGORY_STUDIO_IMAGES['Yapı Market'],
    },
  ];

  return (
    <section id="secili-mekanlar" className="py-10 sm:py-14 relative z-10 border-t border-white/5 bg-[#0B0B0C]">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center w-full max-w-6xl mx-auto"
        >
          {/* Header section */}
          <PartnerHeader />

          {/* Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5 w-full">
            {venues.map((venue) => {
              const count = categoryCounts[venue.category] || categoryCounts[venue.name] || 0;

              return (
                <div 
                  key={venue.id} 
                  onClick={() => handleCategoryClick(venue.name || venue.category, venue.image, venue.slug)}
                  className="group w-full bg-[#121214] border border-[#242428] hover:border-white/20 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 cursor-pointer active:scale-[0.98] hover:shadow-xl hover:shadow-black/50"
                >
                  <div>
                    {/* Large Image */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#0B0B0C]">
                      <img 
                        referrerPolicy="no-referrer"
                        src={venue.image} 
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-3.5 sm:p-4">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                        {venue.name}
                      </h3>
                      <p className="text-xs text-[#A7AFBA] line-clamp-2 leading-relaxed mt-1 font-normal">
                        {venue.description}
                      </p>
                    </div>
                  </div>

                  {/* Store Count Footer */}
                  <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-0">
                    <span className="text-[11px] sm:text-xs text-[#8A92A0] font-medium block">
                      {count} mağaza
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Category Partners Modal */}
      {selectedCategory && (
        <CategoryPartnersModal
          isOpen={isCategoryModalOpen}
          onClose={handleCloseCategoryModal}
          categoryName={selectedCategory.name}
          categoryImage={selectedCategory.image}
        />
      )}
    </section>
  );
}

