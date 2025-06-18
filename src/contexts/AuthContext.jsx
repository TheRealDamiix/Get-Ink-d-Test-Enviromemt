import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Single, more reliable loading state
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async (userId) => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_total_unread_messages', { p_user_id: userId });
      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  }, []);

  const decrementUnreadCount = useCallback((count) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  }, []);

  const fetchFullUserProfile = useCallback(async (sessionUser) => {
    if (!sessionUser?.id) {
      setUser(null);
      return null;
    }
    try {
      const { data: dbProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
      if (profileError) throw profileError;

      const fullUser = { ...sessionUser, ...dbProfile, profile: dbProfile };
      setUser(fullUser);
      if (fullUser.id) {
        await fetchUnreadCount(fullUser.id);
      }
      return fullUser;
    } catch (error) {
       console.error("Error fetching full profile:", error);
       setUser(sessionUser); // Fallback to session user
       return sessionUser;
    }
  }, [fetchUnreadCount]);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await fetchFullUserProfile(session?.user);
        setLoading(false);
      }
    );
    return () => subscription?.unsubscribe();
  }, [fetchFullUserProfile]);

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signup = (email, password, metadata) => supabase.auth.signUp({ email, password, options: { data: metadata } });
  const logout = () => supabase.auth.signOut();
  
  const updateUser = async (updates) => {
    if (!user) return { data: null, error: { message: "No user is currently logged in." }};
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    if (error) return { error };
    await fetchFullUserProfile(user);
    return { error: null };
  };
  
  const deleteAccount = async () => {
    if (!user) throw new Error("No user logged in to delete.");
    const { error } = await supabase.rpc('delete_user_account'); 
    if (error) throw error;
    setUser(null);
  };

  const value = {
    user,
    loading,
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
      {!loading && children}
    </AuthContext.Provider>
  );
};
