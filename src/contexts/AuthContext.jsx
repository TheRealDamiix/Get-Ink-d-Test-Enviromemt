import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchUserAndProfile = async (sessionUser) => {
      if (sessionUser) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { 
          console.error('Error fetching profile:', profileError);
          setUser(sessionUser); 
        } else if (profile) {
          setUser({ ...sessionUser, ...profile });
        } else {
          setUser(sessionUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await fetchUserAndProfile(session?.user);
      if (!session) setLoading(false); 
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await fetchUserAndProfile(session?.user);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      setUser({ ...data.user, ...profile });
    }
    return { data, error };
  };

  const signup = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (!error && data.user) {
      setUser({ ...data.user, ...metadata });
    }
    return { data, error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); 
  };

  const updateUser = async (updatedData) => {
    if (!user) return { data: null, error: new Error("User not authenticated") };
    const { data, error } = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', user.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user profile:', error);
    } else if (data) {
      setUser(prevUser => ({ ...prevUser, ...data }));
    }
    return { data, error };
  };

  const deleteAccount = async () => {
    if (!user) throw new Error("User not authenticated.");
    
    const { data, error } = await supabase.functions.invoke('delete-user-account', {
      body: { userId: user.id }
    });

    if (error) {
      throw error;
    }
    
    await logout(); 
    return data;
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUser,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};