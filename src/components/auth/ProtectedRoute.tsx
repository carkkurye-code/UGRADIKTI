import React from 'react';
import { useLocation } from 'wouter';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
  fallbackComponent?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
  fallbackComponent,
}) => {
  const { user, role, loading, hasRole, getRedirectPath } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0d0f12] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-zinc-400">Yükleniyor...</p>
      </div>
    );
  }

  // Check if role permission matches
  const isAuthorized = !allowedRoles || allowedRoles.length === 0 || hasRole(allowedRoles);

  if (!isAuthorized) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    // Default Fallback / Redirection UI if user accesses page without permission
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0f12] text-white p-4">
        <div className="max-w-md w-full bg-[#181B20] border border-red-500/20 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Erişim Yetkisi Bulunmuyor</h2>
          <p className="text-sm text-zinc-400">
            Bu panele erişmek için yetkili bir hesapla ({allowedRoles?.join(', ')}) giriş yapmalısınız.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setLocation(redirectTo || getRedirectPath(role))}
              className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm transition-all hover:bg-primary/90"
            >
              Paneline Git
            </button>
            <button
              onClick={() => setLocation('/')}
              className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold rounded-xl text-sm transition-all border border-white/10"
            >
              Ana Sayfa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
