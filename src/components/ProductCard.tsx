import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, ShoppingCart, Image as ImageIcon, MoreVertical, Heart, Share2, Eye, Check } from 'lucide-react';
import { Product } from '@/lib/supabase';

export interface ProductCardProps {
  product: Product;
  cartQuantity?: number;
  isFavorite?: boolean;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onToggleFavorite?: (product: Product) => void;
  onShareProduct?: (product: Product) => void;
}

export function ProductCard({
  product,
  cartQuantity = 0,
  isFavorite = false,
  onSelectProduct,
  onAddToCart,
  onUpdateQuantity,
  onToggleFavorite,
  onShareProduct
}: ProductCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const prodImages = product.images && product.images.length > 0 
    ? product.images 
    : (product.image ? [product.image] : []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="py-3.5 sm:py-4 border-b border-[#242428]/70 last:border-b-0 flex items-start justify-between gap-3 sm:gap-4 relative group transition-colors">
      {/* Left Column: Large Product Image */}
      <div
        onClick={() => onSelectProduct(product)}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-[#121214] border border-[#242428] flex items-center justify-center cursor-pointer shrink-0 overflow-hidden group-hover:border-white/30 transition-all duration-300"
      >
        {product.image ? (
          <img
            referrerPolicy="no-referrer"
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-[#121214]">
            <ShoppingBag className="w-8 h-8 text-zinc-600" />
          </div>
        )}

        {/* Low Stock Badge */}
        {product.stock <= 3 && product.stock > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-red-500/90 text-white font-bold text-[8px] px-1.5 py-0.5 rounded uppercase shadow-md z-10">
            Son {product.stock}
          </span>
        )}

        {/* Multiple Images Indicator */}
        {prodImages.length > 1 && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md text-white font-bold text-[8px] px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-0.5 shadow z-10">
            <ImageIcon className="w-2.5 h-2.5 text-zinc-300" />
            {prodImages.length}
          </span>
        )}
      </div>

      {/* Middle Column: Product Title, Description, Price */}
      <div 
        onClick={() => onSelectProduct(product)}
        className="flex-1 min-w-0 py-0.5 cursor-pointer flex flex-col justify-between h-28 sm:h-32"
      >
        <div>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <h3 className="font-bold text-white text-base sm:text-lg leading-snug truncate group-hover:text-white/90 transition-colors">
              {product.title}
            </h3>
            {product.tags && product.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {product.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-[#A7AFBA] line-clamp-2 leading-relaxed font-normal">
            {product.description || 'Açıklama belirtilmemiş.'}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-auto pt-2">
          <span className="text-white font-extrabold text-base sm:text-lg">
            {product.price.toLocaleString('tr-TR')} ₺
          </span>

          {cartQuantity > 0 && (
            <span className="text-[10px] font-extrabold bg-white text-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              {cartQuantity} Adet Sepette
            </span>
          )}
        </div>
      </div>

      {/* Right Column: Three Dots Menu (⋮) */}
      <div className="relative shrink-0 pt-0.5" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="w-9 h-9 rounded-full hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
          title="Seçenekler"
        >
          <MoreVertical className="w-5 h-5 text-white/80" />
        </button>

        {/* Three Dots Dropdown Context Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-10 z-30 w-48 bg-[#121214] border border-[#242428] rounded-2xl shadow-2xl py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onSelectProduct(product);
              }}
              className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-[#1A1A1E] flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#A7AFBA]" />
              <span>Ürünü İncele</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onAddToCart(product);
              }}
              className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-[#1A1A1E] flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-[#A7AFBA]" />
              <span>Sepete Ekle</span>
            </button>

            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onToggleFavorite(product);
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-[#1A1A1E] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white text-white' : 'text-[#A7AFBA]'}`} />
                <span>{isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}</span>
              </button>
            )}

            {onShareProduct && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onShareProduct(product);
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs text-white hover:bg-[#1A1A1E] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#A7AFBA]" />
                <span>Paylaş</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
