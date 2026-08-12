import React, { useState, useEffect, useMemo } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { db, Partner, Product, Order, normalizeCategory, isSupabaseConfigured, isStoreOpen, isUUID } from '@/lib/supabase';
import { getCategoryKey, getProductVariantGroups, getProductTypeOptions, getSubcategoryOptions } from '@/lib/categoryVariants';
import { sendOrderToPartnerWhatsApp } from '@/lib/whatsapp';
import { ProductCard } from '@/components/ProductCard';
import { 
  ShoppingBag, Phone, MapPin, Loader2, ShoppingCart, Check, 
  ArrowLeft, ChevronRight, CheckCircle2, ShieldAlert, CreditCard, Banknote, Trash2, X,
  Zap, AlertTriangle, Clock, Share2, MoreVertical, Heart, Star, MessageSquare, Info,
  Search, ExternalLink, CheckCircle, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import { CustomerTrackingService } from '@/services/customerTracking';
import { NotificationService } from '@/services/notificationService';
import { CustomerTrackingState } from '@/types/customerTracking';
import { LiveDispatchService } from '@/lib/dispatchService';
import { getAccurateLocationAndAddress, StructuredAddress } from '@/services/gpsLocationService';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { MapPinPickerModal } from '@/components/MapPinPickerModal';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOptions?: Record<string, string>;
  cardNote?: string;
}

function getCachedStoreData(slug: string): { partner: Partner | null; products: Product[] } {
  if (typeof window === 'undefined' || !slug || isSupabaseConfigured) {
    return { partner: null, products: [] };
  }
  try {
    const cleanSlug = slug.toLowerCase().trim();
    const partnersRaw = localStorage.getItem('ugra_partners');
    let partner: Partner | null = null;
    if (partnersRaw) {
      const partners: Partner[] = JSON.parse(partnersRaw);
      partner = partners.find(p => 
        p.slug && p.slug.toLowerCase().trim() === cleanSlug && (p.active ?? true)
      ) || null;
    }

    let products: Product[] = [];
    if (partner) {
      const productsRaw = localStorage.getItem('ugra_products');
      if (productsRaw) {
        const allProducts: Product[] = JSON.parse(productsRaw);
        products = allProducts.filter(p => 
          (p.partner_id === partner.id || (p as any).store_id === partner.id) && (p.active ?? true)
        );
      }
    }
    return { partner, products };
  } catch {
    return { partner: null, products: [] };
  }
}

export function getDefaultCategoryBanner(category?: string): string {
  const catKey = getCategoryKey(category);
  switch (catKey) {
    case 'kahve':
      return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop';
    case 'giyim':
      return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop';
    case 'kozmetik':
      return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop';
    case 'teknoloji':
      return 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop';
    case 'medikal':
      return 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=1200&auto=format&fit=crop';
    case 'optik':
      return 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop';
    case 'cicek':
      return 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?q=80&w=1200&auto=format&fit=crop';
    case 'petshop':
      return 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=1200&auto=format&fit=crop';
    case 'taki':
      return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop';
    case 'parfum':
      return 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1200&auto=format&fit=crop';
    case 'canta':
      return 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop';
    case 'bebek':
      return 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=1200&auto=format&fit=crop';
    case 'kirtasiye':
      return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=1200&auto=format&fit=crop';
    case 'yapi_market':
      return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=1200&auto=format&fit=crop';
    default:
      return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1200&auto=format&fit=crop';
  }
}

const CATEGORY_SUBCATEGORIES_PRESETS: Record<string, string[]> = {
  giyim: ['T-Shirt', 'Sweatshirt', 'Gömlek', 'Pantolon', 'Ceket', 'Ayakkabı', 'Aksesuar'],
  kahve: ['Kahve', 'Soğuk Kahve', 'Sıcak Kahve', 'Tatlı', 'Pasta', 'Sandviç', 'İçecek'],
  kozmetik: ['Parfüm', 'Ruj', 'Fondöten', 'Maskara', 'Cilt Bakımı'],
  teknoloji: ['Telefon', 'Laptop', 'Kulaklık', 'Klavye', 'Mouse'],
  petshop: ['Mama', 'Oyuncak', 'Bakım', 'Aksesuar'],
  medikal: ['Medikal Malzeme', 'Hijyen & Bakım', 'Ölçüm Cihazları', 'Ortopedi'],
  optik: ['Güneş Gözlüğü', 'Numaralı Gözlük', 'Lens', 'Aksesuar & Solüsyon'],
  cicek: ['Buket', 'Saksı Çiçeği', 'Aranjman', 'Teraryum', 'Çelenk'],
  taki: ['Kolye', 'Yüzük', 'Bileklik', 'Küpe', 'Aksesuar'],
  parfum: ['Erkek Parfüm', 'Kadın Parfüm', 'Unisex Parfüm', 'Oda Kokusu', 'Deodorant'],
  canta: ['El Çantası', 'Sırt Çantası', 'Cüzdan', 'Valiz & Kabin Boy'],
  bebek: ['Bebek Giyim', 'Beslenme', 'Bebek Bakım', 'Oyuncak'],
  kirtasiye: ['Defter', 'Kalem', 'Ofis Malzemeleri', 'Çizim & Boya'],
  yapi_market: ['El Aletleri', 'Hırdavat', 'Boya & Kimyasal', 'Aydınlatma'],
};

const SAVED_CUSTOMER_INFO_KEY = 'ugra_saved_customer_info';
const FOLLOWED_STORES_KEY = 'ugra_followed_stores';
const FAVORITE_PRODUCTS_KEY = 'ugra_favorite_products';

export function StoreFront() {
  const [, params] = useRoute('/:slug');
  const [, setLocation] = useLocation();
  const slug = params?.slug || '';

  const handleBack = () => {
    if (selectedProduct) {
      setSelectedProduct(null);
      return;
    }
    if (isCheckoutOpen) {
      setIsCheckoutOpen(false);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      const currentPath = window.location.pathname;
      try {
        window.history.back();
      } catch (e) {
        setLocation('/');
        return;
      }

      // Safety fallback: if after 200ms the pathname has not changed, navigate to '/'
      setTimeout(() => {
        if (window.location.pathname === currentPath) {
          setLocation('/');
        }
      }, 200);
    } else {
      setLocation('/');
    }
  };

  // Synchronously load cached data to render instantly without loading flicker
  const initialCache = useMemo(() => getCachedStoreData(slug), [slug]);

  const [partner, setPartner] = useState<Partner | null>(initialCache.partner);
  const [products, setProducts] = useState<Product[]>(initialCache.products);
  const [loading, setLoading] = useState<boolean>(!initialCache.partner);
  const [error, setError] = useState(false);

  // Active Tab: 'urunler' | 'hakkinda'
  const [activeTab, setActiveTab] = useState<'urunler' | 'hakkinda'>('urunler');

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');

  // Follow State
  const [isFollowed, setIsFollowed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(FOLLOWED_STORES_KEY);
      if (saved) {
        const list: string[] = JSON.parse(saved);
        return list.includes(slug.toLowerCase());
      }
    } catch {}
    return false;
  });

  // Favorite Products
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITE_PRODUCTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const toggleFollow = () => {
    try {
      const saved = localStorage.getItem(FOLLOWED_STORES_KEY);
      let list: string[] = saved ? JSON.parse(saved) : [];
      const clean = slug.toLowerCase();
      if (list.includes(clean)) {
        list = list.filter(s => s !== clean);
        setIsFollowed(false);
        showToast('Takibi bıraktınız');
      } else {
        list.push(clean);
        setIsFollowed(true);
        showToast('Mağaza takip ediliyor');
      }
      localStorage.setItem(FOLLOWED_STORES_KEY, JSON.stringify(list));
    } catch (e) {
      setIsFollowed(!isFollowed);
    }
  };

  const toggleFavoriteProduct = (product: Product) => {
    try {
      let updated: string[];
      if (favorites.includes(product.id)) {
        updated = favorites.filter(id => id !== product.id);
        showToast(`"${product.title}" favorilerden çıkarıldı`);
      } else {
        updated = [...favorites, product.id];
        showToast(`"${product.title}" favorilere eklendi`);
      }
      setFavorites(updated);
      localStorage.setItem(FAVORITE_PRODUCTS_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  const shareStore = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: partner?.business_name || 'UĞRA Mağaza',
          text: `${partner?.business_name} - UĞRA Mağaza Sayfası`,
          url: url
        });
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Mağaza bağlantısı kopyalandı');
      } catch (e) {
        showToast('Bağlantı kopyalanamadı');
      }
    }
  };

  const shareProduct = async (product: Product) => {
    const url = `${window.location.origin}/${slug}?product=${product.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `${product.title} - ${partner?.business_name}`,
          url: url
        });
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast(`"${product.title}" bağlantısı kopyalandı`);
      } catch (e) {
        showToast('Bağlantı kopyalanamadı');
      }
    }
  };

  // Product Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedProductOptions, setSelectedProductOptions] = useState<Record<string, string>>({});
  const [customCardNote, setCustomCardNote] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  // Initialize variant options when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      const catKey = getCategoryKey(partner?.category, selectedProduct.category);
      const groups = getProductVariantGroups(catKey, selectedProduct.attributes);
      const initial: Record<string, string> = {};
      groups.forEach(g => {
        if (g.options && g.options.length > 0) {
          initial[g.id] = g.options[0];
        }
      });
      setSelectedProductOptions(initial);
      setCustomCardNote('');
      setModalQuantity(1);
    }
  }, [selectedProduct, partner?.category]);

  // Cart Local State
  const { user } = useCustomerAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingOrderSubmit, setPendingOrderSubmit] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartPanelDismissed, setIsCartPanelDismissed] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useModalBackButton(Boolean(selectedProduct), () => setSelectedProduct(null), 'product-detail-modal');
  useModalBackButton(isCheckoutOpen, () => setIsCheckoutOpen(false), 'checkout-modal');

  // Checkout Form State (automatically populated from device localStorage if available)
  const [custName, setCustName] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_CUSTOMER_INFO_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.custName || '';
      }
    } catch (e) {}
    return '';
  });

  const [custPhone, setCustPhone] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_CUSTOMER_INFO_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.custPhone || '';
      }
    } catch (e) {}
    return '';
  });

  const [custAddress, setCustAddress] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_CUSTOMER_INFO_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.custAddress || '';
      }
    } catch (e) {}
    return '';
  });

  useEffect(() => {
    if (isCheckoutOpen) {
      try {
        const saved = localStorage.getItem(SAVED_CUSTOMER_INFO_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.custName && !custName) setCustName(parsed.custName);
          if (parsed.custPhone && !custPhone) setCustPhone(parsed.custPhone);
          if (parsed.custAddress && !custAddress) setCustAddress(parsed.custAddress);
        }
      } catch (e) {}
    }
  }, [isCheckoutOpen]);

  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isMapPinModalOpen, setIsMapPinModalOpen] = useState(false);

  const handleMapPinConfirm = (address: StructuredAddress) => {
    setGpsLocation({ lat: address.latitude, lng: address.longitude });
    setCustAddress(address.formatted_address);
    setLocationStatusMsg({ type: 'success', text: 'Harita pini adrese yansıtıldı.' });
  };
  const [orderNote, setOrderNote] = useState('');
  const [paymentType, setPaymentType] = useState<'kapida_nakit' | 'kapida_kart'>('kapida_kart');

  // Assistant Service Fee (Min 100 TL)
  const [assistantFeeInput, setAssistantFeeInput] = useState<string>('100');

  const assistantFeeNum = useMemo(() => {
    if (!assistantFeeInput || assistantFeeInput.trim() === '') return 0;
    const parsed = parseFloat(assistantFeeInput.replace(',', '.'));
    return isNaN(parsed) ? 0 : Math.round(parsed);
  }, [assistantFeeInput]);

  const isFeeValid = assistantFeeNum >= 100;

  const feeError = useMemo(() => {
    if (assistantFeeInput.trim() === '') return 'Lütfen asistan hizmet bedeli giriniz.';
    if (assistantFeeNum < 100) return 'Asistan hizmet bedeli minimum 100 ₺ olmalıdır.';
    return null;
  }, [assistantFeeInput, assistantFeeNum]);

  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [waUrl, setWaUrl] = useState('');
  const [createdTaskId, setCreatedTaskId] = useState<string>('');
  const [trackingState, setTrackingState] = useState<CustomerTrackingState | null>(null);

  useEffect(() => {
    if (!orderSuccess || !createdTaskId || !isUUID(createdTaskId)) return;
    const fetchTracking = async () => {
      const state = await CustomerTrackingService.getLiveTrackingState(createdTaskId, 'cust-1');
      if (state) {
        setTrackingState(state);
      }
    };
    fetchTracking();
    const interval = setInterval(fetchTracking, 5000);
    return () => clearInterval(interval);
  }, [orderSuccess, createdTaskId]);

  const [structuredGpsAddress, setStructuredGpsAddress] = useState<StructuredAddress | null>(null);

  const handleGetLocation = async () => {
    setIsLocating(true);
    setLocationStatusMsg({ type: 'info', text: 'Konum doğrulanıyor...' });

    try {
      const addressData = await getAccurateLocationAndAddress((status) => {
        setLocationStatusMsg(status);
      });

      setStructuredGpsAddress(addressData);
      setGpsLocation({ lat: addressData.latitude, lng: addressData.longitude });
      setCustAddress(addressData.formatted_address);
      setLocationStatusMsg({
        type: 'success',
        text: `Konumunuz yüksek hassasiyetle belirlendi (${addressData.accuracy.toFixed(0)}m).`,
      });
    } catch (err: any) {
      console.error('StoreFront location error:', err);
      setLocationStatusMsg({
        type: 'error',
        text: err?.message || 'Konumunuz alınırken bir hata oluştu.',
      });
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check fast local cache immediately
    const cached = getCachedStoreData(slug);
    if (cached.partner && isMounted) {
      setPartner(cached.partner);
      setProducts(cached.products);
      setLoading(false);
      setError(false);
    } else if (!partner && isMounted) {
      setLoading(true);
      setError(false);
    }

    const fetchStoreData = async () => {
      try {
        const partnerData = await db.getPartnerBySlug(slug);
        if (!isMounted) return;

        if (!partnerData) {
          if (!cached.partner) {
            setError(true);
          }
          return;
        }

        setPartner(partnerData);
        setError(false);

        const productsData = await db.getProducts(partnerData.id);
        if (!isMounted) return;

        setProducts(productsData.filter(p => p.active));
      } catch (err) {
        console.error('Error fetching storefront data:', err);
        if (!cached.partner) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (slug) {
      fetchStoreData();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const addToCart = (
    product: Product, 
    quantity = 1, 
    options?: Record<string, string>, 
    note?: string
  ) => {
    setIsCartPanelDismissed(false);

    const optSummary = options && Object.keys(options).length > 0
      ? Object.values(options).join(' / ')
      : '';
    const toastLabel = optSummary ? `"${product.title}" (${optSummary})` : `"${product.title}"`;
    showToast(`${toastLabel} sepete eklendi`);

    setCart(prev => {
      const optionsKey = JSON.stringify(options || {});
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && JSON.stringify(item.selectedOptions || {}) === optionsKey
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          cardNote: note || updated[existingIndex].cardNote
        };
        return updated;
      }

      return [...prev, { product, quantity, selectedOptions: options, cardNote: note }];
    });
  };

  const updateCartQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setIsCartPanelDismissed(false);
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.product.id !== productId);
      if (updated.length === 0) {
        setIsCartPanelDismissed(false);
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const grandTotal = useMemo(() => {
    return cartTotal + (isFeeValid ? assistantFeeNum : 0);
  }, [cartTotal, assistantFeeNum, isFeeValid]);

  // Extract unique product_type values for the store dynamically
  const categoryList = useMemo(() => {
    const list: string[] = ['Tümü'];
    const addedSet = new Set<string>(['tümü']);

    // Store main category names that must NEVER be displayed as product type tabs
    const storeCatLower = (partner?.category || '').trim().toLowerCase();
    const mainCategoryBanned = new Set<string>([
      'giyim', 'kahve', 'kafe', 'cafe', 'petshop', 'teknoloji', 'elektronik',
      'kozmetik', 'optik', 'çiçekçi', 'cicekci', 'market', 'restoran', 'tatlıcı',
      'tatlici', 'pastane', 'manav', 'kasap', 'eczane', 'medikal', 'bakkal', 'süpermarket',
      storeCatLower
    ].filter(Boolean));

    // 1. Load default product types for this store's category so tabs are ready when store loads
    const presetTypes = getProductTypeOptions(partner?.category);
    presetTypes.forEach(type => {
      const typeLower = type.trim().toLowerCase();
      if (!addedSet.has(typeLower) && !mainCategoryBanned.has(typeLower)) {
        list.push(type);
        addedSet.add(typeLower);
      }
    });

    // 2. Collect product_type values strictly from actual products in this store (including custom product types)
    products.forEach(p => {
      const pType = (p.product_type || p.subcategory || '').trim();
      if (pType) {
        const typeLower = pType.toLowerCase();
        if (!addedSet.has(typeLower) && !mainCategoryBanned.has(typeLower)) {
          list.push(pType);
          addedSet.add(typeLower);
        }
      }
    });

    return list;
  }, [products, partner?.category]);

  // Filter products strictly by selected product_type
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Tümü') return products;

    const selLower = selectedCategory.toLowerCase().trim();

    return products.filter(p => {
      const pTypeLower = (p.product_type || p.subcategory || '').trim().toLowerCase();
      
      // Strict product_type match
      if (pTypeLower === selLower) return true;

      // Fallback for legacy items without product_type
      if (!pTypeLower && p.category && p.category.toLowerCase().trim() === selLower) {
        return true;
      }

      return false;
    });
  }, [products, selectedCategory]);

  const executeOrderCreation = async () => {
    if (!partner || cart.length === 0) return;
    if (!isFeeValid) {
      setCheckoutError('Asistan hizmet bedeli minimum 100 ₺ olmalıdır.');
      return;
    }
    setOrderSubmitting(true);
    try {
      const itemMap = new Map<string, number>();
      cart.forEach(item => {
        if (!item.product || !item.product.id) return;
        const currentQty = itemMap.get(item.product.id) || 0;
        itemMap.set(item.product.id, currentQty + item.quantity);
      });

      const orderItems = Array.from(itemMap.entries()).map(([product_id, quantity]) => ({
        product_id,
        quantity
      }));

      const effectiveFee = assistantFeeNum;

      // Create store task via secure RPC (bypasses direct tasks INSERT RLS safely)
      console.log("BEFORE createStoreOrder RPC");
      const savedTask = await db.createStoreOrder({
        partner_id: partner.id,
        items: orderItems,
        assistant_fee: effectiveFee,
        delivery_address: custAddress.trim(),
        delivery_lat: gpsLocation?.lat || structuredGpsAddress?.latitude,
        delivery_lng: gpsLocation?.lng || structuredGpsAddress?.longitude,
        customer_name: custName.trim(),
        customer_phone: custPhone.trim(),
        customer_note: orderNote.trim()
      });
      console.log("AFTER createStoreOrder RPC:", savedTask);
      const newTaskId = savedTask?.id || savedTask?.task_id || '';
      if (newTaskId) {
        setCreatedTaskId(newTaskId);
      }

      const taskDispatchInput: any = {
        ...savedTask,
        id: savedTask.id || savedTask.task_id,
        task_id: savedTask.id || savedTask.task_id,
        is_task: true,
        source: 'tasks',
        partner_id: partner.id,
        partner_name: partner.business_name,
        customer_name: custName.trim(),
        customer_phone: custPhone.trim(),
        customer_address: custAddress.trim(),
        delivery_address: custAddress.trim(),
        courier_net: savedTask.courier_net || effectiveFee,
        customer_price: savedTask.customer_price || (cartTotal + effectiveFee),
        total_price: savedTask.total_price || (cartTotal + effectiveFee),
        notes: savedTask.task_description,
        service_type: 'asistan_siparis'
      };

      // Trigger dispatch to assistant network
      try {
        await LiveDispatchService.dispatchToNextCandidate(taskDispatchInput);
      } catch (dispatchErr) {
        console.warn('Dispatch notice for store task:', dispatchErr);
      }

      // Auto-save customer details
      try {
        localStorage.setItem(SAVED_CUSTOMER_INFO_KEY, JSON.stringify({
          custName: custName.trim(),
          custPhone: custPhone.trim(),
          custAddress: custAddress.trim()
        }));
      } catch (e) {}

      setOrderSuccess(true);
      clearCart();
    } catch (err: any) {
      console.error('Error placing order:', err);
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setCheckoutError('Sipariş kaydedilirken hata oluştu: ' + errMsg);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner || cart.length === 0) return;
    setCheckoutError(null);

    if (!custName.trim() || !custPhone.trim() || !custAddress.trim()) {
      setCheckoutError('Lütfen tüm sipariş bilgilerini eksiksiz doldurunuz.');
      return;
    }

    if (!isFeeValid) {
      setCheckoutError('Asistan hizmet bedeli minimum 100 ₺ olmalıdır.');
      return;
    }

    const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';

    if (!user && !isDev) {
      setPendingOrderSubmit(true);
      setIsCheckoutOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    await executeOrderCreation();
  };

  const handleAuthClose = () => {
    setIsAuthModalOpen(false);
    if (pendingOrderSubmit) {
      setIsCheckoutOpen(true);
      setPendingOrderSubmit(false);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
  };

  useEffect(() => {
    if (user && pendingOrderSubmit) {
      setIsAuthModalOpen(false);
      setIsCheckoutOpen(true);
      setPendingOrderSubmit(false);
      executeOrderCreation();
    }
  }, [user, pendingOrderSubmit]);

  const closeSuccessDialog = () => {
    setOrderSuccess(false);
    setIsCheckoutOpen(false);
    setWaUrl('');
    setOrderNote('');
    setGpsLocation(null);
    setLocationStatusMsg(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-white mx-auto" />
          <p className="text-[#A7AFBA] text-sm font-medium">Mağaza yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-5 max-w-sm">
          <ShieldAlert className="w-16 h-16 text-white mx-auto opacity-80" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Mağaza Bulunamadı</h1>
            <p className="text-sm text-[#A7AFBA] leading-relaxed">
              Aradığınız <strong>"{slug}"</strong> mağazası mevcut değil ya da şu anda aktif değil.
            </p>
          </div>
          <Link href="/">
            <button className="w-full bg-[#121214] border border-[#242428] hover:bg-[#1A1A1E] text-white py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors">
              Ana Sayfaya Dön
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const storeStatus = isStoreOpen(partner);
  const handleName = partner.slug ? `@${partner.slug}` : `@${partner.business_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const catKey = getCategoryKey(partner.category);
  const uploadedCover = partner.cover_image || (partner as any).banner;
  const isOldCafePhoto = uploadedCover && (
    uploadedCover.includes('photo-1501339847302-ac426a4a7cbb') ||
    uploadedCover.includes('photo-1517256064527-09c73fc73e38')
  );

  const bannerBg = (uploadedCover && (!isOldCafePhoto || catKey === 'kahve'))
    ? uploadedCover
    : getDefaultCategoryBanner(partner.category);

  return (
    <div className="min-h-screen bg-transparent text-white font-sans antialiased pb-32 selection:bg-white/20 selection:text-white">
      {/* Toast Notification Floating Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#121214] border border-[#242428] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-2 sm:pt-4">
        
        {/* TOP COVER BANNER WITH OVERLAY BUTTONS */}
        <div className="relative w-full h-36 sm:h-52 md:h-56 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#121214] border border-[#242428] shadow-2xl">
          <img
            referrerPolicy="no-referrer"
            src={bannerBg}
            alt={partner.business_name}
            className="w-full h-full object-cover brightness-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-black/20 to-black/60" />

          {/* Top Bar Action Buttons over Banner */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
            <button 
              type="button"
              onClick={handleBack}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer shadow-lg"
              title="Geri Dön"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={shareStore}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer shadow-lg"
                title="Mağazayı Paylaş"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('hakkinda')}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black transition-all cursor-pointer shadow-lg"
                title="Mağaza Bilgileri"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* STORE PROFILE HEADER SECTION */}
        <div className="relative px-2 sm:px-4 -mt-12 sm:-mt-16 z-20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            {/* Store Logo Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#0B0B0C] bg-[#121214] shadow-2xl overflow-hidden flex items-center justify-center text-white text-3xl font-black shrink-0">
              {partner.logo ? (
                <img referrerPolicy="no-referrer" src={partner.logo} alt={partner.business_name} className="w-full h-full object-cover" />
              ) : (
                partner.business_name.charAt(0)
              )}
            </div>

            {/* Store Title & Status */}
            <div className="flex-1 min-w-0 pt-1 sm:pt-0 sm:pl-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {partner.business_name}
                </h1>
                <CheckCircle2 className="w-5 h-5 text-white fill-white/20 shrink-0" />
              </div>

              <div className="text-xs text-[#A7AFBA] font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span>{handleName}</span>
                <span>•</span>
                <span>{partner.category ? normalizeCategory(partner.category) : 'Mağaza'}</span>
                <span>•</span>
                {storeStatus.isOpen ? (
                  <span className="text-emerald-400 font-bold bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[11px] inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Açık
                  </span>
                ) : (
                  <span className="text-red-400 font-bold bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full text-[11px] inline-flex items-center gap-1">
                    Kapalı
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* FOLLOW BUTTON (Matching reference image) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={toggleFollow}
              className={`w-full h-11 rounded-xl text-sm font-extrabold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border-0 active:scale-98 shadow-sm ${
                isFollowed 
                  ? 'bg-[#121214] text-white border border-[#242428] hover:bg-[#1A1A1E]' 
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {isFollowed ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Takibi Bırak</span>
                </>
              ) : (
                <>
                  <span>+ Takip Et</span>
                </>
              )}
            </button>
          </div>

          {/* SECTION TABS (Ürünler, Hakkında) */}
          <div className="border-b border-[#242428] pt-2 flex items-center gap-6 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('urunler')}
              className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === 'urunler' ? 'text-white' : 'text-[#A7AFBA] hover:text-white'
              }`}
            >
              Ürünler
              {activeTab === 'urunler' && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('hakkinda')}
              className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === 'hakkinda' ? 'text-white' : 'text-[#A7AFBA] hover:text-white'
              }`}
            >
              Hakkında
              {activeTab === 'hakkinda' && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: PRODUCTS (Ürünler) */}
        {activeTab === 'urunler' && (
          <div className="mt-6 space-y-5">
            {/* HORIZONTAL CATEGORY SCROLL PILLS */}
            {categoryList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categoryList.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                        isActive
                          ? 'bg-white text-black border-white shadow-md'
                          : 'bg-[#121214] text-white border-[#242428] hover:bg-[#1A1A1E]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}

            {/* PRODUCT LIST (Row Layout matching reference image) */}
            {filteredProducts.length === 0 ? (
              <div className="bg-[#121214] border border-[#242428] rounded-2xl p-12 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-[#A7AFBA]/40 mx-auto" />
                <h4 className="text-sm font-semibold text-white">Bu kategoride henüz ürün bulunmuyor.</h4>
                <p className="text-xs text-[#A7AFBA]">Diğer kategorileri inceleyebilirsiniz.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((prod) => {
                  const cartItem = cart.find(item => item.product.id === prod.id);

                  return (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      cartQuantity={cartItem?.quantity || 0}
                      isFavorite={favorites.includes(prod.id)}
                      onSelectProduct={(p) => {
                        setSelectedProduct(p);
                        setActiveImageIndex(0);
                        const existing = cart.find(item => item.product.id === p.id);
                        setModalQuantity(existing ? existing.quantity : 1);
                      }}
                      onAddToCart={addToCart}
                      onUpdateQuantity={updateCartQuantity}
                      onToggleFavorite={toggleFavoriteProduct}
                      onShareProduct={shareProduct}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HAKKINDA (About Store) */}
        {activeTab === 'hakkinda' && (
          <div className="mt-6 space-y-4">
            <div className="bg-[#121214] border border-[#242428] rounded-2xl p-5 space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-[#242428] pb-3">
                Mağaza Bilgileri
              </h3>

              <div className="space-y-3 text-sm text-[#A7AFBA]">
                <p className="leading-relaxed text-white">
                  {partner.description || 'Seçkin lezzetler ve özel hazırlanan sunumlarımızla hizmetinizdeyiz. UĞRA zaman asistanınız ile siparişiniz kapınıza kadar hızlıca ulaştırılır.'}
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs text-[#A7AFBA]">Telefon</span>
                      <span className="font-bold text-white">{partner.phone || 'Belirtilmemiş'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs text-[#A7AFBA]">Adres</span>
                      <span className="font-bold text-white">{partner.address || 'Serdivan / Sakarya'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-white shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs text-[#A7AFBA]">Çalışma Saatleri</span>
                      <span className="font-bold text-white">{(partner as any).opening_hours || 'Haftanın Her Günü: 08:00 - 23:00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* STICKY / FLOATING CART BAR AT BOTTOM RIGHT */}
      <AnimatePresence>
        {cart.length > 0 && !isCartPanelDismissed && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 right-4 sm:right-6 z-40"
          >
            <div 
              onClick={() => {
                setIsCheckoutOpen(true);
                setOrderSuccess(false);
              }}
              className="relative bg-[#121214] border border-[#242428] rounded-full px-4 py-2.5 flex items-center gap-3.5 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-white/20 transition-all active:scale-98"
            >
              {/* Close Button "X" */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCartPanelDismissed(true);
                }}
                className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-[#121214] border border-[#242428] text-[#A7AFBA] hover:text-white flex items-center justify-center transition-all shadow-lg cursor-pointer z-10"
                title="Kapat"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Cart Icon */}
              <div className="text-white shrink-0 pl-1">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>

              <div className="h-4 w-px bg-[#242428]" />

              {/* Items & Total Price */}
              <div className="flex items-center gap-2.5 text-xs text-white">
                <span className="font-semibold text-[#A7AFBA]">{cartItemCount} Ürün</span>
                <span className="font-extrabold text-white text-sm">{cartTotal.toLocaleString('tr-TR')} ₺</span>
              </div>

              {/* White Arrow Circle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCheckoutOpen(true);
                  setOrderSuccess(false);
                }}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center transition-all cursor-pointer hover:bg-zinc-200 shrink-0 ml-1"
                title="Siparişi Tamamla"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Mini Reopen Floating Cart Button */}
        {cart.length > 0 && isCartPanelDismissed && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsCartPanelDismissed(false)}
            className="fixed bottom-5 right-4 z-40 bg-white text-black font-extrabold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer hover:bg-zinc-200 transition-all"
            title="Sepeti Aç"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-xs">{cartItemCount} Ürün • {cartTotal.toLocaleString('tr-TR')} ₺</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL & SUCCESS DIALOG */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSuccessDialog}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-lg bg-[#121214] border border-[#242428] text-white rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92dvh] overflow-y-auto"
            >
              {!orderSuccess ? (
                <div className="space-y-4 relative">
                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="absolute top-0 right-0 z-20 w-8 h-8 rounded-full bg-[#1A1A1E] hover:bg-white/10 text-white flex items-center justify-center cursor-pointer border border-[#242428] transition-colors"
                    title="Kapat"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Header */}
                  <div className="text-center pb-2 border-b border-[#242428] pr-8">
                    <h3 className="font-extrabold text-xl text-white tracking-tight">Siparişi Tamamla</h3>
                    <p className="text-xs text-[#A7AFBA] mt-1">Siparişiniz doğrulandıktan sonra mağazaya iletilecektir.</p>
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A7AFBA] block">
                      SEPETİNİZDEKİ ÜRÜNLER
                    </span>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div key={item.product.id} className="bg-[#1A1A1E] rounded-xl p-3 flex items-center justify-between gap-3 border border-[#242428]">
                          {item.product.image ? (
                            <div className="w-10 h-10 bg-white rounded-lg p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                              <img
                                referrerPolicy="no-referrer"
                                src={item.product.image}
                                alt={item.product.title}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-[#A7AFBA] shrink-0">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-white text-xs truncate">{item.product.title}</h4>
                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                              <p className="text-[10px] text-primary font-medium truncate">
                                {Object.values(item.selectedOptions).join(' • ')}
                              </p>
                            )}
                            {item.cardNote && (
                              <p className="text-[10px] text-amber-300 font-medium truncate">
                                Not: {item.cardNote}
                              </p>
                            )}
                            <p className="text-[11px] text-[#A7AFBA] font-semibold">{item.product.price} ₺ / adet</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-xs cursor-pointer border-0"
                            >
                              -
                            </button>
                            <span className="font-extrabold text-xs text-white w-4 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-xs cursor-pointer border-0"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="w-6 h-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center rounded-md transition-colors cursor-pointer border-0 bg-transparent ml-0.5"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-extrabold text-white whitespace-nowrap text-right shrink-0 ml-1">
                              {(item.product.price * item.quantity).toLocaleString('tr-TR')} ₺
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleOrderSubmit} className="space-y-3 text-left pt-1">
                    {checkoutError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-between">
                        <span>{checkoutError}</span>
                        <button type="button" onClick={() => setCheckoutError(null)} className="text-[10px] text-red-400 underline">Kapat</button>
                      </div>
                    )}
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#A7AFBA] block">
                        AD SOYAD
                      </label>
                      <input
                        type="text"
                        placeholder="Adınız Soyadınız"
                        autoComplete="name"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        className="w-full bg-[#1A1A1E] border border-[#242428] focus:border-white focus:ring-1 focus:ring-white outline-none rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-[#A7AFBA]/40 transition-all"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#A7AFBA] block">
                        TELEFON NUMARASI
                      </label>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0555 123 45 67"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        className="w-full bg-[#1A1A1E] border border-[#242428] focus:border-white focus:ring-1 focus:ring-white outline-none rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-[#A7AFBA]/40 transition-all"
                        required
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#A7AFBA] block">
                          SİPARİŞ ADRESİ
                        </label>
                        {gpsLocation && (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> GPS Bağlandı
                          </span>
                        )}
                      </div>

                      <textarea
                        placeholder="Örn: Serdivan, Üniversite Caddesi No:12 Daire:4"
                        autoComplete="street-address"
                        value={custAddress}
                        onChange={(e) => setCustAddress(e.target.value)}
                        className="w-full bg-[#1A1A1E] border border-[#242428] focus:border-white focus:ring-1 focus:ring-white outline-none rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-[#A7AFBA]/40 transition-all h-16 resize-none leading-relaxed"
                        required
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={isLocating}
                          className="py-2 px-3 bg-[#1A1A1E] hover:bg-[#242428] text-white text-xs font-bold rounded-xl border border-[#242428] hover:border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          {isLocating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Alınıyor...</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-white" />
                              <span>Mevcut Konum</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMapPinModalOpen(true)}
                          className="py-2 px-3 bg-[#1A1A1E] hover:bg-[#242428] text-white text-xs font-bold rounded-xl border border-[#242428] hover:border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Harita Pini</span>
                        </button>
                      </div>

                      {locationStatusMsg && (
                        <div
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                            locationStatusMsg.type === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {locationStatusMsg.type === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          )}
                          <span>{locationStatusMsg.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Note */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#A7AFBA] block">
                        SİPARİŞ NOTU (OPSİYONEL)
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: Kapıya bırakabilirsiniz"
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        className="w-full bg-[#1A1A1E] border border-[#242428] focus:border-white focus:ring-1 focus:ring-white outline-none rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-[#A7AFBA]/40 transition-all"
                      />
                    </div>

                    {/* Payment Info Card */}
                    <div className="space-y-3 bg-[#1A1A1E] border border-[#242428] rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                          <span>ÖDEME YÖNTEMİ</span>
                        </label>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Asistana Doğrudan Transfer
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Talebiniz asistan tarafından kabul edildiğinde, IBAN ve hesap bilgisi <strong>Gelen Kutusu</strong> ve <strong>Ödemelerim</strong> ekranına iletilecektir. Ödemeyi doğrudan asistanın IBAN hesabına göndereceksiniz.
                      </p>

                      <div className="pt-3 border-t border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-xs text-zinc-400">
                          <span>Ürünler Toplamı:</span>
                          <span className="font-bold text-white">{cartTotal.toLocaleString('tr-TR')} ₺</span>
                        </div>

                        {/* Asistan Hizmet Bedeli Editable Input */}
                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-200 block">
                              ASİSTAN HİZMET BEDELİ
                            </label>
                            <span className="text-[10px] text-zinc-400 font-medium">Min: 100 ₺</span>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={100}
                              step={10}
                              placeholder="100"
                              value={assistantFeeInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAssistantFeeInput(val);
                                if (checkoutError) setCheckoutError(null);
                              }}
                              className={`w-full bg-[#121214] border ${
                                feeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-[#242428] focus:border-white focus:ring-1 focus:ring-white'
                              } outline-none rounded-xl py-2.5 pl-3.5 pr-8 text-xs text-white font-extrabold transition-all placeholder:text-zinc-600`}
                              required
                            />
                            <span className="absolute right-3 text-xs font-bold text-zinc-400 pointer-events-none select-none">
                              ₺
                            </span>
                          </div>
                          {feeError && (
                            <p className="text-[11px] font-semibold text-red-400 mt-0.5">
                              {feeError}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-white font-extrabold text-sm sm:text-base pt-2.5 border-t border-white/10">
                          <span>Ödenecek Toplam Tutar:</span>
                          <span className="text-white font-black text-base sm:text-lg">
                            {grandTotal.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={orderSubmitting || !storeStatus.isOpen || !isFeeValid}
                        className={`w-full font-extrabold py-3.5 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 border-0 ${
                          storeStatus.isOpen && isFeeValid
                            ? 'bg-white hover:bg-zinc-200 text-black cursor-pointer active:scale-[0.98] shadow-lg' 
                            : 'bg-[#1A1A1E] text-zinc-500 border border-[#242428] cursor-not-allowed opacity-70'
                        }`}
                      >
                        {orderSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-black" />
                        ) : !storeStatus.isOpen ? (
                          <span>MAĞAZA KAPALI • SİPARİŞ ALINAMIYOR</span>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3] text-black" />
                            <span>ASİSTAN TALEBİ OLUŞTUR • {grandTotal.toLocaleString('tr-TR')} ₺</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* SUCCESS STAGE */
                <div className="flex flex-col items-center justify-center text-center py-2 space-y-4 text-white">
                  {/* UĞRA. Logo */}
                  <div className="font-sans font-extrabold tracking-wider text-2xl text-white select-none text-center">
                    UĞRA<span className="text-[#FF7A00]">.</span>
                  </div>

                  <h3 className="text-xl font-bold text-white tracking-tight text-center">
                    🎉 Asistan Talebiniz Oluşturuldu!
                  </h3>

                  <p className="text-xs text-[#A7AFBA] leading-relaxed max-w-sm mx-auto">
                    Talebiniz asistan ağımıza iletildi. Bir asistan talebinizi kabul ettiğinde, ödeme ve IBAN bilgileri <strong className="text-white">Gelen Kutusu</strong> ve <strong className="text-white">Ödemelerim</strong> bölümünüze aktarılacaktır.
                  </p>

                  <div className="w-full border-t border-[#242428] my-1"></div>

                  <button
                    type="button"
                    onClick={() => {
                      closeSuccessDialog();
                      window.dispatchEvent(
                        new CustomEvent('open-customer-account-modal', { detail: { tab: 'taleplerim' } })
                      );
                    }}
                    className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-xl transition-all duration-200 cursor-pointer text-xs flex items-center justify-center gap-2 border-0 shadow-lg"
                  >
                    <span>TALEPLERİMİ VE DURUMU GÖR</span>
                  </button>

                  <button
                    type="button"
                    onClick={closeSuccessDialog}
                    className="w-full h-10 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors duration-200 cursor-pointer text-xs border-0"
                  >
                    Kapat
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRODUCT DETAIL MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[#121214] border border-[#242428] rounded-3xl p-4 sm:p-5 max-w-md w-full max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl relative"
            >
              {(() => {
                const galleryImages = selectedProduct.images && selectedProduct.images.length > 0 
                  ? selectedProduct.images 
                  : (selectedProduct.image ? [selectedProduct.image] : []);
                const currentImg = galleryImages[activeImageIndex] || selectedProduct.image || '';
                const cartItem = cart.find(item => item.product.id === selectedProduct.id);

                return (
                  <div className="space-y-4">
                    {/* Main Image */}
                    <div className="relative w-full aspect-square max-h-[300px] bg-white rounded-2xl p-3 flex items-center justify-center group shadow-md border border-white/10 mx-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center cursor-pointer border-0 transition-all"
                        title="Kapat"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {currentImg ? (
                        <img
                          referrerPolicy="no-referrer"
                          src={currentImg}
                          alt={selectedProduct.title}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 bg-zinc-50 rounded-lg">
                          <ShoppingBag className="w-12 h-12 text-zinc-400" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-3 pt-1">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full">
                            {selectedProduct.category || 'ÜRÜN'}
                          </span>
                          <h3 className="text-xl font-extrabold text-white tracking-tight mt-1.5">
                            {selectedProduct.title}
                          </h3>
                          <p className="text-xs text-[#A7AFBA] mt-0.5">
                            {selectedProduct.description || 'Tercih Sizin'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-2xl font-black text-white block leading-none">
                            {selectedProduct.price.toLocaleString('tr-TR')} ₺
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Options based strictly on product's/store's category */}
                      {(() => {
                        const catKey = getCategoryKey(partner?.category, selectedProduct.category);
                        const variantGroups = getProductVariantGroups(catKey, selectedProduct.attributes);

                        if (variantGroups.length === 0) return null;

                        return (
                          <div className="space-y-3 pt-2 border-t border-[#242428]">
                            {variantGroups.map(group => (
                              <div key={group.id} className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#A7AFBA] uppercase tracking-wider block">
                                  {group.label}
                                </label>
                                
                                {group.type === 'text' ? (
                                  <input
                                    type="text"
                                    value={customCardNote}
                                    onChange={(e) => setCustomCardNote(e.target.value)}
                                    placeholder="Sipariş kartınıza yazılacak notu giriniz..."
                                    className="w-full bg-[#1A1A1E] border border-[#242428] focus:border-white rounded-xl py-2 px-3 text-xs text-white outline-none"
                                  />
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {group.options.map(opt => {
                                      const isSelected = selectedProductOptions[group.id] === opt;
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => {
                                            setSelectedProductOptions(prev => ({
                                              ...prev,
                                              [group.id]: opt
                                            }));
                                          }}
                                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                            isSelected
                                              ? 'bg-white text-black border-white shadow-md'
                                              : 'bg-[#1A1A1E] border-[#242428] text-[#A7AFBA] hover:text-white hover:border-zinc-700'
                                          }`}
                                        >
                                          <span>{opt}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Quantity Stepper */}
                      <div className="pt-2 flex items-center justify-between gap-3 bg-[#1A1A1E] border border-[#242428] rounded-xl p-2">
                        <button
                          type="button"
                          onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                          className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-extrabold text-white text-base hover:bg-white/20 transition-all cursor-pointer shrink-0"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-sm text-white">
                          {modalQuantity} Adet
                        </span>
                        <button
                          type="button"
                          onClick={() => setModalQuantity(prev => prev + 1)}
                          className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-extrabold text-white text-base hover:bg-white/20 transition-all cursor-pointer shrink-0"
                        >
                          +
                        </button>
                      </div>

                      {/* Add Action */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(selectedProduct, modalQuantity, selectedProductOptions, customCardNote);
                            setSelectedProduct(null);
                          }}
                          className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] border-0"
                        >
                          <ShoppingCart className="w-4 h-4 text-black" />
                          <span>SEPETE EKLE ({(modalQuantity * selectedProduct.price).toLocaleString('tr-TR')} ₺)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
      />

      {/* Map Pin Picker Modal */}
      <MapPinPickerModal
        isOpen={isMapPinModalOpen}
        onClose={() => setIsMapPinModalOpen(false)}
        onConfirm={handleMapPinConfirm}
        initialLat={gpsLocation?.lat}
        initialLng={gpsLocation?.lng}
      />
    </div>
  );
}
