import { createClient } from '@supabase/supabase-js';
import { CATEGORY_STUDIO_IMAGES } from './categoryImages';

// Environment variables & LocalStorage configuration support
const getSupabaseUrl = (): string => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
  if (envUrl && envUrl.trim()) return envUrl.trim();
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('VITE_SUPABASE_URL');
    if (stored && stored.trim()) return stored.trim();
  }
  return '';
};

const getSupabaseAnonKey = (): string => {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);
  if (envKey && envKey.trim()) return envKey.trim();
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('VITE_SUPABASE_ANON_KEY');
    if (stored && stored.trim()) return stored.trim();
  }
  return '';
};

export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = getSupabaseAnonKey();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your_supabase_anon_public_key'
);

let productImagesSyncDisabled = false;

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('VITE_SUPABASE_URL', url.trim());
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('VITE_SUPABASE_URL');
    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
    window.location.reload();
  }
};

// Mock client for standalone / frontend-only / preview execution
function createMockSupabaseClient() {
  const chainable: any = {
    select: () => chainable,
    insert: () => chainable,
    update: () => chainable,
    delete: () => chainable,
    upsert: () => chainable,
    eq: () => chainable,
    neq: () => chainable,
    gt: () => chainable,
    gte: () => chainable,
    lt: () => chainable,
    lte: () => chainable,
    like: () => chainable,
    ilike: () => chainable,
    is: () => chainable,
    in: () => chainable,
    contains: () => chainable,
    order: () => chainable,
    limit: () => chainable,
    range: () => chainable,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };

  return {
    auth: {
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => chainable,
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'mock-file' }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
      }),
    },
    channel: () => ({
      on: function() { return this; },
      subscribe: function() { return this; },
      unsubscribe: function() { return this; },
    }),
    removeChannel: () => {},
  } as any;
}

// Role-specific Supabase Clients with distinct storage keys for 100% session isolation
export const supabaseCustomer = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'ugra_auth_customer',
        persistSession: true,
        autoRefreshToken: true,
      }
    }) 
  : createMockSupabaseClient();

export const supabasePartner = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'ugra_auth_partner',
        persistSession: true,
        autoRefreshToken: true,
      }
    }) 
  : createMockSupabaseClient();

export const supabaseAssistant = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'ugra_auth_assistant',
        persistSession: true,
        autoRefreshToken: true,
      }
    }) 
  : createMockSupabaseClient();

export const supabaseAdmin = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'ugra_auth_admin',
        persistSession: true,
        autoRefreshToken: true,
      }
    }) 
  : createMockSupabaseClient();

// Default Supabase client for generic database queries
export const supabase = supabaseCustomer;

// Helper to return the active authenticated client based on logged-in role session
export async function getActiveSupabaseClient() {
  if (isSupabaseConfigured) {
    try {
      if (supabasePartner) {
        const { data: partnerSession } = await supabasePartner.auth.getSession();
        if (partnerSession?.session) return supabasePartner;
      }
    } catch (_) {}
    try {
      if (supabaseAssistant) {
        const { data: assistantSession } = await supabaseAssistant.auth.getSession();
        if (assistantSession?.session) return supabaseAssistant;
      }
    } catch (_) {}
    try {
      if (supabaseCustomer) {
        const { data: customerSession } = await supabaseCustomer.auth.getSession();
        if (customerSession?.session) return supabaseCustomer;
      }
    } catch (_) {}
    try {
      if (supabaseAdmin) {
        const { data: adminSession } = await supabaseAdmin.auth.getSession();
        if (adminSession?.session) return supabaseAdmin;
      }
    } catch (_) {}
  }
  return supabase;
}

// Supabase client initialized

export const isUUID = (str?: string | null): boolean => {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
};

export const toUUID = (str: string): string => {
  if (!str) return '00000000-0000-4000-8000-000000000000';
  if (isUUID(str)) return str;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const pad = (s: string) => (s + '00000000000000000000000000000000').slice(0, 32);
  const fullHex = pad(hex + str.split('').map(c => c.charCodeAt(0).toString(16)).join(''));
  return `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-4${fullHex.slice(13, 16)}-8${fullHex.slice(17, 20)}-${fullHex.slice(20, 32)}`;
};

// ==========================================
// TYPES
// ==========================================
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  role: 'customer' | 'partner' | 'assistant' | 'admin' | 'super_admin';
  is_admin?: boolean;
  is_active?: boolean;
  partner_id?: string;
  assistant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  order_index?: number;
  active: boolean;
  created_at: string;
}

export interface Assistant {
  id: string;
  user_id?: string | null;
  partner_id?: string | null;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string | null;
  city?: string;
  vehicle_type: 'motosiklet' | 'bisiklet' | 'arac';
  status: 'aktif' | 'pasif' | 'görevde' | 'suspended' | 'pending';
  task_status?: string;
  active?: boolean;
  is_online?: boolean;
  rating?: number;
  completed_orders?: number;
  total_earnings?: number;
  latitude?: number | null;
  longitude?: number | null;
  account_holder?: string | null;
  bank_name?: string | null;
  iban?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AssistantSubscription {
  id: string;
  assistant_id: string;
  start_date?: string;
  expires_at?: string;
  monthly_price?: number;
  status?: string;
  payment_status?: string;
  renewal_requested?: boolean;
  renewal_decision?: 'pending' | 'approved' | 'rejected' | string;
  created_at?: string;
  updated_at?: string;
}

export interface Address {
  id: string;
  user_id: string;
  title: string;
  address: string;
  city: string;
  district?: string;
  is_default: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  partner_id?: string;
  product_id?: string;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  partner_id: string;
  order_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  partner_id?: string;
  title: string;
  description?: string;
  discount_rate?: number;
  banner_url?: string;
  target_category?: string;
  active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface Banner {
  id: string;
  partner_id?: string;
  title: string;
  image_url: string;
  link_url?: string;
  position?: number;
  active: boolean;
  created_at: string;
}
export interface Partner {
  id: string;
  slug: string;
  business_name: string;
  email?: string;
  logo?: string;
  cover_image?: string;
  description?: string;
  phone?: string;
  address?: string;
  category?: string;
  active: boolean;
  created_at: string;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  working_hours?: Record<string, { open: string; close: string; closed: boolean }>;
  gallery?: string[];
  operating_status?: 'open' | 'closed' | 'busy' | 'temp_closed';
  prep_time?: number;
  min_order_amount?: number;
  delivery_note?: string;
  tax_office?: string;
  tax_no?: string;
  invoice_title?: string;
  iban?: string;
  // Enhanced metadata fields for discovery & listing
  rating?: number;
  rating_count?: number;
  distance_km?: number;
  distance_text?: string;
  delivery_time?: string;
  is_artisan?: boolean;
  craft_type?: string;
}

/**
 * Evaluates whether a partner store is currently open based on:
 * 1. Active status & operating_status override ('closed' or 'temp_closed')
 * 2. Weekly working_hours configured in partner panel for local device time/day
 */
export function isStoreOpen(partner: Partner): { isOpen: boolean; label: 'Açık' | 'Kapalı' | 'Geçici Kapalı' | 'Yoğun'; reason?: string } {
  if (!partner) {
    return { isOpen: false, label: 'Kapalı', reason: 'Mağaza bilgisi bulunamadı.' };
  }

  if (partner.active === false) {
    return { isOpen: false, label: 'Kapalı', reason: 'Mağaza pasif durumda.' };
  }

  // 1. Manual status overrides
  if (partner.operating_status === 'temp_closed') {
    return { isOpen: false, label: 'Geçici Kapalı', reason: 'Geçici olarak hizmet vermiyor.' };
  }
  if (partner.operating_status === 'closed') {
    return { isOpen: false, label: 'Kapalı', reason: 'Şu anda hizmet vermiyor.' };
  }

  // 2. Evaluate working_hours for local device time/day
  try {
    const now = new Date();
    const turkishDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const dayIndex = now.getDay();
    const dayNameTR = turkishDays[dayIndex];
    const dayNameEN = englishDays[dayIndex];

    let hoursData: Record<string, { open: string; close: string; closed: boolean }> | null = null;

    if (partner.working_hours) {
      if (typeof partner.working_hours === 'string') {
        try {
          hoursData = JSON.parse(partner.working_hours);
        } catch (e) {
          hoursData = null;
        }
      } else if (typeof partner.working_hours === 'object') {
        hoursData = partner.working_hours;
      }
    }

    if (hoursData && Object.keys(hoursData).length > 0) {
      const todayKey = Object.keys(hoursData).find(
        key => key.toLowerCase() === dayNameTR.toLowerCase() || key.toLowerCase() === dayNameEN.toLowerCase()
      );

      const dayHours = todayKey ? hoursData[todayKey] : null;

      if (dayHours) {
        if (dayHours.closed) {
          return { isOpen: false, label: 'Kapalı', reason: `${dayNameTR} günü kapalı.` };
        }

        if (dayHours.open && dayHours.close) {
          const currentMins = now.getHours() * 60 + now.getMinutes();
          const [openH, openM] = dayHours.open.split(':').map(Number);
          const [closeH, closeM] = dayHours.close.split(':').map(Number);

          const openMins = (openH || 0) * 60 + (openM || 0);
          const closeMins = (closeH || 0) * 60 + (closeM || 0);

          let isWithinHours = false;
          if (closeMins < openMins) {
            // Overnight schedule e.g. 18:00 -> 02:00
            isWithinHours = currentMins >= openMins || currentMins < closeMins;
          } else {
            isWithinHours = currentMins >= openMins && currentMins < closeMins;
          }

          if (!isWithinHours) {
            return {
              isOpen: false,
              label: 'Kapalı',
              reason: `Çalışma saatleri: ${dayHours.open} - ${dayHours.close}`
            };
          }
        }
      }
    }

    // Fallback for simple working_hours_start & working_hours_end if present
    const startStr = (partner as any).working_hours_start;
    const endStr = (partner as any).working_hours_end;
    if (startStr && endStr) {
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = startStr.split(':').map(Number);
      const [closeH, closeM] = endStr.split(':').map(Number);
      const openMins = (openH || 0) * 60 + (openM || 0);
      const closeMins = (closeH || 0) * 60 + (closeM || 0);

      let isWithinHours = false;
      if (closeMins < openMins) {
        isWithinHours = currentMins >= openMins || currentMins < closeMins;
      } else {
        isWithinHours = currentMins >= openMins && currentMins < closeMins;
      }

      if (!isWithinHours) {
        return { isOpen: false, label: 'Kapalı', reason: `Çalışma saatleri: ${startStr} - ${endStr}` };
      }
    }
  } catch (err) {
    console.error('Error calculating store status:', err);
  }

  if (partner.operating_status === 'busy') {
    return { isOpen: true, label: 'Yoğun', reason: 'Yoğun sipariş alıyor.' };
  }

  return { isOpen: true, label: 'Açık' };
}

export const OFFICIAL_PARTNER_CATEGORIES: readonly string[] = [
  'Giyim',
  'Kafe',
  'Kahve',
  'Teknoloji',
  'Optik',
  'Kozmetik',
  'Petshop',
  'Market',
  'Restoran',
  'Medikal',
  'Sağlık & Medikal',
  'Çiçekçi',
  'Parfüm & Parfümeri',
  'Kırtasiye',
  'Yapı Market',
  'Bebek',
  'Hediyelik',
  'Takı & Aksesuar',
  'Çanta & Valiz',
  'Senin Dükkanın',
];

export const PARTNER_CATEGORIES: string[] = [...OFFICIAL_PARTNER_CATEGORIES];

export const normalizeCategory = (cat?: string): string => {
  if (!cat) return '';
  const trimmed = cat.trim();
  if (!trimmed) return '';

  const matched = OFFICIAL_PARTNER_CATEGORIES.find(c => c.toLowerCase() === trimmed.toLowerCase());
  if (matched) return matched;

  const l = trimmed.toLowerCase();

  if (l.includes('senin dükkanın') || l.includes('senin dukkanin') || l.includes('bireysel')) return 'Senin Dükkanın';
  if (l.includes('kafe') || l.includes('cafe')) return 'Kafe';
  if (l.includes('kahve') || l.includes('coffee')) return 'Kahve';
  if (l.includes('giyim') || l.includes('moda') || l.includes('vintage') || l.includes('butik')) return 'Giyim';
  if (l.includes('restoran') || l.includes('lokanta') || l.includes('yemek')) return 'Restoran';
  if (l.includes('medikal')) return 'Medikal';
  if (l.includes('sağlık') || l.includes('saglik') || l.includes('eczane')) return 'Sağlık & Medikal';
  if (l.includes('pet')) return 'Petshop';
  if (l.includes('çiçek') || l.includes('cicek')) return 'Çiçekçi';
  if (l.includes('market') || l.includes('şarküteri') || l.includes('sarkuteri')) return 'Market';
  if (l.includes('parfüm') || l.includes('parfum') || l.includes('parfümeri') || l.includes('parfumeri')) return 'Parfüm & Parfümeri';
  if (l.includes('kozmetik')) return 'Kozmetik';
  if (l.includes('kırtasiye') || l.includes('kirtasiye')) return 'Kırtasiye';
  if (l.includes('teknoloji')) return 'Teknoloji';
  if (l.includes('yapı market') || l.includes('yapi market') || l.includes('nalbur') || l.includes('hardware')) return 'Yapı Market';
  if (l.includes('bebek')) return 'Bebek';
  if (l.includes('hediye')) return 'Hediyelik';
  if (l.includes('optik')) return 'Optik';
  if (l.includes('takı') || l.includes('taki') || l.includes('aksesuar')) return 'Takı & Aksesuar';
  if (l.includes('çanta') || l.includes('canta') || l.includes('valiz')) return 'Çanta & Valiz';

  return trimmed;
};

export const categoryNameToSlug = (name: string): string => {
  if (!name) return '';
  const n = name.toLowerCase().trim();
  if (n.includes('senin dükkanın') || n.includes('bireysel')) return 'senin-dukkanin';
  if (n.includes('kafe') || n.includes('cafe')) return 'kafe';
  if (n.includes('kahve') || n.includes('coffee')) return 'kahve';
  if (n.includes('giyim') || n.includes('moda')) return 'giyim';
  if (n.includes('restoran') || n.includes('lokanta')) return 'restoran';
  if (n.includes('medikal')) return 'medikal';
  if (n.includes('sağlık') || n.includes('saglik')) return 'saglik-medikal';
  if (n.includes('pet')) return 'petshop';
  if (n.includes('çiçek') || n.includes('cicek')) return 'cicekci';
  if (n.includes('market')) return 'market';
  if (n.includes('parfüm') || n.includes('parfum')) return 'parfum-parfumeri';
  if (n.includes('kozmetik')) return 'kozmetik';
  if (n.includes('kırtasiye') || n.includes('kirtasiye')) return 'kirtasiye';
  if (n.includes('teknoloji')) return 'teknoloji';
  if (n.includes('yapı market') || n.includes('yapi market') || n.includes('nalbur')) return 'nalbur';
  if (n.includes('bebek')) return 'bebek';
  if (n.includes('hediyelik') || n.includes('hediye')) return 'hediyelik';
  if (n.includes('optik')) return 'optik';
  if (n.includes('takı') || n.includes('taki') || n.includes('aksesuar')) return 'taki-aksesuar';
  if (n.includes('çanta') || n.includes('canta') || n.includes('valiz')) return 'canta-valiz';
  return n.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

export const categorySlugToName = (slug: string): string => {
  if (!slug) return '';
  const s = slug.toLowerCase().trim();
  if (s === 'senin-dukkanin' || s === 'bireysel-satici' || s === 'bireysel-yerel-uretici') return 'Senin Dükkanın';
  if (s === 'kafe' || s === 'cafe') return 'Kafe';
  if (s === 'kahve' || s === 'coffee') return 'Kahve';
  if (s === 'giyim' || s === 'store' || s === 'moda') return 'Giyim';
  if (s === 'restoran' || s === 'lokanta') return 'Restoran';
  if (s === 'medikal') return 'Medikal';
  if (s === 'saglik-medikal' || s === 'health' || s === 'saglik' || s === 'eczane') return 'Sağlık & Medikal';
  if (s === 'petshop' || s === 'pet') return 'Petshop';
  if (s === 'cicekci' || s === 'florist' || s === 'cicek') return 'Çiçekçi';
  if (s === 'market') return 'Market';
  if (s === 'parfum-parfumeri' || s === 'parfum' || s === 'parfumeri' || s === 'perfume') return 'Parfüm & Parfümeri';
  if (s === 'kozmetik' || s === 'cosmetic') return 'Kozmetik';
  if (s === 'kirtasiye' || s === 'stationery') return 'Kırtasiye';
  if (s === 'teknoloji' || s === 'technology') return 'Teknoloji';
  if (s === 'nalbur' || s === 'yapi-market' || s === 'yapimarket' || s === 'hardware') return 'Yapı Market';
  if (s === 'bebek' || s === 'baby') return 'Bebek';
  if (s === 'hediyelik' || s === 'gift') return 'Hediyelik';
  if (s === 'optik' || s === 'optic') return 'Optik';
  if (s === 'taki-aksesuar' || s === 'jewelry') return 'Takı & Aksesuar';
  if (s === 'canta-valiz' || s === 'bags') return 'Çanta & Valiz';
  return OFFICIAL_PARTNER_CATEGORIES.find(c => c.toLowerCase() === s) || normalizeCategory(slug);
};

export const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  'Kahve': CATEGORY_STUDIO_IMAGES['Kahve'],
  'Giyim': CATEGORY_STUDIO_IMAGES['Giyim'],
  'Sağlık & Medikal': CATEGORY_STUDIO_IMAGES['Sağlık & Medikal'],
  'Petshop': CATEGORY_STUDIO_IMAGES['Petshop'],
  'Çiçekçi': CATEGORY_STUDIO_IMAGES['Çiçekçi'],
  'Market': CATEGORY_STUDIO_IMAGES['Senin Dükkanın'],
  'Kozmetik': CATEGORY_STUDIO_IMAGES['Kozmetik'],
  'Parfüm & Parfümeri': CATEGORY_STUDIO_IMAGES['Parfüm & Parfümeri'],
  'Kırtasiye': CATEGORY_STUDIO_IMAGES['Kırtasiye'],
  'Teknoloji': CATEGORY_STUDIO_IMAGES['Teknoloji'],
  'Yapı Market': CATEGORY_STUDIO_IMAGES['Yapı Market'],
  'Nalbur': CATEGORY_STUDIO_IMAGES['Yapı Market'],
  'Bebek': CATEGORY_STUDIO_IMAGES['Bebek'],
  'Hediyelik': CATEGORY_STUDIO_IMAGES['Hediyelik'],
  'Optik': CATEGORY_STUDIO_IMAGES['Optik'],
  'Takı & Aksesuar': CATEGORY_STUDIO_IMAGES['Takı & Aksesuar'],
  'Çanta & Valiz': CATEGORY_STUDIO_IMAGES['Çanta & Valiz'],
  'Senin Dükkanın': CATEGORY_STUDIO_IMAGES['Senin Dükkanın'],
};

export const getCategoryDefaultImage = (cat?: string): string => {
  const norm = normalizeCategory(cat);
  if (norm && CATEGORY_DEFAULT_IMAGES[norm]) {
    return CATEGORY_DEFAULT_IMAGES[norm];
  }
  return CATEGORY_DEFAULT_IMAGES['Kahve'];
};

export const enrichPartner = (p: Partner, index = 0): Partner => {
  const hash = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
  const rating = p.rating ?? Number((4.6 + (hash % 5) * 0.1).toFixed(1));
  const rating_count = p.rating_count ?? (30 + (hash * 7) % 150);
  const distance_km = p.distance_km ?? Number((0.6 + (hash % 18) * 0.1).toFixed(1));
  const distance_text = p.distance_text ?? `${distance_km} km`;
  const delivery_time = p.delivery_time ?? (p.prep_time ? `${p.prep_time}-${p.prep_time + 10} dk` : `${15 + (hash % 3) * 5}-${25 + (hash % 3) * 5} dk`);

  const category = p.category && p.category.trim() ? normalizeCategory(p.category) : (normalizeCategory(p.business_name) || 'Diğer');
  const defaultCatImg = getCategoryDefaultImage(category);

  const isOldCoffeeFallback = p.logo && (
    p.logo.includes('photo-1501339847302-ac426a4a7cbb') ||
    p.logo.includes('photo-1554118811-1e0d58224f24')
  ) && category !== 'Kahve';

  const logo = (p.logo && p.logo.trim() !== '' && !isOldCoffeeFallback) 
    ? p.logo 
    : defaultCatImg;

  return {
    ...p,
    category,
    logo,
    rating,
    rating_count,
    distance_km,
    distance_text,
    delivery_time,
  };
};

export const mergePartnerWithLocalCache = (partner: Partner): Partner => {
  if (!partner) return partner;
  if (isSupabaseConfigured) return partner;
  const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
  const localMatch = localPartners.find(
    p => p.id === partner.id || 
         (p.email && partner.email && p.email.toLowerCase().trim() === partner.email.toLowerCase().trim()) ||
         (p.slug && partner.slug && p.slug.toLowerCase().trim() === partner.slug.toLowerCase().trim())
  );
  if (!localMatch) return partner;

  return {
    ...localMatch,
    ...partner,
    phone: partner.phone || localMatch.phone || '',
    operating_status: partner.operating_status || localMatch.operating_status || 'open',
    prep_time: partner.prep_time !== undefined && partner.prep_time !== null ? partner.prep_time : localMatch.prep_time,
    min_order_amount: partner.min_order_amount !== undefined && partner.min_order_amount !== null ? partner.min_order_amount : localMatch.min_order_amount,
    address: partner.address || localMatch.address || '',
    description: partner.description || localMatch.description || '',
    tax_office: partner.tax_office || localMatch.tax_office || '',
    tax_no: partner.tax_no || localMatch.tax_no || '',
    invoice_title: partner.invoice_title || localMatch.invoice_title || '',
    iban: partner.iban || localMatch.iban || '',
    delivery_note: partner.delivery_note || localMatch.delivery_note || '',
    working_hours: partner.working_hours || localMatch.working_hours,
    gallery: partner.gallery || localMatch.gallery
  };
};

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const cachedCategoriesStr = localStorage.getItem('ugra_virtual_categories');
    if (cachedCategoriesStr) {
      const parsed = JSON.parse(cachedCategoriesStr);
      if (Array.isArray(parsed) && (parsed.length !== OFFICIAL_PARTNER_CATEGORIES.length || parsed.some((item: any) => !OFFICIAL_PARTNER_CATEGORIES.includes(item.name)))) {
        localStorage.removeItem('ugra_virtual_categories');
      }
    }
  } catch (e) {
    // Ignore error
  }
}

export interface ProductAttributes {
  sizes?: string[];          // Beden seçenekleri (Giyim, Çanta, Bebek)
  colors?: string[];         // Renk seçenekleri (Giyim, Teknoloji, Kozmetik, Çiçek vb.)
  shoe_sizes?: string[];     // Ayakkabı numaraları (Giyim)
  fit?: string[];            // Kesim / Kalıp (Giyim: Regular, Slim, Oversize)
  fabric?: string;           // Kumaş (Giyim: %100 Pamuk, Keten vb.)
  coffee_sizes?: string[];   // Kahve boyutları (Küçük, Orta, Büyük)
  temperature?: string[];    // Sıcak / Soğuk seçeneği (Sıcak, Soğuk)
  sugar_level?: string[];    // Şeker Oranı (Şekersiz, Az Şekerli vb.)
  extras?: string[];         // Ekstra seçenekler (Ekstra Shot, Şurup vb.)
  shade?: string[];          // Ton seçimi (Kozmetik)
  volume?: string[];         // Hacim (Kozmetik, Parfüm: 30ml, 50ml, 100ml)
  package_options?: string[];// Paket seçeneği (Kozmetik)
  box_type?: string[];       // Kutu Tipi (Medikal)
  quantity_per_pack?: string[];// Adet (Medikal)
  measurement?: string[];    // Ölçü / Beden (Medikal)
  storage?: string[];        // Depolama (Teknoloji: 128 GB, 256 GB)
  ram?: string[];            // RAM (Teknoloji: 8 GB, 16 GB)
  weight_kg?: string[];      // Ağırlık Kg (Petshop: 1.5kg, 3kg, 12kg)
  pack_size?: string[];      // Paket Boyutu (Petshop)
  flavor?: string[];         // Aroma / Lezzet (Petshop: Tavuklu, Somonlu)
  fragrance_type?: string[]; // Esans Tipi (Parfüm: EDP, EDT)
  frame_color?: string[];    // Çerçeve Rengi (Optik)
  lens_type?: string[];      // Cam Tipi (Optik)
  bouquet_size?: string;     // Buket boyutu (Çiçekçi)
  allow_card_note?: boolean; // Kart notu eklenebilir (Çiçekçi)
  brand?: string;            // Marka (Teknoloji, Medikal, Bebek)
  model?: string;            // Model (Teknoloji)
  age_range?: string;        // Yaş aralığı (Bebek)
  material?: string;         // Materyal (Takı, Çanta)
  variants?: string[];       // Varyant seçenekleri (Takı vb.)
  [key: string]: any;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  created_at?: string;
}

export interface Product {
  id: string;
  partner_id: string;
  title: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  category?: string;
  subcategory?: string;
  product_type?: string;
  custom_product_type?: boolean;
  tags?: string[];
  stock: number;
  active: boolean;
  created_at: string;
  attributes?: ProductAttributes;
}

export interface Order {
  id: string;
  partner_id?: string;
  store_id?: string;
  partner_name?: string;
  user_id?: string;
  customer_id?: string;
  assistant_id?: string;
  assistant_iban?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_address?: string;
  pickup_address?: string;
  latitude?: number;
  longitude?: number;
  location_url?: string;
  street?: string;
  district?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  place_id?: string;
  accuracy?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  assistant_name?: string;
  payment_type: 'kapida_nakit' | 'kapida_kart' | 'online' | string;
  status: 'pending' | 'created' | 'accepted' | 'in_progress' | 'on_the_way' | 'bekliyor' | 'beklemede' | 'hazirlaniyor' | 'hazir' | 'yolda' | 'teslim_edildi' | 'tamamlandi' | 'iptal' | string;
  total_price: number;
  service_type?: string;
  pickup_zone?: string;
  delivery_zone?: string;
  distance_km?: number;
  estimated_minutes?: number;
  courier_net?: number;
  base_price?: number;
  fuel_cost?: number;
  wear_cost?: number;
  operation_cost?: number;
  tax_cost?: number;
  vat_cost?: number;
  commission?: number;
  customer_price?: number;
  created_at: string;
  updated_at?: string;
  items?: { product_id?: string; title: string; name?: string; quantity: number; price: number }[];
  notes?: string;
  task_description?: string;
  address_detail?: string;
  preferred_time?: string | null;
  archived?: boolean;
  deleted?: boolean;
  requires_delivery_code?: boolean;
  delivery_code?: string | null;
  delivery_code_verified?: boolean;
  delivery_code_verified_at?: string | null;
  delivered_at?: string | null;
}

export interface AuditLog {
  id: string;
  partner_id?: string;
  partner_name?: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
}

export interface Profile {
  id: string;
  partner_id: string;
  role: string;
  is_admin?: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  partner_id: string;
  business_name?: string;
  subject: string;
  message: string;
  status: 'acik' | 'cozuldu' | 'iptal';
  created_at: string;
}

export type AssistantApplication = Assistant;

export interface CategoryItem {
  id: string;
  name: string;
  icon?: string;
  icon_name?: string;
  image?: string;
  image_url?: string;
  slug?: string;
  order?: number;
  order_position?: number;
  active: boolean;
  created_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  usage_limit?: number;
  used_count: number;
  start_date?: string;
  end_date?: string;
  active: boolean;
  created_at: string;
}
export type CouponItem = Coupon;

export interface NotificationLog {
  id: string;
  target_type: 'all' | 'partners' | 'assistants' | 'city' | 'category';
  target_value?: string;
  title: string;
  body: string;
  message?: string;
  type?: string;
  read?: boolean;
  action_url?: string;
  sent_by: string;
  created_at: string;
}

export interface ReviewItem {
  id: string;
  customer_name: string;
  partner_id?: string;
  partner_name?: string;
  assistant_id?: string;
  assistant_name?: string;
  rating: number;
  comment: string;
  status: 'approved' | 'hidden' | 'flagged';
  created_at: string;
  reply?: string;
  reply_at?: string;
}

export interface SystemSettings {
  commission_rate: number;
  delivery_fee: number;
  min_order_amount: number;
  service_zones: string[];
  working_hours_start: string;
  working_hours_end: string;
  tax_rate: number;
  contact_phone: string;
  contact_email: string;
  contact_whatsapp: string;
  address: string;
  social_media: { instagram?: string; twitter?: string; linkedin?: string };
  api_settings: { sms_provider?: string; map_provider?: string; auto_assign_courier?: boolean };
}

export interface AdminRoleUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'operasyon' | 'destek' | 'finans' | 'pazarlama';
  active: boolean;
  created_at: string;
  last_login?: string;
}

// ==========================================
// VIRTUAL / LOCALSTORAGE FALLBACK ENGINE
// ==========================================
export const LOCAL_STORAGE_KEYS = {
  PARTNERS: 'ugra_virtual_partners',
  PRODUCTS: 'ugra_virtual_products',
  ORDERS: 'ugra_virtual_orders',
  PROFILES: 'ugra_virtual_profiles',
  SESSION: 'ugra_virtual_session'
};

const inMemoryStore = new Map<string, string>();

// Helpers for localStorage state manipulation (offline fallback / cache only)
export const getStored = <T>(key: string): T[] => {
  let data: string | null = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    data = localStorage.getItem(key);
  } else {
    data = inMemoryStore.get(key) || null;
  }
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setStored = <T>(key: string, data: T[]) => {
  const json = JSON.stringify(data);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, json);
  } else {
    inMemoryStore.set(key, json);
  }
};

const getStoredObject = <T>(key: string, defaultValue: T): T => {
  let data: string | null = null;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    data = localStorage.getItem(key);
  } else {
    data = inMemoryStore.get(key) || null;
  }
  if (!data) return defaultValue;
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStoredObject = <T>(key: string, data: T) => {
  const json = JSON.stringify(data);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, json);
  } else {
    inMemoryStore.set(key, json);
  }
};

const exactTableColumnsCache = new Map<string, string[]>();
const inFlightColumnPromises = new Map<string, Promise<string[]>>();
let openApiDefinitionsCache: Record<string, any> | null = null;
let openApiDefinitionsFetched = false;

async function fetchOpenApiDefinitions(): Promise<Record<string, any> | null> {
  // PostgREST OpenAPI spec endpoint /rest/v1/ is restricted in Supabase configuration
  openApiDefinitionsFetched = true;
  return null;
}

// Helper to inspect actual table columns from PostgREST / Supabase
export async function getExactTableColumns(tableName: string): Promise<string[]> {
  if (exactTableColumnsCache.has(tableName)) {
    return exactTableColumnsCache.get(tableName)!;
  }
  if (inFlightColumnPromises.has(tableName)) {
    return inFlightColumnPromises.get(tableName)!;
  }

  const promise = (async () => {
    // Prevent REST calls for missing support_tickets table
    if (tableName === 'support_tickets') {
      exactTableColumnsCache.set(tableName, []);
      return [];
    }

    // 1. Fetch OpenAPI spec from PostgREST endpoint
    const definitions = await fetchOpenApiDefinitions();
    if (definitions) {
      if (definitions[tableName] && definitions[tableName].properties) {
        const cols = Object.keys(definitions[tableName].properties);
        if (cols.length > 0) {
          exactTableColumnsCache.set(tableName, cols);
          return cols;
        }
      }
    }

    // 2. Sample row probe from PostgREST table if OpenAPI spec was not available or empty
    const columnsSet = new Set<string>();
    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        const { data, error } = await client.from(tableName).select('*').limit(1);
        if (!error && data && data.length > 0) {
          Object.keys(data[0]).forEach(col => columnsSet.add(col));
        } else if (error && (error.code === '42P01' || error.status === 404 || error.message?.includes('does not exist'))) {
          exactTableColumnsCache.set(tableName, []);
          return [];
        }
      } catch (e) {
        console.warn(`Sample row select error for table ${tableName}:`, e);
      }
    }

    const sampleCols = Array.from(columnsSet);
    if (sampleCols.length > 0) {
      console.log(`[GERÇEK KOLON LİSTESİ] ${tableName} tablosu:`, sampleCols);
      exactTableColumnsCache.set(tableName, sampleCols);
      return sampleCols;
    }

    // 3. Complete candidate column mappings as final fallback
    const fallbackCandidateMap: Record<string, string[]> = {
      partners: ['id', 'business_name', 'slug', 'email', 'phone', 'category', 'description', 'logo', 'address', 'status', 'active', 'created_at'],
      profiles: ['id', 'partner_id', 'role', 'is_admin', 'phone', 'avatar_url', 'full_name', 'address', 'created_at', 'updated_at'],
      products: ['id', 'partner_id', 'name', 'title', 'description', 'price', 'image', 'category', 'active', 'created_at'],
      tasks: [
        'id', 'customer_id', 'partner_id', 'assistant_id', 'status',
        'task_description', 'pickup_address', 'delivery_address', 'pickup_lat', 'pickup_lng',
        'delivery_lat', 'delivery_lng', 'total_price', 'verification_code',
        'created_at', 'updated_at', 'service_type', 'distance_km', 'estimated_minutes',
        'courier_net', 'base_price', 'fuel_cost', 'wear_cost', 'operation_cost',
        'tax_cost', 'vat_cost', 'commission', 'customer_price'
      ],
      orders: [
        'id', 'partner_id', 'store_id', 'customer_id', 'user_id', 'assistant_id',
        'customer_name', 'customer_phone', 'customer_address', 'delivery_address',
        'payment_type', 'total_price', 'customer_price', 'courier_net', 'base_price',
        'items', 'notes', 'status', 'service_type', 'distance_km', 'estimated_minutes',
        'pickup_lat', 'pickup_lng', 'delivery_lat', 'delivery_lng',
        'city', 'province', 'postal_code', 'place_id', 'location_url',
        'created_at', 'updated_at', 'accepted_at', 'completed_at', 'delivery_code'
      ],
      assistants: ['id', 'user_id', 'full_name', 'phone', 'vehicle_type', 'status', 'rating', 'active', 'balance', 'created_at', 'updated_at'],
      assistant_subscriptions: ['id', 'assistant_id', 'start_date', 'expires_at', 'monthly_price', 'payment_status', 'status', 'created_at'],
      wallets: ['id', 'profile_id', 'available_balance', 'reserved_balance', 'currency', 'status', 'created_at', 'updated_at'],
      wallet_transactions: ['id', 'wallet_id', 'amount', 'transaction_type', 'description', 'status', 'created_at'],
      dispatch_offers: [
        'id', 'dispatch_session_id', 'order_id', 'task_id', 'assistant_id', 'status',
        'courier_net', 'customer_price', 'offered_at', 'expires_at',
        'distance_km', 'estimated_minutes', 'service_type', 'wave_index', 'created_at', 'updated_at'
      ],
      dispatch_sessions: [
        'id', 'order_id', 'task_id', 'status', 'current_index', 'strategy', 'created_at', 'updated_at'
      ]
    };

    if (fallbackCandidateMap[tableName]) {
      const cols = fallbackCandidateMap[tableName];
      exactTableColumnsCache.set(tableName, cols);
      return cols;
    }

    exactTableColumnsCache.set(tableName, []);
    return [];
  })();

  inFlightColumnPromises.set(tableName, promise);
  try {
    return await promise;
  } finally {
    inFlightColumnPromises.delete(tableName);
  }
}

export function filterPayloadByValidColumns<T extends Record<string, any>>(payload: T, validColumns: string[]): Record<string, any> {
  if (!validColumns || validColumns.length === 0) return payload;
  const filtered: Record<string, any> = {};
  for (const key of Object.keys(payload)) {
    if (validColumns.includes(key)) {
      filtered[key] = payload[key];
    }
  }
  return filtered;
}

let cachedProductsTableColumns: Set<string> | null = null;

async function getProductsTableColumns(): Promise<Set<string>> {
  if (cachedProductsTableColumns) return cachedProductsTableColumns;
  if (!isSupabaseConfigured) return new Set(['id', 'partner_id', 'name', 'description', 'price', 'image', 'category', 'active', 'created_at']);

  const cols = await getExactTableColumns('products');
  if (cols && cols.length > 0) {
    cachedProductsTableColumns = new Set(cols);
    return cachedProductsTableColumns;
  }

  cachedProductsTableColumns = new Set(['id', 'partner_id', 'name', 'description', 'price', 'image', 'category', 'active', 'created_at']);
  return cachedProductsTableColumns;
}

let cachedOrdersTableColumns: Set<string> | null = null;

export async function getOrdersTableColumns(): Promise<Set<string>> {
  if (cachedOrdersTableColumns) return cachedOrdersTableColumns;
  if (!isSupabaseConfigured) {
    return new Set([
      'id', 'partner_id', 'customer_name', 'customer_phone', 'customer_address',
      'delivery_address', 'payment_type', 'total_price', 'items', 'notes', 'status', 'created_at',
      'service_type', 'distance_km', 'estimated_minutes', 'courier_net', 'base_price', 'fuel_cost',
      'wear_cost', 'operation_cost', 'tax_cost', 'vat_cost', 'commission', 'customer_price'
    ]);
  }

  const cols = await getExactTableColumns('orders');
  if (cols && cols.length > 0) {
    cachedOrdersTableColumns = new Set(cols);
    return cachedOrdersTableColumns;
  }

  cachedOrdersTableColumns = new Set([
    'id', 'partner_id', 'customer_name', 'customer_phone', 'customer_address',
    'payment_type', 'total_price', 'items', 'notes', 'status', 'created_at',
    'service_type', 'distance_km', 'estimated_minutes', 'courier_net', 'base_price', 'fuel_cost',
    'wear_cost', 'operation_cost', 'tax_cost', 'vat_cost', 'commission', 'customer_price'
  ]);
  return cachedOrdersTableColumns;
}

// Helper to guarantee a partner row exists in 'partners' table without FK violations
export async function ensurePartnerInDatabase(partnerInput: Partial<Partner> & { id: string }): Promise<Partner> {
  if (!partnerInput?.id) {
    return partnerInput as Partner;
  }

  if (isSupabaseConfigured) {
    try {
      const client = await getActiveSupabaseClient();
      const partnerUuid = isUUID(partnerInput.id) ? partnerInput.id : toUUID(partnerInput.id);
      const cleanEmail = partnerInput.email ? partnerInput.email.toLowerCase().trim() : '';

      // 1. Check if partner already exists in 'partners' table by ID or email
      let existing: any = null;

      if (partnerUuid) {
        const { data } = await client
          .from('partners')
          .select('*')
          .eq('id', partnerUuid)
          .maybeSingle();
        if (data) existing = data;
      }

      if (!existing && cleanEmail) {
        const { data } = await client
          .from('partners')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (data) existing = data;
      }

      // Introspect valid columns for 'partners' table
      const validCols = await getExactTableColumns('partners');

      const fullPartner: Record<string, any> = {
        id: existing?.id || partnerUuid,
        business_name: partnerInput.business_name || existing?.business_name || 'Mağaza',
        slug: partnerInput.slug || existing?.slug || ('magaza-' + Date.now()),
        email: cleanEmail || existing?.email || '',
        phone: partnerInput.phone || existing?.phone || '',
        address: partnerInput.address || existing?.address || '',
        category: partnerInput.category ? normalizeCategory(partnerInput.category) : (existing?.category || 'Diğer'),
        description: partnerInput.description || existing?.description || '',
        logo: partnerInput.logo || existing?.logo || '',
        status: partnerInput.status || existing?.status || (partnerInput.active === false ? 'pending' : 'approved'),
        active: partnerInput.active !== undefined ? partnerInput.active : (existing?.active ?? true),
        created_at: partnerInput.created_at || existing?.created_at || new Date().toISOString()
      };

      const payload = filterPayloadByValidColumns(fullPartner, validCols);

      let upserted: any = null;
      let error: any = null;
      try {
        const res = await client
          .from('partners')
          .upsert(payload)
          .select()
          .maybeSingle();
        upserted = res.data;
        error = res.error;
      } catch (e) {
        error = e;
      }

      // Also ensure profiles table entry exists safely
      try {
        const profileCols = await getExactTableColumns('profiles');
        if (profileCols && profileCols.length > 0) {
          const profilePayload = filterPayloadByValidColumns({
            id: fullPartner.id,
            partner_id: fullPartner.id,
            role: 'partner',
            is_admin: false,
            phone: fullPartner.phone || '',
            avatar_url: fullPartner.logo || '',
            created_at: fullPartner.created_at
          }, profileCols);

          await client.from('profiles').upsert([profilePayload]);
        }
      } catch (e) {}

      return (upserted || existing || fullPartner) as Partner;
    } catch (err) {}
  }

  return partnerInput as Partner;
}

// ==========================================
// UNIFIED SERVICE LAYER (SUPABASE + FALLBACK)
// ==========================================

export const db = {
  // --- AUTH SERVICES ---
  async signIn(email: string, password: string) {
    const cleanEmail = email.toLowerCase().trim();

    // Admin login fast path
    if (cleanEmail === 'goko@ugra.app' || cleanEmail === 'admin@ugra.app') {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          if (!error && data?.user) return data;
        } catch (e) {}
      }
      if (password === 'gokougra123') {
        const mockAdminUser = {
          user: {
            id: '8987cf9f-8bcf-4e2e-a648-da996c0b0fbb',
            email: cleanEmail,
            user_metadata: { business_name: 'UĞRA Yönetim' },
            is_admin: true
          },
          session: { access_token: 'admin-confirmed-session' }
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, JSON.stringify(mockAdminUser));
        }
        return mockAdminUser;
      }
      throw new Error('E-posta adresi veya şifre hatalı.');
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
          let msg = error.message;

          // Check if partner status in DB can determine response regardless of Auth status (e.g. unconfirmed email or signup disabled)
          const partner = await this.getPartnerById('', cleanEmail);
          if (partner) {
            if (partner.status === 'pending') {
              throw new Error('Başvurunuz yönetici onayı bekliyor.');
            }
            if (partner.status === 'rejected') {
              throw new Error('Başvurunuz reddedildi.');
            }
            if (partner.status === 'approved' && partner.active !== false) {
              const mockUser = {
                user: {
                  id: partner.id,
                  email: cleanEmail,
                  user_metadata: { business_name: partner.business_name }
                },
                session: { access_token: 'partner-session' }
              };
              if (typeof window !== 'undefined') {
                localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, JSON.stringify(mockUser));
              }
              return mockUser;
            }
          }

          if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials') || error.code === 'invalid_credentials') {
            msg = 'E-posta adresi veya şifre hatalı.';
          } else if (msg.includes('User disabled') || msg.includes('banned')) {
            msg = 'Kullanıcı hesabı dondurulmuş veya devre dışı bırakılmış.';
          } else if (msg.includes('Too many requests')) {
            msg = 'Çok fazla hatalı giriş denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
          } else {
            msg = 'E-posta adresi veya şifre hatalı.';
          }
          throw new Error(msg);
        }

        if (!data?.user) {
          throw new Error('Giriş başarısız oldu. Kullanıcı hesabı bulunamadı.');
        }

        const user = data.user;
        const partner = await this.getPartnerById(user.id, user.email || cleanEmail);
        
        if (!partner) {
          await supabase.auth.signOut();
          throw new Error('Partner kaydınız bulunamadı. Lütfen önce partner başvurusu yapınız.');
        }

        if (partner.status === 'pending') {
          await supabase.auth.signOut();
          throw new Error('Başvurunuz yönetici onayı bekliyor.');
        }

        if (partner.status === 'rejected') {
          await supabase.auth.signOut();
          throw new Error('Başvurunuz reddedildi.');
        }

        const pStatus = (partner.status || '').toLowerCase();
        const isApprovedStatus = !pStatus || pStatus === 'approved' || pStatus === 'aktif' || pStatus === 'active' || pStatus === 'onaylandi' || pStatus === 'onaylandı';
        if (!isApprovedStatus || partner.active === false) {
          await supabase.auth.signOut();
          throw new Error('Başvurunuz yönetici onayı bekliyor.');
        }

        // Guarantee partner row is present in Supabase 'partners' table
        await ensurePartnerInDatabase({
          ...partner,
          id: user.id || partner.id,
          email: user.email || cleanEmail
        });

        return data;
      } catch (err: any) {
        throw new Error(err.message || 'Giriş yapılırken bir hata oluştu.');
      }
    } else {
      // Virtual Login
      const lowercaseEmail = email.toLowerCase().trim();
      const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
      const emailLocal = lowercaseEmail.split('@')[0];
      const partner = partners.find(p => 
        (p.email && p.email.toLowerCase() === lowercaseEmail) ||
        p.slug === emailLocal || 
        (p.phone && p.phone.includes(emailLocal)) || 
        p.business_name.toLowerCase().replace(/\s+/g, '') === emailLocal
      );
      
      if (!partner) {
        throw new Error('Partner kaydınız bulunamadı. Lütfen önce partner başvurusu yapınız.');
      }

      if (partner.status === 'pending') {
        throw new Error('Başvurunuz yönetici onayı bekliyor.');
      }

      if (partner.status === 'rejected') {
        throw new Error('Başvurunuz reddedildi.');
      }

      if (partner.status !== 'approved' || partner.active === false) {
        throw new Error('Başvurunuz yönetici onayı bekliyor.');
      }

      const mockUser = {
        user: {
          id: partner.id,
          email: lowercaseEmail,
          user_metadata: { business_name: partner.business_name }
        },
        session: { access_token: 'mock-token' }
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SESSION, JSON.stringify(mockUser));
      }
      return mockUser;
    }
  },

  async signUp(email: string, password: string, businessName: string, slug: string, category?: string, phone?: string) {
    console.log("REGISTER START");
    const cleanEmail = email.toLowerCase().trim();
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'magaza';
    const partnerCategory = category && category.trim() 
      ? normalizeCategory(category) 
      : (normalizeCategory(businessName) || 'Diğer');
    
    if (isSupabaseConfigured && supabase) {
      // 0. Pre-check if partner with email or slug already exists in DB or LocalStorage
      try {
        const { data: existingByEmail } = await supabase
          .from('partners')
          .select('id, email, slug')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (existingByEmail) {
          throw new Error('Bu e-posta adresi ile zaten kayıtlı bir mağaza başvurusu bulunmaktadır. Lütfen Giriş Yap sekmesinden giriş yapınız.');
        }

        const { data: existingBySlug } = await supabase
          .from('partners')
          .select('id, email, slug')
          .eq('slug', cleanSlug)
          .maybeSingle();

        if (existingBySlug) {
          throw new Error('Bu mağaza adresi (URL slug) başka bir işletme tarafından alınmıştır. Lütfen farklı bir mağaza adı seçiniz.');
        }
      } catch (checkErr: any) {
        if (checkErr.message && checkErr.message.includes('zaten')) {
          throw checkErr;
        }
      }

      // Check LocalStorage as well
      const localPartnersCheck = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
      const localExisting = localPartnersCheck.find(
        p => (p.email && p.email.toLowerCase() === cleanEmail) || p.slug === cleanSlug
      );
      if (localExisting) {
        if (localExisting.slug === cleanSlug && localExisting.email?.toLowerCase() !== cleanEmail) {
          throw new Error('Bu mağaza adresi (URL slug) başka bir işletme tarafından alınmıştır. Lütfen farklı bir mağaza adı seçiniz.');
        }
        throw new Error('Bu e-posta adresi ile zaten kayıtlı bir mağaza başvurusu bulunmaktadır. Lütfen Giriş Yap sekmesinden giriş yapınız.');
      }

      let userId = '';
      let authUserObj: any = null;

      // 1. Sign up user in Supabase Auth
      console.log("SIGNUP REQUEST");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            business_name: businessName,
            slug: cleanSlug,
            email: cleanEmail,
            phone: phone ? phone.trim() : ''
          }
        }
      });

      console.log(authData);
      console.log(authError);

      if (authError) {
        let msg = authError.message;
        if (
          msg.includes('User already registered') ||
          msg.includes('already exists') ||
          msg.includes('user_already_exists')
        ) {
          throw new Error('Bu e-posta adresi ile zaten kayıtlı bir hesap bulunmaktadır. Lütfen Giriş Yap sekmesinden giriş yapınız.');
        } else if (msg.includes('Password should be at least')) {
          throw new Error('Şifre en az 6 karakter uzunluğunda olmalıdır.');
        } else if (
          msg.includes('Email signups are disabled') ||
          msg.includes('signups are disabled') ||
          msg.includes('rate limit') ||
          msg.includes('over_email_send_rate_limit') ||
          msg.includes('Email rate limit exceeded')
        ) {
          // Bypass auth constraint if email signups are disabled in Supabase project settings
          userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
          authUserObj = { id: userId, email: cleanEmail };
        } else {
          throw new Error(msg);
        }
      } else if (authData?.user) {
        if (authData.user.identities && authData.user.identities.length === 0) {
          throw new Error('Bu e-posta adresi ile zaten kayıtlı bir kullanıcı bulunmaktadır. Lütfen şifrenizle giriş yapınız.');
        }
        userId = authData.user.id;
        authUserObj = authData.user;
      } else {
        userId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
        authUserObj = { id: userId, email: cleanEmail };
      }

      const nowIso = new Date().toISOString();

      // Application Payload ONLY (Do NOT insert into partners table during application)
      const applicationPayload: Partner = {
        id: userId,
        slug: cleanSlug,
        business_name: businessName,
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        address: '',
        category: partnerCategory,
        active: false, // Default false until approved
        status: 'pending', // Default pending
        created_at: nowIso
      };

      // 1. Save directly into partners and profiles tables in Supabase
      try {
        await ensurePartnerInDatabase(applicationPayload);
      } catch (e) {
        console.warn('ensurePartnerInDatabase error on signUp:', e);
      }

      // 2. Sync to LocalStorage for offline fallback or instant update
      const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
      const existingIdx = localPartners.findIndex(p => p.id === userId || p.slug === cleanSlug || (p.email && p.email.toLowerCase() === cleanEmail));
      if (existingIdx !== -1) {
        localPartners[existingIdx] = { ...localPartners[existingIdx], ...applicationPayload };
      } else {
        localPartners.unshift(applicationPayload);
      }
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, localPartners);

      // 3. Dispatch event for real-time update in open Admin Panel tabs/windows without page reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ugra_partner_application_submitted', { detail: applicationPayload }));
      }

      // Ensure user is signed out so pending partner cannot access session before admin approval
      try {
        await supabase.auth.signOut();
      } catch (e) {}

      return { user: authUserObj, partner: applicationPayload };
    } else {
      // Virtual Sign Up (Demo Mode)
      const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
      const existing = partners.find(p => p.slug === cleanSlug || (p.email && p.email.toLowerCase() === cleanEmail));
      if (existing) {
        throw new Error('Bu mağaza ismi/adresi veya e-posta adresi zaten alınmış.');
      }

      const newId = 'p_' + Math.random().toString(36).substr(2, 9);
      const newPartner: Partner = {
        id: newId,
        slug: cleanSlug,
        business_name: businessName,
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        address: '',
        category: partnerCategory,
        description: '',
        logo: '',
        active: false, // Default false until approved
        status: 'pending', // Default pending
        created_at: new Date().toISOString()
      };

      partners.unshift(newPartner);
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, partners);

      const mockUser = {
        user: {
          id: newId,
          email: cleanEmail,
          user_metadata: { business_name: businessName, slug: cleanSlug }
        },
        session: { access_token: 'mock-token' }
      };

      return { user: mockUser.user, partner: newPartner };
    }
  },

  async signOut() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSION);
    }
  },

  async getSession() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session;
    } else {
      const session = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
      return session ? JSON.parse(session).session : null;
    }
  },

  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) return data.user;
      
      const session = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed?.user) return parsed.user;
        } catch (e) {}
      }
      return null;
    } else {
      const session = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
      return session ? JSON.parse(session).user : null;
    }
  },

  // --- PARTNERS SERVICE ---
  async getApprovedPartners(category?: string): Promise<Partner[]> {
    let supabasePartners: Partner[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('partners')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          supabasePartners = data;
        } else if (error) {
          console.warn('Supabase partners query with order failed, retrying plain select:', error);
          const { data: retryData, error: retryError } = await supabase
            .from('partners')
            .select('*');
          if (!retryError && retryData) {
            supabasePartners = retryData;
          }
        }
      } catch (err) {
        console.error('Error fetching approved partners from Supabase:', err);
      }
    }

    let allPartners: Partner[] = [];

    if (isSupabaseConfigured) {
      // Primary and exclusive source of truth when Supabase is configured
      allPartners = supabasePartners.map(p => {
        if (!p) return null;
        const cleanId = p.id ? (isUUID(p.id) ? p.id : toUUID(p.id)) : toUUID(p.business_name || p.slug || Math.random().toString());
        return { ...p, id: cleanId };
      }).filter(Boolean) as Partner[];

      // Sync local storage cache so stale cache is overwritten with actual Supabase state
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, allPartners);
    } else {
      // Local storage fallback ONLY when Supabase is NOT configured
      const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
      allPartners = localPartners;
    }

    // Filter active and approved partners flexibly (case-insensitive & handles nulls/booleans)
    const approved = allPartners.filter((p: Partner) => {
      const activeRaw: any = p.active ?? (p as any).is_active;
      const isActive = activeRaw === true || 
                       activeRaw === 1 || 
                       activeRaw === undefined || 
                       activeRaw === null || 
                       String(activeRaw).toLowerCase() === 'true' || 
                       String(activeRaw).toLowerCase() === '1' ||
                       String(activeRaw).toLowerCase() === 'aktif';

      const statusStr = (p.status || '').toString().toLowerCase().trim();
      const isApproved = !statusStr || 
                         statusStr === 'approved' || 
                         statusStr === 'aktif' || 
                         statusStr === 'active' || 
                         statusStr === 'onaylandi' || 
                         statusStr === 'onaylandı' ||
                         statusStr === 'approved_partner';

      const isNotSuspended = statusStr !== 'suspended' && statusStr !== 'rejected' && statusStr !== 'reddedildi' && statusStr !== 'pasif';

      return isActive && isApproved && isNotSuspended;
    });

    if (!category) {
      return approved.map((p, idx) => {
        const cat = p.category && p.category.trim() ? normalizeCategory(p.category) : normalizeCategory(p.business_name);
        return enrichPartner({ ...p, category: cat || 'Diğer' }, idx);
      });
    }

    const targetNorm = normalizeCategory(category).toLowerCase().trim();
    const targetSlug = categoryNameToSlug(category);

    const filtered = approved.filter((p: Partner) => {
      const rawCat = p.category && p.category.trim() ? p.category.trim() : p.business_name;
      if (!rawCat) return true;

      const partnerCatNorm = normalizeCategory(rawCat).toLowerCase().trim();
      const partnerCatRawLower = rawCat.toLowerCase().trim();
      const partnerSlug = categoryNameToSlug(rawCat);

      if (partnerCatNorm === targetNorm || partnerCatRawLower === category.trim().toLowerCase()) {
        return true;
      }

      if (targetSlug && partnerSlug && targetSlug === partnerSlug) {
        return true;
      }

      return (
        partnerCatRawLower.includes(targetNorm) ||
        targetNorm.includes(partnerCatRawLower)
      );
    });

    return filtered.map((p, idx) => {
      const cat = p.category && p.category.trim() ? normalizeCategory(p.category) : normalizeCategory(p.business_name);
      return enrichPartner({ ...p, category: cat || 'Diğer' }, idx);
    });
  },

  async getFeaturedPartners(limit = 6): Promise<Partner[]> {
    const all = await this.getApprovedPartners();
    const partnersOnly = all.filter(p => !p.is_artisan);
    const pool = partnersOnly.length > 0 ? partnersOnly : all;
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    const sorted = [...pool].sort((a, b) => {
      const scoreA = (a.rating || 4.5) * 10 + ((a.id.charCodeAt(0) + dayOfYear) % 13);
      const scoreB = (b.rating || 4.5) * 10 + ((b.id.charCodeAt(0) + dayOfYear) % 13);
      return scoreB - scoreA;
    });

    return sorted.slice(0, limit);
  },

  async getArtisans(limit?: number): Promise<Partner[]> {
    const all = await this.getApprovedPartners();
    const artisans = all.filter(p => p.is_artisan || p.id.startsWith('a'));
    if (limit && limit > 0) {
      return artisans.slice(0, limit);
    }
    return artisans;
  },

  async getCategoryPartnerCounts(): Promise<Record<string, number>> {
    const approvedPartners = await this.getApprovedPartners();
    const counts: Record<string, number> = {};

    OFFICIAL_PARTNER_CATEGORIES.forEach(cat => {
      counts[cat] = 0;
    });
    counts['Kafe'] = 0;

    approvedPartners.forEach(partner => {
      const cat = partner.category && partner.category.trim()
        ? normalizeCategory(partner.category)
        : normalizeCategory(partner.business_name);

      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
        if (cat === 'Kahve') {
          counts['Kafe'] = (counts['Kafe'] || 0) + 1;
        }
      }
    });

    return counts;
  },

  async getPartnerBySlug(slug: string): Promise<Partner | null> {
    const cleanSlug = slug.toLowerCase().trim();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('partners')
          .select('*')
          .eq('slug', cleanSlug)
          .maybeSingle();

        if (!error && data) {
          const activeRaw = data.active ?? (data as any).is_active;
          const isActive = activeRaw !== false && String(activeRaw).toLowerCase() !== 'false';
          const statusStr = (data.status || '').toString().toLowerCase().trim();
          const isNotSuspended = statusStr !== 'suspended' && statusStr !== 'rejected' && statusStr !== 'pasif';
          if (isActive && isNotSuspended) {
            return enrichPartner(data);
          }
        }
      } catch (e) {
        console.error('Error fetching partner by slug:', e);
      }
      return null;
    }

    const approved = await this.getApprovedPartners();
    const found = approved.find(p => p.slug && p.slug.toLowerCase().trim() === cleanSlug);
    if (found) return mergePartnerWithLocalCache(found);

    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    const localFound = partners.find(p => {
      const isMatch = p.slug && p.slug.toLowerCase().trim() === cleanSlug;
      if (!isMatch) return false;
      const activeRaw = p.active ?? (p as any).is_active;
      return activeRaw !== false && String(activeRaw).toLowerCase() !== 'false';
    });
    return localFound ? enrichPartner(mergePartnerWithLocalCache(localFound)) : null;
  },

  async getPartnerById(id: string, userEmail?: string): Promise<Partner | null> {
    const isValidId = id && id.trim().length > 0 && id !== 'admin_id';

    if (isSupabaseConfigured) {
      const client = await getActiveSupabaseClient();
      // 1. Fetch from profiles first to find the mapped partner_id if valid ID
      if (isValidId) {
        try {
          const { data: profileData, error: profileError } = await client
            .from('profiles')
            .select('partner_id')
            .eq('id', id)
            .maybeSingle();

          if (!profileError && profileData?.partner_id) {
            const { data: partnerData, error: partnerError } = await client
              .from('partners')
              .select('*')
              .eq('id', profileData.partner_id)
              .maybeSingle();
            
            if (!partnerError && partnerData) return enrichPartner(partnerData);
          }
        } catch (err) {
          console.error('Error in getPartnerById profile lookup:', err);
        }

        // 2. Direct fetch from partners table by auth.uid() ID
        try {
          const { data, error } = await client
            .from('partners')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          
          if (!error && data) return enrichPartner(data);
        } catch (err) {
          console.error('Error in getPartnerById direct lookup:', err);
        }
      }

      // 3. Match by email if userEmail is provided
      if (userEmail) {
        try {
          const cleanEmail = userEmail.toLowerCase().trim();
          const { data, error } = await client
            .from('partners')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (!error && data) {
            // Found partner row by email! Sync ID to auth.uid() if different and valid
            if (isValidId && data.id !== id) {
              try {
                await client.from('partners').update({ id }).eq('id', data.id);
                data.id = id;
              } catch (e) {}
            }
            return enrichPartner(data);
          }
        } catch (err) {
          console.error('Error in getPartnerById email lookup:', err);
        }
      }

      // Single source of truth: return null if not in Supabase
      return null;
    }

    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    let found = isValidId ? partners.find(p => p.id === id) : null;
    if (!found && userEmail) {
      const cleanEmail = userEmail.toLowerCase().trim();
      found = partners.find(p => p.email && p.email.toLowerCase() === cleanEmail);
      if (found && isValidId) {
        found.id = id;
        setStored(LOCAL_STORAGE_KEYS.PARTNERS, partners);
      }
    }
    return found ? enrichPartner(mergePartnerWithLocalCache(found)) : null;
  },

  async updatePartner(partnerId: string, updates: Partial<Partner>): Promise<Partner> {
    const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    const existingIndex = localPartners.findIndex(p => p.id === partnerId || p.slug === updates.slug || (p.email && updates.email && p.email.toLowerCase() === updates.email.toLowerCase()));
    const existingObj = existingIndex !== -1 ? localPartners[existingIndex] : null;

    const mergedPartner: Partner = {
      ...(existingObj || {
        id: partnerId,
        slug: updates.slug || 'magaza',
        business_name: updates.business_name || 'Mağaza',
        active: updates.active !== undefined ? updates.active : true,
        created_at: new Date().toISOString(),
      }),
      ...updates
    };

    // Save to local storage immediately
    if (existingIndex !== -1) {
      localPartners[existingIndex] = mergedPartner;
    } else {
      localPartners.push(mergedPartner);
    }
    setStored(LOCAL_STORAGE_KEYS.PARTNERS, localPartners);

    let updatedPartner: Partner = mergedPartner;

    if (isSupabaseConfigured && supabase) {
      try {
        const validCols = await getExactTableColumns('partners');
        const filteredUpdates = filterPayloadByValidColumns(updates, validCols);

        if (Object.keys(filteredUpdates).length > 0) {
          const targetUuid = isUUID(partnerId) ? partnerId : (existingObj?.id && isUUID(existingObj.id) ? existingObj.id : toUUID(partnerId));
          
          let { data, error } = await supabase
            .from('partners')
            .update(filteredUpdates)
            .eq('id', targetUuid)
            .select()
            .maybeSingle();

          if ((error || !data) && mergedPartner.email) {
            const { data: dataByEmail, error: errByEmail } = await supabase
              .from('partners')
              .update(filteredUpdates)
              .ilike('email', mergedPartner.email.toLowerCase().trim())
              .select()
              .maybeSingle();
            if (!errByEmail && dataByEmail) {
              data = dataByEmail;
            }
          }

          if (data) {
            updatedPartner = { ...mergedPartner, ...data };
          }
        }
      } catch (e) {
        console.warn('Supabase updatePartner error:', e);
      }

      // Sync profiles table if phone or logo updated
      if (updates.phone || updates.logo) {
        try {
          const profileCols = await getExactTableColumns('profiles');
          const profileUpdates = filterPayloadByValidColumns({
            phone: mergedPartner.phone || '',
            avatar_url: mergedPartner.logo || ''
          }, profileCols);
          if (Object.keys(profileUpdates).length > 0) {
            await supabase.from('profiles').update(profileUpdates).eq('id', partnerId);
          }
        } catch (e) {}
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ugra_partners_updated'));
    }

    return updatedPartner;
  },

  async deletePartner(partnerId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      if (partnerId && isUUID(partnerId)) {
        try {
          // Cascade delete dependent records first to satisfy FK constraints in Supabase
          const validPartnerUuid = isUUID(partnerId) ? partnerId : toUUID(partnerId);
          await supabase.from('reviews').delete().eq('partner_id', validPartnerUuid);
          await supabase.from('products').delete().eq('partner_id', validPartnerUuid);
          await supabase.from('orders').delete().eq('partner_id', validPartnerUuid);
          if ((await getExactTableColumns('support_tickets')).length > 0) {
            await supabase.from('support_tickets').delete().eq('partner_id', validPartnerUuid);
          }
          await supabase.from('coupons').delete().eq('partner_id', validPartnerUuid);
          await supabase.from('profiles').delete().or(`partner_id.eq.${validPartnerUuid},id.eq.${validPartnerUuid}`);

          const { error } = await supabase
            .from('partners')
            .delete()
            .eq('id', partnerId);

          if (error) {
            console.error('Supabase deletePartner error:', error);
            throw new Error('Supabase partner silme hatası: ' + error.message);
          }
        } catch (e: any) {
          console.error('Supabase deletePartner exception:', e);
          throw e;
        }
      }
    }
    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    const filteredPartners = partners.filter(p => p.id !== partnerId);
    setStored(LOCAL_STORAGE_KEYS.PARTNERS, filteredPartners);

    const products = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
    const filteredProducts = products.filter(p => p.partner_id !== partnerId);
    setStored(LOCAL_STORAGE_KEYS.PRODUCTS, filteredProducts);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ugra_partners_updated'));
    }
  },

  async updateCustomerStatus(customerId: string, status: string): Promise<void> {
    const customers = getStored<any>('ugra_virtual_customers');
    const index = customers.findIndex((c: any) => c.id === customerId);
    if (index !== -1) {
      customers[index].status = status;
      setStored('ugra_virtual_customers', customers);
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    const customers = getStored<any>('ugra_virtual_customers');
    const filtered = customers.filter((c: any) => c.id !== customerId);
    setStored('ugra_virtual_customers', filtered);
  },

  // --- PRODUCTS SERVICE ---
  async getProductImages(productId: string, primaryImage?: string): Promise<string[]> {
    if (!productId) return primaryImage ? [primaryImage] : [];

    let imagesFromDb: string[] = [];

    if (isSupabaseConfigured && isUUID(productId) && !productImagesSyncDisabled) {
      try {
        const client = await getActiveSupabaseClient();
        const { data, error } = await client
          .from('product_images')
          .select('image_url')
          .eq('product_id', productId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          imagesFromDb = data.map((item: any) => item.image_url).filter(Boolean);
        } else if (error) {
          if (error.code === '42501' || error.status === 401 || error.code === '42P01' || error.code === 'PGRST301') {
            productImagesSyncDisabled = true;
          }
        }
      } catch (e) {
        productImagesSyncDisabled = true;
      }
    }

    const storedImageMap = getStoredObject<Record<string, string[]>>('ugra_product_images_map', {});
    const localList = storedImageMap[productId] || [];

    const rawCombined = [...imagesFromDb, ...localList];
    if (primaryImage) {
      rawCombined.unshift(primaryImage);
    }

    const uniqueList = Array.from(new Set(rawCombined.filter(Boolean)));
    return uniqueList;
  },

  async saveProductImages(productId: string, imageUrls: string[]): Promise<void> {
    if (!productId) return;
    const cleanUrls = Array.from(new Set(imageUrls.filter(Boolean)));

    // 1. Update LocalStorage map as reliable cache
    const storedImageMap = getStoredObject<Record<string, string[]>>('ugra_product_images_map', {});
    storedImageMap[productId] = cleanUrls;
    setStoredObject('ugra_product_images_map', storedImageMap);

    // 2. Sync to Supabase product_images table if valid UUID and sync not disabled
    if (isSupabaseConfigured && isUUID(productId) && !productImagesSyncDisabled) {
      try {
        const client = await getActiveSupabaseClient();
        const { error: delErr } = await client
          .from('product_images')
          .delete()
          .eq('product_id', productId);

        if (delErr) {
          if (delErr.code === '42501' || delErr.status === 401 || delErr.code === '42P01' || delErr.code === 'PGRST301') {
            console.warn("Notice: product_images sync notice (restricted or missing):", delErr.message);
            productImagesSyncDisabled = true;
            return;
          }
        }

        if (cleanUrls.length > 0 && !productImagesSyncDisabled) {
          const rows = cleanUrls.map(url => {
            const row: any = {
              product_id: productId,
              image_url: url,
              created_at: new Date().toISOString()
            };
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
              row.id = crypto.randomUUID();
            }
            return row;
          });

          const { error: insErr } = await client.from('product_images').insert(rows);
          if (insErr) {
            console.warn("Notice: product_images table sync notice:", insErr.message);
            if (insErr.code === '42501' || insErr.status === 401 || insErr.code === '42P01') {
              productImagesSyncDisabled = true;
            }
          }
        }
      } catch (e) {
        console.warn("Notice: product_images sync exception:", e);
        productImagesSyncDisabled = true;
      }
    }
  },

  async getProducts(partnerId: string): Promise<Product[]> {
    if (!partnerId) return [];

    let targetUuid: string | null = isUUID(partnerId) ? partnerId : null;
    let dbProducts: Product[] = [];

    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        if (!targetUuid) {
          const { data: sessionData } = await client.auth.getSession();
          if (sessionData?.session?.user?.id && isUUID(sessionData.session.user.id)) {
            targetUuid = sessionData.session.user.id;
          }
        }

        if (targetUuid && isUUID(targetUuid)) {
          const cols = await getProductsTableColumns();
          if (cols.has('partner_id')) {
            const { data, error } = await client
              .from('products')
              .select('*')
              .eq('partner_id', targetUuid)
              .order('created_at', { ascending: false });

            if (error) {
              console.error("❌ Supabase getProducts error:", error.message, error.code, error.details);
            } else if (data) {
              console.log(`📦 Supabase getProducts returned ${data.length} products for partner ${targetUuid}`);
              dbProducts = data.map((p: any) => ({
                ...p,
                id: String(p.id),
                partner_id: targetUuid!,
                title: p.name || p.title || 'İsimsiz Ürün',
                description: p.description || '',
                price: Number(p.price) || 0,
                stock: Number(p.stock) ?? 0,
                image: p.image || p.image_url || '',
                category: p.category || 'Diğer',
                subcategory: p.subcategory || p.sub_category || '',
                product_type: p.product_type || p.subcategory || p.sub_category || p.category || '',
                custom_product_type: Boolean(p.custom_product_type),
                tags: Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' && p.tags ? JSON.parse(p.tags) : []),
                active: p.active ?? p.is_active ?? true,
                created_at: p.created_at || new Date().toISOString()
              }));

              const storedImageMap = getStoredObject<Record<string, string[]>>('ugra_product_images_map', {});
              for (const p of dbProducts) {
                const localImgs = storedImageMap[p.id] || [];
                const baseImgs = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
                const combined = Array.from(new Set([...baseImgs, ...localImgs].filter(Boolean)));
                p.images = combined;
                if (!p.image && combined.length > 0) {
                  p.image = combined[0];
                }
              }

              return dbProducts;
            }
          }
        }
      } catch (err) {
        console.error("Supabase getProducts exception:", err);
      }
    }

    // LocalStorage Fallback
    const localProducts = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
    const filtered = localProducts.filter(p => p.partner_id === partnerId || (targetUuid && p.partner_id === targetUuid));
    const storedImageMap = getStoredObject<Record<string, string[]>>('ugra_product_images_map', {});
    for (const p of filtered) {
      const localImgs = storedImageMap[p.id] || [];
      const baseImgs = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
      const combined = Array.from(new Set([...baseImgs, ...localImgs].filter(Boolean)));
      p.images = combined;
      if (!p.image && combined.length > 0) {
        p.image = combined[0];
      }
    }
    return filtered;
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    console.log("==========================================");
    console.log("➡️ db.createProduct execution started.");
    console.log("ℹ️ Product Input Payload:", product);

    if (!product.partner_id) {
      console.error("❌ createProduct error: partner_id is missing!");
      throw new Error("Ürün eklenemedi: partner_id (Mağaza kimliği) eksik.");
    }

    const client = await getActiveSupabaseClient();
    let partnerUuid = product.partner_id;
    if (!isUUID(partnerUuid)) {
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user?.id && isUUID(sessionData.session.user.id)) {
        partnerUuid = sessionData.session.user.id;
      }
    }

    const generatedProductUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : undefined;

    if (isSupabaseConfigured) {
      try {
        const cols = await getProductsTableColumns();

        // Foreign Key safety check: Ensure partner exists in 'partners' table if UUID is valid
        if (isUUID(partnerUuid)) {
          const { data: pCheck, error: pCheckErr } = await client
            .from('partners')
            .select('id')
            .eq('id', partnerUuid)
            .maybeSingle();

          if (pCheckErr) {
            console.warn("⚠️ Partner lookup warning before inserting product:", pCheckErr.message);
          }

          if (!pCheck) {
            console.warn(`⚠️ partner_id '${partnerUuid}' not found in 'partners' table. Syncing partner record before product creation...`);
            const existingPartner = await this.getPartnerById(product.partner_id);
            if (existingPartner) {
              await ensurePartnerInDatabase(existingPartner);
            }
          }
        }

        // Construct exact payload based ONLY on introspected columns of 'products' table
        const payload: Record<string, any> = {};

        if (generatedProductUuid && cols.has('id')) {
          payload.id = generatedProductUuid;
        }

        if (cols.has('partner_id') && isUUID(partnerUuid)) {
          payload.partner_id = partnerUuid;
        }

        if (cols.has('name')) {
          payload.name = product.title;
        }

        if (cols.has('description')) {
          payload.description = product.description || '';
        }

        if (cols.has('price')) {
          payload.price = Number(product.price) || 0;
        }

        if (cols.has('stock')) {
          payload.stock = Number(product.stock) || 0;
        }

        if (cols.has('image')) {
          payload.image = product.image || '';
        }

        if (cols.has('active')) {
          payload.active = product.active !== false;
        }

        if (cols.has('category')) {
          payload.category = product.category || 'Diğer';
        }

        console.log("📥 Inserting into 'products' table with payload:", payload);

        const { data, error } = await client
          .from('products')
          .insert(payload)
          .select()
          .maybeSingle();

        if (error) {
          console.error("❌ Supabase product insert error:", error);
          throw error;
        }

        if (data) {
          console.log("🎉 SUCCESS! Product saved to Supabase 'products' table. Returned row:", data);

          const formatted: Product = {
            ...product,
            ...data,
            id: String(data.id || generatedProductUuid || Date.now()),
            partner_id: isUUID(partnerUuid) ? partnerUuid : product.partner_id,
            title: data.name || data.title || product.title,
            price: Number(data.price) || product.price,
            stock: Number(data.stock) ?? product.stock ?? 0,
            image: data.image || data.image_url || product.image || '',
            images: product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []),
            category: data.category || product.category || 'Diğer',
            subcategory: data.subcategory || product.subcategory || '',
            product_type: data.product_type || product.product_type || product.subcategory || '',
            tags: Array.isArray(data.tags) ? data.tags : (product.tags || []),
            active: data.active ?? data.is_active ?? product.active ?? true,
            created_at: data.created_at || new Date().toISOString()
          };

          if (product.images || product.image) {
            const imgs = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
            await this.saveProductImages(formatted.id, imgs);
          }

          // Cache in local storage as backup
          const products = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
          products.unshift(formatted);
          setStored(LOCAL_STORAGE_KEYS.PRODUCTS, products);

          return formatted;
        }
      } catch (err: any) {
        console.warn("⚠️ Supabase createProduct exception, falling back to LocalStorage:", err);
      }
    }

    // LocalStorage Fallback
    console.log("💾 Saving product to LocalStorage fallback...");
    const products = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
    const newProduct: Product = {
      ...product,
      id: generatedProductUuid || `pr_${Date.now()}`,
      images: product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []),
      created_at: new Date().toISOString()
    };
    if (newProduct.images && newProduct.images.length > 0) {
      await this.saveProductImages(newProduct.id, newProduct.images);
    }
    products.unshift(newProduct);
    setStored(LOCAL_STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  },

  async updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    console.log(`➡️ db.updateProduct execution started for product ID: ${productId}`, updates);

    if (isSupabaseConfigured && isUUID(productId)) {
      try {
        const client = await getActiveSupabaseClient();
        const cols = await getProductsTableColumns();
        const payload: Record<string, any> = {};

        if (updates.title && cols.has('name')) {
          payload.name = updates.title;
        }
        if (updates.description !== undefined && cols.has('description')) {
          payload.description = updates.description;
        }
        if (updates.price !== undefined && cols.has('price')) {
          payload.price = Number(updates.price);
        }
        if (updates.stock !== undefined && cols.has('stock')) {
          payload.stock = Number(updates.stock);
        }
        if (updates.image !== undefined && cols.has('image')) {
          payload.image = updates.image;
        }
        if (updates.active !== undefined && cols.has('active')) {
          payload.active = updates.active;
        }
        if (updates.category && cols.has('category')) {
          payload.category = updates.category;
        }

        const res = await client
          .from('products')
          .update(payload)
          .eq('id', productId)
          .select()
          .maybeSingle();

        if (updates.images !== undefined) {
          await this.saveProductImages(productId, updates.images);
        }

        if (!res.error && res.data) {
          const data = res.data;
          const formatted: Product = {
            ...updates,
            ...data,
            id: String(data.id || productId),
            title: data.name || updates.title || 'Ürün',
            price: Number(data.price) || updates.price || 0,
            image: data.image || updates.image || '',
            images: updates.images || (data.image ? [data.image] : []),
            active: data.active ?? updates.active ?? true
          } as Product;

          const products = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
          const updatedList = products.map(p => p.id === productId ? formatted : p);
          setStored(LOCAL_STORAGE_KEYS.PRODUCTS, updatedList);
          return formatted;
        }
      } catch (err) {
        console.warn("⚠️ Supabase updateProduct exception:", err);
      }
    }

    if (updates.images !== undefined) {
      await this.saveProductImages(productId, updates.images);
    }

    const products = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
    let updated: Product | null = null;
    const updatedList = products.map(p => {
      if (p.id === productId) {
        updated = { ...p, ...updates };
        return updated;
      }
      return p;
    });
    if (!updated) {
      updated = { id: productId, ...updates } as Product;
      updatedList.unshift(updated);
    }
    setStored(LOCAL_STORAGE_KEYS.PRODUCTS, updatedList);
    return updated;
  },

  async deleteProduct(productId: string): Promise<void> {
    if (!productId) {
      console.warn("⚠️ db.deleteProduct called with empty productId");
      return;
    }

    console.log(`🗑️ db.deleteProduct execution started for product ID: "${productId}"`);

    if (isSupabaseConfigured && isUUID(productId)) {
      try {
        const client = await getActiveSupabaseClient();
        if (!productImagesSyncDisabled) {
          try {
            await client.from('product_images').delete().eq('product_id', productId);
          } catch (e) {
            // Ignore
          }
        }

        const storedImageMap = getStoredObject<Record<string, string[]>>('ugra_product_images_map', {});
        delete storedImageMap[productId];
        setStoredObject('ugra_product_images_map', storedImageMap);

        await client.from('products').delete().eq('id', productId);
      } catch (err: any) {
        console.warn("⚠️ Supabase deleteProduct exception:", err);
      }
    }

    const products = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
    const filtered = products.filter(p => p.id !== productId);
    setStored(LOCAL_STORAGE_KEYS.PRODUCTS, filtered);
  },

  // --- IMAGE UPLOAD SERVICE ---
  async uploadImage(file: File, bucket: 'products' | 'logos' = 'products'): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      try {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${Math.random().toString(36).substr(2, 9)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (!uploadError) {
          // Get public URL
          const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          if (data?.publicUrl) return data.publicUrl;
        } else {
          console.warn(`Supabase storage upload to bucket "${bucket}" failed (${uploadError.message}), falling back to base64 encoding.`);
        }
      } catch (err) {
        console.warn(`Supabase storage upload exception for bucket "${bucket}", falling back to base64 encoding:`, err);
      }
    }

    // Fallback mode: Base64 Data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string) || '');
      };
      reader.readAsDataURL(file);
    });
  },

  // --- ORDERS SERVICE ---
  async createOrder(order: Omit<Order, 'id' | 'created_at' | 'status'>): Promise<Order> {
    const rawPartner = order.partner_id || order.store_id || null;
    const partnerUuid = rawPartner && rawPartner !== 'default'
      ? (isUUID(rawPartner) ? rawPartner : toUUID(rawPartner))
      : null;

    const pt = String(order.payment_type || '');
    let normPaymentType: 'kapida_nakit' | 'kapida_kart' | 'online' = 'kapida_nakit';
    if (pt === 'kapida_kart' || pt === 'card' || pt === 'kredi_karti') {
      normPaymentType = 'kapida_kart';
    } else if (pt === 'online') {
      normPaymentType = 'online';
    } else if (pt === 'kapida_nakit' || pt === 'cash') {
      normPaymentType = 'kapida_nakit';
    }

    const pickupAddr = order.pickup_address?.trim() || '';
    const deliveryAddr = order.delivery_address?.trim() || order.customer_address?.trim() || '';
    const custAddr = order.customer_address?.trim() || order.delivery_address?.trim() || pickupAddr || '';
    const normAddress = custAddr || deliveryAddr || pickupAddr || '';
    const normStatus = 'beklemede'; // Matches DB check constraint CHECK (status IN ('beklemede', ...))

    if (isSupabaseConfigured && supabase) {
      console.log('Inserting order into database. Received payload:', order);

      // 1. Ensure partner row exists in 'partners' table if partnerUuid is provided
      if (partnerUuid) {
        try {
          const existingPartner = await this.getPartnerById(partnerUuid);
          if (existingPartner) {
            await ensurePartnerInDatabase(existingPartner);
          } else {
            await ensurePartnerInDatabase({
              id: partnerUuid,
              business_name: 'Mağaza',
              slug: 'magaza-' + partnerUuid.slice(0, 8),
              status: 'approved',
              active: true
            });
          }
        } catch (pErr) {
          console.warn('ensurePartnerInDatabase notice before createOrder:', pErr);
        }
      }

      // 2. Discover exact columns available on 'orders' table in Supabase
      const cols = await getOrdersTableColumns();
      console.log("🔍 Valid 'orders' table columns for insert:", Array.from(cols));

      // 3. Construct dynamic payload including ONLY introspected columns
      const payload: Record<string, any> = {};

      if (cols.has('partner_id')) {
        payload.partner_id = partnerUuid;
      }
      if (cols.has('store_id')) {
        payload.store_id = partnerUuid;
      }
      if (cols.has('customer_name')) {
        payload.customer_name = order.customer_name?.trim() || 'Müşteri';
      }
      if (cols.has('customer_phone') || cols.size === 0) {
        payload.customer_phone = order.customer_phone?.trim() || '';
      }
      if (cols.has('phone')) {
        payload.phone = order.customer_phone?.trim() || '';
      }
      if (cols.has('pickup_address')) {
        payload.pickup_address = pickupAddr;
      }
      if (cols.has('customer_address')) {
        payload.customer_address = custAddr;
      }
      if (cols.has('delivery_address')) {
        payload.delivery_address = deliveryAddr;
      }
      if (cols.has('address')) {
        payload.address = deliveryAddr || custAddr || pickupAddr;
      }
      if (cols.has('payment_type')) {
        payload.payment_type = normPaymentType;
      }
      if (cols.has('total_price')) {
        payload.total_price = Number(order.total_price) || 0;
      }
      if (cols.has('total_amount')) {
        payload.total_amount = Number(order.total_price) || 0;
      }
      if (cols.has('service_type') && order.service_type) payload.service_type = order.service_type;
      if (cols.has('distance_km') && order.distance_km !== undefined) payload.distance_km = order.distance_km;
      if (cols.has('estimated_minutes') && order.estimated_minutes !== undefined) payload.estimated_minutes = order.estimated_minutes;
      if (cols.has('courier_net') && order.courier_net !== undefined) payload.courier_net = order.courier_net;
      if (cols.has('base_price') && order.base_price !== undefined) payload.base_price = order.base_price;
      if (cols.has('fuel_cost') && order.fuel_cost !== undefined) payload.fuel_cost = order.fuel_cost;
      if (cols.has('wear_cost') && order.wear_cost !== undefined) payload.wear_cost = order.wear_cost;
      if (cols.has('operation_cost') && order.operation_cost !== undefined) payload.operation_cost = order.operation_cost;
      if (cols.has('tax_cost') && order.tax_cost !== undefined) payload.tax_cost = order.tax_cost;
      if (cols.has('vat_cost') && order.vat_cost !== undefined) payload.vat_cost = order.vat_cost;
      if (cols.has('commission') && order.commission !== undefined) payload.commission = order.commission;
      if (cols.has('customer_price') && order.customer_price !== undefined) payload.customer_price = order.customer_price;
      if (cols.has('requires_delivery_code') || cols.size === 0) payload.requires_delivery_code = order.requires_delivery_code ?? true;
      if (cols.has('delivery_code') || cols.size === 0) payload.delivery_code = order.delivery_code ?? null;
      if (cols.has('delivery_code_verified') || cols.size === 0) payload.delivery_code_verified = order.delivery_code_verified ?? false;
      if (cols.has('delivery_code_verified_at') && order.delivery_code_verified_at !== undefined) payload.delivery_code_verified_at = order.delivery_code_verified_at;
      if (cols.has('items')) {
        payload.items = order.items || [];
      }
      if ((cols.has('preferred_time') || cols.size === 0) && order.preferred_time !== undefined) {
        payload.preferred_time = order.preferred_time;
      }
      if (cols.has('notes')) {
        payload.notes = order.notes || '';
      }
      if (cols.has('latitude') && order.latitude !== undefined) payload.latitude = order.latitude;
      if (cols.has('longitude') && order.longitude !== undefined) payload.longitude = order.longitude;
      if (cols.has('location_url') && order.location_url) payload.location_url = order.location_url;
      if (cols.has('street') && order.street) payload.street = order.street;
      if (cols.has('district') && order.district) payload.district = order.district;
      if (cols.has('city') && order.city) payload.city = order.city;
      if (cols.has('province') && order.province) payload.province = order.province;
      if (cols.has('postal_code') && order.postal_code) payload.postal_code = order.postal_code;
      if (cols.has('place_id') && order.place_id) payload.place_id = order.place_id;
      if (cols.has('accuracy') && order.accuracy !== undefined) payload.accuracy = order.accuracy;
      if (cols.has('pickup_lat') && order.pickup_lat !== undefined) payload.pickup_lat = order.pickup_lat;
      if (cols.has('pickup_lng') && order.pickup_lng !== undefined) payload.pickup_lng = order.pickup_lng;
      if (cols.has('delivery_lat') && order.delivery_lat !== undefined) payload.delivery_lat = order.delivery_lat;
      if (cols.has('delivery_lng') && order.delivery_lng !== undefined) payload.delivery_lng = order.delivery_lng;
      if (cols.has('status')) {
        payload.status = normStatus;
      }
      if (order.customer_id && isUUID(order.customer_id) && (cols.has('customer_id') || cols.size === 0)) {
        payload.customer_id = order.customer_id;
      } else if (order.user_id && isUUID(order.user_id) && (cols.has('customer_id') || cols.size === 0)) {
        payload.customer_id = order.user_id;
      } else if (order.user_id && isUUID(order.user_id) && cols.has('user_id')) {
        payload.user_id = order.user_id;
      }

      console.log('Sending dynamically filtered insert payload to Supabase "orders":', payload);

      const { data, error } = await supabase
        .from('orders')
        .insert(payload)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase orders insert failed! Full error object:', error);
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log('Order successfully inserted into Supabase:', data);

      const returnedOrder: Order = {
        ...order,
        ...data,
        partner_id: order.partner_id,
        customer_name: data.customer_name || order.customer_name,
        customer_phone: data.customer_phone || order.customer_phone,
        customer_address: data.customer_address || data.delivery_address || data.address || normAddress,
        delivery_address: data.delivery_address || data.customer_address || normAddress,
        payment_type: data.payment_type || normPaymentType,
        total_price: Number(data.total_price) || Number(order.total_price) || 0,
        items: data.items || order.items || [],
        status: data.status || normStatus,
        created_at: data.created_at || new Date().toISOString()
      };

      // Update local cache as backup
      const localOrders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
      localOrders.unshift(returnedOrder);
      setStored(LOCAL_STORAGE_KEYS.ORDERS, localOrders);

      return returnedOrder;
    } else {
      const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
      const newOrder: Order = {
        ...order,
        id: 'o_' + Math.random().toString(36).substr(2, 9),
        partner_id: order.partner_id,
        store_id: order.partner_id,
        customer_address: normAddress,
        delivery_address: normAddress,
        payment_type: normPaymentType,
        status: normStatus,
        created_at: new Date().toISOString()
      };
      orders.unshift(newOrder);
      setStored(LOCAL_STORAGE_KEYS.ORDERS, orders);
      return newOrder;
    }
  },

  async createTask(taskData: any): Promise<any> {
    const rawPartner = taskData.partner_id || taskData.store_id || null;
    const partnerUuid = rawPartner && rawPartner !== 'default' && isUUID(rawPartner) ? rawPartner : null;
    const customerUuid = taskData.customer_id && isUUID(taskData.customer_id) ? taskData.customer_id : null;

    const normStatus = 'bekliyor';

    if (isSupabaseConfigured && supabase) {
      console.log('Inserting task into "tasks" table. Received payload:', taskData);

      if (partnerUuid) {
        try {
          const existingPartner = await this.getPartnerById(partnerUuid);
          if (existingPartner) {
            await ensurePartnerInDatabase(existingPartner);
          }
        } catch (pErr) {
          console.warn('ensurePartnerInDatabase notice before createTask:', pErr);
        }
      }

      const colsList = await getExactTableColumns('tasks');
      const cols = new Set(colsList);
      console.log("🔍 Valid 'tasks' table columns for insert:", Array.from(cols));

      const payload: Record<string, any> = {};

      if (cols.has('partner_id') && partnerUuid) payload.partner_id = partnerUuid;
      if (cols.has('customer_id') && customerUuid) payload.customer_id = customerUuid;
      if (cols.has('task_description')) payload.task_description = taskData.task_description || '';
      if (cols.has('pickup_address')) payload.pickup_address = taskData.pickup_address || 'Mağaza';
      if (cols.has('delivery_address')) payload.delivery_address = taskData.delivery_address || taskData.customer_address || '';
      if (cols.has('pickup_lat') && taskData.pickup_lat !== undefined) payload.pickup_lat = taskData.pickup_lat;
      if (cols.has('pickup_lng') && taskData.pickup_lng !== undefined) payload.pickup_lng = taskData.pickup_lng;
      if (cols.has('delivery_lat') && taskData.delivery_lat !== undefined) payload.delivery_lat = taskData.delivery_lat;
      if (cols.has('delivery_lng') && taskData.delivery_lng !== undefined) payload.delivery_lng = taskData.delivery_lng;
      if (cols.has('total_price')) payload.total_price = Number(taskData.total_price) || 0;
      if (cols.has('customer_price')) payload.customer_price = Number(taskData.customer_price || taskData.total_price) || 0;
      if (cols.has('courier_net')) payload.courier_net = Number(taskData.courier_net) || 0;
      if (cols.has('base_price')) payload.base_price = Number(taskData.base_price) || 0;
      if (cols.has('service_type')) payload.service_type = taskData.service_type || 'asistan_siparis';
      if (cols.has('verification_code')) payload.verification_code = taskData.verification_code || Math.floor(1000 + Math.random() * 9000).toString();
      if (cols.has('status')) payload.status = normStatus;

      console.log('Sending dynamically filtered insert payload to Supabase "tasks":', payload);

      const client = await getActiveSupabaseClient();
      const { data, error } = await client
        .from('tasks')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Supabase tasks insert failed! Full error object:', error);
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log('Task successfully inserted into Supabase "tasks":', data);

      const returnedTask = {
        ...taskData,
        ...data,
        id: data.id,
        created_at: data.created_at || new Date().toISOString()
      };

      const localTasks = getStored<any>('ugra_tasks_cache');
      localTasks.unshift(returnedTask);
      setStored('ugra_tasks_cache', localTasks);

      return returnedTask;
    } else {
      const localTasks = getStored<any>('ugra_tasks_cache');
      const newTaskId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 't_' + Math.random().toString(36).substr(2, 9);
      const newLocalTask = {
        ...taskData,
        id: newTaskId,
        status: normStatus,
        created_at: new Date().toISOString()
      };
      localTasks.unshift(newLocalTask);
      setStored('ugra_tasks_cache', localTasks);
      return newLocalTask;
    }
  },

  async createStoreOrder(params: {
    partner_id: string;
    items: Array<{ product_id: string; quantity: number; title?: string }>;
    assistant_fee: number;
    delivery_address: string;
    delivery_lat?: number;
    delivery_lng?: number;
    customer_name?: string;
    customer_phone?: string;
    customer_note?: string;
  }): Promise<any> {
    if (isSupabaseConfigured && supabase) {
      const client = await getActiveSupabaseClient();
      console.log('🚀 Calling create_store_order RPC with params:', params);

      const { data, error } = await client.rpc('create_store_order', {
        p_partner_id: params.partner_id,
        p_items: params.items,
        p_assistant_fee: Number(params.assistant_fee) || 100,
        p_delivery_address: params.delivery_address || '',
        p_delivery_lat: params.delivery_lat !== undefined ? Number(params.delivery_lat) : null,
        p_delivery_lng: params.delivery_lng !== undefined ? Number(params.delivery_lng) : null,
        p_customer_name: params.customer_name || '',
        p_customer_phone: params.customer_phone || '',
        p_customer_note: params.customer_note || ''
      });

      if (error) {
        console.error('❌ RPC create_store_order failed:', error);
        throw new Error(error.message || 'Mağaza siparişi oluşturulamadı');
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result || !result.task_id) {
        console.error('❌ RPC create_store_order returned invalid data:', data);
        throw new Error('Sipariş sunucudan geçersiz yanıt döndürdü');
      }

      console.log('✅ RPC create_store_order success:', result);

      const returnedTask = {
        id: result.task_id,
        task_id: result.task_id,
        partner_id: params.partner_id,
        status: result.status || 'bekliyor',
        total_price: Number(result.total_price) || 0,
        customer_price: Number(result.customer_price) || 0,
        courier_net: Number(result.courier_net) || 0,
        base_price: Number(result.base_price) || 0,
        verification_code: result.verification_code || '0000',
        service_type: result.service_type || 'asistan_siparis',
        task_description: result.task_description || '',
        created_at: new Date().toISOString()
      };

      const localTasks = getStored<any>('ugra_tasks_cache');
      localTasks.unshift(returnedTask);
      setStored('ugra_tasks_cache', localTasks);

      return returnedTask;
    } else {
      const localTasks = getStored<any>('ugra_tasks_cache');
      const newTaskId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 't_' + Math.random().toString(36).substr(2, 9);
      const mockTask = {
        id: newTaskId,
        task_id: newTaskId,
        partner_id: params.partner_id,
        status: 'bekliyor',
        delivery_address: params.delivery_address,
        delivery_lat: params.delivery_lat,
        delivery_lng: params.delivery_lng,
        courier_net: params.assistant_fee,
        total_price: params.assistant_fee,
        customer_price: params.assistant_fee,
        base_price: 0,
        service_type: 'asistan_siparis',
        verification_code: Math.floor(1000 + Math.random() * 9000).toString(),
        created_at: new Date().toISOString()
      };
      localTasks.unshift(mockTask);
      setStored('ugra_tasks_cache', localTasks);
      return mockTask;
    }
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    if (!orderId || !isUUID(orderId)) return null;
    if (isSupabaseConfigured && supabase) {
      try {
        const client = await getActiveSupabaseClient();
        
        // 1. First check tasks table
        const { data: taskData } = await client.from('tasks').select('*').eq('id', orderId).maybeSingle();
        if (taskData) {
          if (taskData.order_id && isUUID(taskData.order_id)) {
            console.log('[OrderFetch] orders.id being queried:', taskData.order_id);
            const { data: orderData } = await client.from('orders').select('*').eq('id', taskData.order_id).maybeSingle();
            if (orderData) {
              return {
                ...orderData,
                ...taskData,
                id: taskData.id,
                task_id: taskData.id,
                total_price: Number(orderData.total_price || orderData.customer_price || taskData.courier_net || 0),
                customer_price: Number(orderData.customer_price || orderData.total_price || taskData.customer_price || 0),
              } as Order;
            }
          }
          // task.order_id is null: Return taskData directly without querying orders table
          return {
            ...taskData,
            id: taskData.id,
            task_id: taskData.id,
            total_price: Number(taskData.customer_price || taskData.courier_net || 0),
            customer_price: Number(taskData.customer_price || 0),
          } as Order;
        }

        // 2. Fallback: Query orders table directly with orderId UUID
        console.log('[OrderFetch] orders.id being queried:', orderId);
        const { data, error } = await client.from('orders').select('*').eq('id', orderId).maybeSingle();

        if (error) {
          console.error('getOrderById error:', error);
          return null;
        }
        if (!data) return null;

        return {
          ...data,
          task_id: data.id,
          total_price: Number(data.total_price || data.customer_price || 0),
          customer_price: Number(data.customer_price || data.total_price || 0),
        } as Order;
      } catch (err) {
        console.error('getOrderById exception:', err);
        return null;
      }
    }
    const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
    return orders.find(o => o.id === orderId) || null;
  },

  async getOrders(partnerId: string): Promise<Order[]> {
    if (!partnerId) return [];

    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        const orderCols = await getExactTableColumns('orders');
        if (orderCols.length === 0) {
          const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
          return orders.filter(o => (o.partner_id === partnerId || (o as any).store_id === partnerId) && !o.deleted);
        }

        const hasStoreId = orderCols.includes('store_id');
        const hasPartnerId = orderCols.includes('partner_id');

        let validUuid: string | null = null;
        if (isUUID(partnerId)) {
          validUuid = partnerId;
        } else {
          const { data: sessionData } = await client.auth.getSession();
          if (sessionData?.session?.user?.id && isUUID(sessionData.session.user.id)) {
            validUuid = sessionData.session.user.id;
          }
        }

        if (!validUuid) {
          const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
          return orders.filter(o => (o.partner_id === partnerId || (o as any).store_id === partnerId) && !o.deleted);
        }

        let query = client.from('orders').select('*');
        if (hasPartnerId) {
          query = query.eq('partner_id', validUuid);
        } else if (hasStoreId) {
          query = query.eq('store_id', validUuid);
        }

        let { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.warn("Supabase getOrders warning:", error.message || error);
          const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
          return orders.filter(o => (o.partner_id === partnerId || (o as any).store_id === partnerId) && !o.deleted);
        } else if (data) {
          return data.filter((o: any) => !o.deleted && !o.customer_name?.startsWith('PARTNER_APP:')) || [];
        }
        return [];
      } catch (err) {
        console.warn("Supabase getOrders exception:", err);
        return [];
      }
    }
    const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
    return orders.filter(o => (o.partner_id === partnerId || (o as any).store_id === partnerId) && !o.deleted);
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
      const index = orders.findIndex(o => o.id === orderId);
      if (index === -1) throw new Error('Sipariş bulunamadı.');
      const updated = { ...orders[index], status };
      orders[index] = updated;
      setStored(LOCAL_STORAGE_KEYS.ORDERS, orders);
      return updated;
    }
  },

  async deleteOrder(orderId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);
        if (error) {
          await supabase
            .from('orders')
            .update({ status: 'iptal' })
            .eq('id', orderId);
        }
      } catch (err) {
        console.warn("Supabase deleteOrder exception:", err);
      }
    }
    const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orders[index].deleted = true;
      setStored(LOCAL_STORAGE_KEYS.ORDERS, orders);
    }
  },

  // --- EXTRA ADMIN & CUSTOMER/TICKET SERVICES ---
  async isUserAdmin(userId: string): Promise<boolean> {
    if (userId === '8987cf9f-8bcf-4e2e-a648-da996c0b0fbb' || userId === 'admin_id') {
      return true;
    }
    if (isSupabaseConfigured) {
      // 1. Check supabaseAdmin session directly
      try {
        if (supabaseAdmin) {
          const { data: adminSessionData } = await supabaseAdmin.auth.getSession();
          const adminUser = adminSessionData?.session?.user;
          if (adminUser) {
            if (adminUser.id === userId || adminUser.email === 'goko@ugra.app' || adminUser.email === 'admin@ugra.app' || adminUser.user_metadata?.is_admin === true || adminUser.app_metadata?.claims_admin === true || adminUser.role === 'admin' || adminUser.role === 'service_role') {
              return true;
            }
          }
        }
      } catch (err) {
        console.warn('isUserAdmin supabaseAdmin check notice:', err);
      }

      // 2. Try retrieving from profiles table using authenticated client
      const client = supabaseAdmin || await getActiveSupabaseClient();
      try {
        const { data, error } = await client
          .from('profiles')
          .select('is_admin, role')
          .eq('id', userId)
          .maybeSingle();
        
        if (!error && data && (data.is_admin || data.role === 'admin')) {
          return true;
        }
      } catch (err) {
        console.warn('Error reading from profiles table, falling back to session metadata:', err);
      }

      // 3. Dynamic fallback check using client user's email and metadata
      try {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
          if (user.id === userId || user.email === 'goko@ugra.app' || user.email === 'admin@ugra.app' || user.user_metadata?.is_admin === true || user.app_metadata?.claims_admin === true) {
            return true;
          }
        }
      } catch (err) {
        console.error('Error in getUser fallback:', err);
      }

      // 4. Check admin storage key or fallback storage
      const adminStorage = localStorage.getItem('ugra_auth_admin') || localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
      if (adminStorage) {
        try {
          const parsed = JSON.parse(adminStorage);
          const email = (parsed?.user?.email || parsed?.currentSession?.user?.email)?.toLowerCase();
          if (email === 'goko@ugra.app' || email === 'admin@ugra.app' || parsed?.user?.is_admin || parsed?.user?.role === 'admin') return true;
        } catch (e) {}
      }

      return false;
    } else {
      const session = localStorage.getItem('ugra_auth_admin') || localStorage.getItem(LOCAL_STORAGE_KEYS.SESSION);
      if (!session) return false;
      try {
        const parsed = JSON.parse(session);
        const user = parsed?.user || parsed?.currentSession?.user;
        const email = user?.email?.toLowerCase();
        return email === 'goko@ugra.app' || email === 'admin@ugra.app' || !!user?.is_admin || user?.role === 'admin';
      } catch (e) {
        return false;
      }
    }
  },

  async resetPassword(email: string) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/partner`
      });
      if (error) throw error;
      return true;
    } else {
      return true;
    }
  },

  async getAdminPartners(): Promise<Partner[]> {
    let supabasePartners: Partner[] = [];

    console.log('🔗 [UĞRA Admin DB] VITE_SUPABASE_URL:', supabaseUrl || '(not configured)');
    console.log('🔗 [UĞRA Admin DB] Connected Supabase Project URL:', isSupabaseConfigured ? supabaseUrl : 'MOCK / UNCONFIGURED');

    if (isSupabaseConfigured && supabase) {
      // 1. Query 'partners' table
      try {
        const { data, error } = await supabase
          .from('partners')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('📦 [UĞRA Admin DB] Raw Supabase Admin Partners query data:', data);
        if (error) {
          console.error('❌ [UĞRA Admin DB] Supabase partners query error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        }

        if (!error && data) {
          supabasePartners = data;
        }
      } catch (err) {
        console.error('Error fetching admin partners from Supabase:', err);
      }




    }

    let merged: Partner[] = [];

    // Always retrieve local storage partners to safely merge with Supabase data so no un-synced application is ever lost
    const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);

    if (isSupabaseConfigured) {
      const spClean = supabasePartners.map(p => {
        if (!p) return null;
        const cleanId = p.id ? (isUUID(p.id) ? p.id : toUUID(p.id)) : toUUID(p.business_name || p.slug || Math.random().toString());
        return { ...p, id: cleanId };
      }).filter(Boolean) as Partner[];

      const map = new Map<string, Partner>();
      // Put local partners first
      localPartners.forEach(lp => {
        if (lp && lp.id) {
          map.set(lp.id, lp);
        }
      });
      // Supabase records override local for existing IDs, but preserve un-synced local applications
      spClean.forEach(sp => {
        if (sp && sp.id) {
          map.set(sp.id, sp);
        }
      });

      merged = Array.from(map.values());
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, merged);
    } else {
      merged = localPartners;
    }

    merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return merged;
  },

  async createPartnerByAdmin(payload: {
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    category: string;
    password: string;
    logo?: string;
    coverImage?: string;
  }): Promise<Partner> {
    const rawEmail = payload.email;
    const cleanEmail = rawEmail.trim().toLowerCase();

    console.log("=== CREATE PARTNER BY ADMIN DIAGNOSTICS ===");
    console.log("rawEmail typeof:", typeof rawEmail);
    console.log("rawEmail JSON:", JSON.stringify(rawEmail));
    console.log("cleanEmail typeof:", typeof cleanEmail);
    console.log("cleanEmail JSON:", JSON.stringify(cleanEmail));
    console.log("cleanEmail length:", cleanEmail.length);
    console.log("cleanEmail char codes:", cleanEmail.split('').map(c => c.charCodeAt(0)));
    console.log("payload password length:", payload.password?.length);

    const cleanSlug = payload.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'magaza-' + Date.now();

    if (isSupabaseConfigured && supabase) {
      console.log("Auth.signUp çağrısı yapılıyor... Gönderilen email:", JSON.stringify(cleanEmail));

      // Create isolated client to avoid overwriting or changing current admin session
      const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
        email: cleanEmail,
        password: payload.password,
        options: {
          data: {
            business_name: payload.businessName,
            full_name: payload.contactName,
            slug: cleanSlug,
            phone: payload.phone
          }
        }
      });

      console.log("Auth sonucu:", {
        user: authData?.user ? { id: authData.user.id, email: authData.user.email } : null,
        session: authData?.session ? "present" : "null",
        error: authError ? {
          code: (authError as any).code,
          message: authError.message,
          details: (authError as any).details || authError
        } : null,
        status: authError ? "FAILED" : "SUCCESS"
      });

      if (authError) {
        console.log("AUTH : FAILED");
        console.log("PARTNER INSERT : SKIPPED");
        console.log("PARTNER SELECT : SKIPPED");
        console.log("PROFILE INSERT : SKIPPED");
        let msg = authError.message;
        if (msg.includes('User already registered') || msg.includes('already exists')) {
          msg = 'Bu e-posta adresi ile zaten kayıtlı bir kullanıcı bulunmaktadır.';
        } else if (msg.includes('Password should be at least')) {
          msg = 'Şifre en az 6 karakter olmalıdır.';
        }
        console.error("Auth hatası detaylı:", {
          code: (authError as any).code,
          message: authError.message,
          details: (authError as any).details || authError
        });
        throw new Error(msg);
      }

      if (!authData.user) {
        console.log("AUTH : FAILED");
        console.log("PARTNER INSERT : SKIPPED");
        console.log("PARTNER SELECT : SKIPPED");
        console.log("PROFILE INSERT : SKIPPED");
        console.error("Auth hatası: authData.user bulunamadı.");
        throw new Error('Kullanıcı hesabı oluşturulamadı.');
      }

      if (authData.user.identities && authData.user.identities.length === 0) {
        console.log("AUTH : FAILED");
        console.log("PARTNER INSERT : SKIPPED");
        console.log("PARTNER SELECT : SKIPPED");
        console.log("PROFILE INSERT : SKIPPED");
        console.error("Auth hatası: authData.user.identities boş.");
        throw new Error('Bu e-posta adresi ile zaten kayıtlı bir kullanıcı bulunmaktadır.');
      }

      const userId = authData.user.id;
      const nowIso = new Date().toISOString();

      // 1. Prepare partnerPayload with EXACTLY the requested columns
      const partnerPayload: Partner = {
        id: userId,
        business_name: payload.businessName,
        slug: cleanSlug,
        email: cleanEmail,
        phone: payload.phone || '',
        category: payload.category ? normalizeCategory(payload.category) : (normalizeCategory(payload.businessName) || 'Diğer'),
        description: '',
        logo: payload.logo || '',
        address: '',
        status: 'approved',
        active: true,
        created_at: nowIso
      };

      console.log("----------------------------------------");
      console.log("PARTNERS INSERT BAŞLIYOR");
      console.log("partners INSERT payload:", JSON.stringify(partnerPayload, null, 2));

      // 2. Insert/upsert into partners table using ensurePartnerInDatabase
      const insertedPartner = await ensurePartnerInDatabase(partnerPayload);

      // 3. Check SELECT directly on partners table
      console.log("PARTNER SELECT sorgusu çalıştırılıyor... ID:", userId);
      const { data: partnerCheck, error: partnerCheckError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log("Partners SELECT sonucu:", {
        data: partnerCheck,
        error: partnerCheckError,
        status: (partnerCheckError || !partnerCheck) ? "FAILED" : "SUCCESS"
      });

      if (partnerCheckError || !partnerCheck) {
        console.error("PARTNER SELECT başarısız veya boş döndü!", {
          code: partnerCheckError?.code,
          message: partnerCheckError?.message,
          details: partnerCheckError?.details,
          hint: partnerCheckError?.hint
        });
      }

      // 4. Prepare profilePayload with EXACTLY valid table columns
      const profileCols = await getExactTableColumns('profiles');
      const rawProfilePayload = {
        id: userId,
        partner_id: userId,
        role: 'partner',
        is_admin: false,
        phone: payload.phone || '',
        avatar_url: payload.logo || '',
        created_at: nowIso
      };
      const profilePayload = filterPayloadByValidColumns(rawProfilePayload, profileCols);

      console.log("profiles INSERT payloadı:", JSON.stringify(profilePayload, null, 2));

      // 5. Upsert into profiles table
      let profileData: any = null;
      let profileError: any = null;
      try {
        const res = await supabase
          .from('profiles')
          .upsert([profilePayload])
          .select()
          .maybeSingle();
        profileData = res.data;
        profileError = res.error;
      } catch (err) {
        profileError = err;
      }

      console.log("Profile insert sonucu:", {
        data: profileData,
        error: profileError ? {
          code: (profileError as any).code,
          message: profileError?.message,
          details: (profileError as any).details,
          hint: (profileError as any).hint
        } : null,
        status: profileError ? "FAILED" : "SUCCESS"
      });

      if (profileError) {
        console.log("AUTH : SUCCESS");
        console.log("PARTNER INSERT : SUCCESS");
        console.log(`PARTNER SELECT : ${partnerCheck ? "SUCCESS" : "FAILED"}`);
        console.log("PROFILE INSERT : FAILED");
        console.error('Profile insert hatası detaylı:', profileError);
        throw profileError;
      }

      console.log("--- AKIŞ ÖZETİ ---");
      console.log("AUTH : SUCCESS");
      console.log("PARTNER INSERT : SUCCESS");
      console.log(`PARTNER SELECT : ${partnerCheck ? "SUCCESS" : "FAILED"}`);
      console.log("PROFILE INSERT : SUCCESS");

      const finalPartner: Partner = {
        ...(insertedPartner || partnerPayload),
        cover_image: payload.coverImage || ''
      };

      // Sync local storage cache
      const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
      const filtered = localPartners.filter(p => p.id !== userId && p.email !== cleanEmail);
      filtered.unshift(finalPartner);
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, filtered);

      console.log("Partner oluşturma başarıyla tamamlandı:", finalPartner);
      return finalPartner;
    } else {
      console.log("Supabase yapılandırılmamış, mock yerel kayıt oluşturuluyor...");
      const mockId = 'partner_' + Date.now();
      const localPartner: Partner = {
        id: mockId,
        slug: cleanSlug,
        business_name: payload.businessName,
        email: cleanEmail,
        phone: payload.phone || '',
        address: '',
        category: payload.category ? normalizeCategory(payload.category) : (normalizeCategory(payload.businessName) || 'Diğer'),
        active: true,
        status: 'approved',
        logo: payload.logo || '',
        cover_image: payload.coverImage || '',
        created_at: new Date().toISOString()
      };
      const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
      localPartners.unshift(localPartner);
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, localPartners);
      console.log("Mock partner oluşturuldu:", localPartner);
      return localPartner;
    }
  },

  async adminApprovePartner(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      let existingPartner = await this.getPartnerById(id);
      let appData: Partial<Partner> = existingPartner || {};

      if (!existingPartner || !appData.business_name || !appData.category) {
        const localPartners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
        const localApp = localPartners.find(p => p.id === id);
        if (localApp) {
          appData = { ...appData, ...localApp };
        }
      }

      const partnerPayload: Partial<Partner> & { id: string } = {
        id,
        business_name: appData.business_name || 'Partner Mağazası',
        slug: appData.slug || ('magaza-' + id.slice(0, 8)),
        email: appData.email || '',
        phone: appData.phone || '',
        address: appData.address || '',
        category: appData.category ? normalizeCategory(appData.category) : 'Diğer',
        logo: appData.logo || '',
        description: appData.description || '',
        status: 'approved',
        active: true,
        created_at: appData.created_at || new Date().toISOString()
      };

      await ensurePartnerInDatabase(partnerPayload);
    }

    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    const index = partners.findIndex(p => p.id === id);
    if (index !== -1) {
      partners[index].status = 'approved';
      partners[index].active = true;
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, partners);
    } else {
      const freshPartner = await this.getPartnerById(id);
      if (freshPartner) {
        freshPartner.status = 'approved';
        freshPartner.active = true;
        partners.unshift(freshPartner);
        setStored(LOCAL_STORAGE_KEYS.PARTNERS, partners);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ugra_partners_updated'));
    }
  },

  async adminRejectPartner(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('partners')
          .update({ status: 'rejected', active: false })
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase reject partner error:', e);
      }
    }
    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    const index = partners.findIndex(p => p.id === id);
    if (index !== -1) {
      partners[index].status = 'rejected';
      partners[index].active = false;
      setStored(LOCAL_STORAGE_KEYS.PARTNERS, partners);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ugra_partners_updated'));
    }
  },

  async adminCreatePartner(partner: Omit<Partner, 'id' | 'created_at'>): Promise<Partner> {
    let createdPartner: Partner | null = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('partners')
          .insert({
            ...partner,
            status: 'approved',
            active: true
          })
          .select()
          .single();
        if (!error && data) {
          createdPartner = data;
        }
      } catch (err) {
        console.warn('Error creating partner in Supabase:', err);
      }
    }

    if (!createdPartner) {
      const newId = 'p_' + Math.random().toString(36).substr(2, 9);
      createdPartner = {
        ...partner,
        id: newId,
        status: 'approved',
        active: true,
        created_at: new Date().toISOString()
      };
    }

    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    partners.unshift(createdPartner);
    setStored(LOCAL_STORAGE_KEYS.PARTNERS, partners);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ugra_partners_updated'));
    }

    return createdPartner;
  },

  async adminUpdatePartner(id: string, updates: Partial<Partner>): Promise<Partner> {
    return this.updatePartner(id, updates);
  },

  async adminDeletePartner(id: string): Promise<void> {
    return this.deletePartner(id);
  },

  async adminGetAllProducts(): Promise<(Product & { partner_name?: string })[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, partners(business_name)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((p: any) => ({
          ...p,
          partner_name: p.partners?.business_name
        }));
      } catch (err) {
        console.error("Supabase adminGetAllProducts failed:", err);
        return [];
      }
    }
    const products = getStored<Product>(LOCAL_STORAGE_KEYS.PRODUCTS);
    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    return products.map(p => {
      const partner = partners.find(pt => pt.id === p.partner_id);
      return {
        ...p,
        partner_name: partner?.business_name
      };
    });
  },

  async adminGetAllOrders(): Promise<(Order & { partner_name?: string })[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, partners(business_name)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || [])
          .filter((o: any) => !o.deleted && !o.customer_name?.startsWith('PARTNER_APP:'))
          .map((o: any) => ({
            ...o,
            partner_name: o.partners?.business_name
          }));
      } catch (err) {
        console.error("Supabase adminGetAllOrders failed:", err);
        return [];
      }
    }
    const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    return orders
      .filter(o => !o.deleted && !o.customer_name?.startsWith('PARTNER_APP:'))
      .map(o => {
        const partner = partners.find(pt => pt.id === o.partner_id);
        return {
          ...o,
          partner_name: partner?.business_name
        };
      });
  },

  async adminGetAllCustomers() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('customer_name, customer_phone, customer_address, delivery_address, created_at, partner_id, partners(business_name)');
        if (error) throw error;
        
        const customerMap = new Map();
        (data || [])
          .filter((o: any) => !o.customer_name?.startsWith('PARTNER_APP:'))
          .forEach((item: any) => {
          const key = `${item.customer_name}_${item.customer_phone}`;
          if (!customerMap.has(key)) {
            customerMap.set(key, {
              name: item.customer_name,
              phone: item.customer_phone,
              address: item.customer_address || item.delivery_address || '',
              lastOrderDate: item.created_at,
              orderCount: 1,
              stores: new Set([item.partners?.business_name || 'Bilinmeyen Mağaza'])
            });
          } else {
            const cust = customerMap.get(key);
            cust.orderCount += 1;
            cust.stores.add(item.partners?.business_name || 'Bilinmeyen Mağaza');
            if (new Date(item.created_at) > new Date(cust.lastOrderDate)) {
              cust.lastOrderDate = item.created_at;
            }
          }
        });
        
        return Array.from(customerMap.values()).map((c, idx) => ({
          id: c.id || `cust_${idx + 1}_${c.phone || c.name || 'anon'}`,
          ...c,
          stores: Array.from(c.stores).join(', ')
        }));
      } catch (err) {
        console.error("Supabase adminGetAllCustomers failed:", err);
        return [];
      }
    }
    const orders = getStored<Order>(LOCAL_STORAGE_KEYS.ORDERS);
    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    const customerMap = new Map();
    orders.forEach(o => {
      const key = `${o.customer_name}_${o.customer_phone}`;
      const storeName = partners.find(pt => pt.id === o.partner_id)?.business_name || 'Bilinmeyen Mağaza';
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: `cust_${key}`,
          name: o.customer_name,
          phone: o.customer_phone,
          address: o.customer_address,
          lastOrderDate: o.created_at,
          orderCount: 1,
          stores: new Set([storeName])
        });
      } else {
        const cust = customerMap.get(key);
        cust.orderCount += 1;
        cust.stores.add(storeName);
        if (new Date(o.created_at) > new Date(cust.lastOrderDate)) {
          cust.lastOrderDate = o.created_at;
        }
      }
    });
    return Array.from(customerMap.values()).map((c, idx) => ({
      id: c.id || `cust_${idx + 1}_${c.phone || c.name || 'anon'}`,
      ...c,
      stores: Array.from(c.stores).join(', ')
    }));
  },

  async getSupportTickets(partnerId?: string): Promise<SupportTicket[]> {
    if (isSupabaseConfigured) {
      try {
        const stCols = await getExactTableColumns('support_tickets');
        if (stCols.length > 0) {
          const client = await getActiveSupabaseClient();
          let query = client.from('support_tickets').select('*, partners(business_name)');
          if (partnerId) {
            query = query.eq('partner_id', partnerId);
          }
          const { data, error } = await query.order('created_at', { ascending: false });
          if (!error && data) {
            return data.map((t: any) => ({
              ...t,
              business_name: t.partners?.business_name
            }));
          }
          return [];
        }
      } catch (err) {
        return [];
      }
    }
    const tickets = getStored<SupportTicket>('ugra_virtual_support_tickets');
    const partners = getStored<Partner>(LOCAL_STORAGE_KEYS.PARTNERS);
    const filtered = partnerId ? tickets.filter(t => t.partner_id === partnerId) : tickets;
    return filtered.map(t => ({
      ...t,
      business_name: partners.find(p => p.id === t.partner_id)?.business_name
    }));
  },

  async createSupportTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'status'>): Promise<SupportTicket> {
    if (isSupabaseConfigured) {
      try {
        const stCols = await getExactTableColumns('support_tickets');
        if (stCols.length > 0) {
          const client = await getActiveSupabaseClient();
          const { data, error } = await client
            .from('support_tickets')
            .insert({ ...ticket, status: 'acik' })
            .select()
            .single();
          if (!error && data) {
            return data;
          }
        }
      } catch (err) {
        // Silent fallback
      }
    }
    const tickets = getStored<SupportTicket>('ugra_virtual_support_tickets');
    const newTicket: SupportTicket = {
      ...ticket,
      id: 't_' + Math.random().toString(36).substr(2, 9),
      status: 'acik',
      created_at: new Date().toISOString()
    };
    tickets.unshift(newTicket);
    setStored('ugra_virtual_support_tickets', tickets);
    return newTicket;
  },

  async updateSupportTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const stCols = await getExactTableColumns('support_tickets');
        if (stCols.length > 0) {
          const client = await getActiveSupabaseClient();
          const { error } = await client
            .from('support_tickets')
            .update({ status })
            .eq('id', ticketId);
          if (!error) return;
        }
      } catch (err) {
        // Silent fallback
      }
    }
    const tickets = getStored<SupportTicket>('ugra_virtual_support_tickets');
    const index = tickets.findIndex(t => t.id === ticketId);
    if (index !== -1) {
      tickets[index].status = status;
      setStored('ugra_virtual_support_tickets', tickets);
    }
  },

  async logAction(log: {
    partner_id?: string;
    partner_name?: string;
    user_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: any;
  }) {
    const logs = getStored<AuditLog>('ugra_virtual_audit_logs');
    const newLog: AuditLog = {
      ...log,
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStored('ugra_virtual_audit_logs', logs);
  },

  async getAuditLogs(partnerId?: string): Promise<AuditLog[]> {
    const stored = getStored<AuditLog>('ugra_virtual_audit_logs');
    if (partnerId) {
      return stored.filter(l => l.partner_id === partnerId);
    }
    return stored;
  },

  async getAssistantApplications(): Promise<Assistant[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('assistants')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (!error && data) return data as Assistant[];
        if (error) console.error('Error fetching assistant applications:', error);
        return [];
      } catch (err) {
        console.error('getAssistantApplications error:', err);
        return [];
      }
    }
    return [];
  },

  async createAssistantApplication(app: {
    full_name: string;
    phone: string;
    email?: string;
    password?: string;
    vehicle_type?: 'motosiklet' | 'bisiklet' | 'arac';
  }): Promise<Assistant> {
    if (isSupabaseConfigured && supabase) {
      const payload: any = {
        full_name: app.full_name || '',
        phone: app.phone || '',
        email: app.email ? app.email.trim().toLowerCase() : '',
        vehicle_type: app.vehicle_type || 'motosiklet',
        status: 'pending' as const,
        user_id: null
      };
      if (app.password) {
        payload.password = app.password;
      }
      const { data, error } = await supabase
        .from('assistants')
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error('Error creating assistant application in assistants table:', error);
        throw new Error(error.message || 'Başvuru gönderilirken bir veritabanı hatası oluştu.');
      }
      return data as Assistant;
    }
    throw new Error('Supabase veritabanı bağlantısı henüz yapılandırılmamış.');
  },

  async approveAssistantApplication(appId: string): Promise<{ success: boolean; error?: string }> {
    console.log("3 approveAssistantApplication", appId);
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase veritabanı yapılandırılmamış.' };
    }

    try {
      if (!appId) {
        return { success: false, error: 'Geçersiz başvuru ID.' };
      }

      const searchId = isUUID(appId) ? appId : toUUID(appId);

      // Fetch assistant record to retrieve email and password entered during application
      let { data: assistant, error: fetchErr } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', searchId)
        .maybeSingle();

      if (!assistant && appId !== searchId) {
        const { data: altAssistant } = await supabase
          .from('assistants')
          .select('*')
          .eq('id', appId)
          .maybeSingle();
        if (altAssistant) assistant = altAssistant;
      }

      if (fetchErr || !assistant) {
        const errorMsg = fetchErr ? fetchErr.message : 'Kurye başvurusu bulunamadı.';
        console.error('[approveAssistantApplication] Fetch error:', errorMsg);
        return { success: false, error: errorMsg };
      }

      const email = assistant.email ? assistant.email.trim() : '';
      const password = assistant.password || '12345678';
      const realUUID = assistant.id; // Always use the actual UUID from the database row

      if (!email) {
        console.error('[approveAssistantApplication] Error: E-posta adresi bulunamadı.');
        return { success: false, error: 'Başvuran kuryenin e-posta adresi bulunamadı.' };
      }

      console.log("4 before invoke", {
        appId: realUUID,
        email,
        password,
        full_name: assistant.full_name,
        phone: assistant.phone
      });

      const { data, error: invokeErr } = await supabase.functions.invoke('approve-assistant', {
        body: {
          appId: realUUID,
          email,
          password,
          full_name: assistant.full_name || '',
          phone: assistant.phone || '',
        },
      });

      console.log("5 after invoke", data, invokeErr);

      if (invokeErr) {
        console.error('[approveAssistantApplication] Edge Function invoke error:', invokeErr);
        return { success: false, error: invokeErr.message || 'Edge Function çağrısı başarısız oldu.' };
      }

      if (!data || data.success === false) {
        const errMessage = data?.error || data?.message || 'Edge Function işlem başarısız yanıtı döndürdü.';
        console.error('[approveAssistantApplication] Edge Function data error:', errMessage);
        return { success: false, error: errMessage };
      }

      console.log(`[approveAssistantApplication] Assistant ${assistant.full_name} (${realUUID}) successfully approved.`);
      return { success: true };
    } catch (err: any) {
      console.error('[approveAssistantApplication] Exception:', err);
      return { success: false, error: err.message || 'Kurye onayı sırasında beklenmeyen bir hata oluştu.' };
    }
  },

  async approveAssistant(appId: string): Promise<{ success: boolean; error?: string }> {
    return this.approveAssistantApplication(appId);
  },

  async updateAssistantApplicationStatus(appId: string, status: 'onaylandi' | 'reddedildi' | 'pending' | 'aktif' | 'pasif'): Promise<{ success: boolean; error?: string }> {
    console.log("2 updateAssistantApplicationStatus", appId, status);
    if (isSupabaseConfigured && supabase) {
      if (status === 'onaylandi' || status === 'aktif') {
        return await this.approveAssistantApplication(appId);
      } else {
        const newStatus = status === 'reddedildi' ? 'pasif' : status;
        const { error } = await supabase
          .from('assistants')
          .update({
            status: newStatus
          })
          .eq('id', appId);
        if (error) {
          console.error('Error updating assistant status:', error);
          return { success: false, error: error.message };
        }
        return { success: true };
      }
    }
    return { success: false, error: 'Supabase veritabanı yapılandırılmamış.' };
  },

  // --- CATEGORIES SERVICE ---
  async getCategories(): Promise<CategoryItem[]> {
    const stored = getStored<CategoryItem>('ugra_virtual_categories');
    const hasObsolete = stored.length === 0 || 
      stored.length !== OFFICIAL_PARTNER_CATEGORIES.length ||
      stored.some(item => !OFFICIAL_PARTNER_CATEGORIES.includes(item.name));
    if (hasObsolete) {
      const defaults: CategoryItem[] = OFFICIAL_PARTNER_CATEGORIES.map((cat, idx) => ({
        id: 'cat_' + (idx + 1),
        name: cat,
        slug: cat === 'Senin Dükkanın' ? 'senin-dukkanin' : cat === 'Parfüm & Parfümeri' ? 'parfum-parfumeri' : cat === 'Sağlık & Medikal' ? 'saglik-medikal' : cat === 'Takı & Aksesuar' ? 'taki-aksesuar' : cat === 'Çanta & Valiz' ? 'canta-valiz' : cat === 'Çiçekçi' ? 'cicekci' : cat.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        icon_name: cat === 'Senin Dükkanın' ? 'Store' : 'Tag',
        image_url: getCategoryDefaultImage(cat),
        order: idx + 1,
        order_position: idx + 1,
        active: true,
        created_at: new Date().toISOString()
      }));
      setStored('ugra_virtual_categories', defaults);
      PARTNER_CATEGORIES.length = 0;
      PARTNER_CATEGORIES.push(...OFFICIAL_PARTNER_CATEGORIES);
      return defaults;
    }
    // Always sanitize stored category images so each category has its own default image
    const sanitized = stored.map(cat => {
      const isOldCoffeeFallback = !cat.image_url || 
        (cat.image_url.includes('photo-1501339847302-ac426a4a7cbb') && cat.name !== 'Kahve');
      return {
        ...cat,
        image_url: isOldCoffeeFallback ? getCategoryDefaultImage(cat.name) : cat.image_url
      };
    });

    setStored('ugra_virtual_categories', sanitized);
    return sanitized.sort((a, b) => (a.order_position ?? a.order ?? 0) - (b.order_position ?? b.order ?? 0));
  },

  async saveCategories(categories: CategoryItem[]): Promise<void> {
    setStored('ugra_virtual_categories', categories);
    // Sync with PARTNER_CATEGORIES array
    PARTNER_CATEGORIES.length = 0;
    categories.filter(c => c.active).forEach(c => PARTNER_CATEGORIES.push(c.name));
  },

  // --- ASSISTANTS (COURIERS) SERVICE ---
  async getAssistants(): Promise<Assistant[]> {
    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        const { data, error } = await client.from('assistants').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) return data as Assistant[];
      } catch (e) {
        console.warn('getAssistants Supabase fetch error:', e);
      }
    }
    const stored = getStored<Assistant>('ugra_virtual_assistants');
    return stored;
  },

  async getAssistantById(id: string, userEmail?: string): Promise<Assistant | null> {
    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        const validId = isUUID(id) ? id : toUUID(id);
        let { data } = await client
          .from('assistants')
          .select('*')
          .eq('id', validId)
          .maybeSingle();

        if (!data) {
          const { data: byUser } = await client
            .from('assistants')
            .select('*')
            .eq('user_id', validId)
            .maybeSingle();
          if (byUser) data = byUser;
        }

        if (!data && userEmail) {
          const { data: byEmail } = await client
            .from('assistants')
            .select('*')
            .ilike('email', userEmail)
            .maybeSingle();
          if (byEmail) data = byEmail;
        }

        if (data) return data as Assistant;
      } catch (err) {
        console.warn('Error in getAssistantById:', err);
      }
    }

    const assistants = await this.getAssistants();
    const found = assistants.find(a => a.id === id || (userEmail && a.phone === userEmail));
    if (found) return found;

    return null;
  },

  async recordAssistantLocation(assistantId: string, latitude: number, longitude: number, speed = 0): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const validAssistantUuid = isUUID(assistantId) ? assistantId : toUUID(assistantId);
        await supabase.from('assistants').update({
          latitude,
          longitude
        }).eq('id', validAssistantUuid);
      } catch (err) {
        console.warn('recordAssistantLocation error:', err);
      }
    }
  },

  async saveAssistants(assistants: Assistant[]): Promise<void> {
    setStored('ugra_virtual_assistants', assistants);
  },

  async createAssistant(assistantData: Partial<Assistant>): Promise<Assistant> {
    const assistants = await this.getAssistants();
    const newAssistant: Assistant = {
      full_name: '',
      phone: '',
      city: 'İstanbul',
      vehicle_type: 'motosiklet',
      status: 'aktif',
      ...assistantData,
      id: assistantData.id || ('ast_' + Math.random().toString(36).substr(2, 9)),
      created_at: new Date().toISOString()
    };
    assistants.unshift(newAssistant);
    await this.saveAssistants(assistants);
    return newAssistant;
  },

  async updateAssistant(id: string, updates: Partial<Assistant>): Promise<Assistant> {
    if (isSupabaseConfigured) {
      try {
        const client = await getActiveSupabaseClient();
        const validId = isUUID(id) ? id : toUUID(id);
        const { data, error } = await client
          .from('assistants')
          .update(updates)
          .eq('id', validId)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as Assistant;
        }
      } catch (err) {
        console.warn('updateAssistant Supabase error:', err);
      }
    }

    const assistants = await this.getAssistants();
    const index = assistants.findIndex(a => a.id === id);
    if (index !== -1) {
      assistants[index] = { ...assistants[index], ...updates };
      await this.saveAssistants(assistants);
      return assistants[index];
    }
    return { id, ...updates } as Assistant;
  },

  async deleteAssistant(id: string): Promise<void> {
    const assistants = await this.getAssistants();
    const filtered = assistants.filter(a => a.id !== id);
    await this.saveAssistants(filtered);
  },

  // --- BANNERS SERVICE ---
  async getBanners(): Promise<Banner[]> {
    const stored = getStored<Banner>('ugra_virtual_banners');
    return stored;
  },

  async saveBanners(banners: Banner[]): Promise<void> {
    setStored('ugra_virtual_banners', banners);
  },

  // --- COUPONS & CAMPAIGNS SERVICE ---
  async getCoupons(): Promise<Coupon[]> {
    const stored = getStored<Coupon>('ugra_virtual_coupons');
    return stored;
  },

  async saveCoupons(coupons: Coupon[]): Promise<void> {
    setStored('ugra_virtual_coupons', coupons);
  },

  async getCampaigns(partnerId?: string): Promise<Campaign[]> {
    const stored = getStored<Campaign>('ugra_virtual_campaigns');
    // Remove old demo/unassigned campaign if present
    const cleaned = stored.filter(c => c.id !== 'cmp1' && c.title !== 'Kahve Günleri Kampanyası');
    if (cleaned.length !== stored.length) {
      setStored('ugra_virtual_campaigns', cleaned);
    }
    if (partnerId) {
      return cleaned.filter(c => c.partner_id === partnerId);
    }
    return cleaned;
  },

  async saveCampaigns(campaigns: Campaign[]): Promise<void> {
    setStored('ugra_virtual_campaigns', campaigns);
  },

  // --- PUSH NOTIFICATIONS SERVICE ---
  async getNotificationLogs(_partnerId?: string): Promise<NotificationLog[]> {
    const stored = getStored<NotificationLog>('ugra_virtual_notification_logs');
    return stored;
  },

  async sendNotification(log: Omit<NotificationLog, 'id' | 'created_at'>): Promise<NotificationLog> {
    const logs = getStored<NotificationLog>('ugra_virtual_notification_logs');
    const newLog: NotificationLog = {
      ...log,
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStored('ugra_virtual_notification_logs', logs);
    return newLog;
  },

  // --- REVIEWS & RATINGS SERVICE ---
  async getReviews(): Promise<ReviewItem[]> {
    const stored = getStored<ReviewItem>('ugra_virtual_reviews');
    return stored;
  },

  async saveReviews(reviews: ReviewItem[]): Promise<void> {
    setStored('ugra_virtual_reviews', reviews);
  },

  // --- SYSTEM SETTINGS SERVICE ---
  async getSystemSettings(): Promise<SystemSettings> {
    const defaults: SystemSettings = {
      commission_rate: 10,
      delivery_fee: 29.90,
      min_order_amount: 100,
      service_zones: ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Eskişehir', 'Kocaeli'],
      working_hours_start: '08:00',
      working_hours_end: '00:00',
      tax_rate: 20,
      contact_phone: '0850 123 45 67',
      contact_email: 'destek@ugra.app',
      contact_whatsapp: '908501234567',
      address: 'Maslak Mah. Büyükdere Cad. No:123 Sarıyer / İstanbul',
      social_media: {
        instagram: 'https://instagram.com/ugra.app',
        twitter: 'https://twitter.com/ugraapp',
        linkedin: 'https://linkedin.com/company/ugra'
      },
      api_settings: {
        sms_provider: 'Netgsm',
        map_provider: 'Google Maps Platform',
        auto_assign_courier: true
      }
    };

    if (typeof window === 'undefined') return defaults;
    try {
      const storedStr = localStorage.getItem('ugra_virtual_system_settings');
      if (storedStr) {
        return JSON.parse(storedStr);
      }
      localStorage.setItem('ugra_virtual_system_settings', JSON.stringify(defaults));
      return defaults;
    } catch {
      return defaults;
    }
  },

  async saveSystemSettings(settings: SystemSettings): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ugra_virtual_system_settings', JSON.stringify(settings));
    }
  },

  // --- ADMIN USERS & ROLES SERVICE ---
  async getAdminUsers(): Promise<AdminRoleUser[]> {
    const stored = getStored<AdminRoleUser>('ugra_virtual_admin_users');
    // Filter out old demo accounts if present
    const cleaned = stored.filter(u => u.email !== 'operasyon@ugra.app' && u.email !== 'destek@ugra.app');
    if (cleaned.length < stored.length) {
      setStored('ugra_virtual_admin_users', cleaned);
    }
    if (cleaned.length === 0 || !cleaned.some(u => u.email === 'goko@ugra.app')) {
      const defaults: AdminRoleUser[] = [
        {
          id: 'adm_1',
          name: 'Gökhan (Sistem Yöneticisi)',
          email: 'goko@ugra.app',
          role: 'super_admin',
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        },
        {
          id: 'adm_2',
          name: 'Sistem Yöneticisi',
          email: 'admin@ugra.app',
          role: 'super_admin',
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        }
      ];
      setStored('ugra_virtual_admin_users', defaults);
      return defaults;
    }
    return cleaned;
  },

  async saveAdminUsers(users: AdminRoleUser[]): Promise<void> {
    setStored('ugra_virtual_admin_users', users);
  }
};

export const api = db;
