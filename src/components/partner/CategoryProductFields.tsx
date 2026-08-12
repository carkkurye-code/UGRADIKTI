import React, { useState } from 'react';
import { 
  Shirt, Coffee, Flower2, Smartphone, Baby, Sparkles, 
  Plus, Check, Stethoscope, Heart, Package, Watch, Eye, Briefcase
} from 'lucide-react';
import { ProductAttributes } from '@/lib/supabase';
import { getCategoryKey } from '@/lib/categoryVariants';

interface CategoryProductFieldsProps {
  category?: string;
  attributes: ProductAttributes;
  onChange: (updatedAttributes: ProductAttributes) => void;
}

// Presets
const GIYIM_PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const GIYIM_PRESET_COLORS = ['Siyah', 'Beyaz', 'Kırmızı', 'Mavi', 'Yeşil', 'Gri', 'Bej', 'Lacivert', 'Pembe'];
const GIYIM_PRESET_SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const GIYIM_PRESET_FITS = ['Regular Fit', 'Slim Fit', 'Oversize'];

const KAHVE_SIZES = ['Küçük', 'Orta', 'Büyük'];
const KAHVE_TEMPS = ['Sıcak', 'Soğuk'];
const KAHVE_SUGAR = ['Şekersiz', 'Az Şekerli', 'Orta Şekerli', 'Çok Şekerli'];
const KAHVE_EXTRAS = ['Ekstra Shot', 'Fındık Şurubu', 'Vanilya Şurubu', 'Karamel Şurubu', 'Yulaf Sütü', 'Laktozsuz Süt', 'Krema'];

const KOZMETIK_SHADES = ['Açık Ton', 'Buğday Ton', 'Koyu Ton', 'Nötr'];
const KOZMETIK_VOLUMES = ['30 ml', '50 ml', '100 ml', '150 ml', '200 ml'];
const KOZMETIK_PACKAGES = ['Tekli Ürün', 'Set / Hediye Kutusu', 'Refill / Yedek'];

const MEDIKAL_BOXES = ['10\'lu Kutu', '20\'li Kutu', '50\'li Kutu', '100\'lü Kutu'];
const MEDIKAL_QUANTITIES = ['1 Adet', '2 Adet', '5 Adet', '10 Adet'];
const MEDIKAL_MEASUREMENTS = ['Standart', 'S', 'M', 'L', 'XL'];

const TEKNOLOJI_COLORS = ['Siyah', 'Uzay Grisi', 'Gümüş', 'Gece Yarısı', 'Beyaz', 'Mavi', 'Altın'];
const TEKNOLOJI_STORAGES = ['128 GB', '256 GB', '512 GB', '1 TB'];
const TEKNOLOJI_RAMS = ['8 GB', '16 GB', '32 GB'];

const PETSHOP_WEIGHTS = ['1.5 kg', '3 kg', '7.5 kg', '12 kg', '15 kg'];
const PETSHOP_PACKS = ['Tekli Paket', '3\'lü Paket', '6\'lı Konserve'];
const PETSHOP_FLAVORS = ['Tavuklu', 'Biftekli', 'Somonlu', 'Kuzu Etli'];

const CICEK_SIZES = ['Küçük Buket', 'Orta Buket', 'Büyük Buket', 'VIP Buket'];

const TAKI_MATERIALS = ['925 Ayar Gümüş', '14K Altın', 'Paslanmaz Çelik', 'Deri', 'Doğaltaş'];
const TAKI_COLORS = ['Altın', 'Gümüş', 'Rose Gold', 'Siyah'];

const PARFUM_VOLUMES = ['30 ml', '50 ml', '100 ml', '200 ml'];
const PARFUM_TYPES = ['EDP (Parfüm)', 'EDT (Tuvalet Suyu)', 'Extrait de Parfum'];

const CANTA_SIZES = ['Kabin Boy', 'Orta Boy', 'Büyük Boy', 'El Çantası'];

const OPTIK_FRAMES = ['Siyah', 'Altın', 'Gümüş', 'Kemik', 'Şeffaf'];
const OPTIK_LENSES = ['Güneş Camı', 'Şeffaf / Dinlendirici', 'Polarize', 'Aynalı'];

const BEBEK_AGE_RANGES = ['0-3 Ay', '3-6 Ay', '6-12 Ay', '1-2 Yaş', '2-4 Yaş'];

export const CategoryProductFields: React.FC<CategoryProductFieldsProps> = ({
  category = '',
  attributes = {},
  onChange
}) => {
  const safeAttributes = attributes || {};
  const categoryKey = getCategoryKey('', category);

  // Custom Tag Inputs state
  const [customInput, setCustomInput] = useState('');

  // Helper updates
  const updateAttr = (key: keyof ProductAttributes, value: any) => {
    onChange({
      ...safeAttributes,
      [key]: value
    });
  };

  const toggleArrayItem = (key: keyof ProductAttributes, item: string) => {
    const list: string[] = Array.isArray(safeAttributes[key]) ? [...(safeAttributes[key] as string[])] : [];
    const idx = list.indexOf(item);
    if (idx !== -1) {
      list.splice(idx, 1);
    } else {
      list.push(item);
    }
    updateAttr(key, list);
  };

  const addArrayItem = (key: keyof ProductAttributes, value: string, clearFn: () => void) => {
    if (!value.trim()) return;
    const list: string[] = Array.isArray(safeAttributes[key]) ? [...(safeAttributes[key] as string[])] : [];
    if (!list.includes(value.trim())) {
      list.push(value.trim());
      updateAttr(key, list);
    }
    clearFn();
  };

  if (categoryKey === 'diger') {
    return null;
  }

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 text-xs animate-in fade-in-0 duration-200">
      
      {/* Category Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-primary/10 text-primary font-bold">
        {categoryKey === 'giyim' && <Shirt className="w-4 h-4" />}
        {categoryKey === 'kahve' && <Coffee className="w-4 h-4" />}
        {categoryKey === 'kozmetik' && <Sparkles className="w-4 h-4" />}
        {categoryKey === 'medikal' && <Stethoscope className="w-4 h-4" />}
        {categoryKey === 'teknoloji' && <Smartphone className="w-4 h-4" />}
        {categoryKey === 'petshop' && <Heart className="w-4 h-4" />}
        {categoryKey === 'cicek' && <Flower2 className="w-4 h-4" />}
        {categoryKey === 'taki' && <Watch className="w-4 h-4" />}
        {categoryKey === 'canta' && <Briefcase className="w-4 h-4" />}
        {categoryKey === 'optik' && <Eye className="w-4 h-4" />}
        {categoryKey === 'bebek' && <Baby className="w-4 h-4" />}
        {categoryKey === 'parfum' && <Package className="w-4 h-4" />}
        <span className="uppercase tracking-wider text-[11px]">
          {category} Özellikleri & Varyantları
        </span>
      </div>

      {/* 1. GİYİM */}
      {categoryKey === 'giyim' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Beden Seçenekleri (XS - XXL)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GIYIM_PRESET_SIZES.map(sz => {
                const selected = (safeAttributes.sizes || []).includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleArrayItem('sizes', sz)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Renk Seçenekleri
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GIYIM_PRESET_COLORS.map(clr => {
                const selected = (safeAttributes.colors || []).includes(clr);
                return (
                  <button
                    key={clr}
                    type="button"
                    onClick={() => toggleArrayItem('colors', clr)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {clr}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Ayakkabı Numarası (Varsa)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GIYIM_PRESET_SHOE_SIZES.map(num => {
                const selected = (safeAttributes.shoe_sizes || []).includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleArrayItem('shoe_sizes', num)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Kesim / Kalıp
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GIYIM_PRESET_FITS.map(fit => {
                const selected = (safeAttributes.fit || []).includes(fit);
                return (
                  <button
                    key={fit}
                    type="button"
                    onClick={() => toggleArrayItem('fit', fit)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {fit}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. KAHVE / İÇECEK */}
      {categoryKey === 'kahve' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Boyut Seçenekleri
            </label>
            <div className="flex gap-2">
              {KAHVE_SIZES.map(sz => {
                const selected = (safeAttributes.coffee_sizes || []).includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleArrayItem('coffee_sizes', sz)}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Sıcak / Soğuk Seçeneği
            </label>
            <div className="flex gap-2">
              {KAHVE_TEMPS.map(tmp => {
                const selected = (safeAttributes.temperature || []).includes(tmp);
                return (
                  <button
                    key={tmp}
                    type="button"
                    onClick={() => toggleArrayItem('temperature', tmp)}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                    {tmp}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Şeker Oranı Options
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KAHVE_SUGAR.map(s => {
                const selected = (safeAttributes.sugar_level || []).includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleArrayItem('sugar_level', s)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Ekstra Seçenekler & Şuruplar
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KAHVE_EXTRAS.map(ext => {
                const selected = (safeAttributes.extras || []).includes(ext);
                return (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => toggleArrayItem('extras', ext)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {ext}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. KOZMETİK */}
      {categoryKey === 'kozmetik' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Ton Seçimi
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KOZMETIK_SHADES.map(sh => {
                const selected = (safeAttributes.shade || []).includes(sh);
                return (
                  <button
                    key={sh}
                    type="button"
                    onClick={() => toggleArrayItem('shade', sh)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {sh}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Hacim
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KOZMETIK_VOLUMES.map(v => {
                const selected = (safeAttributes.volume || []).includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleArrayItem('volume', v)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Paket Seçeneği
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KOZMETIK_PACKAGES.map(p => {
                const selected = (safeAttributes.package_options || []).includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleArrayItem('package_options', p)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. MEDİKAL */}
      {categoryKey === 'medikal' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Kutu Tipi
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MEDIKAL_BOXES.map(b => {
                const selected = (safeAttributes.box_type || []).includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleArrayItem('box_type', b)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Paket İçi Adet
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MEDIKAL_QUANTITIES.map(q => {
                const selected = (safeAttributes.quantity_per_pack || []).includes(q);
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => toggleArrayItem('quantity_per_pack', q)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Ölçü / Beden
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MEDIKAL_MEASUREMENTS.map(m => {
                const selected = (safeAttributes.measurement || []).includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleArrayItem('measurement', m)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. TEKNOLOJİ */}
      {categoryKey === 'teknoloji' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Depolama Seçenekleri
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TEKNOLOJI_STORAGES.map(st => {
                const selected = (safeAttributes.storage || []).includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleArrayItem('storage', st)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              RAM
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TEKNOLOJI_RAMS.map(rm => {
                const selected = (safeAttributes.ram || []).includes(rm);
                return (
                  <button
                    key={rm}
                    type="button"
                    onClick={() => toggleArrayItem('ram', rm)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {rm}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Renk Seçenekleri
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TEKNOLOJI_COLORS.map(clr => {
                const selected = (safeAttributes.colors || []).includes(clr);
                return (
                  <button
                    key={clr}
                    type="button"
                    onClick={() => toggleArrayItem('colors', clr)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {clr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. PETSHOP */}
      {categoryKey === 'petshop' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Ağırlık (Kg)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PETSHOP_WEIGHTS.map(w => {
                const selected = (safeAttributes.weight_kg || []).includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleArrayItem('weight_kg', w)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Aroma / Lezzet
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PETSHOP_FLAVORS.map(fl => {
                const selected = (safeAttributes.flavor || []).includes(fl);
                return (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => toggleArrayItem('flavor', fl)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {fl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. ÇİÇEKÇİ */}
      {categoryKey === 'cicek' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Buket Boyutu
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CICEK_SIZES.map(bsz => {
                const selected = safeAttributes.bouquet_size === bsz;
                return (
                  <button
                    key={bsz}
                    type="button"
                    onClick={() => updateAttr('bouquet_size', bsz)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    <span>{bsz}</span>
                    {selected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <label 
              onClick={() => updateAttr('allow_card_note', !safeAttributes.allow_card_note)}
              className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-foreground"
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                safeAttributes.allow_card_note ? 'bg-primary border-primary text-primary-foreground' : 'bg-white/5 border-white/20'
              }`}>
                {safeAttributes.allow_card_note && <Check className="w-3.5 h-3.5" />}
              </div>
              <span>Müşteri sipariş verirken özel kart notu ekleyebilsin</span>
            </label>
          </div>
        </div>
      )}

      {/* 8. TAKI */}
      {categoryKey === 'taki' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Materyal Seçimi
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TAKI_MATERIALS.map(m => {
                const selected = safeAttributes.material === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => updateAttr('material', selected ? '' : m)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      selected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Attribute Input for Extra Flexibility */}
      <div className="pt-2 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Özel varyant/seçenek ekle..."
          className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-foreground outline-none"
        />
        <button
          type="button"
          onClick={() => addArrayItem('variants', customInput, () => setCustomInput(''))}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer border-0 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Ekle
        </button>
      </div>

    </div>
  );
};
