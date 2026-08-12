import { db, Partner } from './supabase';

/**
 * Central WhatsApp order routing number constant.
 * All store orders will be dispatched to this single WhatsApp number.
 * Easily modifiable for future business requirements.
 */
export const CENTRAL_WHATSAPP_NUMBER = '905394659154'; // +90 539 465 91 54

/**
 * Toggle for WhatsApp routing mode:
 * true = Route all orders to CENTRAL_WHATSAPP_NUMBER.
 * false = Route orders directly to individual partner numbers.
 */
export const USE_CENTRAL_WHATSAPP = true;

/**
 * Formats a telephone string into international WhatsApp format (e.g., 905xxxxxxxxx)
 */
export function formatWhatsAppPhone(phoneStr?: string): string {
  if (!phoneStr) return CENTRAL_WHATSAPP_NUMBER;
  let clean = phoneStr.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '90' + clean.substring(1);
  } else if (!clean.startsWith('90') && clean.length === 10) {
    clean = '90' + clean;
  }
  return clean || CENTRAL_WHATSAPP_NUMBER;
}

export interface WhatsAppOrderItem {
  title: string;
  quantity: number;
  price?: number;
}

export interface WhatsAppOrderDetails {
  storeName?: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  locationUrl?: string;
  latitude?: number;
  longitude?: number;
  paymentType?: string;
  note?: string;
  items: WhatsAppOrderItem[];
  totalAmount: number;
  orderDate?: string;
}

/**
 * Formats WhatsApp order message strictly as requested:
 * Includes store name, order number, customer details, address, location link, payment type, note, itemized products with unit and subtotal, total, and timestamp.
 */
export function buildWhatsAppOrderMessage(details: WhatsAppOrderDetails): string {
  let paymentLabel = 'Kapıda Nakit Ödeme';
  const pt = (details.paymentType || '').toLowerCase();
  if (pt === 'kapida_kart' || pt === 'card' || pt === 'kredi_karti') {
    paymentLabel = 'Kapıda Kredi / Banka Kartı';
  } else if (pt === 'kapida_nakit' || pt === 'cash' || pt === 'nakit') {
    paymentLabel = 'Kapıda Nakit Ödeme';
  } else if (pt === 'online') {
    paymentLabel = 'Online Ödeme';
  } else if (details.paymentType) {
    paymentLabel = details.paymentType;
  }

  const itemLines = details.items.map((item) => {
    const unitPrice = typeof item.price === 'number' ? `${item.price.toLocaleString('tr-TR')} ₺` : '-';
    const subtotal = typeof item.price === 'number' ? `${(item.price * item.quantity).toLocaleString('tr-TR')} ₺` : '-';
    return `- ${item.title}\n  Adet: ${item.quantity}\n  Birim fiyat: ${unitPrice}\n  Ara toplam: ${subtotal}`;
  }).join('\n\n');

  const dateStr = details.orderDate || new Date().toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const mapsUrl = details.locationUrl || (details.latitude != null && details.longitude != null ? `https://maps.google.com/?q=${details.latitude},${details.longitude}` : undefined);

  const lines: string[] = [
    'Yeni Sipariş',
    '',
    'Mağaza Adı:',
    details.storeName?.trim() || '-',
    '',
    'Sipariş Numarası:',
    details.orderNumber?.trim() || '-',
    '',
    'Müşteri Adı:',
    details.customerName?.trim() || '-',
    '',
    'Telefon:',
    details.customerPhone?.trim() || '-',
    '',
    'Teslimat Adresi:',
    details.address?.trim() || '-',
    ...(mapsUrl ? ['', 'Konum:', mapsUrl] : []),
    '',
    'Ödeme Yöntemi:',
    paymentLabel,
    '',
    'Sipariş Notu:',
    details.note?.trim() || 'Yok',
    '',
    'Sipariş İçeriği:',
    itemLines,
    '',
    'Genel Toplam:',
    `${details.totalAmount.toLocaleString('tr-TR')} ₺`,
    '',
    'Sipariş Tarihi ve Saati:',
    dateStr
  ];

  return lines.join('\n');
}

/**
 * Resolves WhatsApp dispatch target and formats URL.
 * Routes directly to central WhatsApp number (+905394659154) by default.
 */
export async function sendOrderToPartnerWhatsApp(
  partnerId: string,
  fallbackPartner: Partner | null,
  orderDetails: WhatsAppOrderDetails
): Promise<{ success: boolean; waUrl?: string; phone?: string; error?: string }> {
  try {
    let cleanPhone = CENTRAL_WHATSAPP_NUMBER;

    if (!USE_CENTRAL_WHATSAPP) {
      let targetPartner: Partner | null = null;
      if (partnerId) {
        targetPartner = await db.getPartnerById(partnerId);
      }
      if (!targetPartner) {
        targetPartner = fallbackPartner;
      }
      const rawPhone = targetPartner?.phone || fallbackPartner?.phone || '';
      cleanPhone = formatWhatsAppPhone(rawPhone);
    }

    if (!cleanPhone) {
      cleanPhone = CENTRAL_WHATSAPP_NUMBER;
    }

    const messageText = buildWhatsAppOrderMessage(orderDetails);
    const encodedMessage = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    return {
      success: true,
      waUrl,
      phone: cleanPhone
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'WhatsApp mesajı oluşturulamadı.'
    };
  }
}
