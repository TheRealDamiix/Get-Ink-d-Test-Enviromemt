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
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
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
      setProfileLoading(false);
      return null;
    }
    setProfileLoading(true);
    try {
      const { data: dbProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
      if (profileError) throw profileError;

      // Combine auth user data with public profile data
      const fullUser = { ...sessionUser, ...dbProfile, profile: dbProfile };
      setUser(fullUser);
      
      if (fullUser.id) {
        await fetchUnreadCount(fullUser.id);
      }
      return fullUser;
    } catch (error) {
       console.error("Error fetching full profile:", error);
       setUser(sessionUser); // Fallback to session user data if profile fetch fails
       return sessionUser;
    } finally {
      setProfileLoading(false);
    }
  }, [fetchUnreadCount]);

  useEffect(() => {
    const initializeSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchFullUserProfile(session.user);
      }
      setLoading(false);
    };
    
    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === 'SIGNED_OUT') {
          setUser(null);
        } else if (session?.user) {
          await fetchFullUserProfile(session.user);
        }
      }
    );
    return () => subscription?.unsubscribe();
  }, [fetchFullUserProfile]);
  
  // Realtime subscription for messages
  useEffect(() => {
    let messagesSubscription;
    if (user?.id) {
      messagesSubscription = supabase
        .channel(`public:messages:for_user_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchUnreadCount(user.id);
        })
        .subscribe();
    }
    return () => {
      if (messagesSubscription) {
        supabase.removeChannel(messagesSubscription);
      }
    };
  }, [user?.id, fetchUnreadCount]);

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });

  const signup = (email, password, metadata) => supabase.auth.signUp({ email, password, options: { data: metadata } });

  const logout = () => supabase.auth.signOut();

  const updateUser = async (updates) => {
    if (!user) return { data: null, error: { message: "No user is currently logged in." }};

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      // After a successful DB update, refetch the full user profile
      // to update the context state with the latest data.
      await fetchFullUserProfile(user); 
    }

    return { data, error };
  };

  const deleteAccount = async () => {
    if (!user) throw new Error("No user logged in to delete.");
    // This assumes you have an RPC function in Supabase named 'delete_user_account'.
    // Creating this function on the backend is crucial for security.
    const { error } = await supabase.rpc('delete_user_account'); 
    if (error) throw error;
    setUser(null);
  };

  const value = {
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
      {children}
    </AuthContext.Provider>
  );
};
