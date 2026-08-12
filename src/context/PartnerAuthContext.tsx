import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabasePartner, isSupabaseConfigured, isUUID, db, Partner } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface PartnerAuthState {
  partnerUser: User | null;
  partner: Partner | null;
  loading: boolean;
  error: string | null;
}

export interface PartnerAuthContextType extends PartnerAuthState {
  signIn: (email: string, pass: string) => Promise<{ success: boolean; partner?: Partner | null; error?: string }>;
  signOut: () => Promise<void>;
  refreshPartner: () => Promise<Partner | null>;
}

const defaultContext: PartnerAuthContextType = {
  partnerUser: null,
  partner: null,
  loading: true,
  error: null,
  signIn: async () => ({ success: false, error: 'Not initialized' }),
  signOut: async () => {},
  refreshPartner: async () => null,
};

const PartnerAuthContext = createContext<PartnerAuthContextType>(defaultContext);

export const PartnerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartnerProfile = useCallback(async (authUser: User | null): Promise<Partner | null> => {
    if (!authUser) {
      setPartner(null);
      return null;
    }

    try {
      let targetPartnerId: string | null = null;
      const email = authUser.email || '';

      if (isSupabaseConfigured && supabasePartner) {
        if (isUUID(authUser.id)) {
          const { data: profile } = await supabasePartner
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (profile && profile.partner_id) {
            targetPartnerId = profile.partner_id;
          }
        }

        if (!targetPartnerId) {
          const { data: partnerRow } = await supabasePartner
            .from('partners')
            .select('id')
            .or(`id.eq.${authUser.id},email.ilike.${email}`)
            .maybeSingle();

          if (partnerRow) {
            targetPartnerId = partnerRow.id;
          }
        }
      }

      const partnerData = await db.getPartnerById(targetPartnerId || authUser.id, email);
      setPartner(partnerData);
      return partnerData;
    } catch (err: any) {
      console.error('Error fetching partner profile:', err);
      setPartner(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initPartnerAuth() {
      if (isSupabaseConfigured && supabasePartner) {
        try {
          const { data: { session } } = await supabasePartner.auth.getSession();
          if (session?.user && mounted) {
            setPartnerUser(session.user);
            await fetchPartnerProfile(session.user);
          }
        } catch (err: any) {
          console.error('Partner Auth init error:', err);
        } finally {
          if (mounted) setLoading(false);
        }

        const { data: authListener } = supabasePartner.auth.onAuthStateChange(async (_event: string | null, session: any) => {
          if (!mounted) return;
          const currentUser = session?.user || null;
          setPartnerUser(currentUser);
          if (currentUser) {
            await fetchPartnerProfile(currentUser);
          } else {
            setPartner(null);
          }
          setLoading(false);
        });

        return () => {
          authListener?.subscription?.unsubscribe();
        };
      } else {
        if (mounted) setLoading(false);
      }
    }

    initPartnerAuth();

    return () => {
      mounted = false;
    };
  }, [fetchPartnerProfile]);

  const signIn = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabasePartner) {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error: authErr } = await supabasePartner.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (authErr) {
          setError(authErr.message);
          setLoading(false);
          return { success: false, error: authErr.message };
        }

        if (data?.user) {
          setPartnerUser(data.user);
          const pData = await fetchPartnerProfile(data.user);
          setLoading(false);
          return { success: true, partner: pData };
        }
      } else {
        const mockUser: any = { id: 'mock-partner-id', email };
        setPartnerUser(mockUser);
        setLoading(false);
        return { success: true, partner: null };
      }
    } catch (err: any) {
      const msg = err.message || 'Giriş yapılamadı.';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }

    setLoading(false);
    return { success: false, error: 'Giriş başarısız.' };
  };

  const signOut = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabasePartner) {
      await supabasePartner.auth.signOut();
    }
    setPartnerUser(null);
    setPartner(null);
    setLoading(false);
  };

  const refreshPartner = async () => {
    if (partnerUser) {
      return await fetchPartnerProfile(partnerUser);
    }
    return null;
  };

  return (
    <PartnerAuthContext.Provider
      value={{
        partnerUser,
        partner,
        loading,
        error,
        signIn,
        signOut,
        refreshPartner,
      }}
    >
      {children}
    </PartnerAuthContext.Provider>
  );
};

export const usePartnerAuth = () => useContext(PartnerAuthContext);
