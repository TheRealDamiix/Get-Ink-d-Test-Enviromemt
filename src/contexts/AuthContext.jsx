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
          // If profile fetch fails (but not just 'no rows found'), still set user, but profile data will be limited
          setUser(sessionUser); 
        } else if (profile) {
          // Merge Supabase user data with profile data, ensuring consistent snake_case
          setUser({ ...sessionUser, ...profile });
        } else {
          // If no profile found (PGRST116), still set the user (e.g., for new sign-ups before profile creation)
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
      // Removed the redundant setLoading(false) here, as fetchUserAndProfile already handles it.
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true); // Set loading to true while auth state changes are processed
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
      // After login, fetch the full profile to ensure consistency
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (!profileError && profile) {
        setUser({ ...data.user, ...profile }); // Merge Supabase user with profile
      } else {
        console.error('Error fetching profile after login:', profileError);
        setUser(data.user); // Fallback to just user data
      }
    }
    return { data, error };
  };

  const signup = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // metadata is directly passed to Supabase user_metadata
      },
    });
    if (!error && data.user) {
      // IMPORTANT: After signup, fetch the newly created profile from the 'profiles' table
      // This ensures consistency with the 'login' flow and full profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (!profileError && profile) {
        setUser({ ...data.user, ...profile }); // Merge Supabase user with actual profile
      } else {
        console.error('Error fetching profile after signup:', profileError);
        setUser(data.user); // Fallback if profile fetch fails
      }
    }
    return { data, error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); 
  };

  const updateUser = async (updatedData) => {
    if (!user) return { data: null, error: new Error("User not authenticated") };
    // updatedData here is expected to contain keys matching Supabase column names (snake_case)
    const { data, error } = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', user.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user profile:', error);
    } else if (data) {
      setUser(prevUser => ({ ...prevUser, ...data })); // Update local user state with new profile data
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
