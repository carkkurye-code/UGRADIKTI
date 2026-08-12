import { ProductAttributes } from './supabase';

export type CategoryKey = 
  | 'giyim' 
  | 'kahve' 
  | 'kozmetik' 
  | 'medikal' 
  | 'teknoloji' 
  | 'petshop' 
  | 'cicek' 
  | 'taki' 
  | 'parfum' 
  | 'canta' 
  | 'optik' 
  | 'bebek' 
  | 'kirtasiye' 
  | 'yapi_market' 
  | 'market'
  | 'restoran'
  | 'tatlici'
  | 'manav'
  | 'kasap'
  | 'diger';

/**
 * Normalizes any store or product category string to a strict CategoryKey.
 */
export function getCategoryKey(storeCategory?: string, productCategory?: string): CategoryKey {
  const catStr = `${storeCategory || ''} ${productCategory || ''}`.toLowerCase().trim();

  if (catStr.includes('kahve') || catStr.includes('kafe') || catStr.includes('cafe')) {
    return 'kahve';
  }
  if (catStr.includes('giyim') || catStr.includes('moda') || catStr.includes('butik') || catStr.includes('kıyafet') || catStr.includes('tekstil') || catStr.includes('ayakkabı')) {
    return 'giyim';
  }
  if (catStr.includes('kozmetik') || catStr.includes('güzellik') || catStr.includes('cilt bakımı') || catStr.includes('bakım')) {
    return 'kozmetik';
  }
  if (catStr.includes('medikal') || catStr.includes('sağlık') || catStr.includes('saglik') || catStr.includes('eczane')) {
    return 'medikal';
  }
  if (catStr.includes('teknoloji') || catStr.includes('elektronik') || catStr.includes('bilgisayar') || catStr.includes('telefon')) {
    return 'teknoloji';
  }
  if (catStr.includes('petshop') || catStr.includes('evcil') || catStr.includes('mama')) {
    return 'petshop';
  }
  if (catStr.includes('çiçek') || catStr.includes('cicek') || catStr.includes('florist') || catStr.includes('buket')) {
    return 'cicek';
  }
  if (catStr.includes('takı') || catStr.includes('taki') || catStr.includes('mücevher') || catStr.includes('aksesuar')) {
    return 'taki';
  }
  if (catStr.includes('parfüm') || catStr.includes('parfum') || catStr.includes('esans')) {
    return 'parfum';
  }
  if (catStr.includes('çanta') || catStr.includes('canta') || catStr.includes('valiz') || catStr.includes('deri')) {
    return 'canta';
  }
  if (catStr.includes('optik') || catStr.includes('gözlük') || catStr.includes('gozluk')) {
    return 'optik';
  }
  if (catStr.includes('bebek') || catStr.includes('anne') || catStr.includes('çocuk') || catStr.includes('cocuk')) {
    return 'bebek';
  }
  if (catStr.includes('kırtasiye') || catStr.includes('kirtasiye') || catStr.includes('ofis') || catStr.includes('defter')) {
    return 'kirtasiye';
  }
  if (catStr.includes('yapı') || catStr.includes('yapi') || catStr.includes('nalbur') || catStr.includes('hırdavat')) {
    return 'yapi_market';
  }
  if (catStr.includes('tatlı') || catStr.includes('tatli') || catStr.includes('pastane') || catStr.includes('pasta')) {
    return 'tatlici';
  }
  if (catStr.includes('restoran') || catStr.includes('lokanta') || catStr.includes('yemek') || catStr.includes('kebap') || catStr.includes('burger') || catStr.includes('döner')) {
    return 'restoran';
  }
  if (catStr.includes('manav') || catStr.includes('meyve') || catStr.includes('sebze')) {
    return 'manav';
  }
  if (catStr.includes('kasap') || catStr.includes('et ')) {
    return 'kasap';
  }
  if (catStr.includes('market') || catStr.includes('süpermarket') || catStr.includes('bakkal')) {
    return 'market';
  }

  return 'diger';
}

export const PRESET_TAGS = [
  'Yeni Sezon',
  'İndirim',
  'Premium',
  'Çok Satan',
  'Kampanya',
  'Limited'
];

export function getProductTypeOptions(partnerCategory?: string): string[] {
  const catKey = getCategoryKey(partnerCategory);
  switch (catKey) {
    case 'giyim':
      return ['T-Shirt', 'Sweatshirt', 'Gömlek', 'Pantolon', 'Ceket', 'Ayakkabı', 'Aksesuar', 'Kombin'];
    case 'kahve':
      return ['Kahveler', 'Soğuk Kahveler', 'Sıcak Kahveler', 'Tatlılar', 'Pastalar', 'Sandviçler', 'Atıştırmalıklar'];
    case 'restoran':
      return ['Çorbalar', 'Ana Yemek', 'Izgara', 'Tavuk', 'Burger', 'Pizza', 'Makarna', 'Salata', 'Tatlı', 'İçecek'];
    case 'petshop':
      return ['Kedi Mamaları', 'Köpek Mamaları', 'Oyuncak', 'Tasma', 'Kum', 'Kafes', 'Aksesuar'];
    case 'teknoloji':
      return ['Telefon', 'Laptop', 'Tablet', 'Kulaklık', 'Mouse', 'Klavye', 'Akıllı Saat', 'Aksesuar'];
    case 'kozmetik':
      return ['Parfüm', 'Ruj', 'Fondöten', 'Maskara', 'Cilt Bakımı', 'Saç Bakımı', 'Makyaj'];
    case 'market':
      return ['İçecek', 'Atıştırmalık', 'Süt Ürünleri', 'Kahvaltılık', 'Temizlik', 'Meyve', 'Sebze'];
    case 'medikal':
      return ['Medikal Malzeme', 'Hijyen & Bakım', 'Ölçüm Cihazları', 'Ortopedi'];
    case 'optik':
      return ['Güneş Gözlüğü', 'Numaralı Gözlük', 'Lens', 'Aksesuar & Solüsyon'];
    case 'cicek':
      return ['Buket', 'Saksı Çiçeği', 'Aranjman', 'Teraryum', 'Çelenk'];
    case 'taki':
      return ['Kolye', 'Yüzük', 'Bileklik', 'Küpe', 'Aksesuar'];
    case 'parfum':
      return ['Erkek Parfüm', 'Kadın Parfüm', 'Unisex Parfüm', 'Oda Kokusu', 'Deodorant'];
    case 'canta':
      return ['El Çantası', 'Sırt Çantası', 'Cüzdan', 'Valiz & Kabin Boy'];
    case 'bebek':
      return ['Bebek Giyim', 'Beslenme', 'Bebek Bakım', 'Oyuncak'];
    case 'kirtasiye':
      return ['Defter', 'Kalem', 'Ofis Malzemeleri', 'Çizim & Boya'];
    case 'yapi_market':
      return ['El Aletleri', 'Hırdavat', 'Boya & Kimyasal', 'Aydınlatma'];
    case 'tatlici':
      return ['Tatlılar', 'Pastalar', 'Kuru Pasta', 'Sütlü Tatlılar', 'Dondurma', 'İçecekler'];
    case 'manav':
      return ['Meyve', 'Sebze', 'Yeşillik', 'Narenciye', 'Organik'];
    case 'kasap':
      return ['Kırmızı Et', 'Beyaz Et', 'Kıyma', 'Şarküteri', 'Köfte & İşlenmiş'];
    default:
      return ['Genel', 'Diğer'];
  }
}

export function getSubcategoryOptions(partnerCategory?: string): string[] {
  return getProductTypeOptions(partnerCategory);
}

export interface VariantOptionGroup {
  id: string;
  label: string;
  type: 'single' | 'multiple' | 'text';
  options: string[];
}

// Preset Default Variants for each Category if partner didn't specify custom attributes
export const CATEGORY_PRESET_VARIANTS: Record<CategoryKey, VariantOptionGroup[]> = {
  giyim: [
    { id: 'size', label: 'Beden Seçimi', type: 'single', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { id: 'color', label: 'Renk Seçimi', type: 'single', options: ['Siyah', 'Beyaz', 'Gri', 'Lacivert', 'Bej'] },
    { id: 'fit', label: 'Kesim / Kalıp', type: 'single', options: ['Regular Fit', 'Slim Fit', 'Oversize'] }
  ],
  kahve: [
    { id: 'size', label: 'Boyut Seçimi', type: 'single', options: ['Küçük', 'Orta', 'Büyük'] },
    { id: 'temperature', label: 'Sıcaklık Seçimi', type: 'single', options: ['Soğuk', 'Sıcak'] },
    { id: 'sugar', label: 'Şeker Oranı', type: 'single', options: ['Şekersiz', 'Az Şekerli', 'Orta Şekerli', 'Çok Şekerli'] },
    { id: 'extras', label: 'Ekstra Tercihler', type: 'multiple', options: ['Ekstra Shot', 'Fındık Şurubu', 'Yulaf Sütü', 'Laktozsuz Süt'] }
  ],
  kozmetik: [
    { id: 'shade', label: 'Ton Seçimi', type: 'single', options: ['Açık Ton', 'Buğday Ton', 'Koyu Ton', 'Nötr'] },
    { id: 'color', label: 'Renk / Renk Kodu', type: 'single', options: ['01 Nude', '02 Rose', '03 Coral', '04 Red'] },
    { id: 'volume', label: 'Hacim', type: 'single', options: ['30 ml', '50 ml', '100 ml'] },
    { id: 'package', label: 'Paket Türü', type: 'single', options: ['Tekli Ürün', 'Set / Hediye Kutusu', 'Refill / Yedek'] }
  ],
  medikal: [
    { id: 'box', label: 'Kutu Tipi', type: 'single', options: ['10\'lu Kutu', '20\'li Kutu', '50\'li Kutu', '100\'lü Kutu'] },
    { id: 'quantity', label: 'Paket İçi Adet', type: 'single', options: ['1 Adet', '2 Adet', '5 Adet', '10 Adet'] },
    { id: 'measurement', label: 'Ölçü / Beden', type: 'single', options: ['Standart', 'S', 'M', 'L', 'XL'] }
  ],
  teknoloji: [
    { id: 'color', label: 'Renk Seçimi', type: 'single', options: ['Siyah', 'Uzay Grisi', 'Gümüş', 'Gece Yarısı', 'Beyaz'] },
    { id: 'storage', label: 'Depolama', type: 'single', options: ['128 GB', '256 GB', '512 GB', '1 TB'] },
    { id: 'ram', label: 'RAM', type: 'single', options: ['8 GB', '16 GB', '32 GB'] }
  ],
  petshop: [
    { id: 'weight', label: 'Ağırlık (Kg)', type: 'single', options: ['1.5 kg', '3 kg', '7.5 kg', '12 kg', '15 kg'] },
    { id: 'pack', label: 'Paket Boyutu', type: 'single', options: ['Tekli Paket', '3\'lü Paket', '6\'lı Konserve'] },
    { id: 'flavor', label: 'Aroma / Lezzet', type: 'single', options: ['Tavuklu', 'Biftekli', 'Somonlu', 'Kuzu Etli'] }
  ],
  cicek: [
    { id: 'bouquet', label: 'Buket Boyutu', type: 'single', options: ['Küçük Buket', 'Orta Buket', 'Büyük Buket', 'VIP Buket'] },
    { id: 'color', label: 'Çiçek Rengi', type: 'single', options: ['Kırmızı', 'Beyaz', 'Pembe', 'Sarı', 'Karışık'] },
    { id: 'card', label: 'Özel Not Kartı', type: 'text', options: [] }
  ],
  taki: [
    { id: 'material', label: 'Materyal', type: 'single', options: ['925 Ayar Gümüş', '14K Altın', 'Paslanmaz Çelik', 'Doğaltaş'] },
    { id: 'color', label: 'Renk', type: 'single', options: ['Altın', 'Gümüş', 'Rose Gold', 'Siyah'] },
    { id: 'variant', label: 'Model / Tip', type: 'single', options: ['Zincirli', 'Halka', 'Çivi', 'Ayarlanabilir'] }
  ],
  parfum: [
    { id: 'volume', label: 'Şişe Hacmi', type: 'single', options: ['30 ml', '50 ml', '100 ml', '200 ml'] },
    { id: 'type', label: 'Esans Tipi', type: 'single', options: ['EDP (Parfüm)', 'EDT (Tuvalet Suyu)', 'Extrait de Parfum'] }
  ],
  canta: [
    { id: 'size', label: 'Çanta / Valiz Boyutu', type: 'single', options: ['Kabin Boy', 'Orta Boy', 'Büyük Boy', 'El Çantası'] },
    { id: 'color', label: 'Renk', type: 'single', options: ['Siyah', 'Taba / Kahve', 'Bej', 'Bordo'] },
    { id: 'material', label: 'Materyal', type: 'single', options: ['Hakiki Deri', 'Suni Deri', 'Kumaş', 'Polikarbon'] }
  ],
  optik: [
    { id: 'frame', label: 'Çerçeve Rengi', type: 'single', options: ['Siyah', 'Altın', 'Gümüş', 'Kemik', 'Şeffaf'] },
    { id: 'lens', label: 'Cam Tipi', type: 'single', options: ['Güneş Camı', 'Şeffaf / Dinlendirici', 'Polarize', 'Aynalı'] }
  ],
  bebek: [
    { id: 'age', label: 'Yaş / Ay Aralığı', type: 'single', options: ['0-3 Ay', '3-6 Ay', '6-12 Ay', '1-2 Yaş', '2-4 Yaş'] },
    { id: 'size', label: 'Beden (Boy)', type: 'single', options: ['56 cm', '62 cm', '68 cm', '74 cm', '80 cm', '86 cm'] }
  ],
  kirtasiye: [
    { id: 'type', label: 'Ebat / Tür', type: 'single', options: ['A4', 'A5', 'Çizgili', 'Kareli', 'Noktalı'] },
    { id: 'color', label: 'Renk', type: 'single', options: ['Siyah', 'Lacivert', 'Gri', 'Pastel'] }
  ],
  yapi_market: [
    { id: 'size', label: 'Ölçü / Model', type: 'single', options: ['Standart', 'Profesyonel Seri', 'Ağır Hizmet'] }
  ],
  market: [
    { id: 'size', label: 'Miktar / Ağırlık', type: 'single', options: ['250g', '500g', '1kg', '1L', 'Adet'] }
  ],
  restoran: [
    { id: 'portion', label: 'Porsiyon', type: 'single', options: ['Yarım Porsiyon', 'Tam Porsiyon', 'Duble Porsiyon'] },
    { id: 'spicy', label: 'Acı Tercihi', type: 'single', options: ['Acısız', 'Az Acılı', 'Acılı', 'Çok Acılı'] }
  ],
  tatlici: [
    { id: 'weight', label: 'Ağırlık / Porsiyon', type: 'single', options: ['Porsiyon', '250g', '500g', '1kg', 'Dilim'] }
  ],
  manav: [
    { id: 'weight', label: 'Miktar', type: 'single', options: ['500g', '1kg', '2kg', 'Paket / Demet'] }
  ],
  kasap: [
    { id: 'weight', label: 'Ağırlık', type: 'single', options: ['250g', '500g', '750g', '1kg', 'Paket'] },
    { id: 'prep', label: 'Hazırlanış', type: 'single', options: ['Sade', 'Soslu / Marinede', 'Kıyılmış', 'Kuşbaşı'] }
  ],
  diger: []
};

/**
 * Returns active variant option groups for a product, ensuring NO cross-category options spill over.
 */
export function getProductVariantGroups(
  categoryKey: CategoryKey,
  attributes?: ProductAttributes
): VariantOptionGroup[] {
  const groups: VariantOptionGroup[] = [];
  const attrs = attributes || {};

  switch (categoryKey) {
    case 'giyim':
      if (attrs.sizes && attrs.sizes.length > 0) {
        groups.push({ id: 'size', label: 'Beden', type: 'single', options: attrs.sizes });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.giyim[0]);
      }
      if (attrs.colors && attrs.colors.length > 0) {
        groups.push({ id: 'color', label: 'Renk', type: 'single', options: attrs.colors });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.giyim[1]);
      }
      if (attrs.shoe_sizes && attrs.shoe_sizes.length > 0) {
        groups.push({ id: 'shoe_size', label: 'Ayakkabı Numarası', type: 'single', options: attrs.shoe_sizes });
      }
      if (attrs.fit && attrs.fit.length > 0) {
        groups.push({ id: 'fit', label: 'Kesim / Kalıp', type: 'single', options: attrs.fit });
      }
      break;

    case 'kahve':
      if (attrs.coffee_sizes && attrs.coffee_sizes.length > 0) {
        groups.push({ id: 'size', label: 'Boyut Seçimi', type: 'single', options: attrs.coffee_sizes });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.kahve[0]);
      }
      if (attrs.temperature && attrs.temperature.length > 0) {
        groups.push({ id: 'temperature', label: 'Sıcaklık Seçimi', type: 'single', options: attrs.temperature });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.kahve[1]);
      }
      if (attrs.sugar_level && attrs.sugar_level.length > 0) {
        groups.push({ id: 'sugar', label: 'Şeker Oranı', type: 'single', options: attrs.sugar_level });
      }
      if (attrs.extras && attrs.extras.length > 0) {
        groups.push({ id: 'extras', label: 'Ekstra Seçenekler', type: 'multiple', options: attrs.extras });
      }
      break;

    case 'kozmetik':
      if (attrs.shade && attrs.shade.length > 0) {
        groups.push({ id: 'shade', label: 'Ton Seçimi', type: 'single', options: attrs.shade });
      }
      if (attrs.colors && attrs.colors.length > 0) {
        groups.push({ id: 'color', label: 'Renk / Renk Kodu', type: 'single', options: attrs.colors });
      } else if (!attrs.shade || attrs.shade.length === 0) {
        groups.push(CATEGORY_PRESET_VARIANTS.kozmetik[0]);
      }
      if (attrs.volume && attrs.volume.length > 0) {
        groups.push({ id: 'volume', label: 'Hacim', type: 'single', options: attrs.volume });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.kozmetik[2]);
      }
      if (attrs.package_options && attrs.package_options.length > 0) {
        groups.push({ id: 'package', label: 'Paket Türü', type: 'single', options: attrs.package_options });
      }
      break;

    case 'medikal':
      if (attrs.box_type && attrs.box_type.length > 0) {
        groups.push({ id: 'box', label: 'Kutu Tipi', type: 'single', options: attrs.box_type });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.medikal[0]);
      }
      if (attrs.quantity_per_pack && attrs.quantity_per_pack.length > 0) {
        groups.push({ id: 'quantity', label: 'Paket İçi Adet', type: 'single', options: attrs.quantity_per_pack });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.medikal[1]);
      }
      if (attrs.measurement && attrs.measurement.length > 0) {
        groups.push({ id: 'measurement', label: 'Ölçü / Beden', type: 'single', options: attrs.measurement });
      }
      break;

    case 'teknoloji':
      if (attrs.colors && attrs.colors.length > 0) {
        groups.push({ id: 'color', label: 'Renk', type: 'single', options: attrs.colors });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.teknoloji[0]);
      }
      if (attrs.storage && attrs.storage.length > 0) {
        groups.push({ id: 'storage', label: 'Depolama', type: 'single', options: attrs.storage });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.teknoloji[1]);
      }
      if (attrs.ram && attrs.ram.length > 0) {
        groups.push({ id: 'ram', label: 'RAM', type: 'single', options: attrs.ram });
      }
      break;

    case 'petshop':
      if (attrs.weight_kg && attrs.weight_kg.length > 0) {
        groups.push({ id: 'weight', label: 'Ağırlık (Kg)', type: 'single', options: attrs.weight_kg });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.petshop[0]);
      }
      if (attrs.pack_size && attrs.pack_size.length > 0) {
        groups.push({ id: 'pack', label: 'Paket Boyutu', type: 'single', options: attrs.pack_size });
      }
      if (attrs.flavor && attrs.flavor.length > 0) {
        groups.push({ id: 'flavor', label: 'Aroma / Lezzet', type: 'single', options: attrs.flavor });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.petshop[2]);
      }
      break;

    case 'cicek':
      if (attrs.bouquet_size) {
        groups.push({ id: 'bouquet', label: 'Buket Boyutu', type: 'single', options: [attrs.bouquet_size, 'Orta Buket', 'Büyük Buket', 'VIP Buket'] });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.cicek[0]);
      }
      if (attrs.colors && attrs.colors.length > 0) {
        groups.push({ id: 'color', label: 'Çiçek Rengi', type: 'single', options: attrs.colors });
      }
      if (attrs.allow_card_note) {
        groups.push({ id: 'card_note', label: 'Özel Not Kartı', type: 'text', options: [] });
      }
      break;

    case 'taki':
      if (attrs.material) {
        groups.push({ id: 'material', label: 'Materyal', type: 'single', options: [attrs.material, '925 Ayar Gümüş', '14K Altın', 'Paslanmaz Çelik'] });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.taki[0]);
      }
      if (attrs.colors && attrs.colors.length > 0) {
        groups.push({ id: 'color', label: 'Renk', type: 'single', options: attrs.colors });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.taki[1]);
      }
      if (attrs.variants && attrs.variants.length > 0) {
        groups.push({ id: 'variant', label: 'Model / Tip', type: 'single', options: attrs.variants });
      }
      break;

    case 'parfum':
      if (attrs.volume && attrs.volume.length > 0) {
        groups.push({ id: 'volume', label: 'Şişe Hacmi', type: 'single', options: attrs.volume });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.parfum[0]);
      }
      if (attrs.fragrance_type && attrs.fragrance_type.length > 0) {
        groups.push({ id: 'type', label: 'Esans Tipi', type: 'single', options: attrs.fragrance_type });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.parfum[1]);
      }
      break;

    case 'canta':
      if (attrs.sizes && attrs.sizes.length > 0) {
        groups.push({ id: 'size', label: 'Boyut', type: 'single', options: attrs.sizes });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.canta[0]);
      }
      if (attrs.colors && attrs.colors.length > 0) {
        groups.push({ id: 'color', label: 'Renk', type: 'single', options: attrs.colors });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.canta[1]);
      }
      break;

    case 'optik':
      if (attrs.frame_color && attrs.frame_color.length > 0) {
        groups.push({ id: 'frame', label: 'Çerçeve Rengi', type: 'single', options: attrs.frame_color });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.optik[0]);
      }
      if (attrs.lens_type && attrs.lens_type.length > 0) {
        groups.push({ id: 'lens', label: 'Cam Tipi', type: 'single', options: attrs.lens_type });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.optik[1]);
      }
      break;

    case 'bebek':
      if (attrs.age_range) {
        groups.push({ id: 'age', label: 'Yaş / Ay Aralığı', type: 'single', options: [attrs.age_range, '0-3 Ay', '3-6 Ay', '6-12 Ay', '1-2 Yaş'] });
      } else {
        groups.push(CATEGORY_PRESET_VARIANTS.bebek[0]);
      }
      if (attrs.sizes && attrs.sizes.length > 0) {
        groups.push({ id: 'size', label: 'Beden', type: 'single', options: attrs.sizes });
      }
      break;

    case 'kirtasiye':
      groups.push(...CATEGORY_PRESET_VARIANTS.kirtasiye);
      break;

    case 'yapi_market':
      groups.push(...CATEGORY_PRESET_VARIANTS.yapi_market);
      break;

    case 'diger':
    default:
      // Default / fallback: do NOT render food or drink options!
      break;
  }

  return groups;
}
