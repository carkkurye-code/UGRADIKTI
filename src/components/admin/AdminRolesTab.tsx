import React, { useState } from 'react';
import { 
  ShieldCheck, Plus, UserCheck, Key, Lock, Mail, Edit, Trash2, Check, X, ShieldAlert
} from 'lucide-react';
import { AdminRoleUser, db } from '@/lib/supabase';
import { ConfirmModal } from './ConfirmModal';
import { adminTheme } from './adminTheme';

interface AdminRolesTabProps {
  adminUsers: AdminRoleUser[];
  onRefresh: () => void;
  setAdminUsers: React.Dispatch<React.SetStateAction<AdminRoleUser[]>>;
}

export const AdminRolesTab: React.FC<AdminRolesTabProps> = ({
  adminUsers,
  onRefresh,
  setAdminUsers
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'admin' | 'operasyon' | 'destek' | 'finans' | 'pazarlama'>('operasyon');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
    isDanger?: boolean;
  }>({ isOpen: false, title: '', description: '', action: async () => {} });

  const roleLabels: Record<string, string> = {
    super_admin: 'Süper Yönetici (Full Root)',
    admin: 'Yönetici (Genel Yetki)',
    operasyon: 'Operasyon Sorumlusu',
    destek: 'Destek & Çağrı Merkezi',
    finans: 'Finans & Muhasebe',
    pazarlama: 'Pazarlama & Banner'
  };

  const handleToggleActive = async (u: AdminRoleUser) => {
    const updated = adminUsers.map(item => item.id === u.id ? { ...item, active: !item.active } : item);
    setAdminUsers(updated);
    await db.saveAdminUsers(updated);
  };

  const handleDeleteUser = async (u: AdminRoleUser) => {
    setErrorMsg(null);
    if (u.role === 'super_admin') {
      setErrorMsg('Süper Yönetici hesabı silinemez.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Yönetici Hesabını Sil',
      description: `${u.name} kullanıcısının admin yetkilerini silmek istediğinize emin misiniz?`,
      isDanger: true,
      action: async () => {
        const updated = adminUsers.filter(item => item.id !== u.id);
        setAdminUsers(updated);
        await db.saveAdminUsers(updated);
      }
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newUser: AdminRoleUser = {
      id: 'adm_' + Date.now(),
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      active: true,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    const updated = [...adminUsers, newUser];
    setAdminUsers(updated);
    await db.saveAdminUsers(updated);

    setNewName('');
    setNewEmail('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center justify-between text-xs">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-xs text-red-700 underline font-bold cursor-pointer border-0 bg-transparent">Kapat</button>
        </div>
      )}
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E5E7] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Rol & İzin Yönetimi</h1>
          <p className="text-sm text-[#666666] mt-1">Admin paneline erişebilen personel rollerini ve erişim seviyelerini yönetin.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className={adminTheme.btnPrimary + " px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"}
        >
          <Plus className="w-4 h-4 text-white" /> Yeni Yönetici Yetkilendir
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E5E5E7] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111111]">
            <thead className={adminTheme.tableHeader}>
              <tr>
                <th className="px-5 py-3.5">Yönetici Adı</th>
                <th className="px-5 py-3.5">E-posta</th>
                <th className="px-5 py-3.5">Rol Derecesi</th>
                <th className="px-5 py-3.5">Son Giriş</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="px-5 py-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E7]">
              {adminUsers.map(u => (
                <tr key={u.id} className={adminTheme.tableRow}>
                  <td className="px-5 py-3.5 font-bold flex items-center gap-2 text-[#111111]">
                    <ShieldCheck className="w-4 h-4 text-[#111111]" />
                    {u.name}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[#666666]">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#F7F7F8] text-[#111111] border border-[#E5E5E7]">
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[#666666]">
                    {u.last_login ? new Date(u.last_login).toLocaleString('tr-TR') : 'Henüz girilmedi'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.active ? adminTheme.badgeSuccess : adminTheme.badgeDanger}`}>
                      {u.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="px-2.5 py-1 bg-[#F7F7F8] hover:bg-[#F2F2F3] rounded-lg text-[#666666] hover:text-[#111111] font-bold border border-[#E5E5E7] cursor-pointer transition-colors"
                    >
                      {u.active ? 'Pasife Al' : 'Aktif Et'}
                    </button>
                    {u.role !== 'super_admin' && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E7] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl text-[#111111]">
            <div className="flex justify-between items-center border-b border-[#E5E5E7] pb-3">
              <h3 className="font-bold text-lg text-[#111111]">Yeni Yönetici / Personel Ekle</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-[#666666] hover:text-[#111111] border-0 bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-medium">
              <div className="space-y-1">
                <label className="text-[#666666] font-bold uppercase tracking-wider text-[10px]">Ad Soyad</label>
                <input
                  type="text"
                  required
                  placeholder="Ahmet Yılmaz"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#666666] font-bold uppercase tracking-wider text-[10px]">E-posta Adresi</label>
                <input
                  type="email"
                  required
                  placeholder="ahmet@ugra.app"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111] font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#666666] font-bold uppercase tracking-wider text-[10px]">Rol Seviyesi</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full bg-[#F7F7F8] border border-[#E5E5E7] rounded-xl p-3 text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="operasyon">Operasyon Sorumlusu</option>
                  <option value="destek">Destek & Çağrı Merkezi</option>
                  <option value="finans">Finans & Muhasebe</option>
                  <option value="pazarlama">Pazarlama & Banner</option>
                  <option value="admin">Yönetici (Genel Yetki)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E5E5E7]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#E5E5E7] text-[#666666] hover:text-[#111111] font-bold hover:bg-[#F2F2F3] cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={adminTheme.btnPrimary + " px-5 py-2.5 rounded-xl text-xs"}
                >
                  Yetkilendir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        isDanger={confirmModal.isDanger}
        onConfirm={async () => {
          await confirmModal.action();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

