import React from 'react';
import { NotificationLog } from '@/lib/supabase';
import { Bell, ShoppingBag, XCircle, Star, Info, Check } from 'lucide-react';

interface PartnerNotificationsTabProps {
  notifications: NotificationLog[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export const PartnerNotificationsTab: React.FC<PartnerNotificationsTabProps> = ({
  notifications,
  onMarkAllRead,
  onMarkRead
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Bildirim Merkezi {unreadCount > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-mono">{unreadCount} Okunmamış</span>}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sipariş, iptal talebi, müşteri yorumu ve sistem güncellemeleri anlık akışı.</p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-foreground text-xs font-semibold py-2 px-3.5 rounded-xl cursor-pointer transition-all"
          >
            <Check className="w-3.5 h-3.5 text-primary" /> Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-[#111113] border border-white/5 rounded-2xl">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Henüz bildirim kaydı bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => onMarkRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                notif.read 
                  ? 'bg-[#111113] border-white/5 opacity-80' 
                  : 'bg-[#18181c] border-white/20 ring-1 ring-white/10'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.type === 'order' ? 'bg-white/10 text-white border border-white/20' :
                  notif.type === 'cancel' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  notif.type === 'review' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {notif.type === 'order' && <ShoppingBag className="w-5 h-5" />}
                  {notif.type === 'cancel' && <XCircle className="w-5 h-5" />}
                  {notif.type === 'review' && <Star className="w-5 h-5" />}
                  {notif.type === 'system' && <Info className="w-5 h-5" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{notif.title}</h4>
                    {!notif.read && <span className="w-2 h-2 rounded-full bg-white inline-block" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">{notif.message}</p>
                </div>
              </div>

              <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
                {new Date(notif.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
