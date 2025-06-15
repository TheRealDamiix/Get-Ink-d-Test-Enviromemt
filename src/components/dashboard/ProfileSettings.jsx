import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import ProfileForm from '@/components/dashboard/profile_settings/ProfileForm';
import ConventionDatesManager from '@/components/dashboard/profile_settings/ConventionDatesManager';

const ProfileSettings = () => {
  const { user, updateUser, loading: authLoading, profileLoading: contextProfileLoading } = useAuth();
  const { toast } = useToast();

  const initialFormData = {
    name: '',
    username: '',
    bio: '',
    location: '',
    styles: [],
    currentStyle: '',
    bookingStatus: true,
    bookedUntil: '',
    bookingLink: '',
    profilePhotoUrl: '',
    currentLatitude: null,
    currentLongitude: null,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    if (user && user.profile) {
      setFormData({
        name: user.profile.name || user.name || '',
        username: user.profile.username || user.username || '',
        bio: user.profile.bio || '',
        location: user.profile.location || '',
        styles: user.profile.styles || [],
        currentStyle: '',
        bookingStatus: user.profile.booking_status === null ? true : user.profile.booking_status,
        bookedUntil: user.profile.booked_until || '',
        bookingLink: user.profile.booking_link || '',
        profilePhotoUrl: user.profile.profile_photo_url || user.profile_photo_url || '',
        currentLatitude: user.profile.latitude || null,
        currentLongitude: user.profile.longitude || null,
      });
    } else if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        bio: user.bio || '',
        location: user.location || '',
        styles: user.styles || [],
        currentStyle: '',
        bookingStatus: user.booking_status === null ? true : user.booking_status,
        bookedUntil: user.booked_until || '',
        bookingLink: user.booking_link || '',
        profilePhotoUrl: user.profile_photo_url || '',
        currentLatitude: user.latitude || null,
        currentLongitude: user.longitude || null,
      });
    } else {
      setFormData(initialFormData);
    }
    setProfilePhotoFile(null);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !contextProfileLoading) {
      resetForm();
    }
  }, [user, authLoading, contextProfileLoading, resetForm]);

  const handleProfilePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image too large", description: "Profile photo must be less than 5MB.", variant: "destructive" });
        return;
      }
      setProfilePhotoFile(file);
      setFormData(prev => ({ ...prev, profilePhotoUrl: URL.createObjectURL(file) }));
    }
  };

  const uploadProfilePhoto = async () => {
    if (!profilePhotoFile || !user) return formData.profilePhotoUrl;
    setIsUploading(true);
    try {
      const fileExt = profilePhotoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, profilePhotoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      toast({ title: "Upload Error", description: "Failed to upload profile photo. " + error.message, variant: "destructive" });
      return formData.profilePhotoUrl;
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Error", description: "User not loaded. Cannot update.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    let finalPhotoUrl = formData.profilePhotoUrl;
    if (profilePhotoFile) {
      finalPhotoUrl = await uploadProfilePhoto();
    }

    let lat = formData.currentLatitude;
    let lon = formData.currentLongitude;
    const previousLocation = user.profile?.location || user.location || '';

    if (formData.location && formData.location.trim() !== previousLocation.trim()) {
      try {
        toast({ title: "Geocoding Location", description: "Finding coordinates for your new location...", duration: 2000 });
        const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode-address', {
          body: { address: formData.location.trim() },
        });

        if (geoData && !geoError && geoData.latitude && geoData.longitude) {
          lat = geoData.latitude;
          lon = geoData.longitude;
          toast({ title: "Location Geocoded", description: `Coordinates found: ${geoData.displayName.substring(0,40)}...`, variant: "default" });
        } else {
          if (geoError && geoError.message && !geoError.message.includes("No results found")) {
            console.warn('Geocoding error:', geoError.message);
            toast({ title: "Geocoding Issue", description: "Could not find precise coordinates. Saving location text.", variant: "default", duration: 4000 });
          } else {
             toast({ title: "Geocoding Skipped", description: "Location text saved. Coordinates not found or search was too vague.", variant: "default", duration: 4000 });
          }
          lat = null; 
          lon = null;
        }
      } catch (err) {
        console.warn('Error calling geocode-address function:', err);
        toast({ title: "Geocoding Error", description: "Error finding coordinates. Saving location text.", variant: "destructive", duration: 4000 });
        lat = formData.currentLatitude;
        lon = formData.currentLongitude;
      }
    } else if (!formData.location || formData.location.trim() === '') {
      lat = null;
      lon = null;
    }

    const updates = {
      name: formData.name.trim(),
      username: formData.username.trim(),
      bio: formData.bio.trim(),
      location: formData.location.trim(),
      styles: formData.styles,
      booking_status: formData.bookingStatus,
      booked_until: formData.bookingStatus ? null : (formData.bookedUntil || null),
      booking_link: formData.bookingLink.trim() || null,
      profile_photo_url: finalPhotoUrl,
      latitude: lat,
      longitude: lon,
      last_active: new Date().toISOString(),
    };

    try {
      const { error } = await updateUser(updates);
      if (error) throw error;
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
      console.error('Error updating profile:', error);
      let description = "Failed to update profile. Please try again.";
      if (error.message?.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        description = "Username already taken. Please choose another one.";
      }
      toast({ title: "Update Error", description, variant: "destructive" });
    } finally {
      setIsSaving(false);
      setProfilePhotoFile(null);
    }
  };

  const isLoading = authLoading || contextProfileLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading profile settings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">Could not load user data. Please try refreshing.</p>
      </div>
    );
  }

  const displayIsArtist = user.is_artist ?? user.profile?.is_artist ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <ProfileForm
        formData={formData}
        setFormData={setFormData}
        handleProfilePhotoChange={handleProfilePhotoChange}
        isUploading={isUploading}
        isSaving={isSaving}
        handleProfileUpdate={handleProfileUpdate}
        resetForm={resetForm}
        displayIsArtist={displayIsArtist}
        user={user}
      />

      {displayIsArtist && <ConventionDatesManager user={user} />}
    </motion.div>
  );
};

export default ProfileSettings;