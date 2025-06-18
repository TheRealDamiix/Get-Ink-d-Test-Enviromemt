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
      setUnreadCount(data);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  }, []);
  
  const decrementUnreadCount = useCallback((count) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  }, []);

  const fetchFullUserProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      setProfileLoading(false);
      return null;
    }
    setProfileLoading(true);
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
    } finally {
      setProfileLoading(false);
    }
  }, [fetchUnreadCount]);

  useEffect(() => {
    const initializeAuth = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        await fetchFullUserProfile(session?.user);
        setLoading(false);
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await fetchFullUserProfile(session?.user);
        if (!session) {
          setUser(null);
        }
      }
    );
    return () => subscription?.unsubscribe();
  }, [fetchFullUserProfile]);

  useEffect(() => {
    let messagesSubscription;
    if (user?.id) {
        messagesSubscription = supabase
            .channel(`public:messages:for_user_${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },
                () => fetchUnreadCount(user.id)
            )
            .subscribe();
    }
    return () => {
      if (messagesSubscription) supabase.removeChannel(messagesSubscription);
    };
  }, [user?.id, fetchUnreadCount]);

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });

  const signup = (email, password, metadata) => supabase.auth.signUp({ email, password, options: { data: metadata } });

  const logout = () => supabase.auth.signOut();

  const updateUser = async (updates) => {
    if (!user) return { error: { message: "No user logged in." }};
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile in DB:", error);
      return { error };
    }
    
    // Refresh user state with the latest data
    await fetchFullUserProfile(user);
    return { user: data, error: null };
  };
  
  const deleteAccount = async () => {
      if (!user) throw new Error("No user logged in to delete.");
      // It's recommended to call a secure edge function to handle user deletion
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      // The onAuthStateChange listener will handle setting user to null
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
