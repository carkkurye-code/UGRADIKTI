import React, { useState } from 'react';
import { 
  Package, Search, Edit, Trash2, Check, X, Plus, Image, Building, Tag, DollarSign, AlertCircle
} from 'lucide-react';
import { Product, Partner, OFFICIAL_PARTNER_CATEGORIES, db } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { useModalBackButton } from '@/hooks/useModalBackButton';

interface AdminProductsTabProps {
  products: Product[];
  partners: Partner[];
  onRefresh: () => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({
  products,
  partners,
  onRefresh,
  setProducts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useModalBackButton(Boolean(editingProduct), () => setEditingProduct(null), 'admin-edit-product');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  const filteredProducts = (products || []).filter(prd => {
    if (!prd) return false;
    const titleStr = String(prd.title ?? (prd as any)?.name ?? (prd as any)?.product_name ?? '');
    const descStr = String(prd.description ?? '');
    const categoryStr = String((prd as any)?.category_name ?? prd.category ?? '');
    const slugStr = String((prd as any)?.slug ?? '');
    const brandStr = String((prd as any)?.brand ?? '');
    const termStr = String(searchTerm ?? '').toLowerCase().trim();

    if (!termStr) {
      const matchesPartner = !selectedPartner || prd.partner_id === selectedPartner;
      const matchesCategory = !selectedCategory || 
        String(prd.category ?? (prd as any)?.category_name ?? '').toLowerCase() === String(selectedCategory).toLowerCase();
      return matchesPartner && matchesCategory;
    }

    const matchesSearch = titleStr.toLowerCase().includes(termStr) ||
                          descStr.toLowerCase().includes(termStr) ||
                          categoryStr.toLowerCase().includes(termStr) ||
                          slugStr.toLowerCase().includes(termStr) ||
                          brandStr.toLowerCase().includes(termStr);
    const matchesPartner = !selectedPartner || prd.partner_id === selectedPartner;
    const matchesCategory = !selectedCategory || 
      String(prd.category ?? (prd as any)?.category_name ?? '').toLowerCase() === String(selectedCategory).toLowerCase();
    return matchesSearch && matchesPartner && matchesCategory;
  });

  const handleToggleActive = async (prd: Product) => {
    const newActive = !prd.active;
    setProducts(prev => prev.map(p => p.id === prd.id ? { ...p, active: newActive } : p));
    await db.updateProduct(prd.id, { active: newActive });
  };

  const handleDelete = async (prd: Product) => {
    const prdTitle = prd.title || (prd as any).name || 'Ürün';
    setConfirmModal({
      isOpen: true,
      title: 'Ürünü Sil',
      description: `${prdTitle} ürününü silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        setProducts(prev => prev.filter(p => p.id !== prd.id));
        await db.deleteProduct(prd.id);
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await db.updateProduct(editingProduct.id, editingProduct);
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111113] p-6 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-black text-foreground">Ürün Kataloğu Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">Platformdaki tüm partnerlerin sattığı ürünleri, fiyatları ve stok durumlarını denetleyin.</p>
        </div>
        <div className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-primary font-bold text-xs">
          Toplam {(products || []).length} Ürün Kalemi
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-[#111113] border border-white/5 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Ürün başlığı veya içerik ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#18181B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          className="bg-[#18181B] border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">Tüm Partner Mağazalar</option>
          {(partners || []).map(p => (
            <option key={p?.id || Math.random()} value={p?.id || ''}>{p?.business_name || 'İsimsiz Mağaza'}</option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#18181B] border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">Tüm Kategoriler</option>
          {(OFFICIAL_PARTNER_CATEGORIES || []).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-4">Görsel & Ürün Adı</th>
                <th className="p-4">Partner Mağaza</th>
                <th className="p-4">Fiyat</th>
                <th className="p-4">Stok</th>
                <th className="p-4 text-center">Durum</th>
                <th className="p-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                    Ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prd => {
                  const partner = partners.find(p => p.id === prd.partner_id);

                  return (
                    <tr key={prd.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prd.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=150'}
                            alt={prd.title || (prd as any).name || ''}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 bg-black/40"
                          />
                          <div>
                            <div className="font-bold text-foreground">{prd.title || (prd as any).name || 'İsimsiz Ürün'}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{prd.description || 'Açıklama yok'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-semibold text-muted-foreground">
                        {partner?.business_name || 'Bilinmeyen Mağaza'}
                      </td>
                      <td className="p-4 font-bold text-primary">
                        {prd.price} ₺
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {prd.stock ?? 99}
                      </td>
                      <td className="p-4 text-center">
                        {prd.active ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Yayında
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingProduct({ ...prd })}
                            className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(prd)}
                            className={`p-1.5 rounded-lg border cursor-pointer ${
                              prd.active ? 'bg-white/10 border-white/20 text-white' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}
                            title={prd.active ? 'Pasif Yap' : 'Yayına Al'}
                          >
                            {prd.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(prd)}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer"
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

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto overscroll-contain font-sans">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] touch-none animate-in fade-in duration-200" onClick={() => setEditingProduct(null)} />
          <div className="relative z-[10000] bg-[#171A20] border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 bg-[#171A20] flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0 pr-16">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Ürün Düzenle</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ürün detaylarını güncelleyin ve kaydedin.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                aria-label="Kapat"
                title="Kapat"
                className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Ürün Adı</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.title || (editingProduct as any).name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    className="w-full bg-[#1C2027] border border-white/10 rounded-xl p-3 text-white focus:border-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">Fiyat (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#1C2027] border border-white/10 rounded-xl p-3 text-white focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1 font-semibold">Stok Adedi</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.stock ?? 99}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[#1C2027] border border-white/10 rounded-xl p-3 text-white focus:border-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Görsel URL</label>
                  <input
                    type="text"
                    value={editingProduct.image || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    className="w-full bg-[#1C2027] border border-white/10 rounded-xl p-3 text-white focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Açıklama</label>
                  <textarea
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={3}
                    className="w-full bg-[#1C2027] border border-white/10 rounded-xl p-3 text-white focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 border border-white/10 text-muted-foreground hover:text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer border-0 shadow-md"
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
