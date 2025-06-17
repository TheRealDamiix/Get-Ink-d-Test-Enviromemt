import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import apiFetch from '@/lib/api'; 

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

  const fetchFullUserProfile = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);
    try {
      const { data: dbProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      let fullUser = { ...sessionUser };
      let profileDataForUserObject = {};
      let nestedProfileObject = null;
      let determinedIsArtist = false;
      const rawMeta = sessionUser.user_metadata || sessionUser.raw_user_meta_data || {};


      if (dbProfile) {
        profileDataForUserObject = { ...dbProfile };
        nestedProfileObject = { ...dbProfile };
        if (typeof dbProfile.is_artist === 'boolean') {
          determinedIsArtist = dbProfile.is_artist;
        } else if (typeof rawMeta.is_artist === 'boolean') {
          determinedIsArtist = rawMeta.is_artist;
        }
      } else if (profileError && profileError.code === 'PGRST116') {
        console.warn('Profile not found for user (PGRST116), using session metadata:', sessionUser.id);
        if (typeof rawMeta.is_artist === 'boolean') {
          determinedIsArtist = rawMeta.is_artist;
        }
        profileDataForUserObject = {
          name: rawMeta.name,
          username: rawMeta.username,
          location: rawMeta.location,
          profile_photo_url: rawMeta.profile_photo_url,
        };
        nestedProfileObject = {
          id: sessionUser.id,
          email: sessionUser.email,
          ...profileDataForUserObject,
          is_artist: determinedIsArtist,
        };
      } else if (profileError) {
        console.error('Error fetching profile (not PGRST116):', profileError.message, profileError.details);
        if (typeof rawMeta.is_artist === 'boolean') {
          determinedIsArtist = rawMeta.is_artist;
        }
         profileDataForUserObject = {
          name: rawMeta.name,
          username: rawMeta.username,
          location: rawMeta.location,
          profile_photo_url: rawMeta.profile_photo_url,
        };
      } else {
        if (typeof rawMeta.is_artist === 'boolean') {
          determinedIsArtist = rawMeta.is_artist;
        }
         profileDataForUserObject = {
          name: rawMeta.name,
          username: rawMeta.username,
          location: rawMeta.location,
          profile_photo_url: rawMeta.profile_photo_url,
        };
         nestedProfileObject = {
          id: sessionUser.id,
          email: sessionUser.email,
          ...profileDataForUserObject,
          is_artist: determinedIsArtist,
        };
      }
      
      fullUser = {
        ...fullUser,
        ...profileDataForUserObject,
        is_artist: determinedIsArtist,
        profile: nestedProfileObject
      };

      if (fullUser.profile && typeof fullUser.profile.is_artist !== 'boolean') {
        fullUser.profile.is_artist = determinedIsArtist;
      }
      
      if (fullUser.username === undefined && rawMeta.username) fullUser.username = rawMeta.username;
      if (fullUser.name === undefined && rawMeta.name) fullUser.name = rawMeta.name;
      
      setProfileLoading(false);
      return fullUser;

    } catch (error) {
        console.error("Generic error in fetchFullUserProfile:", error);
        setProfileLoading(false);
        return { ...sessionUser, is_artist: false, profile: null }; 
    }
  }, []);
  
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return;
    setProfileLoading(true);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    setProfileLoading(false);
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error refetching profile:', profileError);
    } else if (profile) {
      setUser(currentUser => {
        if (!currentUser) return null;
        
        let determinedIsArtist = currentUser.is_artist;
        const rawMeta = currentUser.user_metadata || currentUser.raw_user_meta_data || {};

        if (typeof profile.is_artist === 'boolean') {
            determinedIsArtist = profile.is_artist;
        } else if (typeof rawMeta.is_artist === 'boolean') {
            determinedIsArtist = rawMeta.is_artist;
        }

        const updatedUser = {
          ...currentUser, 
          ...profile,    
          is_artist: determinedIsArtist,
          profile: {
            ...profile,
            is_artist: determinedIsArtist
          }
        };
        return updatedUser;
      });
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const fullUser = await fetchFullUserProfile(session?.user);
      setUser(fullUser);
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        const fullUser = await fetchFullUserProfile(session?.user);
        setUser(fullUser);
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchFullUserProfile]);

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    let fetchedUser = null;
    if (!error && data.user) {
      fetchedUser = await fetchFullUserProfile(data.user);
      setUser(fetchedUser);
    }
    setLoading(false);
    return { data: { user: fetchedUser }, error };
  };

  const signup = async (email, password, metadata) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, 
      },
    });
  
    let fetchedUser = null;
    if (!error && data.user) {
      // The on_auth_user_created trigger handles profile creation.
      // We need to ensure fetchFullUserProfile can get the profile.
      // It might take a moment for the trigger to complete.
      // Instead of setTimeout, we can retry fetching the profile or wait for a signal.
      // For now, fetchFullUserProfile is designed to handle cases where profile might be initially missing.
      fetchedUser = await fetchFullUserProfile(data.user);
      // If profile is still null after initial fetch, try one more time after a short delay
      if (fetchedUser && !fetchedUser.profile) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Shorter delay
        fetchedUser = await fetchFullUserProfile(data.user);
      }
      setUser(fetchedUser);
    }
    setLoading(false);
    return { data: {user: fetchedUser}, error };
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null); 
    setLoading(false);
    setProfileLoading(false); 
  };

  const updateUserContextProfile = (updatedProfileData) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      
      let determinedIsArtist = currentUser.is_artist;
      const rawMeta = currentUser.user_metadata || currentUser.raw_user_meta_data || {};
      
      if (typeof updatedProfileData.is_artist === 'boolean') {
          determinedIsArtist = updatedProfileData.is_artist;
      } else if (typeof rawMeta.is_artist === 'boolean') {
          determinedIsArtist = rawMeta.is_artist;
      }

      const newUserData = {
        ...currentUser, 
        ...updatedProfileData, 
        is_artist: determinedIsArtist,
        profile: { 
          ...(currentUser.profile || {}), 
          ...updatedProfileData, 
          is_artist: determinedIsArtist,
        },
      };
      return newUserData;
    });
  };

  const updateUserDatabase = async (updatedData) => {
    if (!user || !user.id) return { data: null, error: new Error("User not loaded or ID missing") };
    
    const profileDataToUpdate = { ...updatedData };
    const fieldsToRemove = ['id', 'email', 'created_at', 'aud', 'role', 'app_metadata', 'user_metadata', 'identities', 'factors', 'is_anonymous', 'phone', 'last_sign_in_at', 'email_confirmed_at', 'confirmed_at', 'updated_at', 'profile', 'raw_user_meta_data', 'raw_app_meta_data'];
    fieldsToRemove.forEach(field => delete profileDataToUpdate[field]);
    
    profileDataToUpdate.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(profileDataToUpdate)
      .eq('id', user.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user profile in DB:', error);
    } else if (data) {
      updateUserContextProfile(data); 
    }
    return { data, error };
  };

  const deleteAccount = async () => {
    if (!user) throw new Error("User not authenticated.");
    
    // The 'delete-user-account' function is invoked without passing userId in body
    // as it extracts userId from the JWT token inside the function.
    const { data, error } = await supabase.functions.invoke('delete-user-account');

    if (error) {
      throw error;
    }
    
    await logout(); 
    return data;
  };

  const value = {
    user,
    loading, 
    profileLoading, 
    login,
    signup,
    logout,
    updateUser: updateUserDatabase, 
    fetchUserProfile, 
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};