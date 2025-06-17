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

  // New function to instantly update the notification badge on the client
  const decrementUnreadCount = useCallback((count) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  }, []);

  const fetchFullUserProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setProfileLoading(false);
      return null;
    }
    setProfileLoading(true);
    try {
      const { data: dbProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
      const fullUser = { ...sessionUser, ...dbProfile, profile: dbProfile };
      setUser(fullUser);
      if (fullUser) await fetchUnreadCount(fullUser.id);
      return fullUser;
    } catch (error) {
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

  const value = {
    user,
    loading,
    profileLoading,
    unreadCount,
    fetchUnreadCount,
    decrementUnreadCount, // Expose the new function
    // ... other exports like login, logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
