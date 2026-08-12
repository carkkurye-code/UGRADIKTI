import React, { useState } from 'react';
import { 
  Image, Plus, Edit, Trash2, Check, X, Tag, Calendar, Percent, Sparkles, Eye, Link as LinkIcon
} from 'lucide-react';
import { Banner, Campaign, CouponItem, db } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface AdminBannersTabProps {
  banners: Banner[];
  campaigns: Campaign[];
  coupons: CouponItem[];
  onRefresh: () => void;
  setBanners: React.Dispatch<React.SetStateAction<Banner[]>>;
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  setCoupons: React.Dispatch<React.SetStateAction<CouponItem[]>>;
}

export const AdminBannersTab: React.FC<AdminBannersTabProps> = ({
  banners,
  campaigns,
  coupons,
  onRefresh,
  setBanners,
  setCampaigns,
  setCoupons
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'banners' | 'campaigns' | 'coupons'>('banners');

  // Banner Forms State
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  // Campaign Forms State
  const [isAddCampOpen, setIsAddCampOpen] = useState(false);
  const [campTitle, setCampTitle] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campDiscount, setCampDiscount] = useState<number | string>('');
  const [campImage, setCampImage] = useState('');

  // Coupon Forms State
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number | string>('');
  const [couponMinAmount, setCouponMinAmount] = useState<number | string>('');

  useModalBackButton(isAddBannerOpen, () => setIsAddBannerOpen(false), 'admin-add-banner');
  useModalBackButton(Boolean(editingBanner), () => setEditingBanner(null), 'admin-edit-banner');
  useModalBackButton(isAddCampOpen, () => setIsAddCampOpen(false), 'admin-add-campaign');
  useModalBackButton(isAddCouponOpen, () => setIsAddCouponOpen(false), 'admin-add-coupon');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  // ESC key handler for modals
  React.useEffect(() => {
    if (!isAddBannerOpen && !isAddCampOpen && !isAddCouponOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddBannerOpen(false);
        setIsAddCampOpen(false);
        setIsAddCouponOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddBannerOpen, isAddCampOpen, isAddCouponOpen]);

  // Banner Actions
  const handleToggleBanner = async (b: Banner) => {
    const updated = banners.map(item => item.id === b.id ? { ...item, active: !item.active } : item);
    setBanners(updated);
    await db.saveBanners(updated);
  };

  const handleDeleteBanner = async (b: Banner) => {
    setConfirmModal({
      isOpen: true,
      title: 'Bannera Sil',
      description: `${b.title} banner görselini silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        const updated = banners.filter(item => item.id !== b.id);
        setBanners(updated);
        await db.saveBanners(updated);
      }
    });
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerImage.trim()) return;
    const newBanner: Banner = {
      id: 'ban_' + Date.now(),
      title: bannerTitle.trim(),
      image_url: bannerImage.trim(),
      link_url: bannerLink.trim() || '/explore',
      active: true,
      position: banners.length + 1,
      created_at: new Date().toISOString()
    };
    const updated = [newBanner, ...banners];
    setBanners(updated);
    await db.saveBanners(updated);
    setBannerTitle('');
    setBannerImage('');
    setBannerLink('');
    setIsAddBannerOpen(false);
  };

  // Campaign Actions
  const handleToggleCamp = async (c: Campaign) => {
    const updated = campaigns.map(item => item.id === c.id ? { ...item, active: !item.active } : item);
    setCampaigns(updated);
    await db.saveCampaigns(updated);
  };

  const handleDeleteCamp = async (c: Campaign) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kampanyayı Sil',
      description: `${c.title} kampanyasını silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        const updated = campaigns.filter(item => item.id !== c.id);
        setCampaigns(updated);
        await db.saveCampaigns(updated);
      }
    });
  };

  const handleAddCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle.trim()) return;
    const newCamp: Campaign = {
      id: 'camp_' + Date.now(),
      title: campTitle.trim(),
      description: campDesc.trim(),
      discount_rate: Number(campDiscount) || 10,
      banner_url: campImage || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
      active: true,
      created_at: new Date().toISOString()
    };
    const updated = [newCamp, ...campaigns];
    setCampaigns(updated);
    await db.saveCampaigns(updated);
    setCampTitle('');
    setCampDesc('');
    setIsAddCampOpen(false);
  };

  // Coupon Actions
  const handleToggleCoupon = async (cp: CouponItem) => {
    const updated = coupons.map(item => item.id === cp.id ? { ...item, active: !item.active } : item);
    setCoupons(updated);
    await db.saveCoupons(updated);
  };

  const handleDeleteCoupon = async (cp: CouponItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kuponu Sil',
      description: `${cp.code} kupon kodunu silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        const updated = coupons.filter(item => item.id !== cp.id);
        setCoupons(updated);
        await db.saveCoupons(updated);
      }
    });
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const newCp: CouponItem = {
      id: 'coup_' + Date.now(),
      code: couponCode.trim().toUpperCase(),
      discount_type: 'fixed',
      discount_value: Number(couponDiscount) || 20,
      min_order_amount: Number(couponMinAmount) || 100,
      used_count: 0,
      usage_limit: 500,
      active: true,
      created_at: new Date().toISOString()
    };
    const updated = [newCp, ...coupons];
    setCoupons(updated);
    await db.saveCoupons(updated);
    setCouponCode('');
    setIsAddCouponOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Banner & Kampanya Yönetimi</h1>
          <p className="text-sm text-[#666666] mt-1">Ana sayfa slider görselleri, indirim kampanyaları ve promosyon kupon kodlarını yönetin.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#F7F7F8] p-1 rounded-xl border border-[#E5E5E7]">
          <button
            onClick={() => setActiveSubTab('banners')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
              activeSubTab === 'banners' ? 'bg-[#111111] text-white font-bold' : 'text-[#666666] hover:text-[#111111]'
            }`}
          >
            Banner Görselleri ({banners.length})
          </button>
          <button
            onClick={() => setActiveSubTab('campaigns')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
              activeSubTab === 'campaigns' ? 'bg-[#111111] text-white font-bold' : 'text-[#666666] hover:text-[#111111]'
            }`}
          >
            Kampanyalar ({campaigns.length})
          </button>
          <button
            onClick={() => setActiveSubTab('coupons')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
              activeSubTab === 'coupons' ? 'bg-[#111111] text-white font-bold' : 'text-[#666666] hover:text-[#111111]'
            }`}
          >
            Promosyon Kuponları ({coupons.length})
          </button>
        </div>
      </div>

      {/* 1. BANNERS SECTION */}
      {activeSubTab === 'banners' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
              <Image className="w-5 h-5 text-[#111111]" /> Aktif Bannerlar
            </h2>
            <button
              onClick={() => setIsAddBannerOpen(true)}
              className="bg-[#111111] hover:bg-[#222222] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-0 shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" /> Yeni Banner Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map(b => (
              <div key={b.id} className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-sm group">
                <div className="h-40 bg-[#F7F7F8] relative overflow-hidden">
                  <img src={b.image_url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider border shadow-sm uppercase ${
                      b.active ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-500 text-white border-red-600'
                    }`}>
                      {b.active ? 'Yayında' : 'Pasif'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-base text-[#111111]">{b.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#666666] font-mono">
                    <LinkIcon className="w-3.5 h-3.5 text-[#111111]" />
                    <span className="truncate">{b.link_url || '/explore'}</span>
                  </div>

                  <div className="pt-3 border-t border-[#E5E5E7] flex items-center justify-between">
                    <button
                      onClick={() => handleToggleBanner(b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        b.active ? 'bg-[#F7F7F8] text-[#666666] border-[#E5E5E7] hover:bg-[#F2F2F3] hover:text-[#111111]' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {b.active ? 'Pasife Al' : 'Yayına Al'}
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(b)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ADD BANNER MODAL */}
          {isAddBannerOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setIsAddBannerOpen(false)} />
              <div className="relative z-[10000] bg-white border border-[#E5E5E7] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-[#E5E5E7] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight flex items-center gap-2">
                      <Image className="w-5 h-5 text-[#111111]" /> Yeni Banner Ekle
                    </h3>
                    <p className="text-xs text-[#666666] mt-0.5">Ana sayfa slider için yeni banner tanımlayın.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddBannerOpen(false)}
                    aria-label="Kapat"
                    title="Kapat"
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E5E7] text-[#666666] hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleAddBanner} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm font-medium">
                    <div className="space-y-1">
                      <label className="text-[#666666] font-semibold">Banner Başlığı</label>
                      <input
                        type="text"
                        required
                        placeholder="Banner Başlığı"
                        value={bannerTitle}
                        onChange={e => setBannerTitle(e.target.value)}
                        className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#666666] font-semibold">Görsel URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://images.unsplash.com/..."
                        value={bannerImage}
                        onChange={e => setBannerImage(e.target.value)}
                        className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#666666] font-semibold">Yönlendirme Linki (Opsiyonel)</label>
                      <input
                        type="text"
                        placeholder="/category/magaza"
                        value={bannerLink}
                        onChange={e => setBannerLink(e.target.value)}
                        className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 sm:p-5 border-t border-[#E5E5E7] bg-[#F7F7F8] flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAddBannerOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-[#E5E5E7] bg-white text-[#666666] hover:text-[#111111] font-semibold cursor-pointer text-xs sm:text-sm transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-white font-bold cursor-pointer border-0 text-xs sm:text-sm shadow-md"
                    >
                      Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. CAMPAIGNS SECTION */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#111111]" /> Kampanyalar
            </h2>
            <button
              onClick={() => setIsAddCampOpen(true)}
              className="bg-[#111111] hover:bg-[#222222] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-0 shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" /> Yeni Kampanya
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map(c => (
              <div key={c.id} className="bg-white border border-[#E5E5E7] rounded-2xl p-6 space-y-4 relative shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-lg text-[#111111]">{c.title}</h3>
                    <p className="text-xs text-[#666666] mt-1">{c.description || 'Açıklama yok'}</p>
                  </div>
                  <span className="px-3 py-1 bg-[#111111] text-white font-black rounded-xl text-sm shadow-sm">
                    %{c.discount_rate || 10} İNDİRİM
                  </span>
                </div>

                <div className="pt-4 border-t border-[#E5E5E7] flex items-center justify-between text-xs">
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${c.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {c.active ? 'Aktif Kampanya' : 'Pasif'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleCamp(c)}
                      className="px-3 py-1.5 bg-[#F7F7F8] hover:bg-[#F2F2F3] rounded-lg text-[#666666] hover:text-[#111111] font-bold border border-[#E5E5E7] cursor-pointer"
                    >
                      {c.active ? 'Durdur' : 'Başlat'}
                    </button>
                    <button
                      onClick={() => handleDeleteCamp(c)}
                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ADD CAMPAIGN MODAL */}
          {isAddCampOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setIsAddCampOpen(false)} />
              <div className="relative z-[10000] bg-white border border-[#E5E5E7] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-[#E5E5E7] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#111111]" /> Yeni Kampanya Oluştur
                    </h3>
                    <p className="text-xs text-[#666666] mt-0.5">Sisteme yeni bir indirim kampanyası ekleyin.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCampOpen(false)}
                    aria-label="Kapat"
                    title="Kapat"
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E5E7] text-[#666666] hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleAddCamp} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm font-medium">
                    <div className="space-y-1">
                      <label className="text-[#666666] font-semibold">Kampanya Adı</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: Bahar Fırsatları"
                        value={campTitle}
                        onChange={e => setCampTitle(e.target.value)}
                        className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#666666] font-semibold">Açıklama</label>
                      <textarea
                        rows={2}
                        placeholder="Seçili ürünlerde geçerli dev indirim..."
                        value={campDesc}
                        onChange={e => setCampDesc(e.target.value)}
                        className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111] resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#666666] font-semibold">İndirim Oranı (%)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={99}
                        value={campDiscount}
                        onChange={e => setCampDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111] font-mono"
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 sm:p-5 border-t border-[#E5E5E7] bg-[#F7F7F8] flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAddCampOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-[#E5E5E7] bg-white text-[#666666] hover:text-[#111111] font-semibold cursor-pointer text-xs sm:text-sm transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-white font-bold cursor-pointer border-0 text-xs sm:text-sm shadow-md"
                    >
                      Oluştur
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. COUPONS SECTION */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#111111] flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#111111]" /> Promosyon Kuponları
            </h2>
            <button
              onClick={() => setIsAddCouponOpen(true)}
              className="bg-[#111111] hover:bg-[#222222] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-0 shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" /> Yeni Kupon Kodu
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coupons.map(cp => (
              <div key={cp.id} className="bg-white border border-[#E5E5E7] rounded-2xl p-5 space-y-3 relative shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-lg text-[#111111] tracking-widest bg-[#F7F7F8] border border-[#E5E5E7] px-3 py-1 rounded-xl">
                    {cp.code}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${cp.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {cp.active ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#666666]">
                    <span>İndirim Tutarı:</span>
                    <span className="font-bold text-[#111111] font-mono">{cp.discount_value || 0} ₺</span>
                  </div>
                  <div className="flex justify-between text-[#666666]">
                    <span>Min. Sepet:</span>
                    <span className="font-bold text-[#111111] font-mono">{cp.min_order_amount} ₺</span>
                  </div>
                  <div className="flex justify-between text-[#666666]">
                    <span>Kullanım:</span>
                    <span className="font-bold text-[#111111] font-mono">{cp.used_count || 0} / {cp.usage_limit || 500}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E5E7] flex justify-between items-center">
                  <button
                    onClick={() => handleToggleCoupon(cp)}
                    className="text-xs text-[#666666] hover:text-[#111111] font-semibold cursor-pointer border-0 bg-transparent"
                  >
                    {cp.active ? 'Deaktif Et' : 'Aktif Et'}
                  </button>
                  <button
                    onClick={() => handleDeleteCoupon(cp)}
                    className="p-1 text-red-600 hover:text-red-700 border-0 bg-transparent cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ADD COUPON MODAL */}
          {isAddCouponOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setIsAddCouponOpen(false)} />
              <div className="relative z-[10000] bg-white border border-[#E5E5E7] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-[#E5E5E7] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[#111111]" /> Yeni Kupon Kodu Tanımla
                    </h3>
                    <p className="text-xs text-[#666666] mt-0.5">Sisteme özel promosyon kupon kodu ekleyin.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCouponOpen(false)}
                    aria-label="Kapat"
                    title="Kapat"
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E5E7] text-[#666666] hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleAddCoupon} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm font-medium">
                    <div className="space-y-1">
                      <label className="text-[#666666] font-semibold">Kupon Kodu</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: HOŞGELDİN50"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] font-mono uppercase focus:outline-none focus:border-[#111111]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[#666666] font-semibold">İndirim Tutarı (₺)</label>
                        <input
                          type="number"
                          required
                          value={couponDiscount}
                          onChange={e => setCouponDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] font-mono focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#666666] font-semibold">Min. Sepet Tutarı (₺)</label>
                        <input
                          type="number"
                          required
                          value={couponMinAmount}
                          onChange={e => setCouponMinAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] font-mono focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 sm:p-5 border-t border-[#E5E5E7] bg-[#F7F7F8] flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAddCouponOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-[#E5E5E7] bg-white text-[#666666] hover:text-[#111111] font-semibold cursor-pointer text-xs sm:text-sm transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#111111] hover:bg-[#222222] text-white font-bold cursor-pointer border-0 text-xs sm:text-sm shadow-md"
                    >
                      Kuponu Oluştur
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
        onConfirm={async () => {
          await confirmModal.action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
