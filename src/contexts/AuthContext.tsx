import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** The full user object stored in context — Supabase Auth user merged with DB profile */
export type AuthUser = User & Partial<Profile> & { profile?: Profile };

interface UpdateUserResult {
  data: AuthUser | null;
  error: { message: string } | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  profileLoading: boolean;
  unreadCount: number;
  login: (
    email: string,
    password: string
  ) => ReturnType<typeof supabase.auth.signInWithPassword>;
  signup: (
    email: string,
    password: string,
    metadata: Record<string, unknown>
  ) => ReturnType<typeof supabase.auth.signUp>;
  logout: () => ReturnType<typeof supabase.auth.signOut>;
  updateUser: (updates: Record<string, unknown>) => Promise<UpdateUserResult>;
  deleteAccount: () => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
  decrementUnreadCount: (count: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async (userId: string) => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_total_unread_messages', {
        p_user_id: userId,
      });
      if (error) throw error;
      setUnreadCount((data as number) || 0);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  }, []);

  const decrementUnreadCount = useCallback((count: number) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  }, []);

  const fetchFullUserProfile = useCallback(
    async (sessionUser: User | null | undefined): Promise<AuthUser | null> => {
      if (!sessionUser?.id) {
        setUser(null);
        return null;
      }
      setProfileLoading(true);
      try {
        const { data: dbProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (profileError) throw profileError;

        const fullUser: AuthUser = {
          ...sessionUser,
          ...(dbProfile as Profile),
          profile: dbProfile as Profile,
        };
        setUser(fullUser);
        // Fire-and-forget — don't block profileLoading on the unread count RPC
        if (fullUser.id) {
          fetchUnreadCount(fullUser.id);
        }
        return fullUser;
      } catch (error) {
        const msg = (error as Error)?.message ?? '';
        const isAbort =
          msg.includes('AbortError') ||
          msg.includes('Lock broken') ||
          msg.includes('signal is aborted');
        if (isAbort) {
          // Supabase lock contention (e.g. rapid page transitions). The auth
          // system will fire another onAuthStateChange — let that one succeed.
          return null;
        }
        console.error('Error fetching full profile:', error);
        setUser(sessionUser as AuthUser);
        return sessionUser as AuthUser;
      } finally {
        setProfileLoading(false);
      }
    },
    [fetchUnreadCount]
  );

  useEffect(() => {
    setLoading(true);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Start profile fetch (synchronously sets profileLoading=true), then
      // immediately set loading=false so the UI unblocks. Profile data arrives
      // in the background while pages show their own per-page spinners.
      const profilePromise = fetchFullUserProfile(session?.user);
      setLoading(false);
      await profilePromise;
    });
    return () => subscription?.unsubscribe();
  }, [fetchFullUserProfile]);

  const login = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signup = (email: string, password: string, metadata: Record<string, unknown>) =>
    supabase.auth.signUp({ email, password, options: { data: metadata } });

  const logout = () => supabase.auth.signOut();

  const updateUser = async (
    updates: Record<string, unknown>
  ): Promise<UpdateUserResult> => {
    if (!user) return { data: null, error: { message: 'No user is currently logged in.' } };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) return { data: null, error };
    await fetchFullUserProfile(user);
    return { data: user, error: null };
  };

  const deleteAccount = async (): Promise<void> => {
    if (!user) throw new Error('No user logged in to delete.');
    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw error;
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    loading,
    profileLoading,
    unreadCount,
    login,
    signup,
    logout,
    updateUser,
    deleteAccount,
    fetchUnreadCount,
    decrementUnreadCount,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
