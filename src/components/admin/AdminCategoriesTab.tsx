import React, { useState } from 'react';
import { 
  Layers, Plus, Edit, Trash2, Check, X, ArrowUp, ArrowDown, Image, Tag, Sparkles
} from 'lucide-react';
import { CategoryItem, db, getCategoryDefaultImage } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import { adminTheme } from './adminTheme';

interface AdminCategoriesTabProps {
  categories: CategoryItem[];
  onRefresh: () => void;
  setCategories: React.Dispatch<React.SetStateAction<CategoryItem[]>>;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  onRefresh,
  setCategories
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  useModalBackButton(isAddOpen, () => setIsAddOpen(false), 'admin-add-category');
  useModalBackButton(Boolean(editingCategory), () => setEditingCategory(null), 'admin-edit-category');

  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Store');
  const [newCatImage, setNewCatImage] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  const handleToggleActive = async (cat: CategoryItem) => {
    const updated = categories.map(c => c.id === cat.id ? { ...c, active: !c.active } : c);
    setCategories(updated);
    await db.saveCategories(updated);
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const newCats = [...categories];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newCats.length) return;

    const temp = newCats[index];
    newCats[index] = newCats[targetIdx];
    newCats[targetIdx] = temp;

    // re-assign order_position
    newCats.forEach((c, idx) => c.order_position = idx + 1);

    setCategories(newCats);
    await db.saveCategories(newCats);
  };

  const handleDelete = async (cat: CategoryItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Kategoriyi Sil',
      description: `${cat.name} kategorisini sistemden silmek istediğinize emin misiniz? Partner paneli senkronize olarak güncellenecektir.`,
      isDanger: true,
      action: async () => {
        const updated = categories.filter(c => c.id !== cat.id);
        setCategories(updated);
        await db.saveCategories(updated);
      }
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const slug = newCatSlug || newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const createdItem: CategoryItem = {
      id: 'cat_' + Date.now(),
      name: newCatName.trim(),
      slug,
      icon_name: newCatIcon,
      image_url: newCatImage || getCategoryDefaultImage(newCatName),
      active: true,
      order_position: categories.length + 1
    };

    const updated = [...categories, createdItem];
    setCategories(updated);
    await db.saveCategories(updated);

    setNewCatName('');
    setNewCatSlug('');
    setIsAddOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const updated = categories.map(c => c.id === editingCategory.id ? editingCategory : c);
    setCategories(updated);
    await db.saveCategories(updated);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Kategori Yönetim Paneli</h1>
          <p className="text-sm text-[#666666] mt-1">
            Bu ekranda yapılan tüm değişiklikler Partner Paneli ve Müşteri Uygulaması ile anında senkronize olur.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={adminTheme.btnPrimary + " px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"}
        >
          <Plus className="w-4 h-4 text-white" /> Yeni Kategori Ekle
        </button>
      </div>

      {/* CATEGORIES GRID / TABLE */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className={adminTheme.tableHeader}>
              <tr>
                <th className="p-4 w-12 text-center">Sıra</th>
                <th className="p-4">Görsel & Kategori Adı</th>
                <th className="p-4">Slug</th>
                <th className="p-4 text-center">Durum</th>
                <th className="p-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {categories.map((cat, idx) => (
                <tr key={cat.id} className={adminTheme.tableRow}>
                  <td className="p-4 text-center font-mono text-xs text-[#666666]">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-[#666666] hover:text-[#111111] disabled:opacity-20 cursor-pointer border-0 bg-transparent"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-[#111111] w-4 text-center">{idx + 1}</span>
                      <button
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-1 text-[#666666] hover:text-[#111111] disabled:opacity-20 cursor-pointer border-0 bg-transparent"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={(cat.image_url && !cat.image_url.includes('photo-1501339847302-ac426a4a7cbb')) ? cat.image_url : getCategoryDefaultImage(cat.name)}
                        alt={cat.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[#E5E5E7] shrink-0 bg-[#F7F7F8]"
                      />
                      <div className="font-bold text-[#111111] text-sm">{cat.name}</div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-[#666666]">
                    /{cat.slug}
                  </td>
                  <td className="p-4 text-center">
                    {cat.active ? (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${adminTheme.badgeSuccess}`}>
                        Aktif
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${adminTheme.badgeDanger}`}>
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setEditingCategory({ ...cat })}
                        className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                          cat.active ? 'bg-[#F7F7F8] border-[#E5E5E7] text-[#111111]' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                        title={cat.active ? 'Pasif Yap' : 'Aktif Yap'}
                      >
                        {cat.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 cursor-pointer transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CATEGORY MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setIsAddOpen(false)} />
          <div className="relative z-[10000] bg-white border border-[#E5E5E7] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200 text-[#111111]">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#E5E5E7] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#111111]" /> Yeni Kategori Ekle
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">Sisteme yeni bir mağaza kategorisi tanımlayın.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Kapat"
                title="Kapat"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E5E7] text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-[#666666] mb-1 font-semibold uppercase tracking-wider text-[10px]">Kategori Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ev & Yaşam"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#666666] mb-1 font-semibold uppercase tracking-wider text-[10px]">Görsel URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newCatImage}
                    onChange={(e) => setNewCatImage(e.target.value)}
                    className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:border-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-[#E5E5E7] bg-[#F7F7F8] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 border border-[#E5E5E7] text-[#666666] hover:text-[#111111] bg-white font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={adminTheme.btnPrimary + " px-5 py-2.5 rounded-xl text-xs sm:text-sm"}
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setEditingCategory(null)} />
          <div className="relative z-[10000] bg-white border border-[#E5E5E7] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200 text-[#111111]">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-[#E5E5E7] bg-white flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#111111] tracking-tight">Kategori Düzenle</h3>
                <p className="text-xs text-[#666666] mt-0.5">Kategori bilgilerini güncelleyin.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                aria-label="Kapat"
                title="Kapat"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E5E7] text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-[#666666] mb-1 font-semibold uppercase tracking-wider text-[10px]">Kategori Adı</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#666666] mb-1 font-semibold uppercase tracking-wider text-[10px]">Görsel URL</label>
                  <input
                    type="text"
                    value={editingCategory.image_url || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, image_url: e.target.value })}
                    className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:border-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-[#E5E5E7] bg-[#F7F7F8] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2.5 border border-[#E5E5E7] text-[#666666] hover:text-[#111111] bg-white font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={adminTheme.btnPrimary + " px-5 py-2.5 rounded-xl text-xs sm:text-sm"}
                >
                  Kaydet
                </button>
              </div>
            </form>
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
