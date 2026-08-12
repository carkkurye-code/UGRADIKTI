import React, { useState } from 'react';
import { 
  Building, Check, X, Phone, Mail, FileText, Eye, ShieldAlert, Trash2, 
  Search, ExternalLink, MessageSquare, AlertCircle, CheckCircle2, FileCheck
} from 'lucide-react';
import { Partner, db, normalizeCategory, getCategoryDefaultImage } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';

interface AdminPartnerAppsTabProps {
  partners: Partner[];
  onRefresh: () => void;
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
}

export const AdminPartnerAppsTab: React.FC<AdminPartnerAppsTabProps> = ({
  partners,
  onRefresh,
  setPartners
}) => {
  const pendingApps = partners.filter(p => {
    if (!p) return false;
    const statusStr = (p.status || '').toString().toLowerCase().trim();
    const isPendingStatus = statusStr === 'pending' || 
                             statusStr === 'beklemede' || 
                             statusStr === 'yeni' || 
                             statusStr === 'onay_bekliyor' ||
                             statusStr === 'basvuru' ||
                             statusStr === 'application';
    
    const isExplicitlyHandled = statusStr === 'approved' || 
                                statusStr === 'aktif' || 
                                statusStr === 'active' || 
                                statusStr === 'onaylandi' || 
                                statusStr === 'onaylandı' ||
                                statusStr === 'rejected' || 
                                statusStr === 'reddedildi' || 
                                statusStr === 'suspended' || 
                                statusStr === 'pasif';

    const isActiveFalse = p.active === false || String(p.active) === 'false' || (p as any).is_active === false;

    return isPendingStatus || (isActiveFalse && !isExplicitlyHandled);
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [viewingApp, setViewingApp] = useState<Partner | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  // Reject Reason Modal
  const [rejectingPartner, setRejectingPartner] = useState<Partner | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  const filteredApps = (pendingApps || []).filter(a => {
    if (!a) return false;
    const nameStr = String(a.business_name ?? '');
    const slugStr = String(a.slug ?? '');
    const phoneStr = String(a.phone ?? '');
    const termStr = String(searchTerm ?? '').toLowerCase();

    return nameStr.toLowerCase().includes(termStr) ||
           slugStr.toLowerCase().includes(termStr) ||
           phoneStr.includes(searchTerm);
  });

  const toggleSelectAll = () => {
    if (selectedAppIds.length === filteredApps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredApps.map(a => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAppIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Actions
  const handleApprove = async (partner: Partner) => {
    setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: 'approved', active: true } : p));
    await db.adminApprovePartner(partner.id);
    await db.logAction({
      partner_id: partner.id,
      partner_name: partner.business_name,
      action: 'PARTNER_APPLICATION_APPROVED',
      entity_type: 'partner_application',
      entity_id: partner.id
    });
  };

  const handleOpenReject = (partner: Partner) => {
    setRejectingPartner(partner);
    setRejectReason('');
    setRejectError(null);
  };

  const confirmReject = async () => {
    if (!rejectingPartner) return;
    if (!rejectReason.trim()) {
      setRejectError('Lütfen reddetme nedenini giriniz.');
      return;
    }
    setPartners(prev => prev.map(p => p.id === rejectingPartner.id ? { ...p, status: 'rejected', active: false } : p));
    await db.adminRejectPartner(rejectingPartner.id);
    await db.logAction({
      partner_id: rejectingPartner.id,
      partner_name: rejectingPartner.business_name,
      action: 'PARTNER_APPLICATION_REJECTED',
      entity_type: 'partner_application',
      entity_id: rejectingPartner.id,
      details: { rejection_reason: rejectReason }
    });
    setRejectingPartner(null);
  };

  const handleSuspend = async (partner: Partner) => {
    setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: 'suspended', active: false } : p));
    await db.updatePartner(partner.id, { status: 'suspended', active: false });
  };

  const handleDelete = async (partner: Partner) => {
    setConfirmModal({
      isOpen: true,
      title: 'Başvuruyu Sil',
      description: `${partner.business_name} başvurusunu silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        try {
          await db.deletePartner(partner.id);
          setPartners(prev => prev.filter(p => p.id !== partner.id));
          if (onRefresh) onRefresh();
        } catch (err: any) {
          setOpError('Silme işlemi başarısız oldu: ' + (err.message || err));
        }
      }
    });
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    for (const id of selectedAppIds) {
      await db.adminApprovePartner(id);
    }
    setPartners(prev => prev.map(p => selectedAppIds.includes(p.id) ? { ...p, status: 'approved', active: true } : p));
    setSelectedAppIds([]);
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Toplu Başvuru Sil',
      description: `Seçilen ${selectedAppIds.length} partner başvurusunu silmek üzeresiniz.`,
      isDanger: true,
      action: async () => {
        for (const id of selectedAppIds) {
          await db.deletePartner(id);
        }
        setPartners(prev => prev.filter(p => !selectedAppIds.includes(p.id)));
        setSelectedAppIds([]);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {opError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center justify-between text-xs shadow-sm">
          <span>{opError}</span>
          <button type="button" onClick={() => setOpError(null)} className="text-xs text-red-600 underline font-bold cursor-pointer">Kapat</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1F2937] tracking-tight">Partner Mağaza Başvuruları</h1>
          <p className="text-xs sm:text-sm text-[#6B7280] font-medium mt-1">Platforma katılmak isteyen yeni işletmelerin başvurularını inceleyin ve onaylayın.</p>
        </div>
        <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-amber-600" /> {pendingApps.length} Onay Bekleyen Başvuru
        </div>
      </div>

      {/* SEARCH & BULK ACTIONS */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Başvuran mağaza adı, telefon veya slug ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 bg-gray-50 border border-[#E5E7EB] rounded-xl pl-9 pr-3 text-xs font-medium text-[#1F2937] focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] transition-all shadow-sm"
          />
        </div>

        {selectedAppIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
            <span className="font-bold text-[#1F2937]">{selectedAppIds.length} başvuru seçildi</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkApprove}
                className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Toplu Onayla
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-100 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Toplu Sil
              </button>
            </div>
          </div>
        )}
      </div>

      {/* APPLICATIONS LIST */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <div className="text-center py-12 bg-white border border-dashed border-[#E5E7EB] rounded-2xl shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1F2937]">Onay bekleyen partner başvurusu bulunmuyor.</p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const isChecked = selectedAppIds.includes(app.id);
            const rawPhone = (app.phone || '').replace(/\D/g, '');
            const waPhone = rawPhone.startsWith('90') ? rawPhone : '90' + rawPhone;

            return (
              <div key={app.id} className={`p-5 bg-white border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm ${isChecked ? 'border-[#1F2937] bg-gray-50/50' : 'border-[#E5E7EB]'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(app.id)}
                    className="mt-1.5 rounded border-gray-300 text-[#1F2937] focus:ring-0 cursor-pointer"
                  />
                  <img
                    src={app.logo || getCategoryDefaultImage(app.category || app.business_name)}
                    alt={app.business_name}
                    className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EB] shrink-0 shadow-sm"
                  />
                  <div>
                    <h3 className="font-bold text-[#1F2937] text-base flex items-center gap-2">
                      {app.business_name}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-[#374151] border border-gray-200">
                        {app.category ? normalizeCategory(app.category) : (normalizeCategory(app.business_name) || 'Diğer')}
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280] mt-0.5">
                      <span className="font-mono text-[11px]">ugra.app/{app.slug}</span>
                      <span className="text-[#1F2937] font-semibold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> {app.phone || 'Telefon yok'}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1">{app.description || 'Açıklama belirtilmemiş.'}</p>
                  </div>
                </div>

                {/* Quick Communication & Action Bar */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 border-[#E5E7EB] pt-3 md:pt-0">
                  {/* Comm buttons */}
                  {app.phone && (
                    <a
                      href={`tel:${app.phone}`}
                      className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 text-[#1F2937] cursor-pointer flex items-center justify-center transition-all shadow-sm active:scale-95"
                      title="Telefon Et"
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </a>
                  )}
                  {app.phone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 cursor-pointer flex items-center justify-center transition-all shadow-sm active:scale-95"
                      title="WhatsApp Mesaj Gönder"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                  <a
                    href={`mailto:${app.email || 'destek@ugra.app'}`}
                    className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 cursor-pointer flex items-center justify-center transition-all shadow-sm active:scale-95"
                    title="Mail Gönder"
                  >
                    <Mail className="w-4 h-4" />
                  </a>

                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => setViewingApp(app)}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold hover:bg-gray-200 text-[#1F2937] cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#1F2937]" /> Detaylar & Evraklar
                  </button>

                  {/* Approve */}
                  <button
                    type="button"
                    onClick={() => handleApprove(app)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Onayla
                  </button>

                  {/* Reject */}
                  <button
                    type="button"
                    onClick={() => handleOpenReject(app)}
                    className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-xs hover:bg-red-100 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Reddet
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* APPLICATION DETAIL & DOCUMENTS MODAL */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 relative text-xs">
            <button
              type="button"
              onClick={() => setViewingApp(null)}
              aria-label="Kapat"
              title="Kapat"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4">
              <Building className="w-8 h-8 text-[#1F2937]" />
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">{viewingApp.business_name} Başvuru Dosyası</h2>
                <p className="text-[#6B7280] font-medium">Başvuru Tarihi: {new Date(viewingApp.created_at).toLocaleString('tr-TR')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-2">
                <div className="font-bold text-[#1F2937] text-sm">İşletme Bilgileri</div>
                <div><span className="text-[#6B7280] font-medium">Kategori:</span> <span className="font-semibold text-[#1F2937]">{viewingApp.category}</span></div>
                <div><span className="text-[#6B7280] font-medium">Telefon:</span> <span className="font-semibold text-[#1F2937] font-mono">{viewingApp.phone}</span></div>
                <div><span className="text-[#6B7280] font-medium">E-posta:</span> <span className="font-semibold text-[#1F2937]">{viewingApp.email || 'Yok'}</span></div>
                <div><span className="text-[#6B7280] font-medium">Adres:</span> <span className="font-semibold text-[#1F2937]">{viewingApp.address}</span></div>
              </div>

              {/* Documents Inspection Cards */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-3">
                <div className="font-bold text-[#1F2937] text-sm flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" /> Kurumsal Belgeler & Onay Evrakları
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="font-medium text-[#1F2937]">Vergi Levhası (PDF/Görsel)</span>
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Yüklendi</span>
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="font-medium text-[#1F2937]">Ticaret Sicil Gazetesi</span>
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Yüklendi</span>
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="font-medium text-[#1F2937]">İmza Sirküleri</span>
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Yüklendi</span>
                  </div>
                  <div className="p-2.5 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-between shadow-sm">
                    <span className="font-medium text-[#1F2937]">Yetkili Kimlik Fotokopisi</span>
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Yüklendi</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-gray-50 text-[#4B5563] font-semibold cursor-pointer shadow-sm transition-all"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => { handleApprove(viewingApp); setViewingApp(null); }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Başvuruyu Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT WITH MANDATORY REASON MODAL */}
      {rejectingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button
              type="button"
              onClick={() => setRejectingPartner(null)}
              aria-label="Kapat"
              title="Kapat"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
              <X className="w-4 h-4 text-red-600" /> Başvuruyu Reddet ({rejectingPartner.business_name})
            </h3>

            <p className="text-[#6B7280] font-medium">Red nedeni zorunludur. İşletmeye bildirilecek resmi açıklama giriniz:</p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Örn: Evraklar eksik veya okunamıyor. Lütfen vergi levhasını güncelleyerek tekrar başvurun."
              rows={3}
              className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#1F2937] focus:border-[#1F2937] focus:outline-none focus:ring-1 focus:ring-[#1F2937] shadow-sm"
            />

            {rejectError && <p className="text-red-600 font-bold text-[11px]">{rejectError}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setRejectingPartner(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-gray-50 text-[#4B5563] font-semibold cursor-pointer shadow-sm transition-all"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Reddet ve Bildir
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
};
