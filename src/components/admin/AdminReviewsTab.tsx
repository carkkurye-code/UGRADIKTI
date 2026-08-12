import React, { useState } from 'react';
import { 
  Star, Search, Trash2, Eye, EyeOff, Check, X, ShieldAlert, MessageSquare, Building, User, ThumbsUp
} from 'lucide-react';
import { ReviewItem, db } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';

interface AdminReviewsTabProps {
  reviews: ReviewItem[];
  onRefresh: () => void;
  setReviews: React.Dispatch<React.SetStateAction<ReviewItem[]>>;
}

export const AdminReviewsTab: React.FC<AdminReviewsTabProps> = ({
  reviews,
  onRefresh,
  setReviews
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.partner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.comment || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || r.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (rev: ReviewItem) => {
    const updated = reviews.map(r => r.id === rev.id ? { ...r, status: 'approved' as const } : r);
    setReviews(updated);
    await db.saveReviews(updated);
  };

  const handleHide = async (rev: ReviewItem) => {
    const isHidden = rev.status === 'hidden';
    const newStatus = isHidden ? 'approved' as const : 'hidden' as const;
    const updated = reviews.map(r => r.id === rev.id ? { ...r, status: newStatus } : r);
    setReviews(updated);
    await db.saveReviews(updated);
  };

  const handleDelete = async (rev: ReviewItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Yorumu Sil',
      description: `Bu yorumu sistemden tamamen silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        const updated = reviews.filter(r => r.id !== rev.id);
        setReviews(updated);
        await db.saveReviews(updated);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Değerlendirme & Yorum Yönetimi</h1>
          <p className="text-sm text-[#666666] mt-1">Müşterilerin partner ve kuryelere yaptığı tüm puanlama ve yorumları denetleyin.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 bg-[#F7F7F8] border border-[#E5E5E7] text-[#111111] font-bold text-xs rounded-xl flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-[#111111] text-[#111111]" /> Toplam {reviews.length} Yorum
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A]" />
          <input
            type="text"
            placeholder="Müşteri, partner veya yorum ara..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#F7F7F8] border border-[#E5E5E7] focus:border-[#111111] outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-[#111111] placeholder-[#8A8A8A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-[#F7F7F8] border border-[#E5E5E7] text-xs text-[#111111] rounded-xl py-2 px-3 outline-none focus:border-[#111111]"
          >
            <option value="">Tüm Durumlar</option>
            <option value="approved">Onaylı Yorumlar</option>
            <option value="flagged">Şikayet Edilen / İncelenecek</option>
            <option value="hidden">Gizlenen Yorumlar</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReviews.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-[#E5E5E7] text-[#666666] text-sm shadow-sm">
            Kriterlere uygun yorum bulunamadı.
          </div>
        ) : (
          filteredReviews.map(r => (
            <div key={r.id} className="bg-white border border-[#E5E5E7] rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-[#111111]">
                    <User className="w-4 h-4 text-[#111111]" />
                    {r.customer_name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#666666] mt-0.5">
                    <Building className="w-3.5 h-3.5 text-[#666666]" />
                    <span>{r.partner_name}</span>
                    {r.assistant_name && (
                      <span className="text-[#111111] font-medium">• Kurye: {r.assistant_name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-[#111111] border border-[#111111] px-2.5 py-1 rounded-lg text-white">
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span className="font-extrabold text-xs text-white font-mono">{r.rating}</span>
                </div>
              </div>

              <p className="text-xs text-[#111111] bg-[#F7F7F8] border border-[#E5E5E7] p-3 rounded-xl leading-relaxed">
                "{r.comment || 'Yorum yazılmadı, sadece puanlama verildi.'}"
              </p>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E5E5E7]">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  r.status === 'flagged' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {r.status === 'approved' ? 'Onaylı' : r.status === 'flagged' ? 'Şikayet Edildi' : 'Gizli'}
                </span>

                <div className="flex items-center gap-2">
                  {r.status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(r)}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold border border-emerald-200 cursor-pointer"
                    >
                      Onayla
                    </button>
                  )}
                  <button
                    onClick={() => handleHide(r)}
                    className="px-3 py-1 bg-[#F7F7F8] hover:bg-[#F2F2F3] text-[#666666] hover:text-[#111111] rounded-lg font-bold border border-[#E5E5E7] cursor-pointer"
                  >
                    {r.status === 'hidden' ? 'Göster' : 'Gizle'}
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

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
