import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, supabaseAssistant, isSupabaseConfigured, isUUID, db, Assistant, Partner } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface AssistantAuthState {
  assistantUser: User | null;
  currentAssistant: Assistant | null;
  connectedPartner: Partner | null;
  isOnline: boolean;
  setIsOnline: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  error: string | null;
}

export interface AssistantAuthContextType extends AssistantAuthState {
  signIn: (email: string, pass: string) => Promise<{ success: boolean; assistant?: Assistant | null; error?: string }>;
  signOut: () => Promise<void>;
  refreshAssistant: () => Promise<Assistant | null>;
}

const defaultContext: AssistantAuthContextType = {
  assistantUser: null,
  currentAssistant: null,
  connectedPartner: null,
  isOnline: true,
  setIsOnline: () => {},
  loading: true,
  error: null,
  signIn: async () => ({ success: false, error: 'Not initialized' }),
  signOut: async () => {},
  refreshAssistant: async () => null,
};

const AssistantAuthContext = createContext<AssistantAuthContextType>(defaultContext);

export const AssistantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assistantUser, setAssistantUser] = useState<User | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [connectedPartner, setConnectedPartner] = useState<Partner | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssistantProfile = useCallback(async (authUser: User | null): Promise<Assistant | null> => {
    if (!authUser) {
      setCurrentAssistant(null);
      setConnectedPartner(null);
      return null;
    }

    try {
      let profile: any = null;
      if (isSupabaseConfigured && supabaseAssistant && isUUID(authUser.id)) {
        const { data, error: profileErr } = await supabaseAssistant
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (!profileErr) profile = data;
      }

      const assistantId = profile?.assistant_id || profile?.id || authUser.id;
      let asstRecord = await db.getAssistantById(assistantId, authUser.email);

      if (!asstRecord && isSupabaseConfigured && supabaseAssistant && isUUID(assistantId)) {
        try {
          const { data: rawAsst } = await supabaseAssistant
            .from('assistants')
            .select('*')
            .eq('id', assistantId)
            .maybeSingle();
          if (rawAsst) asstRecord = rawAsst as Assistant;
        } catch (e) {
          console.warn('Assistant fallback query:', e);
        }
      }

      if (asstRecord) {
        if (authUser.id && isUUID(authUser.id) && asstRecord.user_id !== authUser.id) {
          try {
            await (supabaseAssistant || supabase)
              .from('assistants')
              .update({ user_id: authUser.id })
              .eq('id', asstRecord.id);
            asstRecord.user_id = authUser.id;
          } catch (_) {}
        }
        setCurrentAssistant(asstRecord);
        setIsOnline(asstRecord.is_online !== false);

        if (asstRecord.partner_id) {
          const partnerData = await db.getPartnerById(asstRecord.partner_id);
          setConnectedPartner(partnerData);
        }
        return asstRecord;
      } else {
        const fallbackAsst: Assistant = {
          id: assistantId,
          user_id: authUser.id,
          full_name: profile?.full_name || authUser.email?.split('@')[0] || 'Saha Asistanı',
          phone: profile?.phone || '',
          email: authUser.email,
          city: 'İstanbul',
          vehicle_type: 'motosiklet',
          active: true,
          status: 'aktif',
          is_online: true,
          task_status: 'Müsait',
          created_at: new Date().toISOString()
        };
        setCurrentAssistant(fallbackAsst);
        setIsOnline(true);
        return fallbackAsst;
      }
    } catch (err: any) {
      console.error('Error fetching assistant profile:', err);
      setCurrentAssistant(null);
      setConnectedPartner(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAssistantAuth() {
      if (isSupabaseConfigured && supabaseAssistant) {
        try {
          const { data: { session } } = await supabaseAssistant.auth.getSession();
          if (session?.user && mounted) {
            setAssistantUser(session.user);
            await fetchAssistantProfile(session.user);
          }
        } catch (err: any) {
          console.error('Assistant Auth init error:', err);
        } finally {
          if (mounted) setLoading(false);
        }

        const { data: authListener } = supabaseAssistant.auth.onAuthStateChange(async (_event: string | null, session: any) => {
          if (!mounted) return;
          const currentUser = session?.user || null;
          setAssistantUser(currentUser);
          if (currentUser) {
            await fetchAssistantProfile(currentUser);
          } else {
            setCurrentAssistant(null);
            setConnectedPartner(null);
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

    initAssistantAuth();

    return () => {
      mounted = false;
    };
  }, [fetchAssistantProfile]);

  const signIn = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabaseAssistant) {
        const cleanEmail = email.trim().toLowerCase();
        let authUser: User | null = null;
        let authSuccess = false;

        const { data, error: authErr } = await supabaseAssistant.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (!authErr && data?.user) {
          authUser = data.user;
          authSuccess = true;
        }

        const activeClient = supabaseAssistant || db;
        let dbAssistant: Assistant | null = null;

        if (authUser?.id && isUUID(authUser.id)) {
          const { data: byUserId } = await (supabaseAssistant || supabase)
            .from('assistants')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();
          if (byUserId) dbAssistant = byUserId as Assistant;
        }

        if (!dbAssistant) {
          const { data: byEmail } = await (supabaseAssistant || supabase)
            .from('assistants')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
          if (byEmail) dbAssistant = byEmail as Assistant;
        }

        if (dbAssistant) {
          const asstStatus = (dbAssistant.status || '').toLowerCase();
          if (asstStatus === 'pending') {
            if (authSuccess) await supabaseAssistant.auth.signOut();
            const msg = 'Başvurunuz yönetici onayı bekliyor.';
            setError(msg);
            setLoading(false);
            return { success: false, error: msg };
          }
          if (asstStatus === 'rejected' || asstStatus === 'pasif' || dbAssistant.active === false) {
            if (authSuccess) await supabaseAssistant.auth.signOut();
            const msg = 'Asistan hesabınız dondurulmuş veya pasif durumdadır.';
            setError(msg);
            setLoading(false);
            return { success: false, error: msg };
          }

          const dbPassword = (dbAssistant as any).password;
          if (!authSuccess) {
            if (dbPassword && dbPassword !== pass) {
              const msg = 'E-posta adresi veya şifre hatalı.';
              setError(msg);
              setLoading(false);
              return { success: false, error: msg };
            }

            const { data: signUpData } = await supabaseAssistant.auth.signUp({
              email: cleanEmail,
              password: pass,
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
              const { data: retryData } = await supabaseAssistant.auth.signInWithPassword({
                email: cleanEmail,
                password: pass,
              });
              if (retryData?.user) {
                authUser = retryData.user;
                authSuccess = true;
              }
            }
          }

          if (authUser?.id && isUUID(authUser.id) && dbAssistant.user_id !== authUser.id) {
            try {
              await (supabaseAssistant || supabase)
                .from('assistants')
                .update({ user_id: authUser.id })
                .eq('id', dbAssistant.id);
              dbAssistant.user_id = authUser.id;
            } catch (_) {}
          }
        } else {
          if (!authSuccess) {
            const msg = 'E-posta adresi veya şifre hatalı.';
            setError(msg);
            setLoading(false);
            return { success: false, error: msg };
          }
        }

        if (!authSuccess && !dbAssistant) {
          const msg = 'E-posta adresi veya şifre hatalı.';
          setError(msg);
          setLoading(false);
          return { success: false, error: msg };
        }

        const effectiveUser = authUser || { id: dbAssistant?.user_id || dbAssistant?.id || 'asst_session', email: cleanEmail } as User;
        setAssistantUser(effectiveUser);
        setCurrentAssistant(dbAssistant);

        if (typeof window !== 'undefined') {
          localStorage.setItem('ugra_assistant_session', JSON.stringify({
            user: effectiveUser,
            assistant: dbAssistant,
            timestamp: Date.now()
          }));
        }

        setLoading(false);
        return { success: true, assistant: dbAssistant };
      } else {
        const mockUser: any = { id: 'mock-assistant-id', email };
        setAssistantUser(mockUser);
        setLoading(false);
        return { success: true, assistant: null };
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
    if (isSupabaseConfigured && supabaseAssistant) {
      await supabaseAssistant.auth.signOut();
    }
    setAssistantUser(null);
    setCurrentAssistant(null);
    setConnectedPartner(null);
    setLoading(false);
  };

  const refreshAssistant = async () => {
    if (assistantUser) {
      return await fetchAssistantProfile(assistantUser);
    }
    return null;
  };

  return (
    <AssistantAuthContext.Provider
      value={{
        assistantUser,
        currentAssistant,
        connectedPartner,
        isOnline,
        setIsOnline,
        loading,
        error,
        signIn,
        signOut,
        refreshAssistant,
      }}
    >
      {children}
    </AssistantAuthContext.Provider>
  );
};

export const useAssistantAuth = () => useContext(AssistantAuthContext);
