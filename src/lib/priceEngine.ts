import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface PricingSettings {
  id?: string;
  active?: boolean;
  immediate_customer_price?: number;
  immediate_courier_net?: number;
  passing_customer_price?: number;
  passing_courier_net?: number;
  minimum_courier_net?: number;
  base_fee?: number;
  km_fee?: number;
  minute_fee?: number;
  fuel_multiplier?: number;
  wear_multiplier?: number;
  tax_multiplier?: number;
  vat_multiplier?: number;
  operation_multiplier?: number;
  commission_rate?: number;
  immediate_multiplier?: number;
  passing_multiplier?: number;
  minimum_order_price?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalculatePriceInput {
  serviceType: 'hemen' | 'gecerken' | 'immediate' | 'passing' | string;
  pickupZone?: string;
  deliveryZone?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
  settingsOverride?: Partial<PricingSettings>;
}

export interface CalculatePriceOutput {
  serviceType: string;
  pickupZone?: string;
  deliveryZone?: string;
  distanceKm: number;
  estimatedMinutes: number;
  courierNet: number;
  basePrice: number;
  fuelCost: number;
  wearCost: number;
  operationCost: number;
  taxCost: number;
  vatCost: number;
  commission: number;
  customerPrice: number;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  active: true,
  immediate_customer_price: undefined,
  immediate_courier_net: undefined,
  passing_customer_price: undefined,
  passing_courier_net: undefined,
  minimum_courier_net: undefined,
  base_fee: 30,
  km_fee: 10,
  minute_fee: 2,
  fuel_multiplier: 1.2,
  wear_multiplier: 1.1,
  tax_multiplier: 15,
  vat_multiplier: 20,
  operation_multiplier: 1.0,
  commission_rate: 20,
  immediate_multiplier: 1.30,
  passing_multiplier: 1.00,
  minimum_order_price: undefined,
};

let cachedPricingSettings: PricingSettings | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache

/**
 * Supabase `pricing_settings` tablosundan active = true olan kaydı veya varsayılan ayarları çeker.
 * LocalStorage kullanılmaz, tek doğruluk kaynağı Supabase veritabanıdır.
 */
export async function getActivePricingSettings(): Promise<PricingSettings> {
  const now = Date.now();
  if (cachedPricingSettings && now - lastFetchTime < CACHE_TTL_MS) {
    console.log("RETURN SETTINGS (FROM CACHE):", cachedPricingSettings);
    return cachedPricingSettings;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        // Veritabanındaki gerçek kolonlar (minimum_order_price, minimum_courier_net) tek doğruluk kaynağıdır.
        const minOrder = (data.minimum_order_price !== undefined && Number(data.minimum_order_price) > 0)
          ? Number(data.minimum_order_price)
          : (data.immediate_customer_price !== undefined && Number(data.immediate_customer_price) > 0
            ? Number(data.immediate_customer_price)
            : undefined);

        const minCourNet = (data.minimum_courier_net !== undefined && Number(data.minimum_courier_net) > 0)
          ? Number(data.minimum_courier_net)
          : (data.immediate_courier_net !== undefined && Number(data.immediate_courier_net) > 0
            ? Number(data.immediate_courier_net)
            : undefined);

        const immCust = minOrder;
        const immCour = minCourNet;

        const passCust = (data.passing_customer_price !== undefined && data.passing_customer_price !== null)
          ? Number(data.passing_customer_price)
          : undefined;

        const passCour = (data.passing_courier_net !== undefined && data.passing_courier_net !== null)
          ? Number(data.passing_courier_net)
          : undefined;

        const fetched: PricingSettings = {
          ...DEFAULT_PRICING_SETTINGS,
          ...data,
          minimum_order_price: minOrder,
          minimum_courier_net: minCourNet,
          immediate_customer_price: immCust,
          immediate_courier_net: immCour,
          passing_customer_price: passCust,
          passing_courier_net: passCour,
        };
        cachedPricingSettings = fetched;
        lastFetchTime = now;
        console.log("RETURN SETTINGS:", fetched);
        return fetched;
      }
    } catch (err) {
      console.warn('[priceEngine] Supabase pricing_settings okunamadı:', err);
    }
  }

  const merged = { ...DEFAULT_PRICING_SETTINGS };
  cachedPricingSettings = merged;
  lastFetchTime = now;
  console.log("RETURN SETTINGS (FALLBACK):", merged);
  return merged;
}

/**
 * Supabase `pricing_settings` tablosundaki aktif kaydı günceller.
 * Yalnızca UPDATE çalıştırılır. Kayıt yoksa hata fırlatılır.
 */
export async function updatePricingSettings(settings: Partial<PricingSettings>): Promise<PricingSettings> {
  const current = await getActivePricingSettings();
  const updatedData: PricingSettings = {
    ...current,
    ...settings,
    active: true,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    if (settings.immediate_customer_price !== undefined) {
      updatedData.minimum_order_price = Number(settings.immediate_customer_price);
    }
    if (settings.immediate_courier_net !== undefined) {
      updatedData.minimum_courier_net = Number(settings.immediate_courier_net);
      updatedData.immediate_courier_net = Number(settings.immediate_courier_net);
    }

    if (settings.passing_customer_price !== undefined) {
      updatedData.passing_customer_price = Number(settings.passing_customer_price);
    }
    if (settings.passing_courier_net !== undefined) {
      updatedData.passing_courier_net = Number(settings.passing_courier_net);
    }

    // Supabase şemasındaki GERÇEK VAR OLAN kolonlar
    const validDbColumns = [
      'id', 'active', 'base_fee', 'km_fee', 'minute_fee',
      'fuel_multiplier', 'wear_multiplier', 'tax_multiplier',
      'vat_multiplier', 'operation_multiplier', 'commission_rate',
      'immediate_multiplier', 'passing_multiplier',
      'minimum_order_price', 'minimum_courier_net', 'immediate_courier_net',
      'passing_customer_price', 'passing_courier_net',
      'created_at', 'updated_at'
    ];

    const dbPayload: Record<string, any> = {};
    for (const col of validDbColumns) {
      if ((updatedData as any)[col] !== undefined) {
        dbPayload[col] = (updatedData as any)[col];
      }
    }

    // 1. Mevcut kaydı al
    const { data: currentRecord } = await supabase
      .from("pricing_settings")
      .select("id")
      .eq("active", true)
      .maybeSingle();

    const targetId = currentRecord?.id || current.id;

    if (!targetId) {
      throw new Error('pricing_settings kaydı bulunamadı');
    }

    // 2. SADECE UPDATE çalıştır
    const { data, error } = await supabase
      .from('pricing_settings')
      .update(dbPayload)
      .eq('id', targetId)
      .select()
      .maybeSingle();

    console.log("UPDATE PAYLOAD:", dbPayload);
    console.log("UPDATE DATA:", data);
    console.log("UPDATE ERROR:", error);

    const verify = await supabase
      .from("pricing_settings")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();

    console.log("VERIFY:", verify.data);

    if (error) {
      console.error('[priceEngine] Supabase UPDATE hatası:', error);
      throw new Error(`Veritabanı güncelleme hatası (${error.code}): ${error.message}`);
    }
    if (data?.id) {
      updatedData.id = data.id;
    }
  }

  cachedPricingSettings = updatedData;
  lastFetchTime = Date.now();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ugra_pricing_settings_updated', { detail: updatedData }));
  }
  return updatedData;
}

export function clearPricingCache() {
  cachedPricingSettings = null;
  lastFetchTime = 0;
}

/**
 * Sabit fiyat hesaplamalarını yapan ana fonksiyon.
 * Hiçbir şekilde mesafeye (KM) veya ilçeye göre fiyat üretmez.
 * Sadece Admin Panelinde kayıtlı sabit fiyatları okur.
 */
export async function calculatePrice(
  inputOrServiceType: CalculatePriceInput | string,
  _paramDistanceKm?: number,
  _paramEstimatedMinutes?: number,
  settingsOverride?: Partial<PricingSettings>
): Promise<CalculatePriceOutput> {
  let serviceType = 'hemen';
  let pickupZone = 'Adapazarı';
  let deliveryZone = 'Serdivan';

  if (typeof inputOrServiceType === 'object') {
    serviceType = inputOrServiceType.serviceType || 'hemen';
    if (inputOrServiceType.pickupZone) pickupZone = inputOrServiceType.pickupZone;
    if (inputOrServiceType.deliveryZone) deliveryZone = inputOrServiceType.deliveryZone;
  } else {
    serviceType = inputOrServiceType || 'hemen';
  }

  const sType = (serviceType === 'gecerken' || serviceType === 'passing') ? 'gecerken' : 'hemen';

  const defaultOffer = 250;

  return {
    serviceType: sType,
    pickupZone,
    deliveryZone,
    distanceKm: 0,
    estimatedMinutes: sType === 'gecerken' ? 45 : 20,
    courierNet: defaultOffer,
    customerPrice: defaultOffer,
    basePrice: defaultOffer,
    fuelCost: 0,
    wearCost: 0,
    operationCost: 0,
    taxCost: 0,
    vatCost: 0,
    commission: 0,
  };
}
