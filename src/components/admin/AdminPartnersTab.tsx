import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, ShieldAlert, Key, Mail, Phone, 
  Building, MapPin, Check, X, Clock, ExternalLink, Image, Lock, DollarSign,
  Package, ShoppingBag, History, AlertTriangle, Layers, ChevronDown, Loader2, CheckCircle2
} from 'lucide-react';
import { Partner, Product, Order, AuditLog, OFFICIAL_PARTNER_CATEGORIES, db, normalizeCategory, getCategoryDefaultImage } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface AdminPartnersTabProps {
  partners: Partner[];
  products: Product[];
  orders: Order[];
  auditLogs?: AuditLog[];
  onRefresh: () => void;
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
}

export const AdminPartnersTab: React.FC<AdminPartnersTabProps> = ({
  partners,
  products,
  orders,
  auditLogs = [],
  onRefresh,
  setPartners
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Bulk Selection
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  // Modals
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewingPartner, setViewingPartner] = useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [resetPassPartner, setResetPassPartner] = useState<Partner | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passResetMsg, setPassResetMsg] = useState<string | null>(null);

  // New Partner Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useModalBackButton(Boolean(viewingPartner), () => setViewingPartner(null), 'admin-view-partner');
  useModalBackButton(Boolean(editingPartner), () => setEditingPartner(null), 'admin-edit-partner');
  useModalBackButton(Boolean(resetPassPartner), () => setResetPassPartner(null), 'admin-reset-pass-partner');
  useModalBackButton(isAddModalOpen, () => setIsAddModalOpen(false), 'admin-add-partner');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [newPartnerForm, setNewPartnerForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    category: OFFICIAL_PARTNER_CATEGORIES[0] || 'Kahve',
    password: '',
    confirmPassword: '',
    logo: '',
    coverImage: ''
  });

  // Detail Sub-views
  const [detailSubTab, setDetailSubTab] = useState<'info' | 'orders' | 'products' | 'earnings' | 'logs'>('info');

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
    requireDoubleConfirmation?: boolean;
    prompt?: string;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  // ESC key handler for modals
  React.useEffect(() => {
    if (!viewingPartner && !editingPartner && !resetPassPartner && !isAddModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingPartner(null);
        setEditingPartner(null);
        setResetPassPartner(null);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPartner, editingPartner, resetPassPartner, isAddModalOpen]);
  const cities = Array.from(new Set(partners.map(p => {
    const parts = (p.address || '').split(',');
    return parts[parts.length - 1]?.trim() || p.address || 'İstanbul';
  }))).filter(Boolean);

  // Filter Logic
  const filteredPartners = (partners || []).filter(p => {
    if (!p) return false;
    const nameStr = String(p.business_name ?? '');
    const slugStr = String(p.slug ?? '');
    const searchStr = String(searchTerm ?? '').toLowerCase();
    const matchesSearch = nameStr.toLowerCase().includes(searchStr) ||
                          slugStr.toLowerCase().includes(searchStr) ||
                          String(p.phone ?? '').includes(searchTerm);
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesCity = !selectedCity || String(p.address ?? '').toLowerCase().includes(String(selectedCity).toLowerCase());
    let matchesStatus = true;
    if (selectedStatus === 'aktif') matchesStatus = p.active && p.status !== 'suspended';
    if (selectedStatus === 'pasif') matchesStatus = !p.active && p.status !== 'suspended';
    if (selectedStatus === 'suspended') matchesStatus = p.status === 'suspended';
    if (selectedStatus === 'pending') matchesStatus = p.status === 'pending';

    return matchesSearch && matchesCategory && matchesCity && matchesStatus;
  });

  // Checkbox handlers
  const toggleSelectAll = () => {
    if (selectedPartnerIds.length === filteredPartners.length) {
      setSelectedPartnerIds([]);
    } else {
      setSelectedPartnerIds(filteredPartners.map(p => p.id));
    }
  };

  const toggleSelectPartner = (id: string) => {
    setSelectedPartnerIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  // --- ACTIONS ---
  const handleToggleActive = async (partner: Partner) => {
    const newActiveState = !partner.active;
    const updated = partners.map(p => p.id === partner.id ? { ...p, active: newActiveState } : p);
    setPartners(updated);
    await db.updatePartner(partner.id, { active: newActiveState });
    await db.logAction({
      partner_id: partner.id,
      partner_name: partner.business_name,
      action: 'PARTNER_ACTIVE_TOGGLED',
      entity_type: 'partner',
      entity_id: partner.id,
      details: { active: newActiveState }
    });
  };

  const handleSuspendPartner = async (partner: Partner) => {
    const isSuspended = partner.status === 'suspended';
    const newStatus = isSuspended ? 'approved' : 'suspended';
    const newActive = isSuspended ? true : false;
    
    setConfirmModal({
      isOpen: true,
      title: isSuspended ? 'Partneri Tekrar Aktif Et' : 'Partneri Askıya Al',
      description: `${partner.business_name} partnerini ${isSuspended ? 'tekrar aktif duruma' : 'askıya alma durumuna'} geçirmek istediğinize emin misiniz?`,
      isDanger: !isSuspended,
      action: async () => {
        const updated = partners.map(p => p.id === partner.id ? { ...p, status: newStatus as any, active: newActive } : p);
        setPartners(updated);
        await db.updatePartner(partner.id, { status: newStatus as any, active: newActive });
        await db.logAction({
          partner_id: partner.id,
          partner_name: partner.business_name,
          action: isSuspended ? 'PARTNER_REACTIVATED' : 'PARTNER_SUSPENDED',
          entity_type: 'partner',
          entity_id: partner.id,
          details: { status: newStatus, active: newActive }
        });
      }
    });
  };

  const handleDeletePartner = async (partner: Partner, permanent = false) => {
    setConfirmModal({
      isOpen: true,
      title: permanent ? 'Kalıcı Olarak Sil' : 'Partneri Sil',
      description: `${partner.business_name} partnerini ${permanent ? 'sistemden KALICI OLARAK silmek üzeresiniz. Bu işlem geri alınamaz!' : 'silmek istediğinize emin misiniz?'}`,
      isDanger: true,
      requireDoubleConfirmation: permanent,
      prompt: 'KAZANÇLARI SİL',
      action: async () => {
        try {
          await db.deletePartner(partner.id);
          setPartners(prev => prev.filter(p => p.id !== partner.id));
          await db.logAction({
            partner_id: partner.id,
            partner_name: partner.business_name,
            action: permanent ? 'PARTNER_PERMANENTLY_DELETED' : 'PARTNER_DELETED',
            entity_type: 'partner',
            entity_id: partner.id,
            details: { permanent }
          });
          if (onRefresh) onRefresh();
        } catch (err: any) {
          setActionError('Silme işlemi başarısız oldu: ' + (err.message || err));
        }
      }
    });
  };

  const handlePasswordReset = (partner: Partner) => {
    setResetPassPartner(partner);
    const gen = 'Ugra' + Math.floor(100000 + Math.random() * 900000) + '!';
    setNewPassword(gen);
    setPassResetMsg(null);
  };

  const confirmPasswordReset = async () => {
    if (!resetPassPartner) return;
    try {
      await db.logAction({
        partner_id: resetPassPartner.id,
        partner_name: resetPassPartner.business_name,
        action: 'PARTNER_PASSWORD_RESET',
        entity_type: 'partner',
        entity_id: resetPassPartner.id,
        details: { new_password: newPassword }
      });
      setPassResetMsg(`Yeni Şifre Başarıyla Oluşturuldu: ${newPassword}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk Actions
  const handleBulkDelete = () => {
    if (selectedPartnerIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Toplu Silme Onayı',
      description: `Seçilen ${selectedPartnerIds.length} partneri silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        for (const id of selectedPartnerIds) {
          await db.deletePartner(id);
        }
        setPartners(prev => prev.filter(p => !selectedPartnerIds.includes(p.id)));
        setSelectedPartnerIds([]);
      }
    });
  };

  const handleBulkStatusChange = (active: boolean, suspend = false) => {
    if (selectedPartnerIds.length === 0) return;
    const title = suspend ? 'Toplu Askıya Al' : (active ? 'Toplu Aktif Yap' : 'Toplu Pasif Yap');
    setConfirmModal({
      isOpen: true,
      title,
      description: `Seçilen ${selectedPartnerIds.length} partneri ${title.toLowerCase()} işlemine tabi tutacaksınız.`,
      isDanger: !active || suspend,
      action: async () => {
        const updated = partners.map(p => {
          if (selectedPartnerIds.includes(p.id)) {
            return {
              ...p,
              active: suspend ? false : active,
              status: suspend ? 'suspended' as const : (p.status === 'suspended' ? 'approved' as const : p.status)
            };
          }
          return p;
        });
        setPartners(updated);
        for (const id of selectedPartnerIds) {
          await db.updatePartner(id, {
            active: suspend ? false : active,
            status: suspend ? 'suspended' : 'approved'
          });
        }
        setSelectedPartnerIds([]);
      }
    });
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    try {
      await db.updatePartner(editingPartner.id, editingPartner);
      setPartners(prev => prev.map(p => p.id === editingPartner.id ? editingPartner : p));
      await db.logAction({
        partner_id: editingPartner.id,
        partner_name: editingPartner.business_name,
        action: 'PARTNER_UPDATED',
        entity_type: 'partner',
        entity_id: editingPartner.id,
        details: editingPartner
      });
      setEditingPartner(null);
    } catch (err) {
      console.error('Error updating partner:', err);
    }
  };

  const handleAddPartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Create Partner başladı - Form Submit tetiklendi", newPartnerForm);
    setAddError(null);
    setAddSuccess(null);

    if (!newPartnerForm.businessName.trim()) {
      console.warn("Validation hatası: İşletme adı boş.");
      setAddError('Lütfen işletme adını giriniz.');
      return;
    }
    if (!newPartnerForm.contactName.trim()) {
      console.warn("Validation hatası: Yetkili adı soyadı boş.");
      setAddError('Lütfen yetkili adı soyadını giriniz.');
      return;
    }
    const cleanEmail = newPartnerForm.email.trim().toLowerCase();
    if (!cleanEmail) {
      console.warn("Validation hatası: E-posta boş.");
      setAddError('Lütfen e-posta adresini giriniz.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      console.warn("Validation hatası: Geçersiz e-posta adresi.");
      setAddError('Lütfen geçerli bir e-posta adresi giriniz (örnek: raki@ugra.app).');
      return;
    }
    if (!newPartnerForm.password) {
      console.warn("Validation hatası: Şifre boş.");
      setAddError('Lütfen şifre giriniz.');
      return;
    }
    if (newPartnerForm.password.length < 6) {
      console.warn("Validation hatası: Şifre en az 6 karakter olmalıdır.");
      setAddError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPartnerForm.password !== newPartnerForm.confirmPassword) {
      console.warn("Validation hatası: Şifreler eşleşmiyor.");
      setAddError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setAddLoading(true);
    try {
      console.log("db.createPartnerByAdmin çağrılıyor...");
      const createdPartner = await db.createPartnerByAdmin({
        businessName: newPartnerForm.businessName.trim(),
        contactName: newPartnerForm.contactName.trim(),
        email: newPartnerForm.email.trim(),
        phone: newPartnerForm.phone.trim(),
        category: newPartnerForm.category,
        password: newPartnerForm.password,
        logo: newPartnerForm.logo.trim(),
        coverImage: newPartnerForm.coverImage.trim()
      });

      console.log("db.createPartnerByAdmin başarıyla sonuçlandı:", createdPartner);

      await db.logAction({
        partner_id: createdPartner.id,
        partner_name: createdPartner.business_name,
        action: 'PARTNER_CREATED_BY_ADMIN',
        entity_type: 'partner',
        entity_id: createdPartner.id,
        details: { email: createdPartner.email, category: createdPartner.category }
      });

      setPartners(prev => [createdPartner, ...prev.filter(p => p.id !== createdPartner.id)]);
      if (onRefresh) onRefresh();

      setAddSuccess(`"${createdPartner.business_name}" partneri başarıyla oluşturuldu ve onaylandı!`);

      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess(null);
        setNewPartnerForm({
          businessName: '',
          contactName: '',
          email: '',
          phone: '',
          category: OFFICIAL_PARTNER_CATEGORIES[0] || 'Kahve',
          password: '',
          confirmPassword: '',
          logo: '',
          coverImage: ''
        });
      }, 1500);

    } catch (err: any) {
      console.error('Error creating partner (Catch Bloğu):', {
        code: err?.code,
        message: err?.message,
        details: err?.details || err,
        fullError: err
      });
      setAddError(err.message || 'Partner oluşturulurken bir hata meydana geldi.');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {actionError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-xs text-red-400 underline">Kapat</button>
        </div>
      )}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Partner Bayi Yönetimi</h1>
          <p className="text-sm text-[#666666] mt-1">Platformdaki tüm mağazaları, komisyonları, durumları ve detayları yönetin.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#666666] font-semibold px-3 py-1.5 bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl">
            Toplam: <span className="text-[#111111] font-bold">{filteredPartners.length}</span> Partner
          </span>
          <button
            onClick={() => {
              setAddError(null);
              setAddSuccess(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#111111] hover:bg-[#222222] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border-0 active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Yeni Partner Oluştur</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Partner adı, slug veya telefon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="">Tüm Kategoriler</option>
            {OFFICIAL_PARTNER_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="">Tüm Şehirler</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl px-3 py-2 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="">Tüm Durumlar</option>
            <option value="aktif">Aktif Mağazalar</option>
            <option value="pasif">Pasif Mağazalar</option>
            <option value="suspended">Askıya Alınmışlar</option>
            <option value="pending">Onay Bekleyenler</option>
          </select>
        </div>

        {/* BULK ACTIONS BAR (When items checked) */}
        {selectedPartnerIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl text-xs">
            <span className="font-bold text-[#111111]">
              {selectedPartnerIds.length} partner seçildi
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Toplu Aktif Yap
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                className="px-3 py-1.5 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-700 cursor-pointer"
              >
                Toplu Pasif Yap
              </button>
              <button
                onClick={() => handleBulkStatusChange(false, true)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer"
              >
                Toplu Askıya Al
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer"
              >
                Toplu Sil
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PARTNERS TABLE */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F7F8] text-xs font-bold text-[#666666] uppercase tracking-wider">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedPartnerIds.length > 0 && selectedPartnerIds.length === filteredPartners.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-[#111111] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-4">Partner Mağaza</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">İletişim & Konum</th>
                <th className="p-4 text-center">Durum</th>
                <th className="p-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-[#666666]">
                    Aranan kriterlere uygun partner bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredPartners.map(p => {
                  const isChecked = selectedPartnerIds.includes(p.id);
                  const partnerOrders = orders.filter(o => o.partner_id === p.id);
                  const partnerProds = products.filter(prd => prd.partner_id === p.id);

                  return (
                    <tr key={p.id} className={`hover:bg-[#F2F2F3] transition-colors ${isChecked ? 'bg-[#F7F7F8]' : ''}`}>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectPartner(p.id)}
                          className="rounded border-gray-300 text-[#111111] focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.logo || getCategoryDefaultImage(p.category || p.business_name)}
                            alt={p.business_name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E5E7EB] shrink-0 bg-[#F7F7F8]"
                          />
                          <div>
                            <div className="font-bold text-[#111111] flex items-center gap-1.5">
                              {p.business_name}
                              <a href={`/partner/${p.slug}`} target="_blank" rel="noreferrer" className="text-[#666666] hover:text-[#111111]">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="text-xs text-[#666666] font-mono">ugra.app/{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#F7F7F8] border border-[#E5E7EB] text-[#111111]">
                          {p.category ? normalizeCategory(p.category) : (normalizeCategory(p.business_name) || 'Diğer')}
                        </span>
                      </td>
                      <td className="p-4 text-xs space-y-0.5">
                        <div className="text-[#111111] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#666666]" /> {p.phone || 'Telefon yok'}
                        </div>
                        <div className="text-[#666666] flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin className="w-3 h-3 text-[#666666]" /> {p.address || 'İstanbul'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {p.status === 'suspended' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            Askıda
                          </span>
                        ) : p.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            Onay Bekliyor
                          </span>
                        ) : p.active ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Detail */}
                          <button
                            onClick={() => { setViewingPartner(p); setDetailSubTab('info'); }}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#374151] cursor-pointer transition-colors"
                            title="Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setEditingPartner({ ...p })}
                            className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 cursor-pointer transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Active Toggle */}
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                              p.active 
                                ? 'bg-gray-100 border-gray-200 text-[#374151] hover:bg-gray-200' 
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={p.active ? 'Pasif Yap' : 'Aktif Yap'}
                          >
                            {p.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>

                          {/* Suspend / Re-activate */}
                          <button
                            onClick={() => handleSuspendPartner(p)}
                            className="p-1.5 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 cursor-pointer transition-colors"
                            title={p.status === 'suspended' ? 'Askıdan Çıkar' : 'Askıya Al'}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>

                          {/* Password Reset */}
                          <button
                            onClick={() => handlePasswordReset(p)}
                            className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 cursor-pointer transition-colors"
                            title="Şifre Sıfırla"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeletePartner(p, false)}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 cursor-pointer transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW PARTNER DETAIL MODAL */}
      {viewingPartner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setViewingPartner(null)} />
          <div className="relative z-[10000] bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
              <div className="flex items-center gap-4">
                <img
                  src={viewingPartner.logo || getCategoryDefaultImage(viewingPartner.category || viewingPartner.business_name)}
                  alt={viewingPartner.business_name}
                  className="w-14 h-14 rounded-2xl object-cover border border-[#E5E7EB] shadow-sm shrink-0 bg-gray-100"
                />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1F2937] tracking-tight">{viewingPartner.business_name}</h2>
                  <p className="text-xs text-[#6B7280] font-mono mt-0.5">ugra.app/{viewingPartner.slug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 border border-gray-200 text-[#374151]">
                      {viewingPartner.category ? normalizeCategory(viewingPartner.category) : (normalizeCategory(viewingPartner.business_name) || 'Diğer')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${viewingPartner.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {viewingPartner.active ? 'Aktif Mağaza' : 'Pasif Mağaza'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingPartner(null)}
                aria-label="Kapat"
                title="Kapat"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub Nav Tabs inside Modal */}
            <div className="p-4 bg-gray-50 border-b border-[#E5E7EB] flex items-center gap-2 overflow-x-auto shrink-0">
              <button
                onClick={() => setDetailSubTab('info')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${detailSubTab === 'info' ? 'bg-[#1F2937] text-white font-bold' : 'text-[#6B7280] hover:bg-gray-200 hover:text-[#1F2937]'}`}
              >
                Genel Bilgiler & Ayarlar
              </button>
              <button
                onClick={() => setDetailSubTab('orders')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${detailSubTab === 'orders' ? 'bg-[#1F2937] text-white font-bold' : 'text-[#6B7280] hover:bg-gray-200 hover:text-[#1F2937]'}`}
              >
                Siparişleri Gör ({orders.filter(o => o.partner_id === viewingPartner.id).length})
              </button>
              <button
                onClick={() => setDetailSubTab('products')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${detailSubTab === 'products' ? 'bg-[#1F2937] text-white font-bold' : 'text-[#6B7280] hover:bg-gray-200 hover:text-[#1F2937]'}`}
              >
                Ürünleri Gör ({products.filter(p => p.partner_id === viewingPartner.id).length})
              </button>
              <button
                onClick={() => setDetailSubTab('earnings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${detailSubTab === 'earnings' ? 'bg-[#1F2937] text-white font-bold' : 'text-[#6B7280] hover:bg-gray-200 hover:text-[#1F2937]'}`}
              >
                Kazanç Geçmişi
              </button>
              <button
                onClick={() => setDetailSubTab('logs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${detailSubTab === 'logs' ? 'bg-[#1F2937] text-white font-bold' : 'text-[#6B7280] hover:bg-gray-200 hover:text-[#1F2937]'}`}
              >
                Geçmiş İşlemler
              </button>
            </div>

            {/* SUB TAB CONTENT */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {detailSubTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-gray-50 border border-[#E5E7EB] rounded-xl space-y-2">
                    <div className="font-bold text-[#1F2937] text-sm border-b border-[#E5E7EB] pb-2">İletişim & Adres</div>
                    <div><span className="text-[#6B7280]">E-posta:</span> {viewingPartner.email || 'tanimsiz@ugra.app'}</div>
                    <div><span className="text-[#6B7280]">Telefon:</span> {viewingPartner.phone || 'Yok'}</div>
                    <div><span className="text-[#6B7280]">Adres:</span> {viewingPartner.address || 'Kadıköy, İstanbul'}</div>
                    <div><span className="text-[#6B7280]">Açıklama:</span> {viewingPartner.description || 'Açıklama yok'}</div>
                  </div>

                  <div className="p-4 bg-gray-50 border border-[#E5E7EB] rounded-xl space-y-2">
                    <div className="font-bold text-[#1F2937] text-sm border-b border-[#E5E7EB] pb-2">Sistem & Finans Ayarları</div>
                    <div><span className="text-[#6B7280]">Komisyon Oranı:</span> %10 (Varsayılan)</div>
                    <div><span className="text-[#6B7280]">Teslimat Bölgeleri:</span> Tüm İlçe (Kurye Ağı)</div>
                    <div><span className="text-[#6B7280]">Çalışma Saatleri:</span> 08:00 - 00:00</div>
                    <div><span className="text-[#6B7280]">Kayıt Tarihi:</span> {new Date(viewingPartner.created_at).toLocaleDateString('tr-TR')}</div>
                  </div>
                </div>
              )}

              {detailSubTab === 'orders' && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {orders.filter(o => o.partner_id === viewingPartner.id).length === 0 ? (
                    <p className="text-xs text-[#6B7280] text-center py-8">Henüz sipariş bulunmuyor.</p>
                  ) : (
                    orders.filter(o => o.partner_id === viewingPartner.id).map(o => (
                      <div key={o.id} className="p-3 bg-gray-50 border border-[#E5E7EB] rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-[#1F2937]">{o.customer_name} ({o.total_price} ₺)</div>
                          <div className="text-[#6B7280]">{o.payment_type} • {new Date(o.created_at).toLocaleString('tr-TR')}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full font-bold bg-gray-200 text-[#1F2937] border border-gray-300 uppercase text-[10px]">
                          {o.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detailSubTab === 'products' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {(products || []).filter(p => p && p.partner_id === viewingPartner.id).map(prd => (
                    <div key={prd.id} className="p-3 bg-gray-50 border border-[#E5E7EB] rounded-xl flex items-center gap-3 text-xs">
                      <img src={prd.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=100'} alt={prd.title || (prd as any)?.name || ''} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-[#1F2937]">{prd.title || (prd as any)?.name || 'İsimsiz Ürün'}</div>
                        <div className="text-[#1F2937] font-bold">{prd.price ?? 0} ₺</div>
                        <div className="text-[#6B7280]">Stok: {prd.stock ?? 99}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detailSubTab === 'earnings' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-xs">
                  <div className="text-sm font-bold text-emerald-800">Hak Ediş & Kazanç Özet Raporu</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[#6B7280] text-[10px]">Toplam Brüt Ciro</div>
                      <div className="font-bold text-[#1F2937] text-sm">
                        {orders.filter(o => o.partner_id === viewingPartner.id && o.status !== 'iptal').reduce((a, b) => a + (Number(b.total_price) || 0), 0)} ₺
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[#6B7280] text-[10px]">Komisyon Kesintisi (%10)</div>
                      <div className="font-bold text-[#1F2937] text-sm">
                        {Math.round(orders.filter(o => o.partner_id === viewingPartner.id && o.status !== 'iptal').reduce((a, b) => a + (Number(b.total_price) || 0), 0) * 0.1)} ₺
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[#6B7280] text-[10px]">Net Ödenecek Tutar</div>
                      <div className="font-bold text-emerald-700 text-sm">
                        {Math.round(orders.filter(o => o.partner_id === viewingPartner.id && o.status !== 'iptal').reduce((a, b) => a + (Number(b.total_price) || 0), 0) * 0.9)} ₺
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailSubTab === 'logs' && (
                <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
                  {auditLogs.filter(l => l.partner_id === viewingPartner.id).map(log => (
                    <div key={log.id} className="p-2.5 bg-gray-50 border border-[#E5E7EB] rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#1F2937]">{log.action}</div>
                        <div className="text-[#6B7280] text-[10px]">{new Date(log.created_at).toLocaleString('tr-TR')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PARTNER MODAL */}
      {editingPartner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setEditingPartner(null)} />
          <div className="relative z-[10000] bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[#1F2937]" /> Partner Bilgilerini Düzenle
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">Partner mağaza detaylarını güncelleyin.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPartner(null)}
                aria-label="Kapat"
                title="Kapat"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Mağaza Adı</label>
                    <input
                      type="text"
                      value={editingPartner.business_name}
                      onChange={(e) => setEditingPartner({ ...editingPartner, business_name: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Kategori</label>
                    <select
                      value={editingPartner.category ? normalizeCategory(editingPartner.category) : (normalizeCategory(editingPartner.business_name) || OFFICIAL_PARTNER_CATEGORIES[0])}
                      onChange={(e) => setEditingPartner({ ...editingPartner, category: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    >
                      {OFFICIAL_PARTNER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Telefon</label>
                    <input
                      type="text"
                      value={editingPartner.phone || ''}
                      onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">E-posta</label>
                    <input
                      type="email"
                      value={editingPartner.email || ''}
                      onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#4B5563] mb-1 font-semibold">Logo URL</label>
                  <input
                    type="text"
                    value={editingPartner.logo || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, logo: e.target.value })}
                    className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#4B5563] mb-1 font-semibold">Adres</label>
                  <textarea
                    value={editingPartner.address || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, address: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#4B5563] mb-1 font-semibold">Açıklama</label>
                  <textarea
                    value={editingPartner.description || ''}
                    onChange={(e) => setEditingPartner({ ...editingPartner, description: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-gray-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingPartner(null)}
                  className="px-4 py-2.5 border border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1F2937] hover:bg-black text-white font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer border-0 shadow-sm active:scale-95"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetPassPartner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setResetPassPartner(null)} />
          <div className="relative z-[10000] bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-[#1F2937] flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#1F2937] tracking-tight">Şifre Sıfırlama</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">{resetPassPartner.business_name}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setResetPassPartner(null)}
                aria-label="Kapat"
                title="Kapat"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-gray-50 border border-[#E5E7EB] rounded-xl space-y-2">
                <label className="block text-[#4B5563] font-semibold">Oluşturulan Geçici Şifre:</label>
                <input
                  type="text"
                  readOnly
                  value={newPassword}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg p-2.5 font-mono font-bold text-[#1F2937] text-center text-sm"
                />
              </div>

              {passResetMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-xl text-center text-xs">
                  {passResetMsg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-gray-50 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setResetPassPartner(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] font-semibold cursor-pointer text-xs sm:text-sm"
              >
                Kapat
              </button>
              <button
                onClick={confirmPasswordReset}
                className="px-5 py-2.5 rounded-xl bg-[#1F2937] text-white font-bold hover:bg-black cursor-pointer text-xs sm:text-sm border-0 shadow-sm active:scale-95"
              >
                Sıfırla & Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PARTNER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative z-[10000] bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-[#1F2937] flex items-center justify-center shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#1F2937] tracking-tight">Yeni Partner Mağaza Oluştur</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">Sisteme doğrudan onaylı yeni partner mağazası ekleyin.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Kapat"
                title="Kapat"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddPartnerSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
                {addError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}

                {addSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{addSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">İşletme Adı *</label>
                    <input
                      type="text"
                      required
                      value={newPartnerForm.businessName}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, businessName: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Yetkili Adı Soyadı *</label>
                    <input
                      type="text"
                      required
                      value={newPartnerForm.contactName}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, contactName: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">E-posta *</label>
                    <input
                      type="email"
                      required
                      value={newPartnerForm.email}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, email: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Telefon</label>
                    <input
                      type="tel"
                      value={newPartnerForm.phone}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, phone: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[#4B5563] mb-1 font-semibold">Kategori *</label>
                    <select
                      value={newPartnerForm.category}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, category: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    >
                      {OFFICIAL_PARTNER_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Şifre *</label>
                    <input
                      type="password"
                      required
                      value={newPartnerForm.password}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, password: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Şifre Tekrar *</label>
                    <input
                      type="password"
                      required
                      value={newPartnerForm.confirmPassword}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, confirmPassword: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Logo URL (İsteğe bağlı)</label>
                    <input
                      type="text"
                      value={newPartnerForm.logo}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, logo: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#4B5563] mb-1 font-semibold">Kapak Görseli URL (İsteğe bağlı)</label>
                    <input
                      type="text"
                      value={newPartnerForm.coverImage}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, coverImage: e.target.value })}
                      className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] focus:border-[#1F2937] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-medium">
                  ⓘ Bu işlemle oluşturulan partner otomatik olarak <strong>Approved (Onaylı)</strong> ve <strong>Active (Aktif)</strong> olarak sisteme kaydedilir. Partner belirlediğiniz e-posta ve şifre ile hemen Partner Paneline giriş yapabilir.
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-gray-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={addLoading}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] font-semibold transition-colors cursor-pointer text-xs sm:text-sm"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F2937] hover:bg-black text-white font-bold cursor-pointer border-0 disabled:opacity-50 text-xs sm:text-sm shadow-sm active:scale-95"
                >
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
                  <span>Oluştur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
        requireDoubleConfirmation={confirmModal.requireDoubleConfirmation}
        doubleConfirmationPrompt={confirmModal.prompt}
      />
    </div>
  );
};
