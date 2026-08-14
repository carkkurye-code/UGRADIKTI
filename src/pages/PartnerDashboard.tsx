import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  db, isSupabaseConfigured, supabase, supabasePartner, getActiveSupabaseClient, Partner, Product, ProductAttributes, Order, SupportTicket, 
  ReviewItem, Campaign, NotificationLog, OFFICIAL_PARTNER_CATEGORIES, normalizeCategory,
  ensurePartnerInDatabase, isUUID, City, Franchise, resolveFranchiseForCity 
} from '@/lib/supabase';
import { 
  ShoppingBag, Package, Settings, LogOut, Plus, Edit, Trash2, Check, X, 
  ExternalLink, Loader2, Sparkles, Phone, MapPin, Tag, CircleDollarSign, 
  Layers, Upload, ChevronRight, Eye, User, Truck, Clock, AlertCircle, RefreshCw,
  ArrowLeft, Building, Lock, Mail, Link as LinkIcon, EyeOff, Image as ImageIcon,
  HelpCircle, CheckCircle, Calendar, Info, BarChart3, TrendingUp, Copy, Percent,
  Megaphone, Bell, Shield, History, Star, MessageSquare, DollarSign, CheckCircle2,
  XCircle, Zap, ShieldAlert, Printer, Crop, ZoomIn, ZoomOut, Move, ArrowUp, ArrowDown, ArrowRight, Sliders
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useModalBackButton } from '@/hooks/useModalBackButton';

import { PartnerOperatingHeader } from '@/components/partner/PartnerOperatingHeader';
import { PartnerSubscriptionTab } from '@/components/partner/PartnerSubscriptionTab';
import { PartnerOverviewTab } from '@/components/partner/PartnerOverviewTab';
import { PartnerProductsTab } from '@/components/partner/PartnerProductsTab';
import { PartnerReviewsTab } from '@/components/partner/PartnerReviewsTab';
import { PartnerAnalyticsTab } from '@/components/partner/PartnerAnalyticsTab';
import { PartnerCampaignsTab } from '@/components/partner/PartnerCampaignsTab';
import { PartnerNotificationsTab } from '@/components/partner/PartnerNotificationsTab';
import { PartnerOrderDetailModal } from '@/components/partner/PartnerOrderDetailModal';
import { CategoryProductFields } from '@/components/partner/CategoryProductFields';
import { getProductTypeOptions, getSubcategoryOptions, PRESET_TAGS } from '@/lib/categoryVariants';
import { PartnerOperationsService } from '@/services/partnerOperations';
import { NotificationService } from '@/services/notificationService';

export interface RealtimeNotification {
  id: string;
  customerName: string;
  totalPrice: number;
  itemCount: number;
  createdAt: Date;
}



export function PartnerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  // States for operational controls
  const [operatingStatus, setOperatingStatus] = useState<'open' | 'closed' | 'busy' | 'temp_closed'>('open');
  const [prepTime, setPrepTime] = useState<number | string>('');

  // Business info extension states
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [iban, setIban] = useState('');

  // States for order selection and deletion system
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [orderDetailModal, setOrderDetailModal] = useState<Order | null>(null);

  // Bulk Price & Stock Modals
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceType, setBulkPriceType] = useState<'percent_up' | 'percent_down' | 'fixed_add' | 'fixed_sub'>('percent_up');
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockValue, setBulkStockValue] = useState('');

  useModalBackButton(Boolean(orderToDelete), () => setOrderToDelete(null), 'partner-delete-order-modal');
  useModalBackButton(Boolean(orderDetailModal), () => setOrderDetailModal(null), 'partner-order-detail-modal');
  useModalBackButton(showBulkPriceModal, () => setShowBulkPriceModal(false), 'partner-bulk-price-modal');
  useModalBackButton(showBulkStockModal, () => setShowBulkStockModal(false), 'partner-bulk-stock-modal');

  // Real-time notifications and badges
  const [unreadOrdersCount, setUnreadOrdersCount] = useState(0);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Tabs: dashboard | products | orders | reviews | analytics | notifications | campaigns | hours | audit | support | info | logo | gallery
  const [activeTab, setActiveTab] = useState('dashboard');
  const activeTabRef = React.useRef('dashboard');

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'orders') {
      setUnreadOrdersCount(0);
    }
  }, [activeTab]);

  // Audio & Notification Warmup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    audioRef.current = new Audio('/sounds/new-order.mp3');

    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play()
          .then(() => {
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
          })
          .catch(() => {});
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Helper to trigger new order notifications
  const triggerNewOrderNotification = (newOrder: Order) => {
    let count = 0;
    if (Array.isArray(newOrder.items)) {
      count = newOrder.items.reduce((acc, item: any) => acc + (item.quantity || 1), 0);
    } else if (newOrder.items) {
      try {
        const itemsArr = typeof newOrder.items === 'string' ? JSON.parse(newOrder.items) : newOrder.items;
        if (Array.isArray(itemsArr)) {
          count = itemsArr.reduce((acc, item: any) => acc + (item.quantity || 1), 0);
        }
      } catch (e) {
        count = 1;
      }
    } else {
      count = 1;
    }

    const newNotif: RealtimeNotification = {
      id: newOrder.id,
      customerName: newOrder.customer_name,
      totalPrice: newOrder.total_price,
      itemCount: count,
      createdAt: new Date()
    };

    setNotifications(prev => [newNotif, ...prev]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newOrder.id));
    }, 8000);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    if (activeTabRef.current !== 'orders') {
      setUnreadOrdersCount(prev => prev + 1);
    }

    handleRefresh();
  };

  // Fast polling interval for orders
  useEffect(() => {
    if (!partner?.id || !isUUID(partner.id)) return;
    const interval = setInterval(() => {
      db.getOrders(partner.id).then(ords => {
        setOrders(ords);
      }).catch(err => console.warn('Polling orders error:', err));
    }, 5000);
    return () => clearInterval(interval);
  }, [partner?.id]);

  // Supabase Realtime Channel
  useEffect(() => {
    if (!partner || !partner.id || !isUUID(partner.id) || !isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`partner-orders-${partner.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `partner_id=eq.${partner.id}`
        },
        (payload: any) => {
          if (payload.new) {
            triggerNewOrderNotification(payload.new as Order);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[PartnerDashboard] Realtime subscribed for partner orders`);
        }
      });

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [partner?.id]);

  // New & Edit Product state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productActive, setProductActive] = useState(true);
  const [productSubcategory, setProductSubcategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [productTags, setProductTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [productAttributes, setProductAttributes] = useState<ProductAttributes>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Image Cropper / Adjuster Modal State
  const [adjustingImageIndex, setAdjustingImageIndex] = useState<number | null>(null);
  const [adjustingImageUrl, setAdjustingImageUrl] = useState<string | null>(null);

  useModalBackButton(showProductModal, () => setShowProductModal(false), 'partner-product-modal');
  useModalBackButton(adjustingImageUrl !== null, () => { setAdjustingImageUrl(null); setAdjustingImageIndex(null); }, 'partner-crop-image-modal');
  const [cropZoom, setCropZoom] = useState<number>(1.0);
  const [cropOffsetX, setCropOffsetX] = useState<number>(0);
  const [cropOffsetY, setCropOffsetY] = useState<number>(0);
  const [cropBgColor, setCropBgColor] = useState<string>('#161619');
  const [isSavingAdjustedImage, setIsSavingAdjustedImage] = useState<boolean>(false);

  // Product Delete Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<boolean>(false);

  // Edit Store State
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [storeLogo, setStoreLogo] = useState('');
  const [storeSaving, setStoreSaving] = useState(false);

  // Weekly Working Hours State
  const [workingHours, setWorkingHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({
    Pazartesi: { open: '09:00', close: '22:00', closed: false },
    Salı: { open: '09:00', close: '22:00', closed: false },
    Çarşamba: { open: '09:00', close: '22:00', closed: false },
    Perşembe: { open: '09:00', close: '22:00', closed: false },
    Cuma: { open: '09:00', close: '23:00', closed: false },
    Cumartesi: { open: '10:00', close: '23:00', closed: false },
    Pazar: { open: '10:00', close: '22:00', closed: false }
  });

  // Gallery
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);

  // Support Ticket Form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [signupCategory, setSignupCategory] = useState(OFFICIAL_PARTNER_CATEGORIES[0] || 'Kahve');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('');
  const [activeCities, setActiveCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityResolution, setCityResolution] = useState<{
    count: number;
    franchiseId: string | null;
    franchise: Franchise | null;
    franchises: Franchise[];
  }>({ count: 0, franchiseId: null, franchise: null, franchises: [] });
  const [cityResolving, setCityResolving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Load active cities for partner registration
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
        console.error('Error fetching active cities for partner registration:', err);
      } finally {
        if (isMounted) setLoadingCities(false);
      }
    };
    fetchActiveCities();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePartnerCityChange = async (cityId: string) => {
    const selectedCity = activeCities.find(c => c.id === cityId);
    const cityName = selectedCity ? selectedCity.name : '';
    
    setSelectedCityId(cityId);
    setSelectedCityName(cityName);
    setSelectedFranchiseId('');

    if (!cityId) {
      setCityResolution({ count: 0, franchiseId: null, franchise: null, franchises: [] });
      return;
    }

    setCityResolving(true);
    try {
      const resolution = await resolveFranchiseForCity(cityId);
      setCityResolution(resolution);
      if (resolution.count === 1 && resolution.franchiseId) {
        setSelectedFranchiseId(resolution.franchiseId || '');
      }
    } catch (err) {
      console.error('Error resolving franchise for city:', err);
      setCityResolution({ count: 0, franchiseId: null, franchise: null, franchises: [] });
    } finally {
      setCityResolving(false);
    }
  };

  useEffect(() => {
    if (authMode === 'signup') {
      const generatedSlug = businessName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generatedSlug);
    }
  }, [businessName, authMode]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMessage(null);
    setResetSuccess(false);

    try {
      if (authMode === 'signup') {
        if (!email || !password || !businessName || !phone || !slug) {
          throw new Error('Lütfen tüm zorunlu alanları doldurunuz.');
        }
        if (password.length < 6) {
          throw new Error('Şifre en az 6 karakter olmalıdır.');
        }
        if (!selectedCityId) {
          throw new Error('Lütfen işletmenizin bulunduğu şehri seçiniz.');
        }
        if (cityResolution.count === 0) {
          throw new Error('Seçilen şehirde henüz aktif operasyon/bayi bulunmadığı için başvuru kabul edilememektedir.');
        }
        if (cityResolution.count > 1 && !selectedFranchiseId) {
          throw new Error('Lütfen bağlı bulunacağınız bayiyi seçiniz.');
        }

        const finalFranchiseId = selectedFranchiseId || cityResolution.franchiseId || null;
        await db.signUp(email, password, businessName, slug, signupCategory, phone, selectedCityId, finalFranchiseId, selectedCityName);
        setAuthSuccessMessage('Başvurunuz başarıyla alındı! Yönetici onayından sonra giriş yapabilirsiniz.');
        setAuthMode('login');
        setPassword('');
      } else if (authMode === 'forgot') {
        if (!email) {
          throw new Error('Lütfen e-posta adresinizi giriniz.');
        }
        await db.resetPassword(email);
        setResetSuccess(true);
      } else {
        if (!email || !password) {
          throw new Error('E-posta ve şifrenizi giriniz.');
        }

        const cleanEmail = email.trim().toLowerCase();

        if (isSupabaseConfigured && supabasePartner) {
          // 1. Supabase Auth signInWithPassword
          const { data: authData, error: authErr } = await supabasePartner.auth.signInWithPassword({
            email: cleanEmail,
            password: password,
          });

          if (authErr) {
            if (authErr.message.includes('Invalid login credentials')) {
              throw new Error('E-posta adresi veya şifre hatalı.');
            }
            throw new Error(authErr.message || 'Giriş yapılırken bir hata oluştu.');
          }

          if (!authData?.user) {
            throw new Error('Oturum başlatılamadı.');
          }

          // 2. Check public.profiles record for role = 'partner'
          if (cleanEmail !== 'admin@ugra.app') {
            let profile: any = null;
            if (isUUID(authData.user.id)) {
              const { data, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .maybeSingle();

              if (profileErr) {
                console.error('Error fetching profile on login:', profileErr);
              }
              profile = data;
            }

            if (profile) {
              if (profile.role !== 'partner') {
                await supabasePartner.auth.signOut();
                throw new Error('Bu hesap iş ortağı hesabı değildir.');
              }
            } else {
              // Fallback check in partners table
              const { data: partnerByUserId } = await supabase
                .from('partners')
                .select('id')
                .or(`id.eq.${authData.user.id},email.ilike.${cleanEmail}`)
                .maybeSingle();

              if (!partnerByUserId) {
                await supabasePartner.auth.signOut();
                throw new Error('Bu hesap iş ortağı hesabı değildir.');
              }
            }
          }
        } else {
          await db.signIn(email, password);
        }

        await initDashboard();
        setLocation('/partner/dashboard');
      }
    } catch (err: any) {
      console.error("Partner Auth Catch Error:", err);
      setAuthError(err.message || 'Bir hata oluştu.');
    } finally {
      setAuthLoading(false);
    }
  };

  const initDashboard = async () => {
    try {
      setLoading(true);
      let user: any = null;

      if (isSupabaseConfigured && supabasePartner) {
        const { data: sessionData } = await supabasePartner.auth.getSession();
        user = sessionData?.session?.user || null;
      } else {
        user = await db.getCurrentUser();
      }

      if (!user) {
        setPartner(null);
        return;
      }
      setCurrentUser(user);

      let targetPartnerId: string | null = null;

      // Check public.profiles role = 'partner'
      if (isSupabaseConfigured && supabasePartner && user.email !== 'admin@ugra.app') {
        const activeClient = await getActiveSupabaseClient();
        let profile: any = null;
        if (isUUID(user.id)) {
          const { data, error: profileErr } = await activeClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profileErr) {
            console.error('initDashboard profile error:', profileErr);
          }
          profile = data;
        }

        if (profile) {
          if (profile.role !== 'partner') {
            setPartner(null);
            setAuthError('Bu hesap iş ortağı hesabı değildir.');
            await supabasePartner.auth.signOut();
            return;
          }
          targetPartnerId = profile.partner_id || user.id;
        } else {
          const { data: partnerRow } = await activeClient
            .from('partners')
            .select('id')
            .or(`id.eq.${user.id},email.ilike.${user.email || ''}`)
            .maybeSingle();

          if (!partnerRow) {
            setPartner(null);
            setAuthError('Bu hesap iş ortağı hesabı değildir.');
            await supabasePartner.auth.signOut();
            return;
          }
          targetPartnerId = partnerRow.id;
        }
      } else {
        targetPartnerId = user.id;
      }

      const partnerData = await db.getPartnerById(targetPartnerId || user.id, user.email || undefined);

      if (user.email !== 'admin@ugra.app') {
        if (!partnerData) {
          setPartner(null);
          setAuthError('Partner kaydınız bulunamadı. Lütfen önce partner başvurusu yapınız.');
          if (isSupabaseConfigured && supabasePartner) await supabasePartner.auth.signOut();
          return;
        }

        if (partnerData.status === 'pending') {
          setPartner(null);
          setAuthError('Başvurunuz yönetici onayını bekliyor.');
          if (isSupabaseConfigured && supabasePartner) await supabasePartner.auth.signOut();
          return;
        }

        if (partnerData.status === 'rejected') {
          setPartner(null);
          setAuthError('Partner başvurunuz reddedildi.');
          if (isSupabaseConfigured && supabasePartner) await supabasePartner.auth.signOut();
          return;
        }

        if (partnerData.status === 'suspended') {
          setPartner(null);
          setAuthError('Hesabınız geçici olarak askıya alınmıştır.');
          if (isSupabaseConfigured && supabasePartner) await supabasePartner.auth.signOut();
          return;
        }

        if (partnerData.status !== 'approved' || partnerData.active !== true) {
          setPartner(null);
          setAuthError('Hesabınız henüz onaylanmamış veya pasife alınmıştır.');
          if (isSupabaseConfigured && supabasePartner) await supabasePartner.auth.signOut();
          return;
        }
      }

      if (partnerData) {
        // Guarantee partner record exists in Supabase 'partners' table before fetching products
        await ensurePartnerInDatabase(partnerData);

        setPartner(partnerData);
        setStoreName(partnerData.business_name || '');
        setStoreDesc(partnerData.description || '');
        setStorePhone(partnerData.phone || '');
        setStoreAddress(partnerData.address || '');
        setStoreCategory(normalizeCategory(partnerData.category));
        setStoreLogo(partnerData.logo || '');
        setOperatingStatus(partnerData.operating_status || 'open');
        setPrepTime(partnerData.prep_time !== undefined && partnerData.prep_time !== null ? partnerData.prep_time : '');
        setMinOrderAmount(partnerData.min_order_amount !== undefined && partnerData.min_order_amount !== null ? String(partnerData.min_order_amount) : '');
        setDeliveryNote(partnerData.delivery_note || '');
        setTaxOffice(partnerData.tax_office || '');
        setTaxNo(partnerData.tax_no || '');
        setInvoiceTitle(partnerData.invoice_title || '');
        setIban(partnerData.iban || '');

        if (partnerData.working_hours) {
          try {
            const parsed = typeof partnerData.working_hours === 'string' 
              ? JSON.parse(partnerData.working_hours) 
              : partnerData.working_hours;
            if (parsed && Object.keys(parsed).length > 0) {
              setWorkingHours(parsed);
            }
          } catch (e) {}
        }

        if (partnerData.gallery) {
          try {
            const parsed = typeof partnerData.gallery === 'string'
              ? JSON.parse(partnerData.gallery)
              : partnerData.gallery;
            if (Array.isArray(parsed)) {
              setGallery(parsed);
            }
          } catch (e) {}
        }

        try {
          const prods = await db.getProducts(partnerData.id);
          setProducts(prods);
        } catch (e) {
          console.warn('Failed loading products in dashboard:', e);
        }

        try {
          const ords = await db.getOrders(partnerData.id);
          setOrders(ords);
          setUnreadOrdersCount(ords.filter(o => o.status === 'beklemede').length);
        } catch (e) {
          console.warn('Failed loading orders in dashboard:', e);
        }

        try {
          const tkts = await db.getSupportTickets(partnerData.id);
          setSupportTickets(tkts);
        } catch (e) {
          console.warn('Failed loading support tickets in dashboard:', e);
        }

        try {
          const revs = await db.getReviews();
          setReviews(revs.filter(r => r.partner_name === partnerData.business_name || r.partner_id === partnerData.id));
        } catch (e) {
          console.warn('Failed loading reviews in dashboard:', e);
        }

        try {
          const cmps = await db.getCampaigns(partnerData.id);
          setCampaigns(cmps.filter(c => c.partner_id === partnerData.id));
        } catch (e) {
          console.warn('Failed loading campaigns in dashboard:', e);
        }

        try {
          const notifs = await db.getNotificationLogs(partnerData.id);
          setNotificationLogs(notifs);
        } catch (e) {
          console.warn('Failed loading notification logs in dashboard:', e);
        }
      } else {
        setPartner(null);
      }
    } catch (err) {
      console.error('Dashboard initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initDashboard();
  }, []);

  const handleRefresh = async () => {
    if (!partner) return;
    try {
      const prods = await db.getProducts(partner.id);
      setProducts(prods);
      const ords = await db.getOrders(partner.id);
      setOrders(ords);
      const tkts = await db.getSupportTickets(partner.id);
      setSupportTickets(tkts);
      const revs = await db.getReviews();
      setReviews(revs.filter(r => r.partner_name === partner.business_name || r.partner_id === partner.id));
      const cmps = await db.getCampaigns(partner.id);
      setCampaigns(cmps.filter(c => c.partner_id === partner.id));
      const notifs = await db.getNotificationLogs(partner.id);
      setNotificationLogs(notifs);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabasePartner) {
      await supabasePartner.auth.signOut();
    } else {
      await db.signOut();
    }
    setPartner(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Operating status and prep time quick handlers
  const handleStatusChange = async (status: 'open' | 'closed' | 'busy' | 'temp_closed') => {
    if (!partner) return;
    try {
      setOperatingStatus(status);
      const updated = await db.updatePartner(partner.id, { operating_status: status });
      setPartner(updated);
      toast({
        title: 'Çalışma Durumu Güncellendi',
        description: `İşletme durumu: ${status === 'open' ? 'Açık' : status === 'busy' ? 'Yoğun' : status === 'closed' ? 'Kapalı' : 'Geçici Kapalı'}`
      });
      await db.logAction({
        partner_id: partner.id,
        partner_name: partner.business_name,
        user_id: currentUser?.id,
        action: 'OPERATING_STATUS_CHANGED',
        entity_type: 'partner',
        entity_id: partner.id,
        details: { old_status: operatingStatus, new_status: status, status }
      });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handlePrepTimeChange = async (mins: number) => {
    if (!partner) return;
    try {
      const oldTime = prepTime;
      setPrepTime(mins);
      const updated = await db.updatePartner(partner.id, { prep_time: mins });
      setPartner(updated);
      toast({
        title: 'Hazırlama Süresi Güncellendi',
        description: `Varsayılan hazırlama süresi: ${mins} dakika`
      });
      await db.logAction({
        partner_id: partner.id,
        partner_name: partner.business_name,
        user_id: currentUser?.id,
        action: 'PREP_TIME_CHANGED',
        entity_type: 'partner',
        entity_id: partner.id,
        details: { old_prep_time: oldTime, new_prep_time: mins, prep_time: mins }
      });
    } catch (err) {
      console.error('Error updating prep time:', err);
    }
  };

  // Order status
  const handleOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const updated = await db.updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));

      // Sync with Partner Operations Service
      if (partner) {
        const partnerOpStatus = status === 'hazirlaniyor' 
          ? 'preparing' 
          : status === 'yolda' 
          ? 'courier_arrived' 
          : status === 'tamamlandi' 
          ? 'delivered' 
          : status === 'iptal' 
          ? 'cancelled' 
          : 'ready';

        await PartnerOperationsService.updateOrderStatus(partner.id, orderId, partnerOpStatus);

        await db.logAction({
          partner_id: partner.id,
          partner_name: partner.business_name,
          user_id: currentUser?.id,
          action: 'ORDER_STATUS_CHANGED',
          entity_type: 'order',
          entity_id: orderId,
          details: { customer_name: order?.customer_name, old_status: order?.status, new_status: status }
        });

        // Push Notification to Customer
        if (order?.user_id) {
          await NotificationService.sendTaskNotification(
            order.user_id,
            order.id,
            'task_updated',
            `Sipariş Durumu: ${status.toUpperCase()}`,
            `Siparişinizin yeni durumu: ${status}`
          );
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const executeOrderDelete = async (orderId: string) => {
    setDeletingOrderId(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      await db.deleteOrder(orderId);
      if (partner) {
        await db.logAction({
          partner_id: partner.id,
          partner_name: partner.business_name,
          user_id: currentUser?.id,
          action: 'ORDER_DELETED',
          entity_type: 'order',
          entity_id: orderId,
          details: { customer_name: order?.customer_name, total_price: order?.total_price }
        });
      }
      setTimeout(() => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (selectedOrderId === orderId) setSelectedOrderId(null);
        setDeletingOrderId(null);
        toast({ title: 'Sipariş silindi', description: 'Sipariş başarıyla silindi.' });
      }, 300);
    } catch (err) {
      console.error('Error deleting order:', err);
      setDeletingOrderId(null);
    }
  };

  // Product Duplication
  const handleDuplicateProduct = async (prod: Product) => {
    if (!partner) return;
    try {
      const payload = {
        partner_id: partner.id,
        title: `${prod.title} (Kopya)`,
        description: prod.description || '',
        price: prod.price,
        stock: prod.stock,
        image: prod.image,
        category: prod.category,
        active: true,
        attributes: prod.attributes ? { ...prod.attributes } : undefined
      };
      const created = await db.createProduct(payload);
      setProducts(prev => [created, ...prev]);
      toast({ title: 'Ürün Kopyalandı', description: `"${prod.title}" kopyası oluşturuldu.` });
      await db.logAction({
        partner_id: partner.id,
        partner_name: partner.business_name,
        user_id: currentUser?.id,
        action: 'PRODUCT_DUPLICATED',
        entity_type: 'product',
        entity_id: created.id,
        details: { original_id: prod.id, title: created.title }
      });
    } catch (err) {
      console.error('Error duplicating product:', err);
    }
  };

  // Bulk Price Update
  const handleApplyBulkPrice = async () => {
    if (!partner || !bulkPriceValue) return;
    const val = parseFloat(bulkPriceValue);
    if (isNaN(val) || val <= 0) {
      toast({ title: 'Hata', description: 'Geçerli bir değer giriniz.', variant: 'destructive' });
      return;
    }
    try {
      const updatedProducts = await Promise.all(
        products.map(async (prod) => {
          let newPrice = prod.price;
          if (bulkPriceType === 'percent_up') {
            newPrice = Math.round(prod.price * (1 + val / 100));
          } else if (bulkPriceType === 'percent_down') {
            newPrice = Math.max(0, Math.round(prod.price * (1 - val / 100)));
          } else if (bulkPriceType === 'fixed_add') {
            newPrice = Math.round(prod.price + val);
          } else if (bulkPriceType === 'fixed_sub') {
            newPrice = Math.max(0, Math.round(prod.price - val));
          }
          if (newPrice !== prod.price) {
            return await db.updateProduct(prod.id, { price: newPrice });
          }
          return prod;
        })
      );
      setProducts(updatedProducts);
      setShowBulkPriceModal(false);
      setBulkPriceValue('');
      toast({ title: 'Toplu Fiyat Güncellendi', description: `${products.length} ürün güncellendi.` });
      await db.logAction({
        partner_id: partner.id,
        partner_name: partner.business_name,
        user_id: currentUser?.id,
        action: 'BULK_PRICE_UPDATED',
        entity_type: 'products',
        details: { type: bulkPriceType, value: val }
      });
    } catch (err) {
      console.error('Error bulk price update:', err);
    }
  };

  // Bulk Stock Update
  const handleApplyBulkStock = async () => {
    if (!partner || !bulkStockValue) return;
    const val = parseInt(bulkStockValue, 10);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Hata', description: 'Geçerli bir stok değeri giriniz.', variant: 'destructive' });
      return;
    }
    try {
      const updatedProducts = await Promise.all(
        products.map(async (prod) => await db.updateProduct(prod.id, { stock: val }))
      );
      setProducts(updatedProducts);
      setShowBulkStockModal(false);
      setBulkStockValue('');
      toast({ title: 'Toplu Stok Güncellendi', description: `Tüm ürünlerin stoku ${val} yapıldı.` });
      await db.logAction({
        partner_id: partner.id,
        partner_name: partner.business_name,
        user_id: currentUser?.id,
        action: 'BULK_STOCK_UPDATED',
        entity_type: 'products',
        details: { new_stock: val }
      });
    } catch (err) {
      console.error('Error bulk stock update:', err);
    }
  };

  // Review reply
  const handleSaveReviewReply = async (reviewId: string, replyText: string) => {
    if (!partner || !replyText.trim()) return;
    try {
      const allRev = await db.getReviews();
      const updatedRev = allRev.map(r => r.id === reviewId ? {
        ...r,
        reply: replyText,
        reply_at: new Date().toISOString()
      } : r);
      await db.saveReviews(updatedRev);
      setReviews(updatedRev.filter(r => r.partner_name === partner.business_name || r.partner_id === partner.id));
      toast({ title: 'Cevap Gönderildi', description: 'Müşteri yorumuna cevabınız kaydedildi.' });
    } catch (err) {
      console.error('Error saving review reply:', err);
    }
  };

  // Campaign create
  const handleSaveCampaign = async (data: { title: string; discount_rate: number; start_date: string; end_date: string }) => {
    if (!partner) return;
    try {
      const allCmp = await db.getCampaigns();
      const newCmp: Campaign = {
        id: 'cmp_' + Math.random().toString(36).substr(2, 9),
        partner_id: partner.id,
        title: data.title,
        discount_rate: data.discount_rate,
        start_date: data.start_date,
        end_date: data.end_date,
        active: true,
        created_at: new Date().toISOString()
      };
      const updatedList = [newCmp, ...allCmp];
      await db.saveCampaigns(updatedList);
      setCampaigns(updatedList.filter(c => c.partner_id === partner.id));
      toast({ title: 'Kampanya Yayınlandı', description: `"${data.title}" kampanyası aktif edildi.` });

      await db.logAction({
        partner_id: partner.id,
        partner_name: partner.business_name,
        user_id: currentUser?.id,
        action: 'CAMPAIGN_CREATED',
        entity_type: 'campaign',
        entity_id: newCmp.id,
        details: { title: newCmp.title, discount_rate: newCmp.discount_rate, start_date: newCmp.start_date, end_date: newCmp.end_date }
      });
    } catch (err) {
      console.error('Error creating campaign:', err);
    }
  };

  const handleToggleCampaign = async (campaignId: string, active: boolean) => {
    try {
      const allCmp = await db.getCampaigns();
      const campaign = allCmp.find(c => c.id === campaignId);
      const updatedList = allCmp.map(c => c.id === campaignId ? { ...c, active } : c);
      await db.saveCampaigns(updatedList);
      if (partner) {
        setCampaigns(updatedList.filter(c => c.partner_id === partner.id));
        await db.logAction({
          partner_id: partner.id,
          partner_name: partner.business_name,
          user_id: currentUser?.id,
          action: active ? 'CAMPAIGN_UPDATED' : 'CAMPAIGN_STOPPED',
          entity_type: 'campaign',
          entity_id: campaignId,
          details: { title: campaign?.title || 'Kampanya', active }
        });
      }
    } catch (err) {
      console.error('Error toggling campaign:', err);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const allCmp = await db.getCampaigns();
      const campaign = allCmp.find(c => c.id === campaignId);
      const updatedList = allCmp.filter(c => c.id !== campaignId);
      await db.saveCampaigns(updatedList);
      if (partner) {
        setCampaigns(updatedList.filter(c => c.partner_id === partner.id));
        await db.logAction({
          partner_id: partner.id,
          partner_name: partner.business_name,
          user_id: currentUser?.id,
          action: 'CAMPAIGN_STOPPED',
          entity_type: 'campaign',
          entity_id: campaignId,
          details: { title: campaign?.title || 'Kampanya' }
        });
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  };

  // Product Modals
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductTitle('');
    setProductDesc('');
    setProductPrice('');
    setProductStock('');
    setProductImage('');
    setProductImages([]);
    setProductActive(true);
    setProductAttributes({});
    
    const subOpts = getProductTypeOptions(partner?.category);
    setProductSubcategory(subOpts.length > 0 ? subOpts[0] : '');
    setCustomSubcategory('');
    setProductTags([]);
    setCustomTagInput('');

    setShowProductModal(true);
  };

  const openEditProduct = async (prod: Product) => {
    setEditingProduct(prod);
    setProductTitle(prod.title);
    setProductDesc(prod.description || '');
    setProductPrice(String(prod.price));
    setProductStock(prod.stock !== undefined ? String(prod.stock) : '');
    
    let initialImgs = prod.images && prod.images.length > 0 ? prod.images : (prod.image ? [prod.image] : []);
    if (initialImgs.length === 0) {
      initialImgs = await db.getProductImages(prod.id, prod.image);
    }
    setProductImages(initialImgs);
    setProductImage(initialImgs[0] || prod.image || '');
    setProductActive(prod.active);
    setProductAttributes(prod.attributes || {});

    const subOpts = getProductTypeOptions(partner?.category);
    const existingSub = (prod.product_type || prod.subcategory || '').trim();
    if (existingSub && subOpts.map(s => s.toLowerCase()).includes(existingSub.toLowerCase())) {
      const matched = subOpts.find(s => s.toLowerCase() === existingSub.toLowerCase()) || existingSub;
      setProductSubcategory(matched);
      setCustomSubcategory('');
    } else if (existingSub) {
      setProductSubcategory('custom');
      setCustomSubcategory(existingSub);
    } else {
      setProductSubcategory(subOpts.length > 0 ? subOpts[0] : '');
      setCustomSubcategory('');
    }

    setProductTags(Array.isArray(prod.tags) ? prod.tags : []);
    setCustomTagInput('');

    setShowProductModal(true);
  };

  const handleDeleteProduct = (prodId: string) => {
    if (!prodId) {
      console.error("❌ handleDeleteProduct error: prodId is missing.");
      return;
    }
    const found = products.find(p => p.id === prodId) || ({ id: prodId, title: 'Seçili Ürün' } as Product);
    setProductToDelete(found);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const prodId = productToDelete.id;
    setIsDeletingProduct(true);

    try {
      console.log(`🗑️ PartnerDashboard: Confirming delete for product ID: "${prodId}" (${productToDelete.title})`);
      await db.deleteProduct(prodId);

      // Immediately filter local state for instant UI responsiveness
      setProducts(prev => prev.filter(p => p.id !== prodId));

      // Close delete modal
      setProductToDelete(null);

      // Re-fetch products from DB to ensure state synchronization
      if (partner) {
        const freshProducts = await db.getProducts(partner.id);
        setProducts(freshProducts);

        await db.logAction({
          partner_id: partner.id,
          partner_name: partner.business_name,
          user_id: currentUser?.id,
          action: `Ürün silindi: ${productToDelete.title || prodId}`,
          entity_type: 'product',
          entity_id: prodId
        });
      }

      toast({
        title: 'Ürün Silindi',
        description: `"${productToDelete.title || 'Ürün'}" menünüzden başarıyla kaldırıldı.`
      });
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast({
        title: 'Hata',
        description: err?.message || 'Ürün silinirken bir hata oluştu.',
        variant: 'destructive'
      });
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await db.uploadImage(files[i], 'products');
        if (url) newUrls.push(url);
      }
      if (newUrls.length > 0) {
        setProductImages(prev => {
          const updated = [...prev, ...newUrls];
          if (!productImage || productImage === '') {
            setProductImage(updated[0]);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveProductImage = (indexToRemove: number) => {
    setProductImages(prev => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      const newPrimary = filtered[0] || '';
      setProductImage(newPrimary);
      return filtered;
    });
  };

  const handleSetPrimaryProductImage = (indexToPrimary: number) => {
    setProductImages(prev => {
      if (indexToPrimary <= 0 || indexToPrimary >= prev.length) return prev;
      const targetUrl = prev[indexToPrimary];
      const remaining = prev.filter((_, idx) => idx !== indexToPrimary);
      const reordered = [targetUrl, ...remaining];
      setProductImage(targetUrl);
      return reordered;
    });
  };

  const openImageAdjuster = (index: number) => {
    if (index >= 0 && index < productImages.length) {
      setAdjustingImageIndex(index);
      setAdjustingImageUrl(productImages[index]);
      setCropZoom(1.0);
      setCropOffsetX(0);
      setCropOffsetY(0);
      setCropBgColor('#161619');
    }
  };

  const handleSaveAdjustedImage = async () => {
    if (adjustingImageIndex === null || !adjustingImageUrl) return;
    setIsSavingAdjustedImage(true);

    try {
      // Create high-res 800x800 canvas for crisp output
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error("Canvas context oluşturulamadı");

      // Load original image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Görsel yüklenemedi. CORS veya bağlantı hatası."));
        img.src = adjustingImageUrl;
      });

      // Fill background
      ctx.fillStyle = cropBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();

      // Translate center + scaling offset (320px preview to 800px canvas = 2.5 ratio)
      const scaleFactor = 800 / 320;
      const canvasX = (canvas.width / 2) + (cropOffsetX * scaleFactor);
      const canvasY = (canvas.height / 2) + (cropOffsetY * scaleFactor);

      ctx.translate(canvasX, canvasY);
      ctx.scale(cropZoom, cropZoom);

      // Draw image centered around translates
      // Maintain aspect ratio scaling to fit inside 800x800 box initially
      const imgRatio = img.width / img.height;
      let drawW = 800;
      let drawH = 800;
      if (imgRatio > 1) {
        drawH = 800 / imgRatio;
      } else {
        drawW = 800 * imgRatio;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

      ctx.restore();

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
      });

      if (!blob) throw new Error("Görsel işleme başarısız.");

      const processedFile = new File([blob], `product_adjusted_${Date.now()}.png`, { type: 'image/png' });
      const uploadedUrl = await db.uploadImage(processedFile, 'products');

      if (uploadedUrl) {
        setProductImages(prev => {
          const updated = [...prev];
          updated[adjustingImageIndex] = uploadedUrl;
          if (adjustingImageIndex === 0) {
            setProductImage(uploadedUrl);
          }
          return updated;
        });
        toast({
          title: 'Görsel Düzenlendi',
          description: 'Görsel yakınlaştırma, konumlandırma ve kırpma ayarlarıyla başarıyla güncellendi!'
        });
        setAdjustingImageIndex(null);
        setAdjustingImageUrl(null);
      }
    } catch (err: any) {
      console.error("Görsel düzenleme hatası:", err);
      toast({
        title: 'Hata',
        description: err?.message || 'Görsel kaydedilirken bir hata oluştu.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingAdjustedImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) {
      console.error("❌ handleSaveProduct error: No active partner state found.");
      toast({ title: 'Hata', description: 'Oturum açmış geçerli bir partner mağaza bulunamadı.', variant: 'destructive' });
      return;
    }
    setSaveLoading(true);

    try {
      const subChoice = productSubcategory === 'custom' ? customSubcategory.trim() : productSubcategory.trim();
      const finalProductType = subChoice || (getProductTypeOptions(partner?.category)[0] || 'Genel');

      if (!finalProductType) {
        toast({
          title: 'Ürün Türü Zorunludur',
          description: 'Lütfen ürün için bir ürün türü seçiniz.',
          variant: 'destructive'
        });
        setSaveLoading(false);
        return;
      }

      const mainImg = productImages[0] || productImage || '';
      const finalImages = productImages.length > 0 ? productImages : (mainImg ? [mainImg] : []);

      const payload = {
        partner_id: partner.id,
        title: productTitle.trim(),
        description: productDesc ? productDesc.trim() : '',
        price: parseFloat(productPrice) || 0,
        stock: productStock ? parseInt(productStock, 10) : 0,
        image: mainImg,
        images: finalImages,
        category: partner.category || 'Diğer',
        subcategory: finalProductType,
        product_type: finalProductType,
        custom_product_type: productSubcategory === 'custom',
        tags: productTags,
        active: productActive,
        attributes: productAttributes
      };

      if (editingProduct) {
        const updated = await db.updateProduct(editingProduct.id, payload);
        updated.images = finalImages;

        const priceChanged = editingProduct.price !== updated.price;
        await db.logAction({
          partner_id: partner.id,
          partner_name: partner.business_name,
          user_id: currentUser?.id,
          action: priceChanged ? 'PRICE_CHANGED' : 'PRODUCT_UPDATED',
          entity_type: 'product',
          entity_id: editingProduct.id,
          details: {
            title: updated.title,
            old_price: editingProduct.price,
            new_price: updated.price,
            price: updated.price
          }
        });
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        toast({ title: 'Ürün Güncellendi', description: `"${updated.title}" ürün bilgileri ve görselleri kaydedildi.` });
      } else {
        const created = await db.createProduct(payload);
        created.images = finalImages;
        setProducts(prev => [created, ...prev]);
        toast({ title: 'Ürün Eklendi', description: `"${created.title}" mağazanıza başarıyla eklendi.` });
      }

      setShowProductModal(false);
    } catch (err: any) {
      console.error("Error saving product:", err);
      toast({ title: 'Hata', description: "Ürün kaydedilirken bir hata oluştu: " + (err?.message || err), variant: 'destructive' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Save Business Info
  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;

    setStoreSaving(true);
    try {
      const cleanCat = normalizeCategory(storeCategory);
      const updated = await db.updatePartner(partner.id, {
        business_name: storeName,
        description: storeDesc,
        phone: storePhone,
        address: storeAddress,
        category: cleanCat,
        min_order_amount: parseFloat(minOrderAmount) || 0,
        delivery_note: deliveryNote,
        tax_office: taxOffice,
        tax_no: taxNo,
        invoice_title: invoiceTitle,
        iban: iban
      });

      setPartner(updated);
      setStoreCategory(cleanCat);

      toast({
        title: 'İşletme Bilgileri Kaydedildi',
        description: 'Tüm mağaza açıklamaları ve fatura detayları başarıyla güncellendi.'
      });

      await db.logAction({
        partner_id: partner.id,
        partner_name: updated.business_name,
        user_id: currentUser?.id,
        action: 'BUSINESS_INFO_UPDATED',
        entity_type: 'partner',
        entity_id: partner.id
      });
    } catch (err) {
      console.error('Error saving business info:', err);
    } finally {
      setStoreSaving(false);
    }
  };

  // Working hours
  const handleSaveWorkingHours = async () => {
    if (!partner) return;
    setStoreSaving(true);
    try {
      const updated = await db.updatePartner(partner.id, {
        working_hours: workingHours as any
      });
      setPartner(updated);
      toast({
        title: 'Çalışma Saatleri Kaydedildi',
        description: 'Haftalık çalışma takviminiz güncellendi.'
      });
    } catch (err) {
      console.error('Error saving working hours:', err);
    } finally {
      setStoreSaving(false);
    }
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partner) return;

    setStoreSaving(true);
    try {
      const logoUrl = await db.uploadImage(file, 'logos');
      const updated = await db.updatePartner(partner.id, { logo: logoUrl });
      setPartner(updated);
      setStoreLogo(logoUrl);
      toast({
        title: 'Logo Yüklendi',
        description: 'İşletme logonuz başarıyla güncellendi.'
      });
    } catch (err) {
      console.error('Error uploading logo:', err);
    } finally {
      setStoreSaving(false);
    }
  };

  // Gallery
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partner) return;

    setUploadingGalleryImage(true);
    try {
      const url = await db.uploadImage(file, 'products');
      const updatedGallery = [...gallery, url];
      const updated = await db.updatePartner(partner.id, {
        gallery: updatedGallery
      });
      setPartner(updated);
      setGallery(updatedGallery);
    } catch (err) {
      console.error('Error uploading gallery image:', err);
    } finally {
      setUploadingGalleryImage(false);
    }
  };

  const handleRemoveGalleryImage = async (urlToRemove: string) => {
    if (!partner) return;
    try {
      const updatedGallery = gallery.filter(g => g !== urlToRemove);
      const updated = await db.updatePartner(partner.id, {
        gallery: updatedGallery
      });
      setPartner(updated);
      setGallery(updatedGallery);
    } catch (err) {
      console.error('Error removing gallery image:', err);
    }
  };

  const handleDeleteSelfStore = async () => {
    if (!partner) return;
    const confirmDelete = window.confirm(`"${partner.business_name}" mağazanıza ait tüm veri ve ürünler silinecek. Emin misiniz?`);
    if (!confirmDelete) return;

    try {
      await db.deletePartner(partner.id);
      await db.signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting store:', err);
      toast({ title: 'Hata', description: 'Mağaza silinirken bir hata oluştu.', variant: 'destructive' });
    }
  };

  // Support Ticket Submit
  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner || !ticketSubject || !ticketMessage) return;

    setTicketSubmitting(true);
    try {
      const ticket = await db.createSupportTicket({
        partner_id: partner.id,
        subject: ticketSubject,
        message: ticketMessage
      });

      setSupportTickets(prev => [ticket, ...prev]);
      setTicketSubject('');
      setTicketMessage('');
      setTicketSuccess(true);
      setTimeout(() => setTicketSuccess(false), 5000);
    } catch (err) {
      console.error('Error creating support ticket:', err);
    } finally {
      setTicketSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Partner Paneli Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Not Logged In View
  if (!partner) {
    return (
      <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md glass-panel border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <Link href="/" className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20">
            <button
              type="button"
              aria-label="Kapat"
              title="Kapat"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </Link>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Building className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              UĞRA<span className="text-[#FF7A00]">.</span> İş Ortağı Paneli
            </h1>
            <p className="text-xs text-muted-foreground">İşletmenizi yönetmek ve siparişlerinizi takip etmek için giriş yapın.</p>
          </div>

          <div className="flex bg-white/[0.02] border border-white/5 rounded-xl p-1 text-xs">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); setAuthSuccessMessage(null); }}
              className={`flex-1 py-2 font-bold rounded-lg transition-all border-0 cursor-pointer ${authMode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(null); setAuthSuccessMessage(null); }}
              className={`flex-1 py-2 font-bold rounded-lg transition-all border-0 cursor-pointer ${authMode === 'signup' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Başvuru Yap
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authSuccessMessage}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">İşletme Adı</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="İşletme Adı"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">İşletme Kategorisi</label>
                  <select
                    value={signupCategory}
                    onChange={(e) => setSignupCategory(e.target.value)}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl py-3 px-4 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    {OFFICIAL_PARTNER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Telefon Numarası *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0555 123 45 67"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Bulunduğunuz Şehir <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedCityId}
                    required
                    onChange={(e) => handlePartnerCityChange(e.target.value)}
                    disabled={loadingCities}
                    className="w-full bg-[#18181B] border border-white/10 rounded-xl py-3 px-4 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">{loadingCities ? 'Şehirler yükleniyor...' : 'Şehir Seçiniz'}</option>
                    {activeCities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {selectedCityId && !cityResolving && cityResolution.count === 0 && (
                    <p className="text-xs text-red-400 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Bu şehirde henüz aktif operasyon bulunmamaktadır.
                    </p>
                  )}
                  {selectedCityId && !cityResolving && cityResolution.count === 1 && (
                    <p className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Bayi: {cityResolution.franchises[0]?.name} (Otomatik Eşleşti)
                    </p>
                  )}
                </div>

                {selectedCityId && cityResolution.count > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Bağlı Olacağınız Bayi / Bölge <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedFranchiseId}
                      required
                      onChange={(e) => setSelectedFranchiseId(e.target.value)}
                      className="w-full bg-[#18181B] border border-white/10 rounded-xl py-3 px-4 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="">Bayi Seçiniz</option>
                      {cityResolution.franchises.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Mağaza Adresi (URL Slug)</label>
                  <div className="flex items-center bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs text-muted-foreground font-mono">
                    <span>ugra.app/store/</span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="bg-transparent border-0 outline-none text-foreground flex-1 font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">E-Posta Adresi</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@ugra.app"
                className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
              />
            </div>

            {authMode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Şifre</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[11px] text-primary hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Şifremi Unuttum?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white bg-transparent border-0 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 bg-white hover:bg-[#E8E8E8] text-black font-bold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 border-0"
            >
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : authMode === 'login' ? 'Giriş Yap' : authMode === 'signup' ? 'Başvuruyu Gönder' : 'Sıfırlama Bağlantısı Gönder'}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-muted-foreground hover:text-white transition-colors">
              &larr; Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARD VIEW
  const partnerNavItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: Layers },
    { id: 'subscription', label: 'Kiralama / Lisans', icon: Calendar },
    { id: 'products', label: 'Ürün Yönetimi', icon: Package, badge: products.length },
    { id: 'orders', label: 'Sipariş Yönetimi', icon: ShoppingBag, badge: unreadOrdersCount > 0 ? unreadOrdersCount : undefined },
    { id: 'reviews', label: 'Müşteri Yorumları', icon: MessageSquare, badge: reviews.length },
    { id: 'analytics', label: 'İstatistikler', icon: BarChart3 },
    { id: 'notifications', label: 'Bildirim Merkezi', icon: Bell },
    { id: 'campaigns', label: 'Kampanyalar', icon: Megaphone },
    { id: 'hours', label: 'Çalışma Saatleri', icon: Clock },
    { id: 'support', label: 'Destek Talepleri', icon: HelpCircle, badge: supportTickets.length },
    { id: 'info', label: 'İşletme Bilgileri', icon: Building },
    { id: 'logo', label: 'Logo Yükle', icon: Upload },
    { id: 'gallery', label: 'Fotoğraf Galerisi', icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col md:flex-row">
      
      {/* MOBILE TOP BAR NAVIGATION (Visible on screens < md) */}
      <div className="md:hidden sticky top-0 z-40 bg-[#121214]/95 backdrop-blur-xl border-b border-[#242428] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
              {partner.logo ? (
                <img referrerPolicy="no-referrer" src={partner.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                partner.business_name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-white text-xs truncate">{partner.business_name}</h1>
              <span className="text-[10px] text-[#7A7A82] font-mono block truncate">ugra.app/store/{partner.slug}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/store/${partner.slug}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-[#161618] border border-[#242428] text-[#D6D6D6] hover:text-white"
              title="Mağazayı Gör"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg bg-[#161618] border border-[#242428] text-[#D6D6D6] hover:text-white"
              title="Yenile"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg border border-red-500/20"
            >
              Çıkış
            </button>
            <Link href="/" aria-label="Kapat" title="Kapat">
              <button
                type="button"
                aria-label="Kapat"
                title="Kapat"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Scrollable Tab Pills on Mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {partnerNavItems.map(item => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border-0 ${
                  isActive 
                    ? 'bg-white text-black font-bold shadow-md shadow-white/10' 
                    : 'bg-[#161618] text-[#D6D6D6] hover:text-white hover:bg-[#1A1A1E]'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${isActive ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP SIDEBAR NAVIGATION (Hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-[#121214] border-r border-[#242428] p-4 flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-[#242428] pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                {partner.logo ? (
                  <img referrerPolicy="no-referrer" src={partner.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  partner.business_name.charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-white text-sm truncate">{partner.business_name}</h1>
                <span className="text-[10px] text-[#7A7A82] font-mono block">ugra.app/store/{partner.slug}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href={`/store/${partner.slug}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-[#161618] hover:bg-[#1A1A1E] border border-[#242428] text-[#7A7A82] hover:text-white transition-colors"
                title="Mağazayı Gör"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <Link href="/" aria-label="Kapat" title="Kapat">
                <button
                  type="button"
                  aria-label="Kapat"
                  title="Kapat"
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1">
            {partnerNavItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border-0 ${
                    isActive 
                      ? 'bg-white text-black font-bold shadow-md shadow-white/10' 
                      : 'text-[#D6D6D6] hover:bg-[#1A1A1E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-black text-white' : 'bg-white/10 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout Footer */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Verileri Yenile
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Pending Approval Notice */}
        {partner.status === 'pending' && (
          <div className="p-4 bg-[#161618] border border-[#242428] text-[#D6D6D6] rounded-2xl text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-white" />
              <span>
                <strong className="font-bold text-white">Başvurunuz İnceleniyor:</strong> Mağaza başvurunuz henüz yönetici onayındadır. Onaylandıktan sonra mağazanız platformda aktif görünecektir.
              </span>
            </div>
          </div>
        )}

        {/* Top Operating Status Header Bar */}
        <PartnerOperatingHeader
          partner={partner}
          operatingStatus={operatingStatus}
          prepTime={prepTime}
          onStatusChange={handleStatusChange}
          onPrepTimeChange={handlePrepTimeChange}
        />

        {/* 1. DASHBOARD OVERVIEW TAB */}
        {activeTab === 'dashboard' && (
          <PartnerOverviewTab
            partner={partner}
            orders={orders}
            products={products}
            onSelectOrder={(id) => {
              const ord = orders.find(o => o.id === id);
              if (ord) setOrderDetailModal(ord);
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* 1.5 SUBSCRIPTION TAB */}
        {activeTab === 'subscription' && (
          <PartnerSubscriptionTab
            partner={partner}
            onRefreshPartner={handleRefresh}
          />
        )}

        {/* 2. PRODUCTS TAB */}
        {activeTab === 'products' && (
          <PartnerProductsTab
            products={products}
            onOpenAddProduct={openAddProduct}
            onOpenEditProduct={openEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onDuplicateProduct={handleDuplicateProduct}
            onOpenBulkPriceModal={() => setShowBulkPriceModal(true)}
            onOpenBulkStockModal={() => setShowBulkStockModal(true)}
          />
        )}

        {/* 3. ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Gelen Siparişler</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Müşterilerinizin verdiği anlık siparişler ve durum takibi.</p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 glass-panel border border-white/5 rounded-2xl">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Henüz alınmış bir sipariş kaydı bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => {
                  const isSelected = selectedOrderId === order.id;
                  
                  return (
                    <div 
                      key={order.id} 
                      onClick={() => setOrderDetailModal(order)}
                      className={`glass-panel border rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative cursor-pointer transition-all duration-300 ${
                        isSelected 
                          ? 'ring-1 ring-white/30 border-white/20 bg-[#161618]' 
                          : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-[200px]">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="font-bold text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">#{String(order.id || '').substring(0, 8)}</span>
                            <span className="text-muted-foreground/80 font-mono">{new Date(order.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          <div>
                            <h4 className="font-bold text-sm text-foreground">{order.customer_name}</h4>
                            <div className="flex flex-col gap-1 mt-1">
                              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground/60 shrink-0" /> {order.customer_phone}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-start gap-1 font-medium max-w-md">
                                <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0 mt-0.5" /> <span>{order.customer_address}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5" onClick={(e) => e.stopPropagation()}>
                        <div className="lg:text-right">
                          <div className="text-[10px] text-muted-foreground">Toplam Tutar</div>
                          <div className="text-base font-black text-white font-mono mt-0.5">{order.total_price} ₺</div>
                        </div>

                        <select
                          value={order.status === 'beklemede' ? 'bekliyor' : order.status === 'yolda' ? 'hazir' : order.status === 'tamamlandi' ? 'teslim_edildi' : order.status}
                          onChange={(e) => handleOrderStatus(order.id, e.target.value as any)}
                          className="bg-[#18181b] border border-white/10 rounded-xl py-1.5 px-3 text-xs text-foreground outline-none focus:border-primary/50 cursor-pointer"
                        >
                          <option value="bekliyor">Bekliyor</option>
                          <option value="hazirlaniyor">Hazırlanıyor</option>
                          <option value="hazir">Hazır</option>
                          <option value="teslim_edildi">Teslim Edildi</option>
                          <option value="iptal">İptal</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white cursor-pointer border border-red-500/30 transition-all"
                          title="Siparişi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <PartnerReviewsTab
            reviews={reviews}
            onSaveReply={handleSaveReviewReply}
          />
        )}

        {/* 5. ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <PartnerAnalyticsTab
            orders={orders}
            products={products}
          />
        )}

        {/* 6. NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <PartnerNotificationsTab
            notifications={notificationLogs}
            onMarkAllRead={async () => {
              setNotificationLogs(prev => prev.map(n => ({ ...n, read: true })));
            }}
            onMarkRead={async (id) => {
              setNotificationLogs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }}
          />
        )}

        {/* 7. CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <PartnerCampaignsTab
            campaigns={campaigns}
            onSaveCampaign={handleSaveCampaign}
            onToggleCampaign={handleToggleCampaign}
            onDeleteCampaign={handleDeleteCampaign}
          />
        )}

        {/* 8. WORKING HOURS TAB */}
        {activeTab === 'hours' && (
          <div className="glass-panel border border-white/5 rounded-2xl p-6 max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Çalışma Saatleri</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Haftalık çalışma takviminizi belirleyin.</p>
            </div>

            <div className="space-y-3">
              {Object.entries(workingHours).map(([day, hrs]) => (
                <div key={day} className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 rounded-xl text-sm gap-4">
                  <div className="font-semibold w-24 text-foreground">{day}</div>
                  
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      id={`closed-${day}`}
                      checked={hrs.closed}
                      onChange={(e) => {
                        setWorkingHours({
                          ...workingHours,
                          [day]: { ...hrs, closed: e.target.checked }
                        });
                      }}
                      className="rounded bg-white/[0.02] border border-white/10 text-primary w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor={`closed-${day}`} className="text-xs text-muted-foreground uppercase cursor-pointer select-none">KAPALI</label>
                  </div>

                  {!hrs.closed && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="09:00"
                        value={hrs.open}
                        onChange={(e) => {
                          setWorkingHours({
                            ...workingHours,
                            [day]: { ...hrs, open: e.target.value }
                          });
                        }}
                        className="bg-white/[0.02] border border-white/5 w-16 text-center py-1.5 rounded-lg text-xs outline-none"
                      />
                      <span className="text-muted-foreground">-</span>
                      <input
                        type="text"
                        placeholder="22:00"
                        value={hrs.close}
                        onChange={(e) => {
                          setWorkingHours({
                            ...workingHours,
                            [day]: { ...hrs, close: e.target.value }
                          });
                        }}
                        className="bg-white/[0.02] border border-white/5 w-16 text-center py-1.5 rounded-lg text-xs outline-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveWorkingHours}
              disabled={storeSaving}
              className="bg-white hover:bg-[#E8E8E8] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2 border-0"
            >
              {storeSaving ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Çalışma Saatlerini Kaydet'}
            </button>
          </div>
        )}

        {/* 10. SUPPORT TICKETS TAB */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Destek Talepleri</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Platform yönetimi ile iletişime geçin ve taleplerinizi iletin.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="font-extrabold text-white text-base">Yeni Destek Talebi</h3>

                {ticketSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                    Destek talebiniz yönetime iletildi.
                  </div>
                )}

                <form onSubmit={handleCreateSupportTicket} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Talep Konusu</label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Talep Konusu"
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mesajınız</label>
                    <textarea
                      required
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Detaylı açıklama..."
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ticketSubmitting}
                    className="w-full py-3 bg-white hover:bg-[#E8E8E8] text-black font-bold rounded-xl text-xs cursor-pointer border-0"
                  >
                    {ticketSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-black mx-auto" /> : 'Talebi Gönder'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="font-extrabold text-white text-base">Talepleriniz ({supportTickets.length})</h3>

                {supportTickets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Henüz oluşturulmuş destek talebi bulunmuyor.</p>
                ) : (
                  <div className="space-y-3">
                    {supportTickets.map(t => (
                      <div key={t.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-muted-foreground text-[10px]">#ID: {String(t.id || '').substring(0, 6)}</span>
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold uppercase">{t.status}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm">{t.subject}</h4>
                        <p className="text-muted-foreground italic">"{t.message}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 11. BUSINESS INFO TAB */}
        {activeTab === 'info' && (
          <div className="glass-panel border border-white/5 rounded-2xl p-6 max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">İşletme Bilgileri & Fatura Ayarları</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Mağaza açıklamalarınızı, iletişim bilgilerinizi ve fatura / IBAN verilerinizi düzenleyin.</p>
            </div>

            <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">İşletme Adı</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kategori</label>
                  <select
                    value={normalizeCategory(storeCategory)}
                    onChange={(e) => setStoreCategory(e.target.value)}
                    className="w-full glass-panel border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                  >
                    {OFFICIAL_PARTNER_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">İletişim Telefonu</label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="0532..."
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Minimum Sipariş Tutarı (₺)</label>
                  <input
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="100"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mağaza Tanıtım Açıklaması</label>
                <textarea
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  placeholder="Mağazanız hakkında kısa bir tanıtım..."
                  rows={3}
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">İşletme Açık Adresi</label>
                <textarea
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Adres..."
                  rows={2}
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-3 px-4 text-sm text-foreground resize-none"
                />
              </div>

              {/* Tax & IBAN Information Section */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <h3 className="font-extrabold text-white text-sm">Fatura & Banka Hesap Bilgileri</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vergi Dairesi</label>
                    <input
                      type="text"
                      value={taxOffice}
                      onChange={(e) => setTaxOffice(e.target.value)}
                      placeholder="Vergi Dairesi"
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vergi No / T.C. No</label>
                    <input
                      type="text"
                      value={taxNo}
                      onChange={(e) => setTaxNo(e.target.value)}
                      placeholder="Vergi No / T.C. No"
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fatura Ünvanı</label>
                  <input
                    type="text"
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    placeholder="Fatura Ünvanı"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ödeme IBAN Adresi</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={storeSaving}
                className="bg-white hover:bg-[#E8E8E8] text-black font-semibold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2 border-0"
              >
                {storeSaving ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Tüm İşletme Bilgilerini Kaydet'}
              </button>
            </form>

            <div className="border-t border-rose-500/20 pt-6 mt-6">
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-rose-400">Tehlikeli Bölge: Mağazayı Kalıcı Olarak Sil</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Mağaza kaydınız, menünüz ve ürünleriniz veritabanından tamamen kaldırılır.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteSelfStore}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Mağazayı Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 12. LOGO TAB */}
        {activeTab === 'logo' && (
          <div className="glass-panel border border-white/5 rounded-2xl p-6 max-w-md space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">İşletme Logosu</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Mağaza kapak görseli olarak görüntülenecek kare logo yükleyin.</p>
            </div>

            <div className="flex flex-col items-center gap-6 py-4">
              <div className="w-32 h-32 bg-primary/10 border border-primary/20 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-primary text-4xl shadow-inner relative group">
                {storeLogo ? (
                  <img referrerPolicy="no-referrer" src={storeLogo} alt="Logo Preview" className="w-full h-full object-cover" />
                ) : (
                  partner.business_name.charAt(0)
                )}
              </div>

              <div className="space-y-2 text-center w-full">
                <label className="flex items-center justify-center gap-2 bg-white hover:bg-[#E8E8E8] text-black font-semibold py-3 px-4 rounded-xl text-sm cursor-pointer transition-all border-0">
                  <Upload className="w-4 h-4 text-black" />
                  {storeSaving ? 'Logo Yükleniyor...' : 'Yeni Logo Seç ve Yükle'}
                  <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 13. GALLERY TAB */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Fotoğraf Galerisi</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Mağazanıza ait mekan ve ambians fotoğraflarını yükleyin.</p>
              </div>
              
              <label className="flex items-center gap-1.5 bg-white hover:bg-[#E8E8E8] text-black text-sm font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all border-0">
                {uploadingGalleryImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-black" /> Fotoğraf Ekle
                  </>
                )}
                <input type="file" onChange={handleGalleryUpload} className="hidden" accept="image/*" />
              </label>
            </div>

            {gallery.length === 0 ? (
              <div className="text-center py-16 glass-panel border border-white/5 rounded-2xl">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Galerinizde henüz fotoğraf bulunmuyor.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map((url, index) => (
                  <div key={index} className="relative aspect-video bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden group">
                    <img referrerPolicy="no-referrer" src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => handleRemoveGalleryImage(url)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-red-400 border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Fotoğrafı Kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ORDER DETAIL MODAL */}
      <PartnerOrderDetailModal
        order={orderDetailModal}
        onClose={() => setOrderDetailModal(null)}
        onStatusChange={(id, status) => {
          handleOrderStatus(id, status);
          if (orderDetailModal) {
            setOrderDetailModal({ ...orderDetailModal, status });
          }
        }}
      />

      {/* BULK PRICE MODAL */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-white/5 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" /> Toplu Fiyat Güncelleme
              </h3>
              <button 
                onClick={() => setShowBulkPriceModal(false)}
                className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer border-0 bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">İşlem Türü</label>
                <select
                  value={bulkPriceType}
                  onChange={(e) => setBulkPriceType(e.target.value as any)}
                  className="w-full bg-[#18181b] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-foreground outline-none"
                >
                  <option value="percent_up">Tüm Fiyatları Yüzde (%) Zam Yap</option>
                  <option value="percent_down">Tüm Fiyatları Yüzde (%) İndirim Yap</option>
                  <option value="fixed_add">Tüm Fiyatlara Sabit Tutar (₺) Ekle</option>
                  <option value="fixed_sub">Tüm Fiyatlardan Sabit Tutar (₺) Düş</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Miktar / Oran</label>
                <input
                  type="number"
                  placeholder="0"
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkPriceModal(false)}
                  className="flex-1 py-2.5 bg-transparent border border-[#2E2E34] text-white font-semibold rounded-xl text-xs cursor-pointer hover:bg-[#2E2E34]/50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPrice}
                  className="flex-1 py-2.5 bg-white hover:bg-[#E8E8E8] text-black font-semibold rounded-xl text-xs border-0 cursor-pointer"
                >
                  Uygula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK STOCK MODAL */}
      {showBulkStockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-white/5 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-white" /> Toplu Stok Eşitleme
              </h3>
              <button 
                onClick={() => setShowBulkStockModal(false)}
                className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer border-0 bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tüm Ürünlerin Stok Miktarı</label>
                <input
                  type="number"
                  placeholder="0"
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 outline-none rounded-xl py-2.5 px-3.5 text-xs text-foreground font-mono"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkStockModal(false)}
                  className="flex-1 py-2.5 bg-transparent border border-[#2E2E34] text-white font-semibold rounded-xl text-xs cursor-pointer hover:bg-[#2E2E34]/50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkStock}
                  className="flex-1 py-2.5 bg-white hover:bg-white/90 text-black font-bold rounded-xl text-xs border-0 cursor-pointer"
                >
                  Tümünü Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-white/5 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white text-base">Siparişi Sil</h3>
              <button 
                onClick={() => setOrderToDelete(null)}
                className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Bu siparişi kalıcı olarak silmek istediğinizden emin misiniz?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 bg-white/[0.02] border border-white/5 hover:bg-[#18181b] text-foreground font-semibold rounded-xl text-xs cursor-pointer border-0"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = orderToDelete.id;
                  setOrderToDelete(null);
                  executeOrderDelete(id);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5 border-0"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border border-white/5 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white text-lg">
                {editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
              </h3>
              <button 
                onClick={() => setShowProductModal(false)}
                className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Product Multi-Image Gallery Management */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ürün Görselleri ({productImages.length})
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Çoklu seçim desteklenir
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5 p-3 bg-white/[0.02] border border-white/5 rounded-2xl min-h-[104px] items-center">
                  {productImages.map((imgUrl, idx) => (
                    <div key={idx} className="relative w-22 h-22 rounded-xl border border-white/10 overflow-hidden group shrink-0 bg-[#161619] p-1 flex items-center justify-center">
                      <img referrerPolicy="no-referrer" src={imgUrl} alt={`Ürün Görseli ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                      
                      {/* Hover Actions Overlay */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1 z-10">
                        <button
                          type="button"
                          onClick={() => openImageAdjuster(idx)}
                          className="w-full bg-white hover:bg-[#E8E8E8] text-black text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1 cursor-pointer border-0 shadow"
                          title="Görseli Yakınlaştır / Konumlandır / Kırp"
                        >
                          <Crop className="w-3 h-3 text-black" /> Düzenle
                        </button>

                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryProductImage(idx)}
                            className="w-full bg-white/20 hover:bg-white/30 text-white text-[9px] font-semibold py-0.5 rounded cursor-pointer border-0"
                          >
                            Ana Yap
                          </button>
                        )}
                      </div>

                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] font-black px-1.5 py-0.5 rounded shadow z-20 pointer-events-none">
                          Ana Vitrin
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveProductImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer border-0 shadow z-20"
                        title="Görseli Sil"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <label className="w-22 h-22 rounded-xl border border-dashed border-white/20 hover:border-primary/50 bg-white/[0.01] hover:bg-white/[0.04] flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0 transition-all text-center p-1">
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground/60" />
                        <span className="text-[10px] font-medium text-muted-foreground leading-tight">Görsel Ekle</span>
                      </>
                    )}
                    <input type="file" onChange={handleProductImageUpload} className="hidden" accept="image/*" multiple />
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Görsel üzerine gelerek <strong>"Düzenle"</strong> butonuna basabilir, yakınlaştırma, konumlandırma ve kadraj kırpması yapabilirsiniz.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ürün Adı</label>
                <input
                  type="text"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder="Ürün adını giriniz"
                  className="w-full bg-white/[0.02] border border-white/5 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Açıklama</label>
                <textarea
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  placeholder="Açıklama ve detayları giriniz..."
                  className="w-full bg-white/[0.02] border border-white/5 outline-none rounded-xl py-3 px-4 text-sm text-foreground h-20 resize-none"
                />
              </div>

              {/* Mandatory Product Type (Ürün Türü) Selection Field */}
              <div className="space-y-2 p-3.5 bg-[#18181B] border border-white/10 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Ürün Türü <span className="text-red-400">* (Zorunlu)</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Ana Kategori: {partner?.category || 'Genel'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {getProductTypeOptions(partner?.category).map((typeOption) => {
                    const isSelected = productSubcategory === typeOption;
                    return (
                      <button
                        key={typeOption}
                        type="button"
                        onClick={() => {
                          setProductSubcategory(typeOption);
                          setCustomSubcategory('');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{typeOption}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setProductSubcategory('custom')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      productSubcategory === 'custom'
                        ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]'
                        : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {productSubcategory === 'custom' && <Check className="w-3 h-3 shrink-0" />}
                    <span>+ Yeni Ürün Türü</span>
                  </button>
                </div>

                {productSubcategory === 'custom' && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={customSubcategory}
                      onChange={(e) => setCustomSubcategory(e.target.value)}
                      placeholder="Özel ürün türünü yazınız (Örn: Takım Elbise)"
                      className="w-full bg-black/40 border border-primary/40 outline-none rounded-xl py-2 px-3 text-xs text-white placeholder:text-muted-foreground focus:border-primary"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Multi-Select Tags (Etiketler) Field */}
              <div className="space-y-2 p-3.5 bg-[#18181B] border border-white/10 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" /> Etiketler <span className="text-muted-foreground font-normal lowercase">(çoklu seçim)</span>
                  </label>
                  {productTags.length > 0 && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                      {productTags.length} etiket seçildi
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = productTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setProductTags(productTags.filter(t => t !== tag));
                          } else {
                            setProductTags([...productTags, tag]);
                          }
                        }}
                        className={`py-1.5 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tags created by partner */}
                {productTags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                    <span className="text-[10px] text-muted-foreground w-full">Özel Eklenen Etiketler:</span>
                    {productTags.filter(t => !PRESET_TAGS.includes(t)).map((customTag) => (
                      <span
                        key={customTag}
                        className="py-1 px-2.5 rounded-xl text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                      >
                        {customTag}
                        <button
                          type="button"
                          onClick={() => setProductTags(productTags.filter(t => t !== customTag))}
                          className="hover:text-red-400 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Custom Tag Input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = customTagInput.trim();
                        if (trimmed && !productTags.includes(trimmed)) {
                          setProductTags([...productTags, trimmed]);
                          setCustomTagInput('');
                        }
                      }
                    }}
                    placeholder="+ Özel etiket yazıp ekle..."
                    className="flex-1 bg-black/40 border border-white/10 outline-none rounded-xl py-1.5 px-3 text-xs text-white placeholder:text-muted-foreground focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = customTagInput.trim();
                      if (trimmed && !productTags.includes(trimmed)) {
                        setProductTags([...productTags, trimmed]);
                        setCustomTagInput('');
                      }
                    }}
                    className="py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Dynamic Category Specific Product Fields */}
              <CategoryProductFields
                category={partner?.category}
                attributes={productAttributes}
                onChange={setProductAttributes}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fiyat (₺)</label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.02] border border-white/5 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stok Miktarı</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white/[0.02] border border-white/5 outline-none rounded-xl py-3 px-4 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prod-active"
                  checked={productActive}
                  onChange={(e) => setProductActive(e.target.checked)}
                  className="rounded bg-white/[0.02] border border-white/10 text-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="prod-active" className="text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none">
                  Satışa Açık (Aktif)
                </label>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-3 bg-transparent border border-[#2E2E34] text-white font-semibold rounded-xl text-sm cursor-pointer hover:bg-[#2E2E34]/50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 py-3 bg-white hover:bg-[#E8E8E8] text-black font-semibold rounded-xl text-sm cursor-pointer flex items-center justify-center gap-1.5 border-0"
                >
                  {saveLoading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE ADJUSTER / CROPPER MODAL */}
      {adjustingImageIndex !== null && adjustingImageUrl && (
        <div className="fixed inset-0 z-[9990] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-white/10 rounded-3xl p-5 sm:p-6 max-w-xl w-full max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Crop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Görsel Düzenleme & Kadraj</h3>
                  <p className="text-[11px] text-muted-foreground">Yakınlaştırma, uzaklaştırma ve konumlandırma ayarları yapın</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setAdjustingImageIndex(null);
                  setAdjustingImageUrl(null);
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Preview Frame */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-white/90">Vitrin Kadrajı Önizleme (1:1)</span>
                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-white/80">
                  Fare veya dokunma ile sürükleyebilirsiniz
                </span>
              </div>

              <div 
                className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden border-2 border-dashed border-primary/40 flex items-center justify-center shadow-2xl select-none cursor-grab active:cursor-grabbing group"
                style={{ backgroundColor: cropBgColor }}
                onMouseDown={(e) => {
                  const startX = e.clientX - cropOffsetX;
                  const startY = e.clientY - cropOffsetY;
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    setCropOffsetX(moveEvent.clientX - startX);
                    setCropOffsetY(moveEvent.clientY - startY);
                  };
                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                  };
                  window.addEventListener('mousemove', handleMouseMove);
                  window.addEventListener('mouseup', handleMouseUp);
                }}
              >
                {/* Visual Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20 border border-white/20 z-10">
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-r border-b border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-white"></div>
                  <div className="border-r border-white"></div>
                  <div></div>
                </div>

                {/* Transformed Image Preview */}
                <img
                  referrerPolicy="no-referrer"
                  src={adjustingImageUrl}
                  alt="Preview"
                  className="max-w-none transition-transform duration-75 pointer-events-none"
                  style={{
                    transform: `translate(${cropOffsetX}px, ${cropOffsetY}px) scale(${cropZoom})`,
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain'
                  }}
                />

                <span className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md text-white font-mono text-[10px] px-2 py-1 rounded-lg border border-white/10 z-20 shadow">
                  Zoom: %{Math.round(cropZoom * 100)} | X: {Math.round(cropOffsetX)}px Y: {Math.round(cropOffsetY)}px
                </span>
              </div>
            </div>

            {/* Adjustments Controls */}
            <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              
              {/* Zoom Slider & Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-white">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-primary" /> Yakınlaştır / Uzaklaştır (Zoom)
                  </span>
                  <span className="text-primary font-mono text-xs font-bold">%{Math.round(cropZoom * 100)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCropZoom(prev => Math.max(0.5, prev - 0.1))}
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer border border-white/10 shrink-0"
                    title="Uzaklaştır"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-primary h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setCropZoom(prev => Math.min(3.0, prev + 0.1))}
                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white cursor-pointer border border-white/10 shrink-0"
                    title="Yakınlaştır"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Position Buttons & Arka Plan Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5">
                
                {/* Arrow Pad */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-primary" /> Konum Yön Tuşları
                  </span>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCropOffsetY(prev => prev - 12)}
                      className="w-9 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer border border-white/10"
                      title="Yukarı Taşı"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCropOffsetX(prev => prev - 12)}
                        className="w-9 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer border border-white/10"
                        title="Sola Taşı"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCropOffsetX(0);
                          setCropOffsetY(0);
                          setCropZoom(1.0);
                        }}
                        className="px-2.5 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] font-extrabold text-muted-foreground hover:text-white cursor-pointer border border-white/10"
                        title="Sıfırla"
                      >
                        Sıfırla
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropOffsetX(prev => prev + 12)}
                        className="w-9 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer border border-white/10"
                        title="Sağa Taşı"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCropOffsetY(prev => prev + 12)}
                      className="w-9 h-8 rounded-lg bg-white/5 hover:bg-white/15 flex items-center justify-center text-white cursor-pointer border border-white/10"
                      title="Aşağı Taşı"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Background Selector & Sliders */}
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-white block mb-1.5">Dolgu Arka Planı</span>
                    <div className="flex items-center gap-2">
                      {[
                        { label: 'Koyu Gri', color: '#161619' },
                        { label: 'Siyah', color: '#000000' },
                        { label: 'Beyaz', color: '#ffffff' }
                      ].map((bg) => (
                        <button
                          key={bg.color}
                          type="button"
                          onClick={() => setCropBgColor(bg.color)}
                          className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            cropBgColor === bg.color ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-muted-foreground'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: bg.color }}></span>
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Yatay Hassas Konum (X)</span>
                      <span className="font-mono text-white">{Math.round(cropOffsetX)}px</span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={cropOffsetX}
                      onChange={(e) => setCropOffsetX(parseInt(e.target.value, 10))}
                      className="w-full accent-primary h-1.5 bg-white/10 rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Düşey Hassas Konum (Y)</span>
                      <span className="font-mono text-white">{Math.round(cropOffsetY)}px</span>
                    </div>
                    <input
                      type="range"
                      min="-150"
                      max="150"
                      value={cropOffsetY}
                      onChange={(e) => setCropOffsetY(parseInt(e.target.value, 10))}
                      className="w-full accent-primary h-1.5 bg-white/10 rounded cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustingImageIndex(null);
                  setAdjustingImageUrl(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustedImage}
                disabled={isSavingAdjustedImage}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#E8E8E8] text-black font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 disabled:opacity-50 transition-all border-0"
              >
                {isSavingAdjustedImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" /> İşleniyor...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black" /> Uygula ve Kaydet
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRODUCT DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-[9995] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-red-500/20 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Ürünü Sil</h3>
                <p className="text-xs text-muted-foreground">Bu işlem geri alınamaz</p>
              </div>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="ml-auto p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-3.5">
              {productToDelete.image ? (
                <img
                  referrerPolicy="no-referrer"
                  src={productToDelete.image}
                  alt={productToDelete.title}
                  className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 bg-[#161619]"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground shrink-0">
                  <Package className="w-6 h-6" />
                </div>
              )}
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="font-bold text-sm text-white truncate">{productToDelete.title || 'İsimsiz Ürün'}</h4>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="text-primary font-bold">{productToDelete.price ? `${productToDelete.price} ₺` : '0 ₺'}</span>
                  <span>•</span>
                  <span>{productToDelete.category || 'Kategori Yok'}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>"{productToDelete.title || 'Bu ürün'}"</strong> ürününü mağaza menünüzden kalıcı olarak silmek istediğinize emin misiniz?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={isDeletingProduct}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 transition-all border-0"
              >
                {isDeletingProduct ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Siliniyor...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Evet, Ürünü Sil
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Realtime Toasts */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="pointer-events-auto glass-panel/95 border-l-4 border-l-primary border border-white/5 rounded-2xl p-4 shadow-2xl flex gap-3 relative overflow-hidden backdrop-blur-md"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
              <ShoppingBag className="w-5 h-5" />
            </div>
            
            <div className="flex-1 pr-4">
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                Yeni Sipariş Geldi!
              </h4>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {notif.customerName} • <span className="text-primary font-bold">{notif.totalPrice} ₺</span> • {notif.itemCount} ürün
              </p>
            </div>

            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              className="absolute top-3 right-3 text-muted-foreground hover:text-white cursor-pointer p-1 rounded-lg border-0 bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
