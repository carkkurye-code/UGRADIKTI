import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Loader2, Phone, Calendar, ShieldCheck, X, Navigation, 
  MapPin, CheckCircle2, DollarSign, Clock, Radio, Power, AlertCircle, Key,
  LogOut, User, CheckSquare, ListOrdered, Building, Lock, Mail, RefreshCw,
  XCircle, Package, UserCheck, CreditCard, FileText, ExternalLink,
  ChevronDown, ChevronUp, Menu, Wallet, Bell, Settings, ChevronRight, Zap,
  Instagram
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, supabaseAssistant, isSupabaseConfigured, db, Assistant, Order, Partner, City, Franchise, resolveFranchiseForCity, isUUID, toUUID, getExactTableColumns, filterPayloadByValidColumns, filterTaskPayload, filterOrderPayload } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { playNotificationSound, showBrowserNotification } from '@/lib/soundUtils';
import { LiveDispatchService } from '@/lib/dispatchService';
import { eventBus } from '@/lib/eventBus';

interface ApplicationFormData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  city: string;
  cityId: string;
  franchiseId: string;
  motorInfo: string;
  licenseInfo: string;
  experience: string;
  hasCompany: string;
  notes: string;
}

const initialFormData: ApplicationFormData = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  city: '',
  cityId: '',
  franchiseId: '',
  motorInfo: '',
  licenseInfo: '',
  experience: '',
  hasCompany: 'Evet',
  notes: ''
};

export interface ResolvedTaskFields {
  id: string;
  order_number: string;
  service_type: 'hemen' | 'gecerken' | string;
  service_action: 'al' | 'birak';
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  task_description: string;
  store_name?: string;
  pickup_address: string;
  pickup_address_detail: string;
  delivery_address: string;
  delivery_address_detail: string;
  preferred_time?: string | null;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  latitude?: number;
  longitude?: number;
  payment_type: string;
  notes: string;
  total_price: number;
  courier_net: number;
  customer_price: number;
  distance: string;
  duration: string;
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

const taskFieldsCache = new WeakMap<object, ResolvedTaskFields>();

export function getOrderCategoryBadge(order: any): { label: string; className: string } {
  const isStoreTask = Boolean(
    order?.is_task ||
    order?.source === 'tasks' ||
    order?.service_type === 'asistan_siparis' ||
    order?.service_type === 'magaza'
  );

  if (isStoreTask) {
    return {
      label: 'MAĞAZA',
      className: 'bg-purple-50 text-[#7C3AED] border-purple-200'
    };
  }

  const rawService = order?.service_type || order?.delivery_type;
  if (rawService === 'gecerken' || rawService === 'gecerken_ugra') {
    return {
      label: 'GEÇERKEN UĞRA',
      className: 'bg-blue-50 text-[#2563EB] border-blue-200'
    };
  }

  return {
    label: 'HEMEN UĞRA',
    className: 'bg-emerald-50 text-[#10B981] border-emerald-200'
  };
}

export function resolveTaskFields(item: any): ResolvedTaskFields {
  if (!item) {
    return {
      id: '',
      order_number: '',
      service_type: 'hemen',
      service_action: 'al',
      status: 'pending',
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      task_description: '',
      store_name: '',
      pickup_address: '',
      pickup_address_detail: '',
      delivery_address: '',
      delivery_address_detail: '',
      payment_type: 'Kapıda Nakit',
      notes: '',
      total_price: 0,
      courier_net: 0,
      customer_price: 0,
      distance: '',
      duration: '',
    };
  }

  if (typeof item === 'object' && item !== null && taskFieldsCache.has(item)) {
    return taskFieldsCache.get(item)!;
  }

  const o = item.order || item;
  const p = item.payload || o.payload || {};

  // 1. YAPILACAK İŞ (Task Description)
  let taskDescription = '';
  const descCandidates = [
    item.task_description,
    o.task_description,
    p.task_description,
    item.description,
    o.description,
    p.description,
    item.title,
    o.title,
    item.note,
    o.note,
    p.note,
    item.notes,
    o.notes,
    p.notes,
    item.customer_request,
    item.instruction,
    item.instruction_text,
    item.special_request,
    item.special_notes,
    item.service_description,
    item.service_detail,
    p.task,
  ];

  for (const cand of descCandidates) {
    if (cand && typeof cand === 'string' && cand.trim().length > 0 && !cand.startsWith('[')) {
      const cleanCand = cand.trim();
      if (cleanCand !== 'Yapılacak iş belirtilmemiş.' && cleanCand !== 'Hizmet Talebi') {
        taskDescription = cleanCand;
        break;
      }
    }
  }

  // Check items array/string
  if (!taskDescription) {
    const itemsList = item.items || o.items || p.items;
    if (Array.isArray(itemsList) && itemsList.length > 0) {
      taskDescription = itemsList
        .map((it: any) => `${it.quantity || 1}x ${it.title || it.name || it.product_name || 'Ürün'}`)
        .join(', ');
    } else if (typeof itemsList === 'string' && itemsList.trim()) {
      taskDescription = itemsList.trim();
    }
  }

  if (taskDescription) {
    taskDescription = taskDescription
      .replace(/\[(?:Mağaza Siparişi\s*-\s*|Mağaza:\s*|Partner:\s*)[^\]]+\]\s*/gi, '')
      .replace(/^\[.*?\]\s*/g, '')
      .replace(/Müşteri:\s*[^\n\r]*/gi, '')
      .replace(/•?\s*Adres Detayı:[^\n\r]*/gi, '')
      .replace(/•?\s*Ne Zaman:[^\n\r]*/gi, '')
      .replace(/•?\s*Ürün(?:lerin)?\s*Toplamı:[^\n\r]*/gi, '')
      .replace(/•?\s*Asistan\s*Hizmet\s*Bedeli:[^\n\r]*/gi, '')
      .replace(/•?\s*Hizmet\s*Bedeli:[^\n\r]*/gi, '')
      .replace(/•?\s*Genel\s*Toplam:[^\n\r]*/gi, '')
      .replace(/•?\s*Toplam\s*Fiyat:[^\n\r]*/gi, '')
      .replace(/•?\s*Toplam\s*Tutar:[^\n\r]*/gi, '')
      .replace(/•?\s*Müşterinin\s*(?:Toplam\s*)?Ödeyeceği:[^\n\r]*/gi, '')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  } else {
    taskDescription = '';
  }

  // 2. MÜŞTERİ ADI ("Müşteri" yazısı tek başına gösterilmeyecek)
  let customerName = '';
  const nameCandidates = [
    item.customer_name,
    item.client_name,
    item.name,
    o.customer_name,
    o.name,
    p.customer_name,
    p.name,
  ];
  for (const nc of nameCandidates) {
    if (nc && typeof nc === 'string' && nc.trim()) {
      const trimmed = nc.trim();
      if (trimmed !== 'Müşteri') {
        customerName = trimmed;
        break;
      }
    }
  }

  if (!customerName) {
    const textPool = [item.task_description, o.task_description, item.notes, o.notes, p.notes];
    for (const text of textPool) {
      if (typeof text === 'string' && text) {
        const match = text.match(/Müşteri:\s*([^\(\n\r]+)/i);
        if (match && match[1]?.trim()) {
          const nameFound = match[1].trim();
          if (nameFound && nameFound !== 'Müşteri') {
            customerName = nameFound;
            break;
          }
        }
      }
    }
  }

  // 3. TELEFON
  let customerPhone = '';
  const phoneCandidates = [
    item.customer_phone,
    item.phone,
    item.mobile,
    item.telephone,
    o.customer_phone,
    o.phone,
    p.customer_phone,
    p.phone,
  ];
  for (const pc of phoneCandidates) {
    if (pc && typeof pc === 'string' && pc.trim()) {
      customerPhone = pc.trim();
      break;
    }
  }

  if (!customerPhone) {
    const textPool = [item.task_description, o.task_description, item.notes, o.notes, p.notes];
    for (const text of textPool) {
      if (typeof text === 'string' && text) {
        const match = text.match(/Müşteri:[^\(\n\r]*\(([^)]+)\)/i);
        if (match && match[1]?.trim()) {
          customerPhone = match[1].trim();
          break;
        }
      }
    }
  }

  // 4. MAĞAZA / PARTNER ADI
  let storeName = '';
  const storeCandidates = [
    item.store_name,
    item.partner_name,
    item.partner?.business_name,
    item.partner?.name,
    o.store_name,
    o.partner_name,
    o.partner?.business_name,
    o.partner?.name,
    p.store_name,
    p.partner_name,
    p.business_name,
    item.restaurant_name,
    o.restaurant_name,
  ];
  for (const sc of storeCandidates) {
    if (sc && typeof sc === 'string' && sc.trim() && sc.trim() !== 'Mağaza') {
      storeName = sc.trim();
      break;
    }
  }
  if (!storeName) {
    const rawPool = [item.raw_notes, item.task_description, o.task_description, item.notes, o.notes, p.notes];
    for (const text of rawPool) {
      if (typeof text === 'string' && text) {
        const match = text.match(/\[(?:Mağaza Siparişi\s*-\s*|Mağaza:\s*|Partner:\s*)([^\]]+)\]/i);
        if (match && match[1]?.trim()) {
          const found = match[1].trim();
          if (found && found !== 'Mağaza') {
            storeName = found;
            break;
          }
        }
      }
    }
  }

  // 5. ALINACAK ADRES (pickup_address)
  let pickupAddress = '';
  const pickupCandidates = [
    item.pickup_address,
    item.store_address,
    item.partner_address,
    item.origin_address,
    item.start_address,
    item.partner?.address,
    o.pickup_address,
    o.store_address,
    o.partner_address,
    o.origin_address,
    o.partner?.address,
    p.pickup_address,
    p.store_address,
    p.address,
  ];
  for (const pac of pickupCandidates) {
    if (pac && typeof pac === 'string' && pac.trim() && pac.trim() !== 'Mağaza' && pac.trim() !== 'Adres') {
      pickupAddress = pac.trim();
      break;
    }
  }

  // 6. ALINACAK ADRES DETAYI
  let pickupAddressDetail = '';
  const pickupDetailCandidates = [
    item.pickup_address_detail,
    item.pickup_detail,
    item.store_address_detail,
    item.partner_address_detail,
    item.address_detail,
    item.details,
    o.pickup_detail,
    o.pickup_address_detail,
    o.address_detail,
    p.pickup_address_detail,
    p.address_detail,
  ];
  for (const padc of pickupDetailCandidates) {
    if (padc && typeof padc === 'string' && padc.trim()) {
      pickupAddressDetail = padc.trim();
      break;
    }
  }

  // 7. TESLİM ADRESİ
  let deliveryAddress = '';
  const deliveryCandidates = [
    item.delivery_address,
    item.destination_address,
    item.customer_address,
    o.delivery_address,
    o.customer_address,
    p.delivery_address,
  ];
  for (const dac of deliveryCandidates) {
    if (dac && typeof dac === 'string' && dac.trim() && dac.trim() !== 'Adres' && dac.trim() !== 'Teslimat Adresi') {
      deliveryAddress = dac.trim();
      break;
    }
  }

  // 8. TESLİM ADRESİ DETAYI
  let deliveryAddressDetail = '';
  const deliveryDetailCandidates = [
    item.delivery_address_detail,
    item.delivery_detail,
    item.address_detail,
    item.details,
    o.delivery_detail,
    o.address_detail,
    p.delivery_address_detail,
  ];
  for (const dadc of deliveryDetailCandidates) {
    if (dadc && typeof dadc === 'string' && dadc.trim()) {
      if (dadc.trim() !== pickupAddressDetail || !pickupAddress) {
        deliveryAddressDetail = dadc.trim();
        break;
      }
    }
  }

  // 9. ÖDEME
  let paymentType = '';
  const paymentCandidates = [
    item.payment_type,
    item.payment_method,
    o.payment_type,
    p.payment_type,
  ];
  for (const pay of paymentCandidates) {
    if (pay && typeof pay === 'string' && pay.trim()) {
      paymentType = pay.trim();
      break;
    }
  }

  // 10. SİPARİŞ NOTU
  let notes = '';
  const notesCandidates = [
    item.notes,
    item.customer_note,
    o.notes,
    o.customer_note,
    p.customer_note,
    p.notes,
  ];
  for (const n of notesCandidates) {
    if (n && typeof n === 'string' && n.trim()) {
      const clean = n
        .replace(/\[.*?\]/g, '')
        .replace(/•?\s*Adres Detayı:[^\n\r]*/gi, '')
        .replace(/•?\s*Ne Zaman:[^\n\r]*/gi, '')
        .replace(/Müşteri:\s*[^\n\r]*/gi, '')
        .replace(/•?\s*Ürün(?:lerin)?\s*Toplamı:[^\n\r]*/gi, '')
        .replace(/•?\s*Asistan\s*Hizmet\s*Bedeli:[^\n\r]*/gi, '')
        .replace(/•?\s*Genel\s*Toplam:[^\n\r]*/gi, '')
        .replace(/•?\s*Toplam\s*Fiyat:[^\n\r]*/gi, '')
        .replace(/•?\s*Toplam\s*Tutar:[^\n\r]*/gi, '')
        .trim();
      if (clean && clean !== taskDescription && clean !== 'Hizmet Talebi' && clean !== 'Yapılacak iş belirtilmemiş.') {
        notes = clean;
        break;
      }
    }
  }

  // 11. ASİSTAN HİZMET BEDELİ (courier_net / assistant_fee)
  let courierNet = 0;
  const netCandidates = [
    item.courier_net,
    o.courier_net,
    p.courier_net,
    item.assistant_earning,
    item.courier_fee,
    item.assistant_fee,
    o.assistant_earning,
    o.courier_fee,
    o.assistant_fee,
    p.assistant_earning,
    p.courier_fee,
    p.assistant_fee,
  ];
  for (const net of netCandidates) {
    if (typeof net === 'number' && net > 0) {
      courierNet = net;
      break;
    } else if (typeof net === 'string' && !isNaN(parseFloat(net)) && parseFloat(net) > 0) {
      courierNet = parseFloat(net);
      break;
    }
  }

  // 12. ÜRÜNLERİN TOPLAMI (total_price / base_price / products_total)
  let totalPrice = 0;
  const totalCandidates = [
    item.total_price,
    item.base_price,
    item.products_total,
    item.products_price,
    o.total_price,
    o.base_price,
    p.total_price,
    p.base_price,
  ];
  for (const pr of totalCandidates) {
    if (typeof pr === 'number' && pr > 0) {
      totalPrice = pr;
      break;
    } else if (typeof pr === 'string' && !isNaN(parseFloat(pr)) && parseFloat(pr) > 0) {
      totalPrice = parseFloat(pr);
      break;
    }
  }

  // 13. MÜŞTERİ TOPLAM ÖDEYECEĞİ (customer_price)
  let customerPrice = 0;
  const priceCandidates = [
    item.customer_price,
    o.customer_price,
    p.customer_price,
  ];
  for (const pr of priceCandidates) {
    if (typeof pr === 'number' && pr > 0) {
      customerPrice = pr;
      break;
    } else if (typeof pr === 'string' && !isNaN(parseFloat(pr)) && parseFloat(pr) > 0) {
      customerPrice = parseFloat(pr);
      break;
    }
  }

  // Fallback regex parsing from notes/raw_notes/task_description
  const rawTextPool = [
    item.raw_notes,
    item.notes,
    item.task_description,
    o.raw_notes,
    o.notes,
    o.task_description,
    p.notes,
  ];
  for (const text of rawTextPool) {
    if (typeof text === 'string' && text) {
      if (totalPrice === 0) {
        const matchUrun = text.match(/(?:•\s*)?Ürün(?:lerin)?\s*Toplamı:\s*(\d+(?:[.,]\d+)?)/i);
        if (matchUrun && matchUrun[1]) {
          totalPrice = parseFloat(matchUrun[1].replace(',', '.'));
        }
      }
      if (courierNet === 0) {
        const matchAsistan = text.match(/(?:•\s*)?Asistan\s*Hizmet\s*Bedeli:\s*(\d+(?:[.,]\d+)?)/i);
        if (matchAsistan && matchAsistan[1]) {
          courierNet = parseFloat(matchAsistan[1].replace(',', '.'));
        }
      }
      if (customerPrice === 0) {
        const matchGenel = text.match(/(?:•\s*)?(?:Genel\s*Toplam|Toplam\s*Fiyat|Müşterinin\s*(?:Toplam\s*)?Ödeyeceği):\s*(\d+(?:[.,]\d+)?)/i);
        if (matchGenel && matchGenel[1]) {
          customerPrice = parseFloat(matchGenel[1].replace(',', '.'));
        }
      }
    }
  }

  // Price synchronization & consistency logic:
  if (customerPrice === 0) {
    if (totalPrice > 0 && courierNet > 0) {
      customerPrice = totalPrice + courierNet;
    } else if (totalPrice > 0) {
      customerPrice = totalPrice;
    } else if (courierNet > 0) {
      customerPrice = courierNet;
    }
  } else {
    // If customerPrice and courierNet exist, but totalPrice was unset or set equal to customerPrice
    if (courierNet > 0 && (totalPrice === 0 || totalPrice === customerPrice)) {
      totalPrice = customerPrice > courierNet ? (customerPrice - courierNet) : 0;
    } else if (totalPrice > 0 && customerPrice < totalPrice) {
      customerPrice = totalPrice + courierNet;
    }
  }

  // 14. MESAFE VE SÜRE
  let distance = '';
  const distCandidates = [
    item.distance,
    item.estimated_distance,
    item.calc_distance,
    o.distance,
    o.estimated_distance,
    p.distance,
    p.estimated_distance,
  ];
  for (const dist of distCandidates) {
    if (dist !== undefined && dist !== null && String(dist).trim() !== '') {
      const distStr = String(dist).trim();
      distance = distStr.includes('km') || distStr.includes('m') ? distStr : `${distStr} km`;
      break;
    }
  }

  let duration = '';
  const durCandidates = [
    item.duration,
    item.estimated_duration,
    item.estimated_time,
    o.duration,
    o.estimated_duration,
    o.estimated_time,
    p.duration,
    p.estimated_duration,
  ];
  for (const dur of durCandidates) {
    if (dur !== undefined && dur !== null && String(dur).trim() !== '') {
      const durStr = String(dur).trim();
      duration = durStr.includes('dk') || durStr.includes('min') || durStr.includes('saat') ? durStr : `${durStr} dk`;
      break;
    }
  }

  // 15. HİZMET TİPİ (hemen vs gecerken)
  let serviceType: 'hemen' | 'gecerken' = 'hemen';
  const rawServiceType = item.service_type || item.delivery_type || o.service_type || o.delivery_type || p.service_type || p.delivery_type || item.task_type;
  if (rawServiceType === 'gecerken' || rawServiceType === 'gecerken_ugra') {
    serviceType = 'gecerken';
  } else if (rawServiceType === 'hemen' || rawServiceType === 'hemen_ugra') {
    serviceType = 'hemen';
  } else {
    const fullText = (item.notes || '') + ' ' + (item.task_description || '') + ' ' + JSON.stringify(item.items || []) + ' ' + (o.notes || '') + ' ' + (o.task_description || '');
    if (fullText.includes('Geçerken') || fullText.includes('gecerken')) {
      serviceType = 'gecerken';
    } else {
      serviceType = 'hemen';
    }
  }

  // 16. HİZMET EYLEMİ (al vs birak)
  let serviceAction: 'al' | 'birak' = 'al';
  const rawAction = item.service_action || item.service_mode || item.action_type || o.service_action || o.service_mode || o.action_type || p.service_action || p.service_mode || p.action_type;
  if (rawAction === 'birak') {
    serviceAction = 'birak';
  } else if (rawAction === 'al') {
    serviceAction = 'al';
  } else {
    const fullText = (item.notes || '') + ' ' + (item.task_description || '') + ' ' + JSON.stringify(item.items || []) + ' ' + (o.notes || '') + ' ' + (o.task_description || '');
    if (fullText.includes('Hazır Olanı Bırak') || fullText.includes('Bırak') || fullText.includes('birak')) {
      serviceAction = 'birak';
    } else {
      serviceAction = 'al';
    }
  }

  const id = item.id || o.id || '';
  const orderNumber = item.order_number || (id ? id.slice(0, 8).toUpperCase() : 'GÖREV');
  const status = item.status || o.status || 'pending';

  const pLat = item.pickup_lat ?? o.pickup_lat ?? null;
  const pLng = item.pickup_lng ?? o.pickup_lng ?? null;
  const dLat = item.delivery_lat ?? o.delivery_lat ?? item.latitude ?? o.latitude ?? p.latitude ?? null;
  const dLng = item.delivery_lng ?? o.delivery_lng ?? item.longitude ?? o.longitude ?? p.longitude ?? null;

  // 17. ZAMAN TERCİHİ (preferred_time)
  let resolvedPreferredTime: string | null =
    item.preferred_time || o.preferred_time || p.preferred_time || item.raw_preferred_time || null;

  if (!resolvedPreferredTime) {
    const rawNotesList = [
      item.raw_notes,
      o.raw_notes,
      item.notes,
      o.notes,
      p.notes,
      item.task_description,
      o.task_description,
    ].filter((n): n is string => typeof n === 'string' && n.length > 0);

    for (const str of rawNotesList) {
      const match = str.match(/(?:•\s*)?Ne Zaman:\s*([^\n\r]+)/i);
      if (match && match[1]?.trim()) {
        resolvedPreferredTime = match[1].trim();
        break;
      }
    }
  }

  if (!resolvedPreferredTime && serviceType === 'gecerken') {
    resolvedPreferredTime = 'Gün içinde fark etmez';
  }

  const resolved: ResolvedTaskFields = {
    id,
    order_number: orderNumber,
    service_type: serviceType,
    service_action: serviceAction,
    status,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_address: deliveryAddress || item.customer_address || o.customer_address || '',
    task_description: taskDescription,
    store_name: storeName,
    pickup_address: pickupAddress,
    pickup_address_detail: pickupAddressDetail,
    delivery_address: deliveryAddress,
    delivery_address_detail: deliveryAddressDetail,
    preferred_time: resolvedPreferredTime,
    pickup_lat: pLat,
    pickup_lng: pLng,
    delivery_lat: dLat,
    delivery_lng: dLng,
    latitude: dLat ?? pLat,
    longitude: dLng ?? pLng,
    payment_type: paymentType || 'Kapıda Nakit',
    notes,
    total_price: totalPrice,
    courier_net: courierNet,
    customer_price: customerPrice,
    distance,
    duration,
  };

  if (typeof item === 'object' && item !== null) {
    taskFieldsCache.set(item, resolved);
  }
  return resolved;
}

// Sub-components for clean reusable UI rendering according to guidelines
const TaskDescriptionCard = React.memo(function TaskDescriptionCard({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description || description.trim() === '' || description === 'Yapılacak iş belirtilmemiş.' || description === 'Hizmet Talebi') {
    return null;
  }

  const cleanDesc = description
    .replace(/\[(?:Mağaza Siparişi\s*-\s*|Mağaza:\s*|Partner:\s*)[^\]]+\]\s*/gi, '')
    .replace(/^\[.*?\]\s*/g, '')
    .replace(/Müşteri:\s*[^\n\r]*/gi, '')
    .replace(/•?\s*Adres Detayı:[^\n\r]*/gi, '')
    .replace(/•?\s*Ne Zaman:[^\n\r]*/gi, '')
    .replace(/•?\s*Ürün(?:lerin)?\s*Toplamı:[^\n\r]*/gi, '')
    .replace(/•?\s*Asistan\s*Hizmet\s*Bedeli:[^\n\r]*/gi, '')
    .replace(/•?\s*Hizmet\s*Bedeli:[^\n\r]*/gi, '')
    .replace(/•?\s*Genel\s*Toplam:[^\n\r]*/gi, '')
    .replace(/•?\s*Toplam\s*Fiyat:[^\n\r]*/gi, '')
    .replace(/•?\s*Toplam\s*Tutar:[^\n\r]*/gi, '')
    .replace(/•?\s*Müşterinin\s*(?:Toplam\s*)?Ödeyeceği:[^\n\r]*/gi, '')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  if (!cleanDesc) {
    return null;
  }

  const isLong = cleanDesc.length > 110 || cleanDesc.split('\n').length > 4;

  return (
    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB] space-y-1">
      <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block">
        YAPILACAK İŞ
      </span>
      <div className={`text-[#1F2937] font-medium text-xs leading-relaxed ${isExpanded ? 'max-h-[250px] overflow-y-auto pr-1' : 'line-clamp-4'}`}>
        <p className="whitespace-pre-wrap">{cleanDesc}</p>
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#2563EB] font-bold text-xs pt-0.5 transition-colors cursor-pointer"
        >
          {isExpanded ? 'Daha Az Göster' : 'Devamını Gör'}
        </button>
      )}
    </div>
  );
});

const CustomerOfferCard = React.memo(function CustomerOfferCard({
  totalPrice,
  courierNet,
  customerPrice,
}: {
  totalPrice?: number;
  courierNet?: number;
  customerPrice?: number;
}) {
  const pTotal = Number(totalPrice) || 0;
  const cNet = Number(courierNet) || 0;
  let cTotal = Number(customerPrice) || 0;

  if (cTotal === 0 && (pTotal > 0 || cNet > 0)) {
    cTotal = pTotal + cNet;
  }

  const effectiveProductTotal = pTotal > 0
    ? pTotal
    : (cTotal > cNet && cNet > 0 ? (cTotal - cNet) : 0);

  const effectiveGrandTotal = cTotal > 0
    ? (cTotal >= effectiveProductTotal ? cTotal : (effectiveProductTotal + cNet))
    : (effectiveProductTotal + cNet);

  return (
    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB] space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider">
          MÜŞTERİ TEKLİFİ
        </span>
      </div>

      <div className="space-y-1.5 pt-0.5">
        {effectiveProductTotal > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280] font-medium">Ürünlerin Toplamı</span>
            <span className="font-semibold text-[#1F2937] font-mono text-sm">
              {effectiveProductTotal} TL
            </span>
          </div>
        )}

        {cNet > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7280] font-medium">Asistan Hizmet Bedeli</span>
            <span className="font-bold text-[#2563EB] font-mono text-sm">
              {cNet} TL
            </span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
        <div className="text-left">
          <div className="text-xs font-bold text-[#1F2937]">Müşterinin Toplam Ödeyeceği</div>
        </div>
        <div className="font-bold text-[#10B981] text-lg font-mono">
          {effectiveGrandTotal || effectiveProductTotal || cNet || 0} TL
        </div>
      </div>
    </div>
  );
});

const PickupAddressCard = React.memo(function PickupAddressCard({
  storeName,
  pickupAddress,
  pickupAddressDetail,
  pickupLat,
  pickupLng,
}: {
  storeName?: string;
  pickupAddress?: string;
  pickupAddressDetail?: string;
  pickupLat?: number;
  pickupLng?: number;
}) {
  const hasStore = !!(storeName && storeName.trim() !== '' && storeName.trim() !== 'Mağaza');
  const hasAddress = !!(pickupAddress && pickupAddress.trim() !== '' && pickupAddress.trim() !== 'Mağaza' && pickupAddress.trim() !== storeName?.trim());

  if (!hasStore && !hasAddress && !pickupAddress) {
    return null;
  }

  const hasCoords = pickupLat != null && pickupLng != null && Number(pickupLat) !== 0 && Number(pickupLng) !== 0;

  const mapHref = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${pickupLat},${pickupLng}`
    : (hasAddress && pickupAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`
        : (hasStore && storeName
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(storeName)}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress || storeName || 'Sakarya')}`
          )
      );

  return (
    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB] text-xs space-y-1.5 w-full min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
          ALINACAK ADRES
        </span>
        <a
          href={mapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[#1F2937] border border-[#E5E7EB] font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all shrink-0 ml-auto flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3 text-[#6B7280]" />
          <span>Haritada Aç</span>
        </a>
      </div>
      <div className="space-y-0.5 text-left min-w-0 w-full">
        {hasStore && (
          <p className="text-[#1F2937] text-xs font-bold leading-snug break-words">
            {storeName}
          </p>
        )}
        {hasAddress && (
          <p className="text-[#4B5563] text-xs font-normal leading-relaxed break-words whitespace-pre-wrap">
            {pickupAddress}
          </p>
        )}
        {!hasStore && !hasAddress && (
          <p className="text-[#1F2937] text-xs font-medium leading-relaxed">
            {storeName || pickupAddress || ''}
          </p>
        )}
      </div>
      {pickupAddressDetail && (
        <p className="text-[#6B7280] text-[11px] pt-1 border-t border-[#E5E7EB]/60 leading-normal break-words whitespace-pre-wrap min-w-0 w-full text-left">
          Adres Detayı: {pickupAddressDetail}
        </p>
      )}
    </div>
  );
});

const CustomerInfoCard = React.memo(function CustomerInfoCard({ name, phone }: { name?: string; phone?: string }) {
  const cleanName = name && name.trim() !== '' && name.trim() !== 'Müşteri' ? name.trim() : null;
  const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;

  return (
    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB] space-y-1.5 text-xs w-full min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block shrink-0">MÜŞTERİ BİLGİLERİ</span>
        {cleanPhone ? (
          <a
            href={`tel:${cleanPhone}`}
            className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[#1F2937] border border-[#E5E7EB] font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all shrink-0 ml-auto flex items-center gap-1"
          >
            <Phone className="w-3 h-3 text-[#6B7280]" />
            <span>Müşteriyi Ara</span>
          </a>
        ) : (
          <span className="px-2.5 py-1 bg-white opacity-50 text-[#6B7280] border border-[#E5E7EB] font-bold text-[10px] rounded-lg shadow-sm shrink-0 ml-auto flex items-center gap-1 cursor-not-allowed">
            <Phone className="w-3 h-3 text-[#6B7280]" />
            <span>Müşteriyi Ara</span>
          </span>
        )}
      </div>
      <div className="space-y-0.5 min-w-0">
        {cleanName && (
          <div className="text-[#1F2937] font-semibold text-xs truncate">
            <span>{cleanName}</span>
          </div>
        )}
        <div className="text-[#6B7280] font-mono text-xs">
          <span>Telefon: {cleanPhone || 'Belirtilmemiş'}</span>
        </div>
      </div>
    </div>
  );
});

const DistanceDurationCard = React.memo(function DistanceDurationCard({ distance, duration }: { distance?: string; duration?: string }) {
  if (!distance && !duration) return null;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {distance && (
        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
          <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Tahmini Mesafe</span>
          <span className="text-[#1F2937] font-medium text-xs font-mono block">{distance}</span>
        </div>
      )}
      {duration && (
        <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
          <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Tahmini Süre</span>
          <span className="text-[#1F2937] font-medium text-xs font-mono block">{duration}</span>
        </div>
      )}
    </div>
  );
});

export function AsistanPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Mode switcher: 'panel' or 'application'
  const [activeTabMode, setActiveTabMode] = useState<'panel' | 'application'>('panel');
  
  // Auth state (Supabase Auth)
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState<boolean>(false);

  // Assistant & Operations state
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [connectedPartner, setConnectedPartner] = useState<Partner | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Assistant Subscription state
  const [subscription, setSubscription] = useState<AssistantSubscription | null>(null);
  const [subLoading, setSubLoading] = useState<boolean>(false);
  const [renewalSubmitting, setRenewalSubmitting] = useState<boolean>(false);
  
  // Drawer & Modal state for mobile courier experience
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<'wallet' | 'notifications' | 'settings' | 'subscription' | null>(null);
  

  // Tabs inside Assistant Panel: 'pending' | 'active' | 'completed' | 'profile' | 'iban'
  const [panelTab, setPanelTab] = useState<'pending' | 'active' | 'completed' | 'profile' | 'iban'>('pending');

  // IBAN Form State
  const [ibanAccountHolder, setIbanAccountHolder] = useState<string>('');
  const [ibanBankName, setIbanBankName] = useState<string>('');
  const [ibanValue, setIbanValue] = useState<string>('');
  const [isSavingIban, setIsSavingIban] = useState<boolean>(false);

  useEffect(() => {
    if (currentAssistant) {
      setIbanAccountHolder(currentAssistant.account_holder || currentAssistant.full_name || '');
      setIbanBankName(currentAssistant.bank_name || '');
      setIbanValue(currentAssistant.iban || '');
    }
  }, [currentAssistant]);

  const handleIbanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!raw.startsWith('TR') && raw.length > 0) {
      if (raw.startsWith('T')) raw = 'TR' + raw.slice(1);
      else if (raw.startsWith('R')) raw = 'TR' + raw;
      else raw = 'TR' + raw;
    }
    raw = raw.slice(0, 26);

    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 6 || i === 10 || i === 14 || i === 18 || i === 22) {
        formatted += ' ';
      }
      formatted += raw[i];
    }
    setIbanValue(formatted);
  };

  const handleIbanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssistant?.id) {
      toast({
        title: "Hata",
        description: "Asistan oturumu bulunamadı.",
        variant: "destructive"
      });
      return;
    }

    const cleanIban = ibanValue.replace(/\s+/g, '').toUpperCase();
    if (!cleanIban.startsWith('TR') || cleanIban.length !== 26) {
      toast({
        title: "Geçersiz IBAN Formatı",
        description: "Lütfen TR ile başlayan 26 karakterlik geçerli bir Türkiye IBAN adresi giriniz.",
        variant: "destructive"
      });
      return;
    }

    setIsSavingIban(true);
    try {
      const updated = await db.updateAssistant(currentAssistant.id, {
        account_holder: ibanAccountHolder,
        bank_name: ibanBankName,
        iban: ibanValue
      });

      if (updated) {
        setCurrentAssistant(updated);
      }

      toast({
        title: "Bilgiler Kaydedildi",
        description: "IBAN bilgileriniz başarıyla kaydedildi.",
      });
    } catch (err: any) {
      console.error("Error saving IBAN:", err);
      toast({
        title: "Kayıt Hatası",
        description: err?.message || "IBAN bilgileri kaydedilirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsSavingIban(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Kopyalandı",
      description: `${label} panoya kopyalandı.`,
    });
  };
  
  // Orders & Tasks lists
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [rejectedOrderIds, setRejectedOrderIds] = useState<Set<string>>(new Set());
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter Orders for specific tabs
  const pendingOrders = allOrders.filter((o) => {
    if (
      rejectedOrderIds.has(o.id) ||
      ((o as any).task_id && rejectedOrderIds.has((o as any).task_id)) ||
      ((o as any).order_id && rejectedOrderIds.has((o as any).order_id))
    ) {
      return false;
    }
    const isPendingStatus = ['pending', 'created', 'bekliyor', 'beklemede', 'hazirlaniyor', 'hazir'].includes(o.status);
    const isAssignedToMeOrOpen = !o.assistant_id || (currentAssistant && (o.assistant_id === currentAssistant.id || o.assistant_id === currentAssistant.user_id));
    return isPendingStatus && isAssignedToMeOrOpen;
  });

  const activeOrders = allOrders.filter((o) => {
    const isActiveStatus = ['rezerve', 'accepted', 'reserved', 'dogrulandi', 'yolda', 'kuryede', 'teslimatta', 'in_progress', 'on_the_way'].includes(o.status);
    const isMine = currentAssistant && (o.assistant_id === currentAssistant.id || o.assistant_id === currentAssistant.user_id);
    return isActiveStatus && isMine;
  });

  const completedOrders = allOrders.filter((o) => {
    const isCompletedStatus = ['teslim_edildi', 'tamamlandi', 'completed'].includes(o.status);
    const isMine = currentAssistant && (o.assistant_id === currentAssistant.id || o.assistant_id === currentAssistant.user_id);
    return isCompletedStatus && isMine;
  });

  // Cancellation modal state for "Ulaşılamadı"
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Delivery Code Verification state
  const [verificationCodes, setVerificationCodes] = useState<Record<string, string>>({});
  const [verificationErrors, setVerificationErrors] = useState<Record<string, string>>({});
  const [verifiedOrderIds, setVerifiedOrderIds] = useState<Record<string, boolean>>({});
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);

  // Lock body scroll when cancel modal is open
  useEffect(() => {
    if (cancelModalOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [cancelModalOrder]);

  // Candidate Application state
  const [vehicleType, setVehicleType] = useState<'motosiklet' | 'bisiklet'>('motosiklet');
  const [stage, setStage] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [activeCities, setActiveCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityResolution, setCityResolution] = useState<{
    count: number;
    franchiseId: string | null;
    franchise: Franchise | null;
    franchises: Franchise[];
  }>({ count: 0, franchiseId: null, franchise: null, franchises: [] });
  const [cityResolving, setCityResolving] = useState(false);

  // Load active cities for candidate application
  useEffect(() => {
    let isMounted = true;
    const fetchActiveCities = async () => {
      setLoadingCities(true);
      try {
        const cts = await db.getActiveCities();
        if (isMounted) {
          setActiveCities(cts || []);
        }
      } catch (err) {
        console.error('Error fetching active cities for assistant registration:', err);
      } finally {
        if (isMounted) setLoadingCities(false);
      }
    };
    fetchActiveCities();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Initialize Supabase Session & Listen to Auth Changes
  const checkAndInitSession = useCallback(async () => {
    setAuthLoading(true);
    setLoginError(null);
    try {
      if (!isSupabaseConfigured || !supabaseAssistant) {
        setAuthUser(null);
        setCurrentAssistant(null);
        return;
      }

      const { data: sessionData } = await supabaseAssistant.auth.getSession();
      let user = sessionData?.session?.user || null;

      if (!user) {
        // Fallback session check from localStorage for active assistants
        if (typeof window !== 'undefined') {
          const rawLocalSession = localStorage.getItem('ugra_assistant_session');
          if (rawLocalSession) {
            try {
              const parsed = JSON.parse(rawLocalSession);
              if (parsed?.assistant?.id || parsed?.user?.email) {
                const activeClient = supabaseAssistant || supabase;
                let freshAsst: Assistant | null = null;

                if (parsed.assistant?.id) {
                  const { data } = await activeClient
                    .from('assistants')
                    .select('*')
                    .eq('id', parsed.assistant.id)
                    .maybeSingle();
                  if (data) freshAsst = data as Assistant;
                }

                if (!freshAsst && parsed.user?.email) {
                  const { data } = await activeClient
                    .from('assistants')
                    .select('*')
                    .ilike('email', parsed.user.email)
                    .maybeSingle();
                  if (data) freshAsst = data as Assistant;
                }

                if (freshAsst) {
                  const statusStr = (freshAsst.status || '').toLowerCase();
                  const isAllowed = statusStr === 'aktif' || statusStr === 'approved' || statusStr === 'görevde' || freshAsst.active !== false;
                  if (isAllowed) {
                    const fallbackUser = parsed.user || { id: freshAsst.user_id || freshAsst.id, email: freshAsst.email };
                    setAuthUser(fallbackUser);
                    setCurrentAssistant(freshAsst);
                    setIsOnline(freshAsst.is_online !== false);
                    if (freshAsst.partner_id) {
                      const partnerData = await db.getPartnerById(freshAsst.partner_id);
                      setConnectedPartner(partnerData);
                    }
                    return;
                  }
                }
              }
            } catch (e) {
              console.warn('[AsistanPage] Local assistant session parse error:', e);
            }
          }
        }
        setAuthUser(null);
        setCurrentAssistant(null);
        return;
      }

      // Check public.profiles using authenticated client
      const activeClient = supabaseAssistant || (await getAuthenticatedClient());
      let profile: any = null;
      if (isUUID(user.id)) {
        const { data, error: profileErr } = await activeClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileErr) {
          console.error('Error fetching profile for assistant session:', profileErr);
        }
        profile = data;
      }

      // Rule 3: profile.assistant_id or user.id
      const assistantId = profile?.assistant_id || profile?.id || user.id;

      // Rule 4 & 5: Fetch from assistants table
      let asstRecord = await db.getAssistantById(assistantId, user.email || undefined);

      if (!asstRecord && isSupabaseConfigured) {
        try {
          if (isUUID(assistantId)) {
            const { data: rawAsst } = await activeClient
              .from('assistants')
              .select('*')
              .eq('id', assistantId)
              .maybeSingle();
            if (rawAsst) asstRecord = rawAsst as Assistant;
          }
          if (!asstRecord && isUUID(user.id)) {
            const { data: rawAsstByUser } = await activeClient
              .from('assistants')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            if (rawAsstByUser) asstRecord = rawAsstByUser as Assistant;
          }
          if (!asstRecord && user.email) {
            const { data: rawAsstByEmail } = await activeClient
              .from('assistants')
              .select('*')
              .ilike('email', user.email)
              .maybeSingle();
            if (rawAsstByEmail) asstRecord = rawAsstByEmail as Assistant;
          }
        } catch (e) {
          console.warn('[AsistanPage] Assistant fallback query notice:', e);
        }
      }

      // Only sign out if profile explicitly exists AND has another role (like partner or customer) AND no assistant record exists
      if (profile && profile.role && profile.role !== 'assistant' && profile.role !== 'courier' && !asstRecord) {
        await supabaseAssistant.auth.signOut();
        if (typeof window !== 'undefined') localStorage.removeItem('ugra_assistant_session');
        setAuthUser(null);
        setCurrentAssistant(null);
        setLoginError('Bu hesap asistan hesabı değildir.');
        return;
      }

      setAuthUser(user);

      if (asstRecord) {
        // Link user_id if missing
        if (user.id && isUUID(user.id) && asstRecord.user_id !== user.id) {
          try {
            await activeClient
              .from('assistants')
              .update({ user_id: user.id })
              .eq('id', asstRecord.id);
            asstRecord.user_id = user.id;
          } catch (_) {}
        }

        setCurrentAssistant(asstRecord);
        setIsOnline(asstRecord.is_online !== false);

        // Fetch connected partner if exists
        if (asstRecord.partner_id) {
          const partnerData = await db.getPartnerById(asstRecord.partner_id);
          setConnectedPartner(partnerData);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('ugra_assistant_session', JSON.stringify({
            user: { id: user.id, email: user.email },
            assistant: asstRecord,
            timestamp: Date.now()
          }));
        }
      } else {
        // Construct fallback assistant profile
        const fallbackAsst: Assistant = {
          id: assistantId,
          user_id: user.id,
          full_name: profile?.full_name || user.email?.split('@')[0] || 'Saha Asistanı',
          phone: profile?.phone || '',
          email: user.email,
          city: 'İstanbul',
          vehicle_type: 'motosiklet',
          active: true,
          status: 'aktif',
          is_online: true,
          task_status: 'Müsait',
          created_at: new Date().toISOString()
        };
        setCurrentAssistant(fallbackAsst);
      }
    } catch (err: any) {
      console.error('Session init error:', err);
      setLoginError(err.message || 'Oturum açılırken bir hata oluştu.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAndInitSession();

    if (isSupabaseConfigured && supabaseAssistant) {
      const { data: listener } = supabaseAssistant.auth.onAuthStateChange((event: any) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          checkAndInitSession();
        } else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setCurrentAssistant(null);
        }
      });

      return () => {
        listener?.subscription?.unsubscribe();
      };
    }
  }, [checkAndInitSession]);

  // Check if current user is an approved and active assistant
  const isApprovedAssistant = Boolean(
    currentAssistant && currentAssistant.active !== false
  );

  // Ensure activeTabMode is locked to 'panel' for approved active assistants
  useEffect(() => {
    if (!authLoading) {
      if (isApprovedAssistant && activeTabMode !== 'panel') {
        setActiveTabMode('panel');
      }
    }
  }, [isApprovedAssistant, authLoading, activeTabMode]);

  // Get active authenticated Supabase client for assistant
  const getAuthenticatedClient = useCallback(async () => {
    const clients = [supabaseAssistant, supabase].filter(Boolean);
    for (const c of clients) {
      try {
        const { data } = await c.auth.getSession();
        if (data?.session) {
          return c;
        }
      } catch (_) {}
    }
    return supabaseAssistant || supabase;
  }, []);

  // Fetch tasks assigned to / available for this assistant from public.orders AND public.tasks
  const fetchAssistantOrders = useCallback(async () => {
    if (!currentAssistant) return;
    setOrdersLoading(true);
    try {
      let tasksList: any[] = [];
      if (isSupabaseConfigured) {
        try {
          const activeClient = await getAuthenticatedClient();
          const assistantUserIds = [currentAssistant.user_id, currentAssistant.id].filter(Boolean) as string[];
          const [ordersRes, tasksRes, dispatchOffersRes] = await Promise.all([
            activeClient.from('orders').select('*').order('created_at', { ascending: false }),
            activeClient.from('tasks').select('*').order('created_at', { ascending: false }),
            activeClient.from('dispatch_offers').select('id, order_id, task_id, status').in('assistant_id', assistantUserIds)
          ]);

          const offerMap = new Map<string, string>();
          if (dispatchOffersRes?.data) {
            const rejectedIds = dispatchOffersRes.data
              .filter((item: any) => item.status === 'rejected')
              .flatMap((item: any) => [item.order_id, item.task_id])
              .filter(Boolean);

            setRejectedOrderIds((prev) => {
              const next = new Set(prev);
              rejectedIds.forEach((id: string) => next.add(id));
              return next;
            });

            dispatchOffersRes.data.forEach((offer: any) => {
              if (offer.id) {
                if (offer.task_id) offerMap.set(offer.task_id, offer.id);
                if (offer.order_id) offerMap.set(offer.order_id, offer.id);
              }
            });
          }

          let mappedOrders: any[] = [];
          if (ordersRes.data) {
            mappedOrders = ordersRes.data.map((order: any) => {
              let rawDesc = order.task_description || order.notes || '';
              let extractedName = '';
              const custMatch = rawDesc.match(/Müşteri:\s*([^\(\n\r]+)/i);
              if (custMatch && custMatch[1]?.trim()) {
                extractedName = custMatch[1].trim();
              }

              let extractedPhone = '';
              const phoneMatch = rawDesc.match(/Müşteri:[^\(\n\r]*\(([^)]+)\)/i);
              if (phoneMatch && phoneMatch[1]?.trim()) {
                extractedPhone = phoneMatch[1].trim();
              }

              let extractedStoreName = '';
              const storeMatch = rawDesc.match(/\[(?:Mağaza Siparişi\s*-\s*|Mağaza:\s*|Partner:\s*)([^\]]+)\]/i);
              if (storeMatch && storeMatch[1]?.trim() && storeMatch[1].trim() !== 'Mağaza') {
                extractedStoreName = storeMatch[1].trim();
              }

              let desc = rawDesc;
              if (desc && desc.includes('[') && desc.includes(']')) {
                desc = desc
                  .replace(/^\[.*?\]\s*/, '')
                  .replace(/• Adres Detayı:[^\n\r]*/gi, '')
                  .replace(/• Ne Zaman:[^\n\r]*/gi, '')
                  .trim();
              }
              desc = desc
                .replace(/Müşteri:\s*[^\n\r]*/gi, '')
                .replace(/•?\s*Ürün Toplamı:[^\n\r]*/gi, '')
                .replace(/•?\s*Asistan Hizmet Bedeli:[^\n\r]*/gi, '')
                .replace(/•?\s*Genel Toplam:[^\n\r]*/gi, '')
                .replace(/•?\s*Toplam Fiyat:[^\n\r]*/gi, '')
                .replace(/•?\s*Toplam Tutar:[^\n\r]*/gi, '')
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .trim();

              let noteStr = order.notes || '';
              if (noteStr) {
                noteStr = noteStr
                  .replace(/\[.*?\]/g, '')
                  .replace(/• Adres Detayı:[^\n\r]*/gi, '')
                  .replace(/• Ne Zaman:[^\n\r]*/gi, '')
                  .replace(/Müşteri:\s*[^\n\r]*/gi, '')
                  .replace(/•?\s*Ürün Toplamı:[^\n\r]*/gi, '')
                  .replace(/•?\s*Asistan Hizmet Bedeli:[^\n\r]*/gi, '')
                  .replace(/•?\s*Genel Toplam:[^\n\r]*/gi, '')
                  .trim();
                if (noteStr === desc) noteStr = '';
              }

              const finalName = order.customer_name && order.customer_name !== 'Müşteri' && order.customer_name.trim() !== ''
                ? order.customer_name.trim()
                : (extractedName || 'Müşteri');

              const finalStore = order.store_name || order.partner_name || extractedStoreName || undefined;

              return {
                id: order.id,
                order_id: order.id,
                customer_id: order.customer_id || order.user_id || null,
                user_id: order.user_id || order.customer_id || null,
                customer_name: finalName,
                customer_phone: order.customer_phone || extractedPhone || '',
                customer_address: order.customer_address || order.delivery_address || 'Adres',
                delivery_address: order.delivery_address || order.customer_address || '',
                pickup_address: order.pickup_address || finalStore || '',
                store_name: finalStore,
                payment_type: order.payment_type || 'Kapıda Nakit',
                total_price: Number(order.total_price || order.customer_price || 0),
                customer_price: Number(order.customer_price || order.total_price || 0),
                courier_net: Number(order.courier_net || 0),
                items: order.items || [],
                notes: noteStr || undefined,
                raw_notes: order.notes || null,
                preferred_time: order.preferred_time || null,
                latitude: order.latitude ?? null,
                longitude: order.longitude ?? null,
                accuracy: order.accuracy ?? null,
                street: order.street ?? null,
                district: order.district ?? null,
                city: order.city ?? null,
                province: order.province ?? null,
                postal_code: order.postal_code ?? null,
                place_id: order.place_id ?? null,
                pickup_lat: order.pickup_lat ?? order.latitude ?? null,
                pickup_lng: order.pickup_lng ?? order.longitude ?? null,
                delivery_lat: order.delivery_lat ?? order.latitude ?? null,
                delivery_lng: order.delivery_lng ?? order.longitude ?? null,
                requires_delivery_code: order.requires_delivery_code ?? true,
                delivery_code: order.delivery_code ?? null,
                delivery_code_verified: order.delivery_code_verified ?? false,
                created_at: order.created_at,

                assistant_id: order.assistant_id || null,
                assistant_name: order.assistant_name || null,
                assistant_phone: order.assistant_phone || null,
                status: order.status,
                accepted_at: order.accepted_at || null,
                started_at: order.started_at || order.accepted_at || null,
                completed_at: order.delivered_at || order.completed_at || null,
                cancelled_at: order.cancelled_at || null,
                service_type: order.service_type || 'hemen',
                task_description: desc || undefined,
                offer_id: offerMap.get(order.id) || null,
              };
            });
          }

          let mappedTasks: any[] = [];
          if (tasksRes.data) {
            mappedTasks = tasksRes.data.map((task: any) => {
              let rawDesc = task.task_description || task.description || task.title || task.notes || '';
              let extractedName = '';
              const custMatch = rawDesc.match(/Müşteri:\s*([^\(\n\r]+)/i);
              if (custMatch && custMatch[1]?.trim()) {
                extractedName = custMatch[1].trim();
              }

              let extractedPhone = '';
              const phoneMatch = rawDesc.match(/Müşteri:[^\(\n\r]*\(([^)]+)\)/i);
              if (phoneMatch && phoneMatch[1]?.trim()) {
                extractedPhone = phoneMatch[1].trim();
              }

              let extractedStoreName = '';
              const storeMatch = rawDesc.match(/\[(?:Mağaza Siparişi\s*-\s*|Mağaza:\s*|Partner:\s*)([^\]]+)\]/i);
              if (storeMatch && storeMatch[1]?.trim() && storeMatch[1].trim() !== 'Mağaza') {
                extractedStoreName = storeMatch[1].trim();
              }

              let desc = rawDesc;
              if (desc && desc.includes('[') && desc.includes(']')) {
                desc = desc
                  .replace(/^\[.*?\]\s*/, '')
                  .replace(/• Adres Detayı:[^\n\r]*/gi, '')
                  .replace(/• Ne Zaman:[^\n\r]*/gi, '')
                  .trim();
              }
              desc = desc
                .replace(/Müşteri:\s*[^\n\r]*/gi, '')
                .replace(/•?\s*Ürün Toplamı:[^\n\r]*/gi, '')
                .replace(/•?\s*Asistan Hizmet Bedeli:[^\n\r]*/gi, '')
                .replace(/•?\s*Genel Toplam:[^\n\r]*/gi, '')
                .replace(/•?\s*Toplam Fiyat:[^\n\r]*/gi, '')
                .replace(/•?\s*Toplam Tutar:[^\n\r]*/gi, '')
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .trim();

              let noteStr = task.notes || '';
              if (noteStr) {
                noteStr = noteStr
                  .replace(/\[.*?\]/g, '')
                  .replace(/• Adres Detayı:[^\n\r]*/gi, '')
                  .replace(/• Ne Zaman:[^\n\r]*/gi, '')
                  .replace(/Müşteri:\s*[^\n\r]*/gi, '')
                  .replace(/•?\s*Ürün Toplamı:[^\n\r]*/gi, '')
                  .replace(/•?\s*Asistan Hizmet Bedeli:[^\n\r]*/gi, '')
                  .replace(/•?\s*Genel Toplam:[^\n\r]*/gi, '')
                  .trim();
                if (noteStr === desc) noteStr = '';
              }

              const finalName = task.customer_name && task.customer_name !== 'Müşteri' && task.customer_name.trim() !== ''
                ? task.customer_name.trim()
                : (extractedName || 'Müşteri');

              const finalStore = task.store_name || task.partner_name || extractedStoreName || undefined;

              return {
                id: task.id,
                task_id: task.id,
                is_task: true,
                source: 'tasks',
                customer_id: task.customer_id || task.user_id || null,
                user_id: task.user_id || task.customer_id || null,
                customer_name: finalName,
                customer_phone: task.customer_phone || extractedPhone || '',
                customer_address: task.customer_address || task.delivery_address || 'Adres',
                delivery_address: task.delivery_address || task.customer_address || '',
                pickup_address: task.pickup_address || finalStore || '',
                store_name: finalStore,
                payment_type: task.payment_type || 'Kapıda Kart',
                total_price: Number(task.total_price || task.customer_price || 0),
                customer_price: Number(task.customer_price || task.total_price || 0),
                courier_net: Number(task.courier_net || 0),
                items: task.items || [],
                notes: noteStr || undefined,
                raw_notes: task.notes || null,
                latitude: task.latitude ?? task.pickup_lat ?? null,
                longitude: task.longitude ?? task.pickup_lng ?? null,
                pickup_lat: task.pickup_lat ?? task.latitude ?? null,
                pickup_lng: task.pickup_lng ?? task.longitude ?? null,
                delivery_lat: task.delivery_lat ?? task.latitude ?? null,
                delivery_lng: task.delivery_lng ?? task.longitude ?? null,
                created_at: task.created_at,

                assistant_id: task.assistant_id || null,
                assistant_name: task.assistant_name || null,
                assistant_phone: task.assistant_phone || null,
                status: task.status || 'bekliyor',
                accepted_at: task.accepted_at || null,
                started_at: task.started_at || task.accepted_at || null,
                completed_at: task.completed_at || task.delivered_at || null,
                cancelled_at: task.cancelled_at || null,
                service_type: task.service_type || 'asistan_siparis',
                task_description: desc || 'Mağaza Ürün Siparişi',
                offer_id: offerMap.get(task.id) || null,
              };
            });
          }

          tasksList = [...mappedOrders, ...mappedTasks];
          tasksList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } catch (e) {
          console.warn('[AsistanPage] Supabase orders/tasks fetch warning:', e);
        }
      }

      setAllOrders(tasksList as Order[]);
    } catch (err) {
      console.error('Error fetching assistant tasks:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [currentAssistant, getAuthenticatedClient]);

  // Fetch Assistant Subscription Details
  const fetchAssistantSubscription = useCallback(async () => {
    if (!currentAssistant || !isSupabaseConfigured) return;
    setSubLoading(true);
    try {
      const activeClient = await getAuthenticatedClient();
      const assistantUserIds = [currentAssistant.id, currentAssistant.user_id].filter(Boolean) as string[];
      const { data, error } = await activeClient
        .from('assistant_subscriptions')
        .select('*')
        .in('assistant_id', assistantUserIds)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[AsistanPage] assistant_subscriptions fetch warning:', error);
      } else if (data) {
        setSubscription(data as AssistantSubscription);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.warn('[AsistanPage] Subscription fetch error:', err);
    } finally {
      setSubLoading(false);
    }
  }, [currentAssistant, getAuthenticatedClient]);

  // Renewal / Subscription Request Handler
  const handleRenewalRequest = async () => {
    if (!currentAssistant || !isSupabaseConfigured) return;
    setRenewalSubmitting(true);
    try {
      const activeClient = await getAuthenticatedClient();
      const { data: sessionData } = await activeClient.auth.getSession();

      if (!sessionData?.session) {
        toast({
          title: 'Oturum Hatası',
          description: 'Oturum doğrulanamadı. Lütfen sayfayı yenileyip tekrar giriş yapın.',
          variant: 'destructive'
        });
        setRenewalSubmitting(false);
        return;
      }

      const nowIso = new Date().toISOString();
      let rpcSuccess = false;

      // 1. Try secure SECURITY DEFINER RPC function first
      try {
        const { data: rpcData, error: rpcErr } = await activeClient.rpc('request_assistant_subscription', {
          p_assistant_id: currentAssistant.id
        });
        if (!rpcErr && rpcData) {
          rpcSuccess = true;
          if (typeof rpcData === 'object') {
            setSubscription(rpcData as AssistantSubscription);
          }
        }
      } catch (e) {
        console.warn('RPC request_assistant_subscription notice, using fallback:', e);
      }

      // 2. Fallback to direct table query if RPC was unavailable
      if (!rpcSuccess) {
        if (subscription?.id) {
          const { error } = await activeClient
            .from('assistant_subscriptions')
            .update({
              renewal_requested: true,
              renewal_decision: 'pending',
              updated_at: nowIso
            })
            .eq('id', subscription.id);

          if (error) throw error;

          setSubscription((prev) => prev ? {
            ...prev,
            renewal_requested: true,
            renewal_decision: 'pending',
            updated_at: nowIso
          } : null);
        } else {
          const { data: newSubData, error } = await activeClient
            .from('assistant_subscriptions')
            .insert({
              assistant_id: currentAssistant.id,
              status: 'inactive',
              payment_status: 'pending',
              renewal_requested: true,
              renewal_decision: 'pending',
              created_at: nowIso,
              updated_at: nowIso
            })
            .select('*')
            .single();

          if (error) throw error;
          if (newSubData) {
            setSubscription(newSubData as AssistantSubscription);
          }
        }
      }

      await fetchAssistantSubscription();

      toast({
        title: 'Talep Alındı',
        description: 'Abonelik talebiniz yöneticiye gönderildi.',
      });
    } catch (err: any) {
      console.error('Renewal request error:', err);
      toast({
        title: 'Hata',
        description: err.message || 'Abonelik talebi gönderilemedi.',
        variant: 'destructive'
      });
    } finally {
      setRenewalSubmitting(false);
    }
  };

  // Helper calculation for subscription remaining days
  const getSubscriptionDaysRemaining = (expiresAtStr?: string) => {
    if (!expiresAtStr) return 0;
    const expiryDate = new Date(expiresAtStr);
    const now = new Date();
    const expiryUtc = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = expiryUtc - nowUtc;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatTurkishDateStr = (dateStr?: string) => {
    if (!dateStr) return 'Belirtilmemiş';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr.split('T')[0];
    }
  };

  const formatPaymentStatusText = (status?: string) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'pending') return 'Ödeme bekleniyor';
    if (s === 'paid') return 'Ödeme tamamlandı';
    if (s === 'failed') return 'Ödeme başarısız';
    return status;
  };

  // Manual Refresh Handler with minimum visual delay for UX feedback
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const startTime = Date.now();
    try {
      await Promise.all([fetchAssistantOrders(), fetchAssistantSubscription()]);
    } finally {
      const elapsed = Date.now() - startTime;
      const minDuration = 500; // Minimum 500ms spinning feedback for smooth UX
      if (elapsed < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
      }
      setIsRefreshing(false);
    }
  }, [fetchAssistantOrders, fetchAssistantSubscription, isRefreshing]);

  useEffect(() => {
    if (currentAssistant) {
      fetchAssistantOrders();
      fetchAssistantSubscription();
      const interval = setInterval(fetchAssistantOrders, 8000);
      return () => clearInterval(interval);
    }
  }, [currentAssistant, fetchAssistantOrders, fetchAssistantSubscription]);

  const fetchOrdersRef = useRef(fetchAssistantOrders);
  useEffect(() => {
    fetchOrdersRef.current = fetchAssistantOrders;
  }, [fetchAssistantOrders]);

  // Subscribe to Realtime orders and tasks table updates
  useEffect(() => {
    if (!currentAssistant?.id) return;

    let ordersChannel: any = null;
    let tasksChannel: any = null;
    const client = supabaseAssistant || supabase;
    if (isSupabaseConfigured && client) {
      ordersChannel = client
        .channel(`assistant-orders-${currentAssistant.id}`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrdersRef.current();
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[AsistanPage] Realtime subscribed for assistant orders`);
          }
        });

      tasksChannel = client
        .channel(`assistant-tasks-${currentAssistant.id}`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'tasks' }, () => {
          fetchOrdersRef.current();
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[AsistanPage] Realtime subscribed for assistant tasks`);
          }
        });
    }

    return () => {
      if (client) {
        if (ordersChannel) client.removeChannel(ordersChannel);
        if (tasksChannel) client.removeChannel(tasksChannel);
      }
    };
  }, [currentAssistant?.id]);

  // Rule 1 & 2: Asistan Giriş (Assistant Login)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);

    try {
      if (!loginEmail || !loginPassword) {
        throw new Error('E-posta adresi ve şifrenizi giriniz.');
      }

      const cleanEmail = loginEmail.trim().toLowerCase();

      if (isSupabaseConfigured && supabaseAssistant) {
        let authUser: SupabaseUser | null = null;
        let authSuccess = false;

        // 1. Try Supabase Auth signInWithPassword
        const { data: authData, error: authErr } = await supabaseAssistant.auth.signInWithPassword({
          email: cleanEmail,
          password: loginPassword,
        });

        if (!authErr && authData?.user) {
          authUser = authData.user;
          authSuccess = true;
        }

        // 2. Fetch assistant record from DB
        const activeClient = supabaseAssistant || supabase;
        let dbAssistant: Assistant | null = null;

        if (authUser?.id && isUUID(authUser.id)) {
          const { data: byUser } = await activeClient
            .from('assistants')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();
          if (byUser) dbAssistant = byUser as Assistant;
        }

        if (!dbAssistant) {
          const { data: byEmail } = await activeClient
            .from('assistants')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
          if (byEmail) dbAssistant = byEmail as Assistant;
        }

        // 3. Evaluate assistant status & credentials
        if (dbAssistant) {
          const asstStatus = (dbAssistant.status || '').toLowerCase();

          if (asstStatus === 'pending') {
            if (authSuccess) await supabaseAssistant.auth.signOut();
            throw new Error('Başvurunuz yönetici onayı bekliyor.');
          }

          if (asstStatus === 'rejected' || asstStatus === 'pasif' || dbAssistant.active === false) {
            if (authSuccess) await supabaseAssistant.auth.signOut();
            throw new Error('Asistan hesabınız dondurulmuş veya pasif durumdadır.');
          }

          // If auth was not successful, verify stored password or sync Auth user
          const dbPassword = (dbAssistant as any).password;
          if (!authSuccess) {
            if (dbPassword && dbPassword !== loginPassword) {
              throw new Error('E-posta adresi veya şifre hatalı.');
            }

            // Attempt user registration / sign up to sync Auth user
            const { data: signUpData } = await supabaseAssistant.auth.signUp({
              email: cleanEmail,
              password: loginPassword,
              options: {
                data: {
                  full_name: dbAssistant.full_name,
                  role: 'assistant'
                }
              }
            });

            if (signUpData?.user) {
              authUser = signUpData.user;
              authSuccess = true;
            } else {
              // Try login once more in case signup linked credentials
              const { data: retryData } = await supabaseAssistant.auth.signInWithPassword({
                email: cleanEmail,
                password: loginPassword,
              });
              if (retryData?.user) {
                authUser = retryData.user;
                authSuccess = true;
              }
            }
          }

          // Ensure user_id in assistants table is linked to authUser.id
          if (authUser?.id && isUUID(authUser.id) && dbAssistant.user_id !== authUser.id) {
            try {
              await activeClient
                .from('assistants')
                .update({ user_id: authUser.id })
                .eq('id', dbAssistant.id);
              dbAssistant.user_id = authUser.id;
            } catch (linkErr) {
              console.warn('[AsistanPage] Failed linking user_id:', linkErr);
            }
          }
        } else {
          // No record in assistants table
          if (!authSuccess) {
            throw new Error('E-posta adresi veya şifre hatalı.');
          }
        }

        if (!authSuccess && !dbAssistant) {
          throw new Error('E-posta adresi veya şifre hatalı.');
        }

        // Store fallback local session for resilience
        if (typeof window !== 'undefined') {
          const effectiveUser = authUser || { id: dbAssistant?.user_id || dbAssistant?.id || 'asst_session', email: cleanEmail };
          localStorage.setItem('ugra_assistant_session', JSON.stringify({
            user: effectiveUser,
            assistant: dbAssistant,
            timestamp: Date.now()
          }));
        }

        toast({
          title: 'Giriş Başarılı ✅',
          description: 'Asistan paneline yönlendiriliyorsunuz.',
        });

        await checkAndInitSession();
      } else {
        throw new Error('Supabase veritabanı bağlantısı henüz yapılandırılmamış.');
      }
    } catch (err: any) {
      console.error('Assistant login catch error:', err);
      setLoginError(err.message || 'Giriş sırasında hata oluştu.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Rule 13: Sign Out (Çıkış Yap)
  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ugra_assistant_session');
      }
      if (isSupabaseConfigured && supabaseAssistant) {
        await supabaseAssistant.auth.signOut();
      }
      setAuthUser(null);
      setCurrentAssistant(null);
      setConnectedPartner(null);
      setLoginError(null);
      toast({
        title: 'Çıkış Yapıldı',
        description: 'Asistan oturumunuz kapatıldı.',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Online / Offline Toggle
  const handleToggleOnline = async () => {
    if (!currentAssistant) return;

    if (isOnline && activeOrders.length > 0) {
      return;
    }

    const nextState = !isOnline;
    setIsOnline(nextState);

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('assistants')
          .update({ status: nextState ? 'aktif' : 'pasif' })
          .eq('id', currentAssistant.id);
      }
      toast({
        title: nextState ? 'Çevrimiçi Olundu 🟢' : 'Çevrimdışı Olundu 🔴',
        description: nextState ? 'Saha sipariş bildirimleri aktif.' : 'Saha bildirimleri durduruldu.',
      });
    } catch (err) {
      console.warn('Error updating online status:', err);
    }
  };

  // 1. STATUS = "beklemede" -> "Kabul Et"
  const handleAcceptOrder = async (orderId: string, offerId?: string) => {
    if (!currentAssistant) return;

    if (activeOrders.length > 0) {
      toast({
        title: 'Aktif Siparişiniz Var',
        description: 'Aynı anda birden fazla aktif sipariş alamazsınız.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(orderId);
    const assistantId = currentAssistant.id || currentAssistant.user_id || '';
    const nowIso = new Date().toISOString();

    // Optimistic state update so UI moves order to active immediately
    setAllOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, assistant_id: assistantId, status: 'accepted' }
          : o
      )
    );

    try {
      const targetItem = allOrders.find(o => o.id === orderId || (o as any).task_id === orderId);
      const isTask = Boolean((targetItem as any)?.is_task || (targetItem as any)?.source === 'tasks' || (targetItem as any)?.service_type === 'asistan_siparis');

      if (isSupabaseConfigured) {
        const activeClient = await getAuthenticatedClient();
        if (isTask) {
          await activeClient
            .from('tasks')
            .update({
              assistant_id: assistantId,
              status: 'accepted',
              accepted_at: nowIso
            })
            .eq('id', orderId);
        } else {
          const orderCols = await getExactTableColumns('orders');
          const rawOrderPayload: Record<string, any> = {
            assistant_id: assistantId,
            status: 'accepted',
            accepted_at: nowIso,
            updated_at: nowIso
          };
          const orderPayload = filterPayloadByValidColumns(rawOrderPayload, orderCols);
          if (Object.keys(orderPayload).length > 0) {
            const { error: ordersErr } = await activeClient
              .from('orders')
              .update(orderPayload)
              .eq('id', orderId);

            if (ordersErr) {
              console.error('Error updating orders table for accept:', ordersErr);
            }
          }
        }
      }

      const targetOfferId = offerId || `off_${Date.now()}`;
      await LiveDispatchService.acceptOffer(orderId, targetOfferId, assistantId);

      await fetchAssistantOrders();
      setPanelTab('active');
    } catch (err: any) {
      console.error('Error accepting order:', err);
      toast({
        title: 'Hata',
        description: err.message || 'Sipariş kabul edilemedi.',
        variant: 'destructive',
      });
      await fetchAssistantOrders();
    } finally {
      setActionLoading(null);
    }
  };

  // 3. STATUS = "rezerve" -> "Doğrulandı"
  const handleVerifyOrder = async (orderId: string) => {
    if (!currentAssistant || !isUUID(orderId)) return;
    setActionLoading(orderId);
    try {
      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured) {
        const activeClient = await getAuthenticatedClient();
        const { data: tData } = await activeClient.from('tasks').select('id, order_id').eq('id', orderId).maybeSingle();
        if (tData) {
          const taskPayload = filterTaskPayload({ status: 'dogrulandi', updated_at: nowIso });
          await activeClient.from('tasks').update(taskPayload).eq('id', orderId);
          if (tData.order_id && isUUID(tData.order_id)) {
            const orderPayload = filterOrderPayload({ status: 'dogrulandi', verified_at: nowIso });
            await activeClient.from('orders').update(orderPayload).eq('id', tData.order_id);
          }
        } else {
          const orderPayload = filterOrderPayload({ status: 'dogrulandi', verified_at: nowIso });
          const { error: ordersErr } = await activeClient
            .from('orders')
            .update(orderPayload)
            .eq('id', orderId);

          if (ordersErr) {
            console.error('Error updating orders table for dogrulandi:', ordersErr);
            throw new Error(ordersErr.message || 'Sipariş doğrulanırken veritabanı hatası oluştu.');
          }
        }
      }

      await fetchAssistantOrders();
    } catch (err: any) {
      console.error('Error verifying order:', err);
      toast({
        title: 'Hata',
        description: err.message || 'İşlem gerçekleştirilemedi.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // 4. STATUS = "rezerve" -> "Ulaşılamadı" (İptal)
  const handleCancelOrder = async (orderId: string, reason: string) => {
    if (!currentAssistant || !isUUID(orderId)) return;
    setIsSubmittingCancel(true);
    try {
      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured) {
        const activeClient = await getAuthenticatedClient();
        const { data: tData } = await activeClient.from('tasks').select('id, order_id').eq('id', orderId).maybeSingle();
        if (tData) {
          const taskPayload = filterTaskPayload({ status: 'cancelled', cancelled_at: nowIso });
          await activeClient.from('tasks').update(taskPayload).eq('id', orderId);
          if (tData.order_id && isUUID(tData.order_id)) {
            const orderPayload = filterOrderPayload({ status: 'cancelled', cancel_reason: reason });
            await activeClient.from('orders').update(orderPayload).eq('id', tData.order_id);
          }
        } else {
          const orderPayload = filterOrderPayload({ status: 'cancelled', cancel_reason: reason });
          const res1 = await activeClient
            .from('orders')
            .update(orderPayload)
            .eq('id', orderId);

          if (res1.error) {
            console.error('Error updating orders table for cancel:', res1.error);
            throw new Error(res1.error.message || 'Sipariş iptal edilirken veritabanı hatası oluştu.');
          }
        }
      }

      setCancelModalOrder(null);
      setCancelReasonText('');
      await fetchAssistantOrders();
    } catch (err: any) {
      console.error('Error canceling order:', err);
      toast({
        title: 'Hata',
        description: err.message || 'İptal işlemi gerçekleştirilemedi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // IBAN Gönder Handler
  const handleSendIban = async (order: Order) => {
    if (!currentAssistant) return;

    const accountHolder = (currentAssistant.account_holder || '').trim();
    const bankName = (currentAssistant.bank_name || '').trim();
    const iban = (currentAssistant.iban || '').trim();

    if (!accountHolder || !bankName || !iban) {
      toast({
        title: 'Eksik IBAN Bilgisi',
        description: 'Lütfen önce IBAN Bilgilerim bölümünden bilgilerinizi kaydedin.',
        variant: 'destructive',
      });
      setPanelTab('iban');
      return;
    }

    const targetCustomerId = order.customer_id || order.user_id;
    if (!targetCustomerId) {
      toast({
        title: 'Müşteri Bulunamadı',
        description: 'Sipariş için geçerli müşteri ID tespiti yapılamadı.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(`iban_${order.id}`);
    try {
      const messageContent = `Hesap Sahibi: ${accountHolder}\nBanka: ${bankName}\nIBAN: ${iban}`;

      if (isSupabaseConfigured) {
        const activeClient = await getAuthenticatedClient();
        const notifCols = await getExactTableColumns('notifications');
        const colsSet = new Set(notifCols);

        const payload: Record<string, any> = {
          title: 'Asistan Ödeme Bilgilerini Gönderdi',
          message: messageContent,
          type: 'iban_details',
        };

        if (colsSet.has('user_id') || colsSet.size === 0) {
          payload.user_id = targetCustomerId;
        }
        if (colsSet.has('recipient_id')) {
          payload.recipient_id = targetCustomerId;
        }
        if (colsSet.has('recipient_profile_id')) {
          payload.recipient_profile_id = targetCustomerId;
        }
        if (colsSet.has('body')) {
          payload.body = messageContent;
        }
        if (colsSet.has('is_read')) {
          payload.is_read = false;
        }
        if (colsSet.has('read')) {
          payload.read = false;
        }

        const { error: notifErr } = await activeClient.from('notifications').insert(payload);
        if (notifErr) {
          console.error('Error inserting notification:', notifErr);
        }
      }

      toast({
        title: 'IBAN Gönderildi',
        description: 'Ödeme bilgileri müşteriye başarıyla iletildi.',
      });
    } catch (err: any) {
      console.error('Error sending IBAN details:', err);
      toast({
        title: 'Hata',
        description: err.message || 'IBAN bilgileri gönderilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // 5. STATUS = "dogrulandi" -> "Yola Çık"
  const handlePickupOrder = async (orderId: string) => {
    if (!currentAssistant || !isUUID(orderId)) return;
    setActionLoading(orderId);
    try {
      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured) {
        const activeClient = await getAuthenticatedClient();
        const { data: tData } = await activeClient.from('tasks').select('id, order_id').eq('id', orderId).maybeSingle();
        if (tData) {
          const taskPayload = filterTaskPayload({ status: 'yolda', updated_at: nowIso });
          await activeClient.from('tasks').update(taskPayload).eq('id', orderId);
          if (tData.order_id && isUUID(tData.order_id)) {
            const orderPayload = filterOrderPayload({ status: 'yolda' });
            await activeClient.from('orders').update(orderPayload).eq('id', tData.order_id);
          }
        } else {
          const orderPayload = filterOrderPayload({ status: 'yolda' });
          await activeClient.from('orders').update(orderPayload).eq('id', orderId);
        }
      }

      await fetchAssistantOrders();
    } catch (err: any) {
      console.error('Error updating order to yolda:', err);
      toast({
        title: 'Hata',
        description: err.message || 'İşlem gerçekleştirilemedi.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Teslimat Kodu Doğrulama
  const handleVerifyDeliveryCode = async (order: any) => {
    const targetId = order.id;
    const enteredCode = (verificationCodes[targetId] || '').trim();
    const expectedCode = String(order.delivery_code || '').trim();

    if (!enteredCode || enteredCode.length !== 6) {
      setVerificationErrors(prev => ({ ...prev, [targetId]: 'Teslim kodu 6 haneli olmalıdır.' }));
      return;
    }

    if (enteredCode !== expectedCode) {
      setVerificationErrors(prev => ({ ...prev, [targetId]: 'Teslim kodu hatalı.' }));
      return;
    }

    setVerifyingOrder(targetId);
    setVerificationErrors(prev => ({ ...prev, [targetId]: '' }));

    try {
      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured && isUUID(targetId)) {
        const activeClient = await getAuthenticatedClient();
        const { data: tData } = await activeClient.from('tasks').select('id, order_id').eq('id', targetId).maybeSingle();
        if (tData) {
          const taskPayload = filterTaskPayload({ updated_at: nowIso });
          if (Object.keys(taskPayload).length > 0) {
            await activeClient.from('tasks').update(taskPayload).eq('id', targetId);
          }
          if (tData.order_id && isUUID(tData.order_id)) {
            const orderPayload = filterOrderPayload({ delivery_code_verified: true });
            await activeClient.from('orders').update(orderPayload).eq('id', tData.order_id);
          }
        } else {
          const orderPayload = filterOrderPayload({ delivery_code_verified: true });
          await activeClient.from('orders').update(orderPayload).eq('id', targetId);
        }
      }

      setVerifiedOrderIds(prev => ({ ...prev, [targetId]: true }));
      await fetchAssistantOrders();
    } catch (err: any) {
      console.error('Error verifying delivery code:', err);
      setVerificationErrors(prev => ({ ...prev, [targetId]: 'Kod doğrulanırken hata oluştu.' }));
    } finally {
      setVerifyingOrder(null);
    }
  };

  // 6. STATUS = "yolda" -> "Teslim Edildi"
  const handleCompleteOrder = async (orderId: string) => {
    if (!currentAssistant || !isUUID(orderId)) return;
    setActionLoading(orderId);
    try {
      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured) {
        const activeClient = await getAuthenticatedClient();
        const { data: tData } = await activeClient.from('tasks').select('id, order_id').eq('id', orderId).maybeSingle();
        if (tData) {
          const taskPayload = filterTaskPayload({ status: 'teslim_edildi', completed_at: nowIso });
          await activeClient.from('tasks').update(taskPayload).eq('id', orderId);
          if (tData.order_id && isUUID(tData.order_id)) {
            const orderPayload = filterOrderPayload({ status: 'teslim_edildi', delivered_at: nowIso });
            await activeClient.from('orders').update(orderPayload).eq('id', tData.order_id);
          }
        } else {
          const orderPayload = filterOrderPayload({ status: 'teslim_edildi', delivered_at: nowIso });
          await activeClient.from('orders').update(orderPayload).eq('id', orderId);
        }
      }

      await fetchAssistantOrders();
      setPanelTab('completed');
    } catch (err: any) {
      console.error('Error completing order:', err);
      toast({
        title: 'Hata',
        description: err.message || 'Sipariş tamamlanamadı.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Sipariş Reddet (Reject Order)
  const handleRejectOrder = async (orderId: string, offerId?: string) => {
    if (!currentAssistant) return;
    setActionLoading(orderId);
    try {
      setRejectedOrderIds((prev) => {
        const next = new Set(prev);
        next.add(orderId);
        return next;
      });

      const targetItem = allOrders.find(o => o.id === orderId || (o as any).task_id === orderId);
      const isTask = Boolean(
        (targetItem as any)?.is_task ||
        (targetItem as any)?.source === 'tasks' ||
        (targetItem as any)?.service_type === 'asistan_siparis' ||
        (targetItem as any)?.service_type === 'magaza'
      );

      if (isSupabaseConfigured) {
        try {
          const activeClient = await getAuthenticatedClient();
          const targetOfferId = offerId || (targetItem as any)?.offer_id;
          const validId = orderId ? (isUUID(orderId) ? orderId : toUUID(orderId)) : null;
          const assistantUserIds = [currentAssistant.user_id, currentAssistant.id].filter(Boolean) as string[];
          const assistantIdToUse = currentAssistant.user_id || currentAssistant.id;

          let updated = false;
          if (targetOfferId && isUUID(targetOfferId)) {
            const { data, error } = await activeClient
              .from('dispatch_offers')
              .update({ status: 'rejected' })
              .eq('id', targetOfferId)
              .select();
            if (error) {
              console.error('[AsistanPage] Reject offer update by offer_id error:', {
                status: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              });
            } else if (data && data.length > 0) {
              updated = true;
            }
          }

          if (!updated && validId) {
            if (isTask) {
              const { data, error } = await activeClient
                .from('dispatch_offers')
                .update({ status: 'rejected' })
                .eq('task_id', validId)
                .in('assistant_id', assistantUserIds)
                .select();
              if (error) {
                console.error('[AsistanPage] Reject offer update by task_id error:', {
                  status: error.code,
                  message: error.message,
                  details: error.details,
                  hint: error.hint
                });
              } else if (data && data.length > 0) {
                updated = true;
              }
            } else {
              const { data, error } = await activeClient
                .from('dispatch_offers')
                .update({ status: 'rejected' })
                .eq('order_id', validId)
                .in('assistant_id', assistantUserIds)
                .select();
              if (error) {
                console.error('[AsistanPage] Reject offer update by order_id error:', {
                  status: error.code,
                  message: error.message,
                  details: error.details,
                  hint: error.hint
                });
              } else if (data && data.length > 0) {
                updated = true;
              }
            }
          }

          if (!updated && validId && assistantIdToUse) {
            const newOfferId = typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : toUUID('off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

            const rawOffer: Record<string, any> = {
              id: newOfferId,
              assistant_id: assistantIdToUse,
              status: 'rejected',
              offered_at: new Date().toISOString()
            };

            if (isTask) {
              rawOffer.task_id = validId;
              // CRITICAL: DO NOT set order_id for store task!
            } else {
              rawOffer.order_id = validId;
            }

            const { error: insertErr } = await activeClient.from('dispatch_offers').insert(rawOffer);
            if (insertErr) {
              console.error('[AsistanPage] Fallback offer insert error:', {
                status: insertErr.code,
                message: insertErr.message,
                details: insertErr.details,
                hint: insertErr.hint
              });
            }
          }

          await LiveDispatchService.rejectOffer(orderId, targetOfferId || '', assistantIdToUse, activeClient);
        } catch (dbErr: any) {
          console.error('[AsistanPage] Reject offer exception:', dbErr);
        }
      }

      await fetchAssistantOrders();
    } catch (err: any) {
      toast({
        title: 'Hata',
        description: err.message || 'İşlem başarısız.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Candidate application handlers
  const handleAppInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCityChange = async (cityId: string) => {
    const selectedCity = activeCities.find(c => c.id === cityId);
    const cityName = selectedCity ? selectedCity.name : '';
    
    setFormData(prev => ({
      ...prev,
      cityId,
      city: cityName,
      franchiseId: ''
    }));

    if (!cityId) {
      setCityResolution({ count: 0, franchiseId: null, franchise: null, franchises: [] });
      return;
    }

    setCityResolving(true);
    try {
      const resolution = await resolveFranchiseForCity(cityId);
      setCityResolution(resolution);
      if (resolution.count === 1 && resolution.franchiseId) {
        setFormData(prev => ({ ...prev, franchiseId: resolution.franchiseId || '' }));
      }
    } catch (err) {
      console.error('Error resolving franchise for city:', err);
      setCityResolution({ count: 0, franchiseId: null, franchise: null, franchises: [] });
    } finally {
      setCityResolving(false);
    }
  };

  const handleAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      toast({
        title: 'Eksik Bilgi',
        description: 'E-posta ve şifre alanları zorunludur.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.cityId) {
      toast({
        title: 'Eksik Bilgi',
        description: 'Lütfen çalışmak istediğiniz şehri seçiniz.',
        variant: 'destructive',
      });
      return;
    }

    if (cityResolution.count === 0) {
      toast({
        title: 'Hizmet Verilemiyor',
        description: 'Seçilen şehirde henüz aktif bayi bulunmadığı için başvuru kabul edilememektedir.',
        variant: 'destructive',
      });
      return;
    }

    if (cityResolution.count > 1 && !formData.franchiseId) {
      toast({
        title: 'Eksik Bilgi',
        description: 'Lütfen çalışmak istediğiniz bayiyi seçiniz.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingApp(true);
    try {
      await db.createAssistantApplication({
        full_name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        vehicle_type: vehicleType,
        city_id: formData.cityId,
        franchise_id: formData.franchiseId || cityResolution.franchiseId || null,
        city: formData.city
      });

      toast({
        title: 'Başvuru Alındı',
        description: 'Asistan başvurunuz başarıyla kaydedilmiştir. Yönetici onayından sonra belirlediğiniz e-posta ve şifre ile giriş yapabilirsiniz.',
      });

      setStage('success');
    } catch (err: any) {
      console.error('Error submitting application:', err);
      toast({
        title: 'Hata',
        description: err.message || 'Başvuru kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingApp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#1F2937] relative overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-30 py-3.5 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 md:px-12 flex justify-between items-center relative min-h-[44px]">
          {/* Sol: Menü Butonu */}
          <div className="flex items-center z-10">
            {currentAssistant && currentAssistant.active !== false ? (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-[#E5E7EB] text-[#1F2937] text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm flex items-center gap-1.5"
                aria-label="Asistan Menüsü"
                title="Asistan Menüsü"
              >
                <Menu className="w-4 h-4 text-[#1F2937]" />
                <span>Menü</span>
              </button>
            ) : (
              <div className="w-11 h-11" />
            )}
          </div>

          {/* Orta: Tam Ortalanmış Çevrimiçi / Çevrimdışı Toggle */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-auto z-10">
            {currentAssistant && currentAssistant.active !== false && (
              <button
                type="button"
                onClick={handleToggleOnline}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-sm border active:scale-95 ${
                  isOnline
                    ? 'bg-emerald-50 text-[#10B981] border-emerald-300'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-gray-50'
                }`}
                title={isOnline ? 'Çevrimdışı olmak için dokunun' : 'Çevrimiçi olmak için dokunun'}
              >
                <div className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  isOnline ? 'bg-[#10B981]' : 'bg-gray-400'
                }`} />
                <span className="tracking-wider uppercase">{isOnline ? 'ÇEVRİMİÇİ' : 'ÇEVRİMDIŞI'}</span>
              </button>
            )}
          </div>

          {/* Sağ: Görevleri Yenile Butonu */}
          <div className="flex items-center z-10">
            <button
              type="button"
              disabled={isRefreshing || ordersLoading}
              onClick={handleManualRefresh}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-[#E5E7EB] text-[#1F2937] text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              title="Görevleri Yenile"
              aria-label="Görevleri Yenile"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1F2937] transition-transform duration-300 ${isRefreshing || ordersLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 md:px-12 py-4 sm:py-6 flex-grow flex flex-col items-center justify-start relative z-10 max-w-4xl">
        {authLoading ? (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <p className="text-xs text-[#6B7280]">Asistan oturum bilgileri kontrol ediliyor...</p>
          </div>
        ) : currentAssistant && currentAssistant.active !== false ? (
          /* ONAYLI VE AKTİF ASİSTAN EKRANI */
          <div className="w-full space-y-4">
            {/* Talep Odaklı Tab Barı (Bekleyen Talep, Aktif Talep) */}
            <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-[#E5E7EB] w-full shadow-sm">
              <button
                type="button"
                onClick={() => setPanelTab('pending')}
                className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  panelTab === 'pending'
                    ? 'bg-[#2563EB] text-white font-bold shadow-sm'
                    : 'text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F8FAFC]'
                }`}
              >
                <span>Bekleyen Talep</span>
                {pendingOrders.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    panelTab === 'pending' ? 'bg-white text-[#2563EB]' : 'bg-[#E5E7EB] text-[#374151]'
                  }`}>
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPanelTab('active')}
                className={`py-2.5 px-2 sm:px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  panelTab === 'active'
                    ? 'bg-[#2563EB] text-white font-bold shadow-sm'
                    : 'text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F8FAFC]'
                }`}
              >
                <span>Aktif Talep</span>
                {activeOrders.length > 0 && (
                  <span className={`w-2 h-2 rounded-full ${panelTab === 'active' ? 'bg-white' : 'bg-[#10B981]'}`} />
                )}
              </button>
            </div>

              {/* TAB CONTENT AREAS */}

              {/* TAB 1: BEKLEYEN GÖREVLER */}
              {panelTab === 'pending' && (
                <div className="space-y-3">
                  {pendingOrders.length === 0 ? (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-sm space-y-2">
                      <h3 className="text-base font-bold text-[#1F2937]">Bekleyen görev bulunmuyor.</h3>
                      <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                        Yeni gelen saha siparişleri burada listelenecektir. Çevrimiçi kaldığınızdan emin olun.
                      </p>
                    </div>
                  ) : (
                    pendingOrders.map((order) => {
                      const r = resolveTaskFields(order);

                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, scale: 0.99 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm relative"
                        >
                          {/* 1. Sipariş No & Service Badge Header */}
                          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const catBadge = getOrderCategoryBadge(order);
                                return (
                                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catBadge.className}`}>
                                    {catBadge.label}
                                  </span>
                                );
                              })()}
                              <span className="font-mono text-xs text-[#6B7280]">
                                #{r.order_number}
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                              Bekleyen
                            </span>
                          </div>

                          {/* 2. Yapılacak İş */}
                          <TaskDescriptionCard description={r.task_description} />

                          {/* 3. Müşteri Teklifi & Asistan Hizmet Bedeli */}
                          <CustomerOfferCard
                            totalPrice={r.total_price}
                            courierNet={r.courier_net}
                            customerPrice={r.customer_price}
                          />

                          {/* 4. Müşteri Bilgileri */}
                          <CustomerInfoCard name={r.customer_name} phone={r.customer_phone} />

                          {/* 5. Alınacak Adres */}
                          <PickupAddressCard
                            storeName={r.store_name}
                            pickupAddress={r.pickup_address}
                            pickupAddressDetail={r.pickup_address_detail}
                            pickupLat={r.pickup_lat}
                            pickupLng={r.pickup_lng}
                          />

                          {/* 6. Teslim Adresi */}
                          {r.delivery_address && (
                            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB] text-xs space-y-1.5 w-full min-w-0">
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-1 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                                  TESLİM ADRESİ
                                </span>
                                <a
                                  href={r.delivery_lat != null && r.delivery_lng != null ? `https://www.google.com/maps/search/?api=1&query=${r.delivery_lat},${r.delivery_lng}` : (r.latitude != null && r.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.delivery_address)}`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[#1F2937] border border-[#E5E7EB] font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all shrink-0 ml-auto flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3 text-[#6B7280]" />
                                  <span>Haritada Aç</span>
                                </a>
                              </div>
                              <p className="text-[#1F2937] text-xs font-medium leading-relaxed break-words whitespace-pre-wrap min-w-0 w-full text-left">{r.delivery_address}</p>
                              {r.delivery_address_detail && (
                                <p className="text-[#6B7280] text-[11px] pt-1 border-t border-[#E5E7EB]/60 leading-normal break-words whitespace-pre-wrap min-w-0 w-full text-left">
                                  Adres Detayı: {r.delivery_address_detail}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Tahmini Mesafe & Süre */}
                          <DistanceDurationCard distance={r.distance} duration={r.duration} />

                          {/* Geçerken UĞRA - Zaman Tercihi */}
                          {r.service_type === 'gecerken' && (
                            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/70 text-xs space-y-0.5">
                              <span className="text-[10px] font-bold text-blue-700 uppercase block">GEÇERKEN UĞRA — ZAMAN TERCİHİ</span>
                              <p className="text-xs text-blue-900 font-semibold">
                                {r.preferred_time || (r.notes?.match(/• Ne Zaman:\s*(.+)/)?.[1]?.trim()) || 'Gün içinde fark etmez'}
                              </p>
                            </div>
                          )}

                          {/* Sipariş Notu */}
                          {r.notes && r.notes.trim() !== '' && (
                            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] text-xs space-y-0.5">
                              <span className="text-[10px] font-semibold text-[#6B7280] uppercase block">Sipariş Notu</span>
                              <p className="text-xs text-[#1F2937] font-normal leading-normal">{r.notes}</p>
                            </div>
                          )}

                          {/* Sipariş kabul et & Reddet Butonları */}
                          <div className="pt-1.5 border-t border-[#E5E7EB] grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              disabled={actionLoading === order.id || activeOrders.length > 0}
                              onClick={() => handleAcceptOrder(order.id)}
                              className="py-3 rounded-xl bg-[#10B981] hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                            >
                              {actionLoading === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                              ) : (
                                <span>Kabul Et</span>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === order.id}
                              onClick={() => handleRejectOrder(order.id, (order as any).offer_id)}
                              className="py-3 rounded-xl bg-white hover:bg-red-50 text-[#EF4444] border border-[#EF4444] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <span>Reddet</span>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: AKTİF GÖREV */}
              {panelTab === 'active' && (
                <div className="space-y-3">
                  {activeOrders.length === 0 ? (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-sm space-y-2">
                      <h3 className="text-base font-bold text-[#1F2937]">Aktif Saha Görevi Bulunmuyor</h3>
                      <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                        Bekleyen görevler sekmesinden yeni bir sipariş kabul ettiğinizde aktif görev detayları burada görüntülenecektir.
                      </p>
                    </div>
                  ) : (
                    activeOrders.map((order) => {
                      const r = resolveTaskFields(order);
                      const currentStatus = order.status || r.status;

                      return (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, scale: 0.99 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white border border-[#E5E7EB] p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm relative"
                        >
                          {/* 1. Sipariş No & Service Badge Header */}
                          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const catBadge = getOrderCategoryBadge(order);
                                return (
                                  <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${catBadge.className}`}>
                                    {catBadge.label}
                                  </span>
                                );
                              })()}
                              <span className="font-mono text-xs text-[#6B7280]">
                                #{r.order_number}
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] uppercase tracking-wider">
                              {currentStatus === 'rezerve' || currentStatus === 'accepted' ? 'Rezerve' :
                               currentStatus === 'dogrulandi' ? 'Doğrulandı' :
                               currentStatus === 'yolda' || currentStatus === 'kuryede' || currentStatus === 'teslimatta' ? 'Yolda' :
                               currentStatus === 'teslim_edildi' || currentStatus === 'tamamlandi' ? 'Teslim Edildi' : currentStatus}
                            </span>
                          </div>

                          {/* 2. Yapılacak İş */}
                          <TaskDescriptionCard description={r.task_description} />

                          {/* 3. Müşteri Teklifi & Asistan Hizmet Bedeli */}
                          <CustomerOfferCard
                            totalPrice={r.total_price}
                            courierNet={r.courier_net}
                            customerPrice={r.customer_price}
                          />

                          {/* 4. Müşteri Bilgileri */}
                          <CustomerInfoCard name={r.customer_name} phone={r.customer_phone} />

                          {/* 5. Alınacak Adres */}
                          <PickupAddressCard
                            storeName={r.store_name}
                            pickupAddress={r.pickup_address}
                            pickupAddressDetail={r.pickup_address_detail}
                            pickupLat={r.pickup_lat}
                            pickupLng={r.pickup_lng}
                          />

                          {/* 6. Teslim Adresi */}
                          {r.delivery_address && (
                            <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB] text-xs space-y-1.5 w-full min-w-0">
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-1 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                                  TESLİM ADRESİ
                                </span>
                                <a
                                  href={r.delivery_lat != null && r.delivery_lng != null ? `https://www.google.com/maps/search/?api=1&query=${r.delivery_lat},${r.delivery_lng}` : (r.latitude != null && r.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.delivery_address)}`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-white hover:bg-gray-50 text-[#1F2937] border border-[#E5E7EB] font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all shrink-0 ml-auto flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3 text-[#6B7280]" />
                                  <span>Haritada Aç</span>
                                </a>
                              </div>
                              <p className="text-[#1F2937] text-xs font-medium leading-relaxed break-words whitespace-pre-wrap min-w-0 w-full text-left">{r.delivery_address}</p>
                              {r.delivery_address_detail && (
                                <p className="text-[#6B7280] text-[11px] pt-1 border-t border-[#E5E7EB]/60 leading-normal break-words whitespace-pre-wrap min-w-0 w-full text-left">
                                  Adres Detayı: {r.delivery_address_detail}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Tahmini Mesafe & Süre */}
                          <DistanceDurationCard distance={r.distance} duration={r.duration} />

                          {/* Geçerken UĞRA - Zaman Tercihi */}
                          {r.service_type === 'gecerken' && (
                            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/70 text-xs space-y-0.5">
                              <span className="text-[10px] font-bold text-blue-700 uppercase block">GEÇERKEN UĞRA — ZAMAN TERCİHİ</span>
                              <p className="text-xs text-blue-900 font-semibold">
                                {r.preferred_time || (r.notes?.match(/• Ne Zaman:\s*(.+)/)?.[1]?.trim()) || 'Gün içinde fark etmez'}
                              </p>
                            </div>
                          )}

                          {/* Sipariş Notu */}
                          {r.notes && r.notes.trim() !== '' && (
                            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] text-xs space-y-0.5">
                              <span className="text-[10px] font-semibold text-[#6B7280] uppercase block">Sipariş Notu</span>
                              <p className="text-xs text-[#1F2937] font-normal leading-normal">{r.notes}</p>
                            </div>
                          )}

                          {/* İş Akışı Butonları */}
                          <div className="pt-1.5 border-t border-[#E5E7EB]">
                            {(currentStatus === 'rezerve' || currentStatus === 'accepted') && (
                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <button
                                  type="button"
                                  disabled={actionLoading === order.id}
                                  onClick={() => handleVerifyOrder(order.id)}
                                  className="py-2.5 px-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm cursor-pointer flex items-center justify-center transition-all"
                                >
                                  {actionLoading === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  ) : (
                                    <span>Doğrulandı</span>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={actionLoading === order.id}
                                  onClick={() => {
                                    setCancelModalOrder(order);
                                    setCancelReasonText('');
                                  }}
                                  className="py-2.5 px-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm cursor-pointer flex items-center justify-center transition-all"
                                >
                                  <span>Ulaşılamadı</span>
                                </button>
                              </div>
                            )}

                            {currentStatus === 'dogrulandi' && (
                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <button
                                  type="button"
                                  disabled={actionLoading === order.id || actionLoading === `iban_${order.id}`}
                                  onClick={() => handleSendIban(order)}
                                  className="py-2.5 px-2 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {actionLoading === `iban_${order.id}` ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  ) : (
                                    <span>IBAN Gönder</span>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={actionLoading === order.id || actionLoading === `iban_${order.id}`}
                                  onClick={() => handlePickupOrder(order.id)}
                                  className="py-2.5 px-2 bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {actionLoading === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  ) : (
                                    <span>Yola Çık</span>
                                  )}
                                </button>
                              </div>
                            )}

                            {(currentStatus === 'yolda' || currentStatus === 'kuryede' || currentStatus === 'teslimatta' || currentStatus === 'in_progress' || currentStatus === 'on_the_way') && (() => {
                              const requiresCode = Boolean(order.requires_delivery_code);
                              const isCodeVerified = Boolean(order.delivery_code_verified || verifiedOrderIds[order.id]);

                              if (requiresCode && !isCodeVerified) {
                                return (
                                  <div className="space-y-2 border-t border-gray-100 pt-3 mt-2">
                                    <label className="block text-xs font-bold text-[#1F2937]">
                                      Teslim Kodunu Doğrula
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        placeholder="6 Haneli Kod"
                                        value={verificationCodes[order.id] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                          setVerificationCodes(prev => ({ ...prev, [order.id]: val }));
                                          if (verificationErrors[order.id]) {
                                            setVerificationErrors(prev => ({ ...prev, [order.id]: '' }));
                                          }
                                        }}
                                        className="flex-1 bg-gray-50 border border-gray-200 focus:border-[#2563EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#1F2937] outline-none text-center tracking-widest transition-all"
                                      />
                                      <button
                                        type="button"
                                        disabled={verifyingOrder === order.id || !(verificationCodes[order.id] || '').trim()}
                                        onClick={() => handleVerifyDeliveryCode(order)}
                                        className="py-2 px-3.5 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer shrink-0 flex items-center justify-center"
                                      >
                                        {verifyingOrder === order.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                        ) : (
                                          <span>Kodu Doğrula</span>
                                        )}
                                      </button>
                                    </div>
                                    {verificationErrors[order.id] && (
                                      <p className="text-[11px] font-bold text-[#EF4444] mt-1">
                                        {verificationErrors[order.id]}
                                      </p>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  disabled={actionLoading === order.id}
                                  onClick={() => handleCompleteOrder(order.id)}
                                  className="w-full py-2.5 bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {actionLoading === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  ) : (
                                    <span>{requiresCode ? 'Teslimi Tamamla' : 'Teslim Edildi'}</span>
                                  )}
                                </button>
                              );
                            })()}

                            {(currentStatus === 'teslim_edildi' || currentStatus === 'tamamlandi' || currentStatus === 'completed') && null}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: TESLİM EDİLENLER */}
              {panelTab === 'completed' && (
                <div className="space-y-3">
                  {completedOrders.length === 0 ? (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-sm space-y-2">
                      <h3 className="text-base font-bold text-[#1F2937]">Teslim Edilen Sipariş Bulunmuyor</h3>
                      <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                        Tamamladığınız saha görevleri burada listelenecektir.
                      </p>
                    </div>
                  ) : (
                    completedOrders.map((order) => {
                      const r = resolveTaskFields(order);
                      const formattedDate = order.created_at || order.delivered_at 
                        ? new Date(order.delivered_at || order.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Tamamlandı';

                      return (
                        <div
                          key={order.id}
                          className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-sm space-y-3"
                        >
                          {/* Header: Status badge & Date */}
                          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-[#10B981] border border-emerald-200 uppercase tracking-wider">
                                TESLİM EDİLDİ
                              </span>
                              <span className="font-mono text-xs text-[#6B7280]">#{r.order_number}</span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
                              {formattedDate}
                            </span>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
                              <span className="text-[10px] font-semibold text-[#6B7280] uppercase block">Müşteri</span>
                              <p className="font-medium text-[#1F2937] text-xs">{r.customer_name || 'Müşteri'}</p>
                              {r.customer_phone && <p className="text-[#6B7280] text-[11px] font-mono">{r.customer_phone}</p>}
                            </div>

                            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
                              <span className="text-[10px] font-semibold text-[#6B7280] uppercase block">Teslim Adresi</span>
                              <p className="text-[#1F2937] text-xs font-medium line-clamp-2">{r.delivery_address || 'Teslimat Adresi'}</p>
                            </div>
                          </div>

                          {/* Task summary if available */}
                          {r.task_description && (
                            <div className="bg-[#F8FAFC] px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs">
                              <span className="text-[10px] font-semibold text-[#6B7280] uppercase block">Yapılan İş</span>
                              <p className="text-[#1F2937] font-medium text-xs line-clamp-1">{r.task_description}</p>
                            </div>
                          )}

                          {/* Geçerken UĞRA - Zaman Tercihi */}
                          {r.service_type === 'gecerken' && (
                            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/70 text-xs space-y-0.5">
                              <span className="text-[10px] font-bold text-blue-700 uppercase block">GEÇERKEN UĞRA — ZAMAN TERCİHİ</span>
                              <p className="text-xs text-blue-900 font-semibold">
                                {r.preferred_time || 'Gün içinde fark etmez'}
                              </p>
                            </div>
                          )}

                          {/* Footer: Earnings & Price */}
                          <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB] text-xs">
                            <span className="text-[#6B7280] font-medium">
                              Müşteri Fiyatı: <strong className="text-[#1F2937] font-mono">{r.customer_price || order.total_price} ₺</strong>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#6B7280] font-semibold uppercase">Kazanç:</span>
                              <span className="text-base font-bold text-[#10B981] font-mono">
                                +{r.courier_net || order.courier_net || 0} ₺
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 4: PROFİL */}
              {panelTab === 'profile' && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#1F2937] text-xl font-bold">
                      {currentAssistant.full_name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1F2937]">
                        {currentAssistant.full_name || 'Saha Asistanı'}
                      </h3>
                      <p className="text-xs text-[#6B7280] font-semibold mt-0.5">
                        {connectedPartner
                          ? `Bağlı İş Ortağı: ${connectedPartner.business_name}`
                          : 'Bağımsız Saha Asistanı'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-semibold text-[#6B7280] uppercase block mb-0.5">
                        İsim Soyisim
                      </span>
                      <p className="font-medium text-[#1F2937] text-sm">{currentAssistant.full_name || '-'}</p>
                    </div>

                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-semibold text-[#6B7280] uppercase block mb-0.5">
                        Telefon Numarası
                      </span>
                      <p className="font-medium text-[#1F2937] text-sm">{currentAssistant.phone || '-'}</p>
                    </div>

                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-semibold text-[#6B7280] uppercase block mb-0.5">
                        Aktiflik Durumu
                      </span>
                      <p className="font-medium text-sm flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[#10B981]' : 'bg-gray-400'}`} />
                        <span className="text-[#1F2937]">
                          {isOnline ? 'Çevrimiçi (Saha Aktif)' : 'Çevrimdışı'}
                        </span>
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-semibold text-[#6B7280] uppercase block mb-0.5">
                        Bağlı Olduğu Partner
                      </span>
                      <p className="font-medium text-[#1F2937] text-sm">
                        {connectedPartner?.business_name || currentAssistant.partner_id || 'Bağımsız'}
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-semibold text-[#6B7280] uppercase block mb-0.5">
                        Görev Durumu
                      </span>
                      <p className="font-medium text-[#1F2937] text-sm">
                        {activeOrders.length > 0 ? 'Görevde (Sipariş Teslimatında)' : 'Müsait (Görev Bekliyor)'}
                      </p>
                    </div>

                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-semibold text-[#6B7280] uppercase block mb-0.5">
                        Araç Tipi / Şehir
                      </span>
                      <p className="font-medium text-[#1F2937] text-sm capitalize">
                        {currentAssistant.vehicle_type || 'Motosiklet'} • {currentAssistant.city || 'İstanbul'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E5E7EB] flex justify-between items-center">
                    <span className="text-xs text-[#6B7280]">
                      Tamamlanan Sipariş Sayısı: <strong className="text-[#1F2937]">{completedOrders.length}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-[#EF4444] text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: IBAN BİLGİLERİM */}
              {panelTab === 'iban' && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
                  <div className="border-b border-[#E5E7EB] pb-4">
                    <h3 className="text-lg font-bold text-[#1F2937]">IBAN Bilgilerim</h3>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Ödemelerinizin aktarılacağı banka hesap bilgilerinizi düzenleyebilirsiniz.
                    </p>
                  </div>

                  <form onSubmit={handleIbanSubmit} className="space-y-4">
                    {/* 1. Hesap Sahibi / Ad Soyad */}
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                        Hesap Sahibi (Ad Soyad)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={ibanAccountHolder}
                          onChange={(e) => setIbanAccountHolder(e.target.value)}
                          placeholder="Ad Soyad"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 pr-20 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] transition-all"
                        />
                        {ibanAccountHolder && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(ibanAccountHolder, 'Ad Soyad')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          >
                            Kopyala
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Banka Adı */}
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                        Banka Adı
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={ibanBankName}
                          onChange={(e) => setIbanBankName(e.target.value)}
                          placeholder="Örn: Garanti BBVA, İş Bankası, Ziraat Bankası"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 pr-20 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] transition-all"
                        />
                        {ibanBankName && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(ibanBankName, 'Banka Adı')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          >
                            Kopyala
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. IBAN */}
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                        IBAN
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={32}
                          value={ibanValue}
                          onChange={handleIbanInputChange}
                          placeholder="TR00 0000 0000 0000 0000 0000 00"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 pr-20 text-sm font-mono text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] transition-all"
                        />
                        {ibanValue && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(ibanValue, 'IBAN')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          >
                            Kopyala
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSavingIban}
                        className="w-full py-3.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingIban ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <span>Kaydet</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
        ) : (
          /* ADAY / GİRİŞ EKRANI */
          <>
            {/* Mode Switcher Header - Aday / Giriş Sekmeleri */}
            <div className="w-full bg-[#E5E7EB]/70 border border-[#E5E7EB] p-1.5 rounded-2xl flex gap-2 mb-8 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTabMode('application')}
                className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTabMode === 'application'
                    ? 'bg-white text-[#111827] font-extrabold shadow-sm'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <span>Asistan Aday Başvurusu</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTabMode('panel')}
                className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTabMode === 'panel'
                    ? 'bg-white text-[#111827] font-extrabold shadow-sm'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <span>Asistan Girişi</span>
              </button>
            </div>

            {activeTabMode === 'panel' ? (
              /* ASİSTAN GİRİŞ EKRANI */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm space-y-6 mx-auto"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold text-[#111827] tracking-tight">
                    Asistan Girişi
                  </h1>
                  <p className="text-xs text-[#6B7280]">
                    Saha görevlerinizi yönetmek ve siparişleri takip etmek için giriş yapın.
                  </p>
                </div>

                {loginError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-[#EF4444] text-xs">
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                      E-Posta
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="asistan@ugra.app"
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                      Şifre
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="w-full py-3.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loginSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Kontrol Ediliyor...
                      </>
                    ) : (
                      <span>Giriş Yap</span>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2 border-t border-[#E5E7EB]">
                  <p className="text-xs text-[#6B7280]">
                    Henüz asistan hesabınız yok mu?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTabMode('application')}
                      className="text-[#2563EB] underline font-bold cursor-pointer"
                    >
                      Başvuru Yapın
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : (
              /* CANDIDATE APPLICATION SECTION */
              <div className="w-full">
            <AnimatePresence mode="wait">
              {stage === 'form' ? (
                <motion.div
                  key="application-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-10 shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-center justify-center mb-8">
                    <div className="bg-[#F5F7FA] p-1.5 rounded-2xl border border-[#E5E7EB] flex gap-2">
                      <button
                        type="button"
                        onClick={() => setVehicleType('motosiklet')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          vehicleType === 'motosiklet'
                            ? 'bg-white text-[#111827] font-extrabold shadow-sm'
                            : 'text-[#6B7280] hover:text-[#111827]'
                        }`}
                      >
                        Motosiklet
                      </button>
                      <button
                        type="button"
                        onClick={() => setVehicleType('bisiklet')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          vehicleType === 'bisiklet'
                            ? 'bg-white text-[#111827] font-extrabold shadow-sm'
                            : 'text-[#6B7280] hover:text-[#111827]'
                        }`}
                      >
                        Bisiklet
                      </button>
                    </div>
                  </div>

                  <div className="mb-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111827] mt-1">
                      {vehicleType === 'bisiklet' ? 'Bisikletli Asistan Başvurusu' : 'Motosikletli Asistan Başvurusu'}
                    </h1>
                    <p className="text-xs text-[#6B7280] mt-3 leading-relaxed max-w-xl">
                      {vehicleType === 'bisiklet' 
                        ? 'Bisikletinizle ekibimize katılın, şehir içi çevre dostu teslimatlar yaparak esnek saatlerle kazanç elde edin.' 
                        : 'Motosikletinizle ekibimize katılın, esnek saatlerle yüksek kazanç elde edin. Başvuru formunu doldurarak ilk adımı atın.'}
                    </p>
                  </div>

                  <form onSubmit={handleAppSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                          Ad Soyad
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          required
                          value={formData.fullName}
                          onChange={handleAppInputChange}
                          placeholder="Adınız Soyadınız"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                          Telefon Numarası
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleAppInputChange}
                          placeholder="05xx xxx xx xx"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                          E-Posta Adresi <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleAppInputChange}
                          placeholder="ornek@email.com"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                          Giriş Şifresi <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="password"
                          name="password"
                          required
                          minLength={6}
                          value={formData.password}
                          onChange={handleAppInputChange}
                          placeholder="Giriş için kullanacağınız şifreniz"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                          Çalışmak İstediğiniz Şehir <span className="text-[#EF4444]">*</span>
                        </label>
                        <select
                          name="cityId"
                          required
                          value={formData.cityId}
                          onChange={(e) => handleCityChange(e.target.value)}
                          disabled={loadingCities}
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-[#2563EB]"
                        >
                          <option value="">{loadingCities ? 'Şehirler yükleniyor...' : 'Şehir Seçiniz'}</option>
                          {activeCities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {formData.cityId && !cityResolving && cityResolution.count === 0 && (
                          <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Bu şehirde şu anda aktif operasyon bulunmamaktadır.
                          </p>
                        )}
                        {formData.cityId && !cityResolving && cityResolution.count === 1 && (
                          <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Bayi: {cityResolution.franchises[0]?.name} (Otomatik Eşleşti)
                          </p>
                        )}
                      </div>

                      {formData.cityId && cityResolution.count > 1 ? (
                        <div>
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                            Çalışmak İstediğiniz Bayi / Bölge <span className="text-[#EF4444]">*</span>
                          </label>
                          <select
                            name="franchiseId"
                            required
                            value={formData.franchiseId}
                            onChange={(e) => setFormData((prev) => ({ ...prev, franchiseId: e.target.value }))}
                            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] focus:outline-none focus:border-[#2563EB]"
                          >
                            <option value="">Bayi Seçiniz</option>
                            {cityResolution.franchises.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                            {vehicleType === 'bisiklet' ? 'Bisiklet Marka / Model' : 'Motosiklet Marka / Model'}
                          </label>
                          <input
                            type="text"
                            name="motorInfo"
                            required
                            value={formData.motorInfo}
                            onChange={handleAppInputChange}
                            placeholder={vehicleType === 'bisiklet' ? 'Örn: Trek FX 3' : 'Örn: Honda Forza 250'}
                            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      )}
                    </div>

                    {formData.cityId && cityResolution.count > 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                            {vehicleType === 'bisiklet' ? 'Bisiklet Marka / Model' : 'Motosiklet Marka / Model'}
                          </label>
                          <input
                            type="text"
                            name="motorInfo"
                            required
                            value={formData.motorInfo}
                            onChange={handleAppInputChange}
                            placeholder={vehicleType === 'bisiklet' ? 'Örn: Trek FX 3' : 'Örn: Honda Forza 250'}
                            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      </div>
                    )}

                    <div className={`grid grid-cols-1 ${vehicleType === 'motosiklet' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-5`}>
                      {vehicleType === 'motosiklet' && (
                        <div>
                          <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                            Ehliyet Sınıfı
                          </label>
                          <input
                            type="text"
                            name="licenseInfo"
                            required={vehicleType === 'motosiklet'}
                            value={formData.licenseInfo}
                            onChange={handleAppInputChange}
                            placeholder="Örn: A, A2, A1"
                            className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                          Saha / Teslimat Deneyimi
                        </label>
                        <input
                          type="text"
                          name="experience"
                          required
                          value={formData.experience}
                          onChange={handleAppInputChange}
                          placeholder="Örn: 2 Yıl Kurye Deneyimi"
                          className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-2">
                        Ek Not / Açıklama
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleAppInputChange}
                        placeholder="Eklemek istediğiniz notlar..."
                        rows={3}
                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:border-[#2563EB] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingApp}
                      className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                    >
                      {isSubmittingApp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Gönderiliyor...</span>
                        </>
                      ) : (
                        <>
                          <span>Başvuruyu Gönder</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="success-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#2A2B31] border border-[#3F414A] rounded-[2rem] p-8 md:p-16 text-center shadow-2xl relative overflow-hidden"
                >
                  <div className="flex flex-col items-center max-w-lg mx-auto">
                    <div className="mb-8 select-none">
                      <span className="text-4xl md:text-[40px] font-extrabold tracking-wider text-white">
                        UĞRA<span className="text-[#FF7A00]">.</span>
                      </span>
                    </div>

                    <h2 className="text-3xl font-extrabold text-white mb-4">
                      Başvurunuz Başarıyla Alındı!
                    </h2>
                    
                    <p className="text-sm text-[#A7AFBA] leading-relaxed mb-8">
                      UĞRA<span className="text-[#FF7A00]">.</span> asistan adaylığınız sistemimize kaydedildi. Ekibimiz başvurunuzu inceledikten sonra onay sürecinde tarafınıza bilgi verilecektir.
                    </p>

                    <button
                      type="button"
                      onClick={() => setStage('form')}
                      className="bg-white text-black font-extrabold px-8 py-3.5 rounded-xl hover:bg-zinc-200 transition-all cursor-pointer text-sm"
                    >
                      Yeni Başvuru Yap
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
            )}
          </>
        )}
      </main>

      {/* Slide-in Mobile Courier Drawer (Yan Panel) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Slide Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 left-0 bottom-0 w-[82vw] max-w-[340px] bg-white border-r border-[#E5E7EB] z-50 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl text-[#1F2937]"
            >
              <div>
                {/* Header of Drawer */}
                <div className="pb-4 border-b border-gray-100 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="absolute -top-1 -right-1 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    aria-label="Kapat"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center font-bold text-gray-700 text-lg">
                      {currentAssistant?.avatar_url ? (
                        <img src={currentAssistant.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{currentAssistant?.full_name ? currentAssistant.full_name.charAt(0).toUpperCase() : 'G'}</span>
                      )}
                    </div>
                    <div className="min-w-0 pr-6">
                      <p className="text-xs text-gray-500 font-medium">Hoş Geldin</p>
                      <h3 className="text-sm font-bold text-gray-900 truncate uppercase tracking-tight">
                        {currentAssistant?.full_name || 'GÖKHAN GÖKALP'}
                      </h3>
                    </div>
                  </div>

                  <a
                    href="tel:05394659154"
                    className="flex items-center gap-2 pt-1 hover:opacity-80 transition-opacity cursor-pointer inline-flex"
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800">Asistan Temsilcisi</span>
                  </a>
                </div>

                {/* Drawer Menu Options */}
                <div className="py-3 space-y-4 text-gray-800">
                  {/* SECTION 1: Profil */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">
                      Profil
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setPanelTab('profile');
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Şifre Değiştir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPanelTab('iban');
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      IBAN Bilgilerim
                    </button>
                  </div>

                  <div className="border-b border-gray-100" />

                  {/* SECTION 2: İşlemler */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">
                      İşlemler
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal('wallet');
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Ödemeler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal('subscription');
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Aboneliğim
                    </button>
                  </div>

                  <div className="border-b border-gray-100" />

                  {/* SECTION 3: Davet Listesi */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">
                      Davet Listesi
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Arkadaşlarını Davet Et
                    </button>
                  </div>

                  <div className="border-b border-gray-100" />

                  {/* SECTION 4: Ayarlar */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">
                      Ayarlar
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal('settings');
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Sıkça Sorulan Sorular
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Kullanıcı Sözleşmesi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false);
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Gizlilik Sözleşmesi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDrawerOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors cursor-pointer block"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer of Drawer */}
              <div className="pt-4 border-t border-gray-100 mt-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-[#1E293B] text-white flex items-center justify-center hover:bg-slate-700 transition-colors inline-flex"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4.5 h-4.5" />
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Aboneliğim Modal */}
      <AnimatePresence>
        {activeModal === 'subscription' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl space-y-5 text-[#1F2937]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-[#E5E7EB] flex items-center justify-center text-[#1F2937]">
                    <Clock className="w-5 h-5 text-[#1F2937]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1F2937]">Aboneliğim</h3>
                    <p className="text-xs text-[#6B7280]">Abonelik durumunuz ve süre takibiniz</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              {subLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                  <Loader2 className="w-6 h-6 text-[#1F2937] animate-spin" />
                  <p className="text-xs text-[#6B7280]">Abonelik bilgileri yükleniyor...</p>
                </div>
              ) : !subscription ? (
                <div className="py-6 px-4 text-center space-y-4 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                  <AlertCircle className="w-8 h-8 text-[#6B7280] mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#1F2937]">
                      Aktif aboneliğiniz bulunmuyor.
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      Abonelik talebi göndererek yönetici onayına sunabilirsiniz.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={renewalSubmitting}
                    onClick={handleRenewalRequest}
                    className="w-full py-2.5 bg-[#1F2937] hover:bg-black text-white font-bold rounded-xl text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {renewalSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Talep Gönderiliyor...</span>
                      </>
                    ) : (
                      <span>Abonelik Talebi Gönder</span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">
                        Abonelik Durumu
                      </span>
                      <span className="text-sm font-bold text-[#1F2937] block">
                        {(() => {
                          if (subscription.renewal_requested && subscription.renewal_decision === 'pending') {
                            return 'Bekleyen Abonelik Talebi';
                          }
                          const remainingDays = getSubscriptionDaysRemaining(subscription.expires_at);
                          const isExpired = remainingDays <= 0 || subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'pasif' || subscription.status === 'inactive';
                          if (isExpired) return 'Süresi Doldu / Pasif';
                          if (subscription.status === 'pending' || subscription.status === 'beklemede') return 'Beklemede';
                          if (subscription.status === 'cancelled' || subscription.status === 'iptal') return 'İptal Edildi';
                          return 'Aktif Abonelik';
                        })()}
                      </span>
                    </div>

                    {(() => {
                      if (subscription.renewal_requested && subscription.renewal_decision === 'pending') {
                        return (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ● Talep İncelemede
                          </span>
                        );
                      }
                      const remainingDays = getSubscriptionDaysRemaining(subscription.expires_at);
                      const isExpired = remainingDays <= 0 || subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'pasif' || subscription.status === 'inactive';
                      const isNearExpiry = !isExpired && remainingDays <= 7;

                      if (isExpired) {
                        return (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gray-200 text-gray-800 border border-gray-300">
                            ● Pasif / Süresi Doldu
                          </span>
                        );
                      }
                      if (isNearExpiry) {
                        return (
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-200 text-zinc-900 border border-zinc-300">
                            ● Yakında Bitiyor
                          </span>
                        );
                      }
                      return (
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ● Aktif
                        </span>
                      );
                    })()}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Başlangıç</span>
                      <span className="text-[#1F2937] font-medium text-xs block">
                        {formatTurkishDateStr(subscription.start_date)}
                      </span>
                    </div>

                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Bitiş</span>
                      <span className="text-[#1F2937] font-medium text-xs block">
                        {formatTurkishDateStr(subscription.expires_at)}
                      </span>
                    </div>

                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Aylık Ücret</span>
                      <span className="text-[#1F2937] font-bold text-xs font-mono block">
                        {subscription.monthly_price && subscription.monthly_price > 0 
                          ? `${subscription.monthly_price.toLocaleString('tr-TR')} TL` 
                          : 'Ücretsiz / Belirtilmemiş'}
                      </span>
                    </div>

                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5">
                      <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Ödeme Durumu</span>
                      <span className="text-[#1F2937] font-medium text-xs block">
                        {subscription.payment_status === 'paid' || subscription.payment_status === 'odendi' ? 'Ödendi' : subscription.payment_status === 'unpaid' ? 'Ödenmedi' : 'Beklemede'}
                      </span>
                    </div>

                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB] space-y-0.5 col-span-2">
                      <span className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider block">Kalan Süre</span>
                      <span className="text-[#1F2937] font-bold text-sm font-mono block">
                        {(() => {
                          const remainingDays = getSubscriptionDaysRemaining(subscription.expires_at);
                          if (remainingDays <= 0 || subscription.status === 'expired' || subscription.status === 'inactive') {
                            return 'Abonelik süresi doldu';
                          }
                          return `${remainingDays} gün`;
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Warning Messages */}
                  {(() => {
                    const remainingDays = getSubscriptionDaysRemaining(subscription.expires_at);
                    const isExpired = remainingDays <= 0 || subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'pasif' || subscription.status === 'inactive';

                    if (isExpired) {
                      return (
                        <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl text-xs text-zinc-800 space-y-1">
                          <p className="font-semibold">Abonelik süresi doldu.</p>
                          <p className="text-[11px] text-zinc-600">Yenileme talebi göndererek aboneliğinizi uzatabilirsiniz.</p>
                        </div>
                      );
                    }
                    if (remainingDays <= 3) {
                      return (
                        <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl text-xs text-zinc-800 space-y-1">
                          <p className="font-semibold">Aboneliğiniz yakında sona erecek. Yenileme talebi gönderebilirsiniz.</p>
                        </div>
                      );
                    }
                    if (remainingDays <= 7) {
                      return (
                        <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl text-xs text-zinc-800">
                          <p className="font-semibold">Aboneliğinizin süresi yakında sona erecek.</p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Renewal Request Action */}
                  {subscription.renewal_requested && subscription.renewal_decision === 'pending' ? (
                    <div className="p-3.5 bg-gray-50 border border-[#E5E7EB] rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1F2937]">Abonelik talebiniz yönetici tarafından inceleniyor.</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Beklemede
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7280]">Abonelik / yenileme talebiniz yönetici incelemesindedir.</p>
                    </div>
                  ) : subscription.renewal_decision === 'rejected' && !subscription.renewal_requested ? (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-red-800">Abonelik talebiniz reddedildi.</span>
                          <span className="text-[10px] font-bold text-red-700 bg-white px-2 py-0.5 rounded border border-red-200">
                            Reddedildi
                          </span>
                        </div>
                        <p className="text-[11px] text-red-600">Tekrar talep gönderebilirsiniz.</p>
                      </div>
                      <button
                        type="button"
                        disabled={renewalSubmitting}
                        onClick={handleRenewalRequest}
                        className="w-full py-2.5 bg-[#1F2937] hover:bg-black text-white font-bold rounded-xl text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {renewalSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Talep Gönderiliyor...</span>
                          </>
                        ) : (
                          <span>Abonelik Talebi Gönder</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={renewalSubmitting}
                      onClick={handleRenewalRequest}
                      className="w-full py-2.5 bg-[#1F2937] hover:bg-black text-white font-bold rounded-xl text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {renewalSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Talep Gönderiliyor...</span>
                        </>
                      ) : (
                        <span>Abonelik Talebi Gönder</span>
                      )}
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1F2937] font-bold rounded-xl text-xs uppercase transition-all cursor-pointer"
              >
                Kapat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cüzdan Modal */}
      <AnimatePresence>
        {activeModal === 'wallet' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl space-y-5 text-[#1F2937]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#10B981]">
                    <Wallet className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1F2937]">Cüzdanım & Hak Ediş</h3>
                    <p className="text-xs text-[#6B7280]">Kazançlarınız ve teslimat bakiye özetiniz</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Total Balance Card */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 space-y-1.5">
                <p className="text-[10px] text-[#6B7280] font-semibold uppercase tracking-wider">Toplam Net Kazanç</p>
                <div className="text-2xl font-bold text-[#10B981] font-mono">
                  {completedOrders.reduce((acc, curr) => acc + (curr.courier_net || 0), 0)} ₺
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B7280] pt-2 border-t border-[#E5E7EB]">
                  <span>Tamamlanan Teslimat:</span>
                  <span className="font-bold text-[#1F2937]">{completedOrders.length} Adet</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-[#6B7280] uppercase font-semibold block">Ortalama Teslimat Net</span>
                  <span className="text-sm font-bold text-[#1F2937] font-mono">
                    {completedOrders.length > 0 
                      ? Math.round((completedOrders.reduce((acc, curr) => acc + (curr.courier_net || 0), 0) / completedOrders.length)) 
                      : 0} ₺
                  </span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-[#6B7280] uppercase font-semibold block">Ödeme Durumu</span>
                  <span className="text-xs font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-200">
                    Haftalık Aktarım
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase transition-all cursor-pointer shadow-sm"
              >
                Kapat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bildirimler Modal */}
      <AnimatePresence>
        {activeModal === 'notifications' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl space-y-5 text-[#1F2937]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
                    <Bell className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1F2937]">Bildirim & Ses Ayarları</h3>
                    <p className="text-xs text-[#6B7280]">Saha bildirimleri ve ses tercihleri</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-[#1F2937]">Sesli Görev Uyarıları</h4>
                    <p className="text-[11px] text-[#6B7280]">Yeni sipariş geldiğinde yüksek sesli zil çalar</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playNotificationSound();
                      toast({ title: 'Test Sesi', description: 'Bildirim sesi çalındı.' });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 text-[#1F2937] font-bold text-xs border border-[#E5E7EB] shadow-sm cursor-pointer"
                  >
                    Test Et
                  </button>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-[#1F2937]">GPS Canlı Konum</h4>
                    <p className="text-[11px] text-[#6B7280]">Çevrimiçi modda arka planda konum iletilir</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Etkin
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase transition-all cursor-pointer shadow-sm"
              >
                Tamam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ayarlar Modal */}
      <AnimatePresence>
        {activeModal === 'settings' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl space-y-5 text-[#1F2937]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-[#E5E7EB] flex items-center justify-center text-[#1F2937]">
                    <Settings className="w-5 h-5 text-[#1F2937]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1F2937]">Asistan Ayarları</h3>
                    <p className="text-xs text-[#6B7280]">Araç ve uygulama parametreleri</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">Araç Tipi</span>
                  <span className="font-semibold text-[#1F2937] capitalize">{currentAssistant?.vehicle_type || 'Motosiklet'}</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">Çalışma Şehri</span>
                  <span className="font-semibold text-[#1F2937]">{currentAssistant?.city || 'İstanbul'}</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">Uygulama Sürümü</span>
                  <span className="font-mono text-[#6B7280]">v2.4.0 (Saha Sürümü)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-bold rounded-xl text-xs uppercase transition-all cursor-pointer shadow-sm"
              >
                Kapat
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ulaşılamadı (İptal Sebebi) Modal */}
      <AnimatePresence>
        {cancelModalOrder && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 20px 50px rgba(0,0,0,0.18)'
              }}
              className="w-full max-w-md border border-[#E5E7EB] rounded-[18px] p-6 space-y-4 text-[#1F2937] opacity-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div>
                  <h3 className="text-base font-bold text-[#1F2937]">Sipariş İptal Nedeni</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">Lütfen iptal nedenini belirtiniz</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCancelModalOrder(null);
                    setCancelReasonText('');
                  }}
                  className="p-2 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937] cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1F2937] block">İptal Sebebi</label>
                <textarea
                  value={cancelReasonText}
                  onChange={(e) => setCancelReasonText(e.target.value)}
                  placeholder="Müşteri telefonlara cevap vermiyor, adreste bulunamadı vb."
                  rows={3}
                  className="w-full bg-white border border-[#D1D5DB] rounded-xl p-3 text-xs text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCancelModalOrder(null);
                    setCancelReasonText('');
                  }}
                  className="flex-1 py-2.5 bg-white hover:bg-red-50 text-[#EF4444] font-bold rounded-xl text-xs uppercase border border-[#EF4444] cursor-pointer transition-colors shadow-sm"
                >
                  İptal
                </button>

                <button
                  type="button"
                  disabled={isSubmittingCancel || !cancelReasonText.trim()}
                  onClick={() => handleCancelOrder(cancelModalOrder.id, cancelReasonText.trim())}
                  className="flex-1 py-2.5 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl text-xs uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingCancel ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <span>Onayla</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


