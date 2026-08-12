import React, { useState } from 'react';
import { 
  Users, Search, Eye, Key, ShieldAlert, Trash2, Ban, MapPin, ShoppingBag, Heart, Ticket, Bell, X, Phone, Mail, Check
} from 'lucide-react';
import { Order, db } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';

interface AdminCustomersTabProps {
  customers: any[];
  orders: Order[];
  onRefresh: () => void;
  setCustomers: React.Dispatch<React.SetStateAction<any[]>>;
}

export const AdminCustomersTab: React.FC<AdminCustomersTabProps> = ({
  customers,
  orders,
  onRefresh,
  setCustomers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [custSubTab, setCustSubTab] = useState<'orders' | 'addresses' | 'coupons' | 'notifications'>('orders');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
    requireDoubleConfirmation?: boolean;
    prompt?: string;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = (c.full_name || c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.phone || '').includes(searchTerm) ||
                          (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || c.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Actions
  const handleBanCustomer = (customer: any) => {
    const isBanned = customer.status === 'banned';
    setConfirmModal({
      isOpen: true,
      title: isBanned ? 'Yasağı Kaldır' : 'Müşteriyi Platformdan Yasakla',
      description: `${customer.full_name || customer.name} kullanıcısını ${isBanned ? 'yasağını kaldırmak' : 'kalıcı olarak yasaklamak'} istediğinize emin misiniz?`,
      isDanger: !isBanned,
      requireDoubleConfirmation: !isBanned,
      prompt: 'KULLANICIYI YASAKLA',
      action: async () => {
        const newStatus = isBanned ? 'aktif' : 'banned';
        setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, status: newStatus } : c));
        await db.updateCustomerStatus(customer.id, newStatus);
      }
    });
  };

  const handleSuspendCustomer = (customer: any) => {
    const isSuspended = customer.status === 'suspended';
    setConfirmModal({
      isOpen: true,
      title: isSuspended ? 'Hesabı Tekrar Aç' : 'Müşteriyi Geçici Askıya Al',
      description: `${customer.full_name || customer.name} kullanıcısının hesabını ${isSuspended ? 'tekrar aktif yapmak' : 'geçici olarak askıya almak'} üzeresiniz.`,
      isDanger: !isSuspended,
      action: async () => {
        const newStatus = isSuspended ? 'aktif' : 'suspended';
        setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, status: newStatus } : c));
        await db.updateCustomerStatus(customer.id, newStatus);
      }
    });
  };

  const handleDeleteCustomer = (customer: any) => {
    setConfirmModal({
      isOpen: true,
      title: 'Müşteri Hesabını Sil',
      description: `${customer.full_name || customer.name} hesabını silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        await db.deleteCustomer(customer.id);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1F2937] tracking-tight">Müşteri Yönetim Merkezi</h1>
          <p className="text-xs sm:text-sm text-[#6B7280] font-medium mt-1">Platformdaki tüm son kullanıcı hesaplarını, sipariş geçmişlerini ve durumlarını yönetin.</p>
        </div>
        <div className="px-3.5 py-2 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 font-bold text-xs flex items-center gap-2 shadow-sm">
          <Users className="w-4 h-4 text-purple-600" /> Toplam {customers.length} Müşteri
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Müşteri adı, e-posta veya telefon ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 bg-gray-50 border border-[#E5E7EB] rounded-xl pl-9 pr-3 text-xs font-medium text-[#1F2937] focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] transition-all shadow-sm"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-10 bg-gray-50 border border-[#E5E7EB] rounded-xl px-3 text-xs font-medium text-[#1F2937] focus:outline-none focus:border-[#1F2937] focus:ring-1 focus:ring-[#1F2937] transition-all shadow-sm"
        >
          <option value="">Tüm Müşteri Durumları</option>
          <option value="aktif">Aktif Müşteriler</option>
          <option value="suspended">Askıdaki Müşteriler</option>
          <option value="banned">Yasaklı Müşteriler</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-extrabold text-[#6B7280] uppercase tracking-wider">
                <th className="p-4">Müşteri</th>
                <th className="p-4">İletişim</th>
                <th className="p-4 text-center">Toplam Sipariş</th>
                <th className="p-4 text-center">Durum</th>
                <th className="p-4 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-[#6B7280] font-medium">
                    Müşteri kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => {
                  const custOrders = orders.filter(o => o.customer_phone === cust.phone || o.customer_name === (cust.full_name || cust.name));
                  const customerKey = cust.id || cust.phone || `cust-${idx}`;

                  return (
                    <tr key={customerKey} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-bold text-[#1F2937]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {(cust.full_name || cust.name || 'M')[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1F2937]">{cust.full_name || cust.name || 'Müşteri'}</div>
                            <div className="text-[10px] text-[#6B7280] font-mono mt-0.5">ID: #{String(cust.id || '').substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs space-y-0.5">
                        <div className="text-[#1F2937] font-medium font-mono">{cust.phone || 'Telefon yok'}</div>
                        <div className="text-[#6B7280]">{cust.email || 'E-posta yok'}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-[#1F2937] text-xs">
                        <span className="px-2.5 py-1 bg-gray-100 rounded-lg border border-gray-200">{custOrders.length} Sipariş</span>
                      </td>
                      <td className="p-4 text-center">
                        {cust.status === 'banned' ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-red-50 text-red-700 border border-red-200">
                            YASAKLI
                          </span>
                        ) : cust.status === 'suspended' ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            ASKIDA
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            AKTİF
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setViewingCustomer(cust); setCustSubTab('orders'); }}
                            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#374151] hover:text-[#1F2937] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Profil & Geçmiş"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSuspendCustomer(cust)}
                            className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                            title={cust.status === 'suspended' ? 'Hesabı Aç' : 'Askıya Al'}
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBanCustomer(cust)}
                            className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                            title={cust.status === 'banned' ? 'Yasağı Kaldır' : 'Platformdan Yasakla'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(cust)}
                            className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 relative text-xs">
            <button
              type="button"
              onClick={() => setViewingCustomer(null)}
              aria-label="Kapat"
              title="Kapat"
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[#6B7280] hover:text-[#1F2937] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-lg flex items-center justify-center shadow-sm">
                {(viewingCustomer.full_name || viewingCustomer.name || 'M')[0]}
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">{viewingCustomer.full_name || viewingCustomer.name}</h2>
                <p className="text-[#6B7280] font-medium">{viewingCustomer.email} • <span className="font-mono">{viewingCustomer.phone}</span></p>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2">
              <button
                type="button"
                onClick={() => setCustSubTab('orders')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${custSubTab === 'orders' ? 'bg-[#1F2937] text-white shadow-sm' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'}`}
              >
                Sipariş Geçmişi
              </button>
              <button
                type="button"
                onClick={() => setCustSubTab('addresses')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${custSubTab === 'addresses' ? 'bg-[#1F2937] text-white shadow-sm' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'}`}
              >
                Kayıtlı Adresler
              </button>
              <button
                type="button"
                onClick={() => setCustSubTab('coupons')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${custSubTab === 'coupons' ? 'bg-[#1F2937] text-white shadow-sm' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'}`}
              >
                Kullanılan Kuponlar
              </button>
            </div>

            {custSubTab === 'orders' && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {orders.filter(o => o.customer_phone === viewingCustomer.phone || o.customer_name === (viewingCustomer.full_name || viewingCustomer.name)).map((o, idx) => (
                  <div key={o.id || `ord-${idx}`} className="p-3.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#1F2937]">Sipariş #{String(o.id || '').substring(0, 8)} - {o.total_price} ₺</div>
                      <div className="text-[#6B7280] text-[11px] font-medium">{new Date(o.created_at).toLocaleString('tr-TR')}</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase text-[10px]">
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {custSubTab === 'addresses' && (
              <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1.5">
                <span className="text-[10px] font-semibold text-[#6B7280] uppercase block">Ev Adresi</span>
                <div className="text-[#1F2937] font-medium">{viewingCustomer.address || 'Maslak Mah. Büyükdere Cad. Sarıyer / İstanbul'}</div>
              </div>
            )}

            {custSubTab === 'coupons' && (
              <div className="p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl space-y-1.5">
                <span className="text-[10px] font-semibold text-[#6B7280] uppercase block">Tanımlı Hoş Geldin Kuponu</span>
                <div className="text-emerald-700 font-bold font-mono">HOŞGELDİN50 - 50 TL İndirim (Kullanıldı)</div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-gray-50 rounded-xl text-[#4B5563] font-semibold cursor-pointer shadow-sm transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
        requireDoubleConfirmation={confirmModal.requireDoubleConfirmation}
        doubleConfirmationPrompt={confirmModal.prompt}
      />
    </div>
  );
};
