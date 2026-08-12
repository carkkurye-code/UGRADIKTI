import React, { useState } from 'react';
import { Product } from '@/lib/supabase';
import { Plus, Edit, Trash2, Copy, Search, Percent, Package, AlertCircle, ShieldAlert, Check, Image, Tag } from 'lucide-react';

interface PartnerProductsTabProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onOpenEditProduct: (prod: Product) => void;
  onDeleteProduct: (prodId: string) => void;
  onDuplicateProduct: (prod: Product) => void;
  onOpenBulkPriceModal: () => void;
  onOpenBulkStockModal: () => void;
}

export const PartnerProductsTab: React.FC<PartnerProductsTabProps> = ({
  products,
  onOpenAddProduct,
  onOpenEditProduct,
  onDeleteProduct,
  onDuplicateProduct,
  onOpenBulkPriceModal,
  onOpenBulkStockModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'passive' | 'out_of_stock' | 'low_stock'>('all');

  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'active') return p.active;
      if (filterType === 'passive') return !p.active;
      if (filterType === 'out_of_stock') return p.stock !== undefined && p.stock <= 0;
      if (filterType === 'low_stock') return p.stock !== undefined && p.stock > 0 && p.stock <= 5;
      return true;
    });
  }, [products, searchQuery, filterType]);

  const outOfStockCount = products.filter(p => p.stock !== undefined && p.stock <= 0).length;
  const lowStockCount = products.filter(p => p.stock !== undefined && p.stock > 0 && p.stock <= 5).length;

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Ürün Yönetimi & Menü</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ürünlerinizi listeleyin, fiyat veya stoklarını toplu güncelleyin.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenBulkPriceModal}
            className="flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-foreground text-xs font-semibold py-2.5 px-3.5 rounded-xl cursor-pointer transition-all"
          >
            <Percent className="w-3.5 h-3.5 text-primary" />
            Toplu Fiyat Güncelle
          </button>

          <button
            type="button"
            onClick={onOpenBulkStockModal}
            className="flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-foreground text-xs font-semibold py-2.5 px-3.5 rounded-xl cursor-pointer transition-all"
          >
            <Package className="w-3.5 h-3.5 text-white" />
            Toplu Stok Eşitle
          </button>

          <button
            type="button"
            onClick={onOpenAddProduct}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all border-0 shadow-md shadow-primary/10"
          >
            <Plus className="w-4 h-4" /> Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {/* Stock Alert Banners if any */}
      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {outOfStockCount > 0 && (
            <div 
              onClick={() => setFilterType('out_of_stock')} 
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center justify-between cursor-pointer hover:bg-red-500/15"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span><strong>{outOfStockCount} adet</strong> stokta biten ürün var!</span>
              </div>
              <span className="underline font-bold text-[10px]">Filtrele</span>
            </div>
          )}

          {lowStockCount > 0 && (
            <div 
              onClick={() => setFilterType('low_stock')} 
              className="bg-[#161618] border border-[#242428] text-[#D6D6D6] p-3 rounded-xl text-xs flex items-center justify-between cursor-pointer hover:bg-[#1A1A1E]"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                <span><strong className="text-white">{lowStockCount} adet</strong> azalan stoklu ürün var! (&le;5)</span>
              </div>
              <span className="underline font-bold text-[10px] text-white">Filtrele</span>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111113] border border-white/5 p-3 rounded-2xl">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ürün adı veya açıklama ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/40 outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-foreground"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `Tümü (${products.length})` },
            { id: 'active', label: 'Aktifler' },
            { id: 'passive', label: 'Pasifler' },
            { id: 'low_stock', label: `Azalan (${lowStockCount})` },
            { id: 'out_of_stock', label: `Tükenen (${outOfStockCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border ${
                filterType === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white/[0.02] border-white/5 text-muted-foreground hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-[#111113] border border-white/5 rounded-2xl">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Arama kriterlerinize uygun ürün bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(prod => {
            const isOutOfStock = prod.stock !== undefined && prod.stock <= 0;
            const isLowStock = prod.stock !== undefined && prod.stock > 0 && prod.stock <= 5;

            return (
              <div key={prod.id} className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-white/10 transition-colors">
                {/* Product Image Area */}
                <div className="relative h-44 sm:h-48 bg-[#161619] p-3 flex items-center justify-center overflow-hidden">
                  {prod.image ? (
                    <img 
                      referrerPolicy="no-referrer" 
                      src={prod.image} 
                      alt={prod.title} 
                      className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105 drop-shadow-sm" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-mono text-xs bg-white/[0.01] rounded-xl border border-white/5">
                      Görsel Yok
                    </div>
                  )}

                  {/* Product Type Badge */}
                  {(prod.product_type || prod.subcategory || prod.category) && (
                    <span className="absolute top-3 left-3 bg-black/85 backdrop-blur-md text-white font-semibold text-[10px] px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 shadow z-10">
                      <Tag className="w-2.5 h-2.5 text-primary" />
                      {prod.product_type || prod.subcategory || prod.category}
                    </span>
                  )}

                  {/* Multi Image Indicator */}
                  {prod.images && prod.images.length > 1 && (
                    <span className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white font-semibold text-[10px] px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1 shadow">
                      <Image className="w-3 h-3 text-primary" />
                      {prod.images.length} Görsel
                    </span>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end z-10">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      prod.active 
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' 
                        : 'bg-red-500/20 border border-red-500/30 text-red-400'
                    }`}>
                      {prod.active ? 'Satışta' : 'Kapalı'}
                    </span>

                    {isOutOfStock && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white shadow-sm">
                        Stok Bitti!
                      </span>
                    )}

                    {isLowStock && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-black shadow-sm">
                        Son {prod.stock} Adet
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-foreground text-sm truncate">{prod.title}</h4>
                      <span className="font-mono font-bold text-primary text-sm">{prod.price} ₺</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 h-8 font-medium">{prod.description || 'Açıklama belirtilmemiş.'}</p>
                  </div>

                  {/* Product Tags Badges */}
                  {prod.tags && prod.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {prod.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-semibold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Category Attribute Badges */}
                  {prod.attributes && (
                    <div className="flex flex-wrap gap-1 py-1">
                      {prod.attributes.sizes && prod.attributes.sizes.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Beden: {prod.attributes.sizes.join(', ')}
                        </span>
                      )}
                      {prod.attributes.colors && prod.attributes.colors.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Renk: {prod.attributes.colors.join(', ')}
                        </span>
                      )}
                      {prod.attributes.shoe_sizes && prod.attributes.shoe_sizes.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Numara: {prod.attributes.shoe_sizes.join(', ')}
                        </span>
                      )}
                      {prod.attributes.coffee_sizes && prod.attributes.coffee_sizes.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Boyut: {prod.attributes.coffee_sizes.join(', ')}
                        </span>
                      )}
                      {prod.attributes.temperature && prod.attributes.temperature.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          İçecek: {prod.attributes.temperature.join(', ')}
                        </span>
                      )}
                      {prod.attributes.extras && prod.attributes.extras.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Ekstralar: {prod.attributes.extras.length} Seçenek
                        </span>
                      )}
                      {prod.attributes.bouquet_size && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          {prod.attributes.bouquet_size}
                        </span>
                      )}
                      {prod.attributes.allow_card_note && (
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-mono">
                          + Kart Notu
                        </span>
                      )}
                      {prod.attributes.brand && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          {prod.attributes.brand} {prod.attributes.model || ''}
                        </span>
                      )}
                      {prod.attributes.age_range && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Yaş: {prod.attributes.age_range}
                        </span>
                      )}
                      {prod.attributes.material && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Materyal: {prod.attributes.material}
                        </span>
                      )}
                      {prod.attributes.variants && prod.attributes.variants.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground font-mono">
                          Varyant: {prod.attributes.variants.join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Stok: <strong className={`font-mono ${isOutOfStock ? 'text-red-400 font-black' : isLowStock ? 'text-white font-bold' : 'text-foreground'}`}>
                        {prod.stock !== undefined ? `${prod.stock} adet` : 'Sınırsız'}
                      </strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => onDuplicateProduct(prod)}
                        className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Ürünü Kopyala"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={() => onOpenEditProduct(prod)}
                        className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Düzenle"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={() => onDeleteProduct(prod.id)}
                        className="p-1.5 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/15 text-red-400 cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
