import React, { useState } from 'react';
import { 
  Bike, Check, X, Search, FileText, FileCheck, Phone, Eye, ShieldAlert, Trash2, AlertCircle, CheckCircle2
} from 'lucide-react';
import { AssistantApplication, db } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';

interface AdminAssistantAppsTabProps {
  applications: AssistantApplication[];
  onRefresh: () => void;
  setApplications: React.Dispatch<React.SetStateAction<AssistantApplication[]>>;
}

export const AdminAssistantAppsTab: React.FC<AdminAssistantAppsTabProps> = ({
  applications,
  onRefresh,
  setApplications
}) => {
  const pendingApps = applications.filter(a => a.status === 'pending');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [viewingApp, setViewingApp] = useState<AssistantApplication | null>(null);

  // Reject Reason Modal
  const [rejectingApp, setRejectingApp] = useState<AssistantApplication | null>(null);
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
    const nameStr = String(a.full_name ?? '');
    const phoneStr = String(a.phone ?? '');
    const emailStr = String(a.email ?? '');
    const termStr = String(searchTerm ?? '').toLowerCase();

    return nameStr.toLowerCase().includes(termStr) ||
           phoneStr.includes(searchTerm) ||
           emailStr.toLowerCase().includes(termStr);
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
  const handleApprove = async (app: AssistantApplication) => {
    if (!app || !app.id) {
      alert('Onaylama hatası: Başvuru ID bulunamadı.');
      return;
    }
    console.log("1 handleApprove", app.id, app.full_name);
    const res = await db.updateAssistantApplicationStatus(app.id, 'onaylandi');
    if (res && res.error) {
      alert(`Onaylama hatası: ${res.error}`);
    } else {
      setApplications(prev => prev.filter(a => a.id !== app.id));
      if (onRefresh) onRefresh();
    }
  };

  const handleOpenReject = (app: AssistantApplication) => {
    setRejectingApp(app);
    setRejectReason('');
    setRejectError(null);
  };

  const confirmReject = async () => {
    if (!rejectingApp) return;
    if (!rejectReason.trim()) {
      setRejectError('Lütfen reddetme nedenini giriniz.');
      return;
    }
    setApplications(prev => prev.filter(a => a.id !== rejectingApp.id));
    await db.updateAssistantApplicationStatus(rejectingApp.id, 'reddedildi');
    setRejectingApp(null);
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (app: AssistantApplication) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kurye Başvurusunu Sil',
      description: `${app.full_name} başvurusunu silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        setApplications(prev => prev.filter(a => a.id !== app.id));
        await db.deleteAssistant(app.id);
        if (onRefresh) onRefresh();
      }
    });
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    for (const id of selectedAppIds) {
      await db.updateAssistantApplicationStatus(id, 'onaylandi');
    }
    setApplications(prev => prev.filter(a => !selectedAppIds.includes(a.id)));
    setSelectedAppIds([]);
    if (onRefresh) onRefresh();
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Toplu Başvuru Sil',
      description: `Seçilen ${selectedAppIds.length} kurye başvurusunu silmek üzeresiniz.`,
      isDanger: true,
      action: async () => {
        for (const id of selectedAppIds) {
          await db.deleteAssistant(id);
        }
        setApplications(prev => prev.filter(a => !selectedAppIds.includes(a.id)));
        setSelectedAppIds([]);
        if (onRefresh) onRefresh();
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1F2937] tracking-tight">Asistan (Kurye) Başvuruları</h1>
          <p className="text-xs sm:text-sm text-[#6B7280] font-medium mt-1">Saha teslimat ekibine katılmak isteyen kuryelerin sürücü ve evrak başvuruları.</p>
        </div>
        <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-bold text-xs flex items-center gap-2 shadow-sm">
          <Bike className="w-4 h-4 text-blue-600" /> {pendingApps.length} Onay Bekleyen Kurye
        </div>
      </div>

      {/* SEARCH & BULK ACTIONS */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Kurye adı, şehir veya telefon ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 bg-gray-50 border border-[#E5E7EB] rounded-xl pl-9 pr-3 text-xs font-medium text-[#1F2937] focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] transition-all shadow-sm"
          />
        </div>

        {selectedAppIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs shadow-sm">
            <span className="font-bold text-blue-700">{selectedAppIds.length} başvuru seçildi</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkApprove}
                className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 cursor-pointer transition-all shadow-sm active:scale-95 border-0"
              >
                Toplu Onayla
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3.5 py-1.5 bg-red-50 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-100 cursor-pointer transition-all shadow-sm active:scale-95"
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
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-[#1F2937]">Onay bekleyen kurye başvurusu bulunmuyor.</p>
          </div>
        ) : (
          filteredApps.map((app) => {
            const isChecked = selectedAppIds.includes(app.id);

            return (
              <div key={app.id} className={`p-5 bg-white border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm hover:shadow-md ${isChecked ? 'border-blue-400 bg-blue-50/30' : 'border-[#E5E7EB]'}`}>
                <div className="flex items-start gap-3.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(app.id)}
                    className="mt-1 rounded border-[#E5E7EB] text-[#1F2937] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 font-bold flex items-center justify-center shrink-0 shadow-sm">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1F2937] text-sm flex items-center gap-2">
                      {app.full_name}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                        {app.vehicle_type || 'Motosiklet'}
                      </span>
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-0.5 font-medium">Tel: <span className="font-mono text-[#1F2937]">{app.phone}</span> {app.email ? `• ${app.email}` : ''}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 border-[#E5E7EB] pt-3 md:pt-0">
                  <button
                    type="button"
                    onClick={() => setViewingApp(app)}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold hover:bg-gray-200 text-[#1F2937] cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#1F2937]" /> Evrakları İncele
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(app)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 border-0 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Onayla
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenReject(app)}
                    className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 font-bold text-xs hover:bg-red-100 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" /> Reddet
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VIEW DOCUMENTS MODAL */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button
              type="button"
              onClick={() => setViewingApp(null)}
              aria-label="Kapat"
              title="Kapat"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" /> {viewingApp.full_name} Evrak Dosyası
            </h2>

            <div className="space-y-2">
              <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-[#1F2937] font-medium">
                <span>1. T.C. Kimlik Kartı Ön / Arka</span>
                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Onaylı</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-[#1F2937] font-medium">
                <span>2. Sürücü Belgesi (Ehliyet - A2/B)</span>
                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Onaylı</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-[#1F2937] font-medium">
                <span>3. Araç Ruhsatı & Trafik Sigortası</span>
                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Onaylı</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-[#1F2937] font-medium">
                <span>4. Adli Sicil Kaydı Belgesi</span>
                <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Temiz</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] bg-white text-[#4B5563] font-semibold hover:bg-gray-50 cursor-pointer shadow-sm"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => { handleApprove(viewingApp); setViewingApp(null); }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer shadow-sm border-0"
              >
                Kuryeyi Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-xs">
            <button
              type="button"
              onClick={() => setRejectingApp(null)}
              aria-label="Kapat"
              title="Kapat"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-[#1F2937]">Başvuruyu Reddet ({rejectingApp.full_name})</h3>
            <p className="text-[#6B7280]">Kuryeye iletilecek red nedenini giriniz:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Örn: Sürücü belgesi süresi dolmuş veya okunamıyor."
              rows={3}
              className="w-full bg-gray-50 border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:border-red-500 focus:outline-none"
            />
            {rejectError && <p className="text-red-600 font-bold text-[11px]">{rejectError}</p>}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-[#4B5563] font-semibold hover:bg-gray-50 bg-white cursor-pointer shadow-sm"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer shadow-sm border-0"
              >
                Reddet
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
