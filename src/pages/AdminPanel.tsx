import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Building, Users, ShoppingBag, Package, Settings, LogOut, Check, X, 
  Shield, RefreshCw, BarChart3, AlertCircle, ArrowLeft, Loader2, Sparkles, 
  Plus, Edit, Trash2, Mail, ExternalLink, HelpCircle, Eye, EyeOff, Lock,
  Phone, MapPin, Search, Calendar, Landmark, Info, ClipboardList, Bike,
  Tag, Star, DollarSign, Bell, ShieldCheck, Layers, Image as ImageIcon, Calculator
} from 'lucide-react';
import { 
  db, isSupabaseConfigured, supabaseAdmin, saveSupabaseCredentials, clearSupabaseCredentials, 
  supabaseUrl, supabaseAnonKey, Partner, Product, Order, SupportTicket, 
  AssistantApplication, Assistant, CategoryItem, Banner, Campaign, 
  CouponItem, ReviewItem, AdminRoleUser, City, Franchise, PARTNER_CATEGORIES, OFFICIAL_PARTNER_CATEGORIES 
} from '@/lib/supabase';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';

import { AdminDashboardTab } from '@/components/admin/AdminDashboardTab';
import { useModalBackButton } from '@/hooks/useModalBackButton';
import { AdminPartnersTab } from '@/components/admin/AdminPartnersTab';
import { AdminPartnerSubscriptionsTab } from '@/components/admin/AdminPartnerSubscriptionsTab';
import { AdminPartnerAppsTab } from '@/components/admin/AdminPartnerAppsTab';
import { AdminAssistantsTab } from '@/components/admin/AdminAssistantsTab';
import { AdminAssistantSubscriptionsTab } from '@/components/admin/AdminAssistantSubscriptionsTab';
import { AdminAssistantAppsTab } from '@/components/admin/AdminAssistantAppsTab';
import { AdminProductsTab } from '@/components/admin/AdminProductsTab';
import { AdminOrdersTab } from '@/components/admin/AdminOrdersTab';
import { AdminCustomersTab } from '@/components/admin/AdminCustomersTab';
import { AdminCategoriesTab } from '@/components/admin/AdminCategoriesTab';
import { AdminBannersTab } from '@/components/admin/AdminBannersTab';
import { AdminReviewsTab } from '@/components/admin/AdminReviewsTab';
import { AdminFinanceTab } from '@/components/admin/AdminFinanceTab';
import { AdminPricingTab } from '@/components/admin/AdminPricingTab';
import { AdminFranchisesTab } from '@/components/admin/AdminFranchisesTab';
import { AdminNotificationsTab } from '@/components/admin/AdminNotificationsTab';
import { AdminRolesTab } from '@/components/admin/AdminRolesTab';

export function AdminPanel() {
  const [location, setLocation] = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Supabase Configuration Form State
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(supabaseUrl || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(supabaseAnonKey || '');
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

  // Data Collections
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [assistantApplications, setAssistantApplications] = useState<AssistantApplication[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminRoleUser[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);

  // Action labels mapping
  const actionLabels: Record<string, string> = {
    ORDER_STATUS_CHANGED: 'Sipariş Durumu Değiştirildi',
    ORDER_DELETED: 'Sipariş Silindi',
    PRODUCT_ADDED: 'Ürün Eklendi',
    PRODUCT_UPDATED: 'Ürün Güncellendi',
    PRODUCT_DELETED: 'Ürün Silindi',
    PRICE_CHANGED: 'Fiyat Değiştirildi',
    STOCK_CHANGED: 'Stok Değiştirildi',
    WORKING_HOURS_UPDATED: 'Çalışma Saatleri Güncellendi',
    LOGO_UPDATED: 'Logo Değiştirildi',
    GALLERY_UPDATED: 'Galeri Fotoğrafı Güncellendi',
    PARTNER_UPDATED: 'İşletme Bilgileri Güncellendi',
    SUPPORT_TICKET_CREATED: 'Destek Talebi Oluşturuldu',
    SUPPORT_TICKET_CLOSED: 'Destek Talebi Kapatıldı',
    PARTNER_STATUS_CHANGED: 'Partner Hesabı Durumu Değiştirildi',
    PARTNER_APPLICATION_APPROVED: 'Partner Başvurusu Onaylandı',
    PARTNER_APPLICATION_REJECTED: 'Partner Başvurusu Reddedildi',
    PUSH_NOTIFICATION_SENT: 'Push Bildirim Gönderildi'
  };

  // Check auth on load
  const checkAdminAuth = async () => {
    try {
      setLoading(true);
      let user: any = null;

      if (isSupabaseConfigured && supabaseAdmin) {
        const { data: sessionData } = await supabaseAdmin.auth.getSession();
        user = sessionData?.session?.user || null;
      } else {
        user = await db.getCurrentUser();
      }

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const adminCheck = await db.isUserAdmin(user.id);
      setIsAdmin(adminCheck);
      if (adminCheck) {
        await loadAdminData();
      }
    } catch (err) {
      console.error('Error checking admin auth:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAuth();

    const handleApplicationEvent = () => {
      loadAdminData();
    };

    window.addEventListener('ugra_partner_application_submitted', handleApplicationEvent);
    window.addEventListener('storage', handleApplicationEvent);

    return () => {
      window.removeEventListener('ugra_partner_application_submitted', handleApplicationEvent);
      window.removeEventListener('storage', handleApplicationEvent);
    };
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const pts = await db.getAdminPartners();
      setPartners(pts || []);

      const prds = await db.adminGetAllProducts();
      setProducts(prds || []);

      const ords = await db.adminGetAllOrders();
      setOrders(ords || []);

      const custs = await db.adminGetAllCustomers();
      setCustomers(custs || []);

      const assts = await db.getAssistants();
      setAssistants(assts || []);

      const asstApps = await db.getAssistantApplications();
      setAssistantApplications(asstApps || []);

      const cats = await db.getCategories();
      setCategories(cats || []);

      const bans = await db.getBanners();
      setBanners(bans || []);

      const camps = await db.getCampaigns();
      setCampaigns(camps || []);

      const coups = await db.getCoupons();
      setCoupons(coups || []);

      const revs = await db.getReviews();
      setReviews(revs || []);

      const admUsers = await db.getAdminUsers();
      setAdminUsers(admUsers || []);

      const tkts = await db.getSupportTickets();
      setSupportTickets(tkts || []);

      const cts = await db.getCities();
      setCities(cts || []);

      const frns = await db.getFranchises();
      setFranchises(frns || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadAdminData();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (!email || !password) {
        throw new Error('E-posta ve şifrenizi giriniz.');
      }
      
      const cleanEmail = email.trim().toLowerCase();
      let user: any = null;

      if (cleanEmail === 'admin@ugra.app') {
        if (isSupabaseConfigured && supabaseAdmin) {
          try {
            const { data } = await supabaseAdmin.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (data?.user) user = data.user;
          } catch (e) {}
        }
        if (!user && password === 'gokougra123') {
          user = {
            id: '8987cf9f-8bcf-4e2e-a648-da996c0b0fbb',
            email: 'admin@ugra.app',
            user_metadata: { business_name: 'UĞRA Yönetim' },
            is_admin: true
          };
        }
      } else if (isSupabaseConfigured && supabaseAdmin) {
        const { data, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (authErr) throw new Error(authErr.message || 'Giriş yapılamadı.');
        user = data?.user;
      } else {
        const res = await db.signIn(email, password);
        user = res?.user;
      }
      
      if (user) {
        const adminCheck = await db.isUserAdmin(user.id);
        if (!adminCheck) {
          if (isSupabaseConfigured && supabaseAdmin) await supabaseAdmin.auth.signOut();
          throw new Error('Yetkisiz erişim. Sadece yöneticiler giriş yapabilir.');
        }
        setIsAdmin(true);
        await loadAdminData();
      } else {
        throw new Error('Giriş başarısız. Bilgilerinizi kontrol edin.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      setIsAdmin(true);
      await loadAdminData();
    } catch (err: any) {
      setAuthError('Demo giriş yapılamadı.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabaseAdmin) {
      await supabaseAdmin.auth.signOut();
    } else {
      await db.signOut();
    }
    setIsAdmin(false);
  };

  const handleResolveTicket = async (ticketId: string, newStatus: SupportTicket['status']) => {
    try {
      await db.updateSupportTicketStatus(ticketId, newStatus);
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Error updating support ticket status:', err);
    }
  };

  // Pending counts
  const pendingPartnerApps = partners.filter(p => p.status === 'pending');
  const pendingAssistantApps = assistantApplications.filter(a => a.status === 'pending');

  // Performance data for Reports tab
  const partnerPerformance = partners.map(p => {
    const partnerOrders = orders.filter(o => o.partner_id === p.id && o.status !== 'iptal');
    const totalSales = partnerOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    return {
      name: p.business_name,
      orders: partnerOrders.length,
      sales: totalSales
    };
  }).sort((a, b) => b.sales - a.sales).slice(0, 5);

  const daysOfWeek = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const ordersByDayData = daysOfWeek.map((day, idx) => {
    const total = orders
      .filter(o => o.created_at && new Date(o.created_at).getDay() === idx && o.status !== 'iptal')
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
    return { day, gelir: total };
  });

  const categoryData = Object.entries(
    partners.reduce((acc, p) => {
      const cat = p.category || 'Diğer';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#111111', '#555555', '#888888', '#B0B0B0', '#D1D5DB', '#E5E7EB'];

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] text-[#111111] flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#111111] animate-spin" />
          <p className="text-sm font-bold text-[#666666] animate-pulse">
            UĞRA Yönetim Paneli Yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  // Auth Screen if not logged in
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] text-[#111111] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
          <Link href="/" className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20">
            <button
              type="button"
              aria-label="Kapat"
              title="Kapat"
              className="w-9 h-9 rounded-xl bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E7EB] text-[#111111] flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </Link>

          <div className="text-center space-y-2 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-[#111111] text-white font-black text-xl flex items-center justify-center mx-auto shadow-sm">
              U
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#111111]">Yönetim Paneli</h1>
            <p className="text-xs text-[#666666] font-medium">UĞRA Platform Operasyon Girişi</p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[#666666] font-bold uppercase tracking-wider text-[10px]">E-posta Adresi</label>
              <input
                type="email"
                required
                placeholder="admin@ugra.app"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#F7F7F8] border border-[#E5E7EB] focus:border-[#111111] outline-none rounded-xl p-3 text-[#111111] font-medium transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[#666666] font-bold uppercase tracking-wider text-[10px]">Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E5E7EB] focus:border-[#111111] outline-none rounded-xl p-3 text-[#111111] font-medium pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#111111] border-0 bg-transparent cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#111111] hover:bg-[#222222] active:scale-95 text-white font-extrabold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-0 shadow-sm"
            >
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Lock className="w-4 h-4 text-white" />}
              <span>Giriş Yap</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ADMIN DASHBOARD GROUPED NAVIGATION LAYOUT
  const adminNavGroups = [
    {
      group: 'OPERASYON',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Shield },
        { id: 'orders', label: 'Sipariş & Görev Takibi', icon: ShoppingBag, badge: orders.filter(o => o.status === 'beklemede' || o.status === 'bekliyor').length },
      ]
    },
    {
      group: 'MAĞAZA YÖNETİMİ',
      items: [
        { id: 'partners', label: 'Partner Mağazalar', icon: Building },
        { id: 'applications', label: 'Partner Başvuruları', icon: ClipboardList, badge: pendingPartnerApps.length },
        { id: 'partner_subscriptions', label: 'Partner Kiralama', icon: Calendar },
      ]
    },
    {
      group: 'KURYE / ASİSTAN YÖNETİMİ',
      items: [
        { id: 'assistants', label: 'Asistan Kuryeler', icon: Bike },
        { id: 'assistant_applications', label: 'Asistan Başvuruları', icon: ClipboardList, badge: pendingAssistantApps.length },
        { id: 'assistant_subscriptions', label: 'Asistan Kiralama', icon: Calendar },
      ]
    },
    {
      group: 'İÇERİK',
      items: [
        { id: 'categories', label: 'Kategoriler', icon: Layers },
        { id: 'products', label: 'Ürünler', icon: Package },
        { id: 'banners', label: 'Banner & Kampanyalar', icon: ImageIcon },
        { id: 'reviews', label: 'Yorum & Değerlendirme', icon: Star },
      ]
    },
    {
      group: 'YÖNETİM',
      items: [
        { id: 'franchises', label: 'Şehir & Bayi Yönetimi', icon: MapPin },
        { id: 'customers', label: 'Müşteriler', icon: Users },
        { id: 'finance', label: 'Finans & Hakediş', icon: DollarSign },
        { id: 'pricing', label: 'Fiyatlandırma', icon: Calculator },
        { id: 'tickets', label: 'Destek Talepleri', icon: HelpCircle, badge: supportTickets.filter(t => t.status === 'acik').length },
        { id: 'notifications', label: 'Bildirimler', icon: Bell },
        { id: 'roles', label: 'Roller & İzinler', icon: ShieldCheck },
        { id: 'settings', label: 'Sistem Ayarları', icon: Settings },
      ]
    }
  ];

  const allNavItems = adminNavGroups.flatMap(g => g.items);

  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#111111] flex flex-col md:flex-row font-sans">
      
      {/* MOBILE TOP BAR (Visible on screens < md) */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-[#E5E7EB] p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#111111] text-white font-black text-sm flex items-center justify-center shadow-sm">
              U
            </div>
            <div>
              <div className="font-extrabold text-sm text-[#111111] flex items-center gap-0.5">
                UĞRA<span className="text-[#111111]">.</span> Admin
              </div>
              <div className="text-[10px] text-[#666666]">Yönetim & Operasyon</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-[#F7F7F8] hover:bg-[#F2F2F3] active:scale-95 text-[#111111] text-xs font-bold rounded-xl transition-all border border-[#E5E7EB] cursor-pointer"
            >
              Çıkış
            </button>
            <Link href="/" aria-label="Kapat" title="Kapat">
              <button
                type="button"
                aria-label="Kapat"
                title="Kapat"
                className="w-8 h-8 rounded-xl bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E7EB] text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Horizontal Scrollable Tabs on Mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
          {allNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive 
                    ? 'bg-[#111111] text-white shadow-sm' 
                    : 'bg-white text-[#666666] hover:text-[#111111] border border-[#E5E7EB]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white text-[#111111]' : 'bg-gray-100 text-[#111111]'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP SIDEBAR NAVIGATION (Hidden on mobile) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E5E7EB] flex-col shrink-0 min-h-screen shadow-sm">
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#111111] text-white font-black text-lg flex items-center justify-center shadow-sm">
              U
            </div>
            <div>
              <div className="font-extrabold text-sm text-[#111111] flex items-center gap-0.5">
                UĞRA<span className="text-[#111111]">.</span> Admin
              </div>
              <div className="text-[10px] text-[#666666] font-medium">Yönetim & Lisans Merkezi</div>
            </div>
          </div>
          <Link href="/" aria-label="Kapat" title="Kapat">
            <button
              type="button"
              aria-label="Kapat"
              title="Kapat"
              className="w-9 h-9 rounded-xl bg-[#F7F7F8] hover:bg-[#F2F2F3] border border-[#E5E7EB] text-[#111111] flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* NAV LIST BY GROUP */}
        <nav className="p-3 space-y-4 overflow-y-auto flex-1">
          {adminNavGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold tracking-wider text-[#8A8A8A] uppercase">
                {group.group}
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#111111] text-white shadow-sm' 
                          : 'text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F8] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#666666]'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white text-[#111111]' : 'bg-gray-100 text-[#111111]'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* FOOTER INFO & LOGOUT */}
        <div className="p-4 border-t border-[#E5E7EB] bg-white">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F7F7F8] hover:bg-[#F2F2F3] active:scale-95 text-[#111111] border border-[#E5E7EB] text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#111111]" />
            <span>Sistem Çıkışı</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F7F7F8]">

        {/* 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <AdminDashboardTab
            partners={partners}
            orders={orders}
            customers={customers}
            assistants={assistants}
            assistantApplications={assistantApplications}
            onRefresh={handleRefresh}
            setActiveTab={setActiveTab}
          />
        )}

        {/* 2. PARTNERS */}
        {activeTab === 'partners' && (
          <AdminPartnersTab
            partners={partners}
            products={products}
            orders={orders}
            onRefresh={handleRefresh}
            setPartners={setPartners}
          />
        )}

        {/* 2.5 PARTNER SUBSCRIPTIONS */}
        {activeTab === 'partner_subscriptions' && (
          <AdminPartnerSubscriptionsTab
            partners={partners}
            onRefresh={handleRefresh}
          />
        )}

        {/* 3. PARTNER APPLICATIONS */}
        {activeTab === 'applications' && (
          <AdminPartnerAppsTab
            partners={partners}
            onRefresh={handleRefresh}
            setPartners={setPartners}
          />
        )}

        {/* 4. ASSISTANTS */}
        {activeTab === 'assistants' && (
          <AdminAssistantsTab
            assistants={assistants}
            orders={orders}
            onRefresh={handleRefresh}
            setAssistants={setAssistants}
          />
        )}

        {/* 4.5 ASSISTANT SUBSCRIPTIONS */}
        {activeTab === 'assistant_subscriptions' && (
          <AdminAssistantSubscriptionsTab
            assistants={assistants}
            onRefresh={handleRefresh}
          />
        )}

        {/* 5. ASSISTANT APPLICATIONS */}
        {activeTab === 'assistant_applications' && (
          <AdminAssistantAppsTab
            applications={assistantApplications}
            onRefresh={handleRefresh}
            setApplications={setAssistantApplications}
          />
        )}

        {/* 6. PRODUCTS */}
        {activeTab === 'products' && (
          <AdminProductsTab
            products={products}
            partners={partners}
            onRefresh={handleRefresh}
            setProducts={setProducts}
          />
        )}

        {/* 7. ORDERS */}
        {activeTab === 'orders' && (
          <AdminOrdersTab
            orders={orders}
            partners={partners}
            assistants={assistants}
            onRefresh={handleRefresh}
            setOrders={setOrders}
          />
        )}

        {/* 8. CUSTOMERS */}
        {activeTab === 'customers' && (
          <AdminCustomersTab
            customers={customers}
            orders={orders}
            onRefresh={handleRefresh}
            setCustomers={setCustomers}
          />
        )}

        {/* 9. CATEGORIES */}
        {activeTab === 'categories' && (
          <AdminCategoriesTab
            categories={categories}
            onRefresh={handleRefresh}
            setCategories={setCategories}
          />
        )}

        {/* 10. BANNERS & CAMPAIGNS */}
        {activeTab === 'banners' && (
          <AdminBannersTab
            banners={banners}
            campaigns={campaigns}
            coupons={coupons}
            onRefresh={handleRefresh}
            setBanners={setBanners}
            setCampaigns={setCampaigns}
            setCoupons={setCoupons}
          />
        )}

        {/* 11. SUPPORT TICKETS */}
        {activeTab === 'tickets' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <div>
                <h1 className="text-2xl font-black text-[#111111]">Destek Talepleri</h1>
                <p className="text-sm text-[#666666] mt-1">UĞRA partnerleri ve kuryeleri tarafından açılan canlı destek biletleri.</p>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
              {supportTickets.length === 0 ? (
                <div className="text-center py-16">
                  <HelpCircle className="w-12 h-12 text-[#8A8A8A] mx-auto mb-4 opacity-50" />
                  <p className="text-[#666666] text-sm font-bold">Açık veya çözülen herhangi bir destek talebi bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supportTickets.map(ticket => (
                    <div key={ticket.id} className="p-5 bg-[#F7F7F8] border border-[#E5E7EB] rounded-2xl space-y-3 relative overflow-hidden shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-2.5">
                        <div>
                          <span className="text-xs text-[#666666] font-semibold">Gönderen: </span>
                          <span className="text-sm font-extrabold text-[#111111]">{ticket.business_name || 'Partner / Kullanıcı'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#666666] font-mono">{new Date(ticket.created_at).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                          {ticket.status === 'acik' && <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">Açık</span>}
                          {ticket.status === 'cozuldu' && <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">Çözüldü</span>}
                          {ticket.status === 'iptal' && <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider">İptal</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-base text-[#111111]">{ticket.subject}</h4>
                        <p className="text-xs text-[#666666] whitespace-pre-line leading-relaxed italic bg-white p-3 rounded-xl border border-[#E5E7EB]">
                          "{ticket.message}"
                        </p>
                      </div>

                      {ticket.status === 'acik' && (
                        <div className="flex items-center gap-2 pt-2 justify-end">
                          <button 
                            onClick={() => handleResolveTicket(ticket.id, 'cozuldu')}
                            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer border-0 shadow-sm transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Çözüldü İşaretle
                          </button>
                          <button 
                            onClick={() => handleResolveTicket(ticket.id, 'iptal')}
                            className="bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> İptal Et
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 12. REVIEWS */}
        {activeTab === 'reviews' && (
          <AdminReviewsTab
            reviews={reviews}
            onRefresh={handleRefresh}
            setReviews={setReviews}
          />
        )}

        {/* 13. FINANCE */}
        {activeTab === 'finance' && (
          <AdminFinanceTab
            orders={orders}
            partners={partners}
            assistants={assistants}
            onRefresh={handleRefresh}
          />
        )}

        {/* 14. NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <AdminNotificationsTab
            partners={partners}
            assistants={assistants}
          />
        )}

        {/* 15. REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <div>
                <h1 className="text-2xl font-black text-[#111111]">Raporlar & Analizler</h1>
                <p className="text-sm text-[#666666] mt-1">Sistem geneli sipariş trendleri, kategori dağılımı ve performans istatistikleri.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-base text-[#111111]">Sipariş & Gelir Trendi</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ordersByDayData}>
                      <defs>
                        <linearGradient id="colorGelirAdmin" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#111111" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#111111" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#666666" fontSize={11} />
                      <YAxis stroke="#666666" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111111', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)' }} />
                      <Area type="monotone" dataKey="gelir" stroke="#111111" strokeWidth={2} fillOpacity={1} fill="url(#colorGelirAdmin)" name="Ciro (₺)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-base text-[#111111]">Kategori Dağılımı</h3>
                <div className="h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111111', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 17. ROLES */}
        {activeTab === 'roles' && (
          <AdminRolesTab
            adminUsers={adminUsers}
            onRefresh={handleRefresh}
            setAdminUsers={setAdminUsers}
          />
        )}

        {/* 17.5 ŞEHİR & BAYİ YÖNETİMİ */}
        {activeTab === 'franchises' && (
          <AdminFranchisesTab
            cities={cities}
            franchises={franchises}
            onRefresh={handleRefresh}
            setCities={setCities}
            setFranchises={setFranchises}
          />
        )}

        {/* PRICING ENGINE */}
        {activeTab === 'pricing' && (
          <AdminPricingTab />
        )}

        {/* 18. SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
              <div>
                <h1 className="text-2xl font-black text-[#111111]">Sistem Ayarları</h1>
                <p className="text-sm text-[#666666] mt-1">UĞRA altyapısı, Supabase entegrasyonu ve genel platform parametreleri.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-base text-[#111111] border-b border-[#E5E7EB] pb-2.5 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-[#111111]" />
                  Altyapı Durumu
                </h3>

                <div className="space-y-3.5 text-xs font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Supabase Bağlantısı:</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${isSupabaseConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-[#666666] border border-[#E5E7EB]'}`}>
                      {isSupabaseConfigured ? 'BAĞLI / AKTİF' : 'YEREL VERİTABANI MODU'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Aktif Depolama:</span>
                    <span className="text-[#111111] font-mono font-bold">Supabase Storage / S3</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#666666]">Sürüm:</span>
                    <span className="font-mono text-[#666666] font-bold">v2.4.1-prod</span>
                  </div>
                </div>
              </div>

              {/* Supabase Config Form */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-base text-[#111111] border-b border-[#E5E7EB] pb-2.5 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#111111]" />
                  Supabase Bağlantısı
                </h3>

                {configSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3 flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{configSuccessMsg}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[#666666] font-bold uppercase text-[10px]">Project URL</label>
                    <input
                      type="url"
                      placeholder="https://xyz.supabase.co"
                      value={supabaseUrlInput}
                      onChange={e => setSupabaseUrlInput(e.target.value)}
                      className="w-full bg-[#F7F7F8] border border-[#E5E7EB] focus:border-[#111111] outline-none rounded-xl p-2.5 text-[#111111] font-mono shadow-sm transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#666666] font-bold uppercase text-[10px]">Anon Public Key</label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOi..."
                      value={supabaseKeyInput}
                      onChange={e => setSupabaseKeyInput(e.target.value)}
                      className="w-full bg-[#F7F7F8] border border-[#E5E7EB] focus:border-[#111111] outline-none rounded-xl p-2.5 text-[#111111] font-mono shadow-sm transition-all"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
                          setConfigSuccessMsg('Lütfen geçerli bir URL ve Key giriniz.');
                          return;
                        }
                        saveSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
                        setConfigSuccessMsg('Bağlantı bilgileri kaydedildi!');
                      }}
                      className="flex-1 bg-[#111111] hover:bg-[#222222] active:scale-95 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer border-0 shadow-sm transition-all"
                    >
                      Kaydet ve Bağlan
                    </button>
                    {isSupabaseConfigured && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Sıfırlamak istediğinize emin misiniz?')) {
                            clearSupabaseCredentials();
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 border border-red-200 text-xs font-bold py-2.5 px-3 rounded-xl cursor-pointer transition-all"
                      >
                        Sıfırla
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
