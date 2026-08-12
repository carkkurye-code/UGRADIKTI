import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabaseCustomer, isSupabaseConfigured, isUUID, UserProfile } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          renderButton?: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

/**
 * Helper to compute SHA-256 hash in hex format using Web Crypto API.
 */
const sha256Hex = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Helper to parse JWT payload to read claims (e.g. nonce) from Google's id_token.
 */
const parseJwtPayload = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/**
 * Direct Google OAuth 2.0 Implicit Popup.
 * Opens authentication directly on accounts.google.com with zero Supabase Hosted OAuth redirects.
 * Communicates result via window.postMessage with safe fallback.
 */
const openGoogleOAuthPopup = (clientId: string, hashedNonce: string): Promise<{ idToken?: string; cancelled?: boolean; error?: string }> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve({ error: 'Pencere bileşeni bulunamadı.' });
    }

    const redirectUri = window.location.origin;
    const scope = encodeURIComponent('openid profile email');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=${scope}&nonce=${encodeURIComponent(hashedNonce)}&prompt=select_account`;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'google_direct_oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
    );

    if (!popup) {
      return resolve({ error: 'Açılır pencere (popup) engellendi. Lütfen tarayıcı izinlerinizi kontrol edin.' });
    }

    let isResolved = false;
    let focusTimer: any = null;
    let timeoutTimer: any = null;

    const cleanup = () => {
      if (isResolved) return;
      isResolved = true;
      if (focusTimer) clearTimeout(focusTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS' && event.data?.idToken) {
        cleanup();
        resolve({ idToken: event.data.idToken });
      } else if (event.data?.type === 'GOOGLE_OAUTH_ERROR') {
        cleanup();
        resolve({ error: event.data.error || 'Google kimlik doğrulama hatası.' });
      }
    };

    const handleFocus = () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        if (isResolved) return;
        cleanup();
        resolve({ cancelled: true, error: 'Google giriş penceresi kapatıldı.' });
      }, 600);
    };

    timeoutTimer = setTimeout(() => {
      if (isResolved) return;
      cleanup();
      resolve({ cancelled: true, error: 'Google giriş işlemi zaman aşımına uğradı.' });
    }, 180000);

    window.addEventListener('message', handleMessage);
    window.addEventListener('focus', handleFocus);
  });
};

/**
 * Directly triggers Google OAuth popup flow to acquire a Google ID Token.
 */
const acquireGoogleIdToken = async (hashedNonce: string): Promise<{ idToken?: string; cancelled?: boolean; error?: string }> => {
  if (typeof window === 'undefined') {
    return { error: 'Pencere bileşeni bulunamadı.' };
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '43567125632-3p2uri5kgb5inrjrq0vslla78mpjk79v.apps.googleusercontent.com';

  return await openGoogleOAuthPopup(clientId, hashedNonce);
};

export type UserRole = 'customer' | 'partner' | 'assistant' | 'admin' | 'super_admin';

export interface CustomerAuthState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
}

export type AuthState = CustomerAuthState;

export interface CustomerAuthContextType extends CustomerAuthState {
  signIn: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  signUp: (email: string, pass: string, role?: UserRole, metadata?: Record<string, any>) => Promise<{ success: boolean; user?: any; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; user?: any; profile?: UserProfile; error?: string; cancelled?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  hasRole: (allowedRoles: UserRole | UserRole[]) => boolean;
  getRedirectPath: (targetRole?: UserRole) => string;
}

const defaultContext: CustomerAuthContextType = {
  user: null,
  profile: null,
  role: 'customer',
  loading: true,
  error: null,
  signIn: async () => ({ success: false, error: 'Not initialized' }),
  signUp: async () => ({ success: false, error: 'Not initialized' }),
  signInWithGoogle: async () => ({ success: false, error: 'Not initialized' }),
  signOut: async () => {},
  refreshProfile: async () => null,
  hasRole: () => false,
  getRedirectPath: () => '/',
};

const CustomerAuthContext = createContext<CustomerAuthContextType>(defaultContext);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (authUser: User | null): Promise<UserProfile | null> => {
    if (!authUser) {
      setProfile(null);
      setRole('customer');
      return null;
    }

    let loadedProfile: UserProfile | null = null;

    if (isSupabaseConfigured && supabaseCustomer && authUser?.id && isUUID(authUser.id)) {
      try {
        const { data, error: profileErr } = await supabaseCustomer
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileErr) {
          console.error('Customer profiles tablosu sorgu hatası:', profileErr);
        }

        if (!profileErr && data) {
          const meta = authUser.user_metadata || {};
          const metaFullName = meta.full_name || meta.name;
          const metaAvatar = meta.avatar_url || meta.picture;

          let updatedName = data.full_name;
          let updatedAvatar = data.avatar_url;

          if ((!updatedName || updatedName === 'Kullanıcı') && metaFullName) {
            updatedName = metaFullName;
          }
          if (!updatedAvatar && metaAvatar) {
            updatedAvatar = metaAvatar;
          }

          if (updatedName !== data.full_name || updatedAvatar !== data.avatar_url) {
            const { error: updateErr } = await supabaseCustomer
              .from('profiles')
              .update({ full_name: updatedName, avatar_url: updatedAvatar })
              .eq('id', authUser.id);

            if (updateErr) {
              console.error('Customer profiles güncelleme hatası:', updateErr);
            }
          }

          loadedProfile = {
            id: data.id,
            email: data.email || authUser.email || '',
            full_name: updatedName || metaFullName || (authUser.email ? authUser.email.split('@')[0] : 'Kullanıcı'),
            phone: data.phone || meta.phone || '',
            role: (data.role as UserRole) || 'customer',
            is_admin: data.is_admin || data.role === 'admin' || data.role === 'super_admin',
            avatar_url: updatedAvatar || metaAvatar,
            partner_id: data.partner_id,
            assistant_id: data.assistant_id,
            created_at: data.created_at,
          };
        } else {
          // Profile does not exist in public.profiles table yet (e.g. first Google sign in)
          const meta = authUser.user_metadata || {};
          const fullName = meta.full_name || meta.name || (authUser.email ? authUser.email.split('@')[0] : 'Kullanıcı');
          const avatarUrl = meta.avatar_url || meta.picture || '';
          const metaRole = (meta.role as UserRole) || 'customer';

          const newProfile = {
            id: authUser.id,
            email: authUser.email || '',
            full_name: fullName,
            avatar_url: avatarUrl,
            role: metaRole,
            is_admin: false,
            created_at: new Date().toISOString(),
          };

          const { data: upserted, error: upsertErr } = await supabaseCustomer
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select('*')
            .maybeSingle();

          if (upsertErr) {
            console.error('Customer profile upsert hatası:', upsertErr);
          }

          if (!upsertErr && upserted) {
            loadedProfile = {
              id: upserted.id,
              email: upserted.email || authUser.email || '',
              full_name: upserted.full_name || fullName,
              phone: upserted.phone || '',
              role: (upserted.role as UserRole) || metaRole,
              is_admin: upserted.is_admin || false,
              avatar_url: upserted.avatar_url || avatarUrl,
              partner_id: upserted.partner_id,
              assistant_id: upserted.assistant_id,
              created_at: upserted.created_at,
            };
          }
        }
      } catch (err) {
        console.error('Customer profiles tablosu istisnası:', err);
      }
    }

    if (!loadedProfile) {
      const meta = authUser.user_metadata || {};
      const metaRole = (meta.role as UserRole) || 'customer';
      const isAdmin = authUser.email === 'admin@ugra.app' || meta.is_admin === true;
      const computedRole: UserRole = isAdmin ? 'admin' : metaRole;

      loadedProfile = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: meta.full_name || meta.name || (authUser.email ? authUser.email.split('@')[0] : 'Kullanıcı'),
        avatar_url: meta.avatar_url || meta.picture || '',
        phone: meta.phone || '',
        role: computedRole,
        is_admin: isAdmin,
        created_at: authUser.created_at || new Date().toISOString(),
      };
    }

    setProfile(loadedProfile);
    setRole((loadedProfile.role as UserRole) || 'customer');
    return loadedProfile;
  }, []);

  useEffect(() => {
    let mounted = true;

    if (isSupabaseConfigured && supabaseCustomer) {
      // 1. Fetch current session on mount to initialize user state immediately
      supabaseCustomer.auth.getSession().then(async ({ data: { session } }: { data: { session: any } }) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
          setRole('customer');
        }
        setLoading(false);
      }).catch((err: any) => {
        console.error('getSession hatası:', err);
        if (mounted) setLoading(false);
      });

      // 2. Register onAuthStateChange listener with proper unmount cleanup
      const { data: authListener } = supabaseCustomer.auth.onAuthStateChange(async (_event: string, session: any) => {
        if (!mounted) return;

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await fetchUserProfile(currentUser);
        } else {
          setProfile(null);
          setRole('customer');
        }
        setLoading(false);
      });

      return () => {
        mounted = false;
        authListener?.subscription?.unsubscribe();
      };
    } else {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
  }, [fetchUserProfile]);

  const signIn = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabaseCustomer) {
        const { data, error: authErr } = await supabaseCustomer.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: pass,
        });

        if (authErr) {
          setError(authErr.message);
          setLoading(false);
          return { success: false, error: authErr.message };
        }

        if (data?.user) {
          setUser(data.user);
          const userProf = await fetchUserProfile(data.user);
          setLoading(false);
          return {
            success: true,
            role: (userProf?.role as UserRole) || 'customer',
          };
        }
      } else {
        const mockRole: UserRole = 'customer';
        const mockUser: any = {
          id: 'mock-customer-id',
          email,
          user_metadata: { role: mockRole },
        };
        setUser(mockUser);
        setRole(mockRole);
        setProfile({
          id: 'mock-customer-id',
          email,
          full_name: email.split('@')[0],
          role: mockRole,
          is_admin: false,
          created_at: new Date().toISOString(),
        });
        setLoading(false);
        return { success: true, role: mockRole };
      }
    } catch (err: any) {
      const msg = err.message || 'Giriş yapılamadı.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }

    setLoading(false);
    return { success: false, error: 'Bilinmeyen hata' };
  };

  const signUp = async (email: string, pass: string, assignedRole: UserRole = 'customer', metadata: Record<string, any> = {}) => {
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabaseCustomer) {
        const { data, error: authErr } = await supabaseCustomer.auth.signUp({
          email: email.trim().toLowerCase(),
          password: pass,
          options: {
            data: {
              role: assignedRole,
              ...metadata,
            },
          },
        });

        if (authErr) {
          setError(authErr.message);
          setLoading(false);
          return { success: false, error: authErr.message };
        }

        if (data?.user) {
          setUser(data.user);
          await fetchUserProfile(data.user);
          setLoading(false);
          return { success: true, user: data.user };
        }
      } else {
        const mockUser: any = {
          id: 'mock-customer-' + Date.now(),
          email,
          user_metadata: { role: assignedRole, ...metadata },
        };
        setUser(mockUser);
        setRole(assignedRole);
        setProfile({
          id: mockUser.id,
          email,
          full_name: metadata.full_name || email.split('@')[0],
          phone: metadata.phone || '',
          role: assignedRole,
          is_admin: false,
          created_at: new Date().toISOString(),
        });
        setLoading(false);
        return { success: true, user: mockUser };
      }
    } catch (err: any) {
      const msg = err.message || 'Kayıt işlemi başarısız.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }

    setLoading(false);
    return { success: false, error: 'Kayıt gerçekleştirilemedi' };
  };

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured || !supabaseCustomer) {
        const errorMsg = 'Supabase bağlantısı henüz yapılandırılmamış.';
        setError(errorMsg);
        setLoading(false);
        return { success: false, error: errorMsg };
      }

      // 1. Generate Raw Nonce and compute SHA-256 for Google
      const rawNonce = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

      const hashedNonce = await sha256Hex(rawNonce);

      // 2. Directly acquire Google ID Token from Google with SHA-256 hashed nonce
      const tokenResult = await acquireGoogleIdToken(hashedNonce);

      if (tokenResult.cancelled) {
        setLoading(false);
        return { success: false, cancelled: true, error: tokenResult.error || 'Giriş penceresi kapatıldı.' };
      }

      if (tokenResult.error || !tokenResult.idToken) {
        const msg = tokenResult.error || 'Google kimlik doğrulama tokenı alınamadı.';
        setError(msg);
        setLoading(false);
        return { success: false, error: msg };
      }

      // 3. Pass Google ID Token & rawNonce to Supabase Auth (signInWithIdToken)
      const { data, error: idTokenErr } = await supabaseCustomer.auth.signInWithIdToken({
        provider: 'google',
        token: tokenResult.idToken,
        nonce: rawNonce,
      });

      if (idTokenErr) {
        console.error('Supabase signInWithIdToken error', idTokenErr);
        setError(idTokenErr.message);
        setLoading(false);
        return { success: false, error: idTokenErr.message };
      }

      const authenticatedUser = data?.user || data?.session?.user || null;

      if (authenticatedUser) {
        setUser(authenticatedUser);
        const userProf = await fetchUserProfile(authenticatedUser);
        setLoading(false);
        return { success: true, user: authenticatedUser, profile: userProf || undefined };
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Google ile giriş yapılırken bir hata oluştu.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabaseCustomer) {
      await supabaseCustomer.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRole('customer');
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      return await fetchUserProfile(user);
    }
    return null;
  };

  const hasRole = (allowedRoles: UserRole | UserRole[]): boolean => {
    const rolesArr = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return rolesArr.includes(role);
  };

  const getRedirectPath = (targetRole?: UserRole): string => {
    const checkRole = targetRole || role;
    switch (checkRole) {
      case 'admin':
      case 'super_admin':
        return '/admin';
      case 'partner':
        return '/partner/dashboard';
      case 'assistant':
        return '/asistan';
      case 'customer':
      default:
        return '/';
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
        hasRole,
        getRedirectPath,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => useContext(CustomerAuthContext);
