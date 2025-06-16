import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import ProfileForm from '@/components/dashboard/profile_settings/ProfileForm';
import ConventionDatesManager from '@/components/dashboard/profile_settings/ConventionDatesManager';
import UserPostsManager from '@/components/dashboard/profile_settings/ArtistPostsManager';
import ArtistDealsManager from '@/components/dashboard/profile_settings/ArtistDealsManager'; // Added import

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
    studio_name: '',
    locationThumbnailUrl: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [locationThumbnailFile, setLocationThumbnailFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = useCallback(() => {
    const profileSource = user?.profile || user || {};
    setFormData({
      name: profileSource.name || '',
      username: profileSource.username || '',
      bio: profileSource.bio || '',
      location: profileSource.location || '',
      styles: profileSource.styles || [],
      currentStyle: '',
      bookingStatus: profileSource.booking_status === null ? true : profileSource.booking_status,
      bookedUntil: profileSource.booked_until || '',
      bookingLink: profileSource.booking_link || '',
      profilePhotoUrl: profileSource.profile_photo_url || '',
      currentLatitude: profileSource.latitude || null,
      currentLongitude: profileSource.longitude || null,
      studio_name: profileSource.studio_name || '',
      locationThumbnailUrl: profileSource.location_thumbnail_url || '',
    });
    setProfilePhotoFile(null);
    setLocationThumbnailFile(null);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !contextProfileLoading) {
      resetForm();
    }
  }, [user, authLoading, contextProfileLoading, resetForm]);

  const handleFileChange = (e, setFile, setUrlPreviewField) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image too large", description: "Image must be less than 5MB.", variant: "destructive" });
        return;
      }
      setFile(file);
      setFormData(prev => ({ ...prev, [setUrlPreviewField]: URL.createObjectURL(file) }));
    }
  };

  const uploadImageToCloudinaryFormData = async (file, folderName, fileNamePrefix = 'image') => {
    if (!file || !user) return null;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${fileNamePrefix}_${user.id}_${Date.now()}.${fileExt}`;
      
      const formDataForUpload = new FormData();
      formDataForUpload.append('file', file);
      formDataForUpload.append('fileName', fileName);
      formDataForUpload.append('folder', folderName);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formDataForUpload,
      });

      if (uploadError || !uploadData || !uploadData.secure_url) {
        let errorMessage = `Failed to upload ${folderName} image.`;
        if (uploadError?.message) errorMessage = uploadError.message;
        else if (uploadData?.error) errorMessage = uploadData.error;
        throw new Error(errorMessage);
      }
      return { url: uploadData.secure_url, publicId: uploadData.public_id };
    } catch (error) {
      console.error(`Error uploading ${folderName} image:`, error);
      toast({ title: "Upload Error", description: `Failed to upload ${folderName} image. ${error.message}`, variant: "destructive" });
      return null;
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
    let finalPhotoPublicId = user.profile?.profile_photo_public_id || null; 
    if (profilePhotoFile) {
      const uploaded = await uploadImageToCloudinaryFormData(profilePhotoFile, 'profile_photos', 'profile');
      if (uploaded) {
        finalPhotoUrl = uploaded.url;
        finalPhotoPublicId = uploaded.publicId;
        if (user.profile?.profile_photo_public_id && user.profile.profile_photo_public_id !== finalPhotoPublicId) {
          await supabase.functions.invoke('delete-from-cloudinary', { body: { publicId: user.profile.profile_photo_public_id } });
        }
      }
    }

    let finalLocationThumbnailUrl = formData.locationThumbnailUrl;
    let finalLocationThumbnailPublicId = user.profile?.location_thumbnail_public_id || null;
    if (locationThumbnailFile) {
      const uploaded = await uploadImageToCloudinaryFormData(locationThumbnailFile, 'location_thumbnails', 'location_thumb');
      if (uploaded) {
        finalLocationThumbnailUrl = uploaded.url;
        finalLocationThumbnailPublicId = uploaded.publicId;
        if (user.profile?.location_thumbnail_public_id && user.profile.location_thumbnail_public_id !== finalLocationThumbnailPublicId) {
           await supabase.functions.invoke('delete-from-cloudinary', { body: { publicId: user.profile.location_thumbnail_public_id } });
        }
      }
    } else if (!formData.locationThumbnailUrl && user.profile?.location_thumbnail_public_id) {
      await supabase.functions.invoke('delete-from-cloudinary', { body: { publicId: user.profile.location_thumbnail_public_id } });
      finalLocationThumbnailUrl = null;
      finalLocationThumbnailPublicId = null;
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
      profile_photo_public_id: finalPhotoPublicId,
      location_thumbnail_url: finalLocationThumbnailUrl,
      location_thumbnail_public_id: finalLocationThumbnailPublicId,
      latitude: lat,
      longitude: lon,
      studio_name: formData.studio_name.trim() || null,
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
      setLocationThumbnailFile(null);
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
        handleProfilePhotoChange={(e) => handleFileChange(e, setProfilePhotoFile, 'profilePhotoUrl')}
        handleLocationThumbnailChange={(e) => handleFileChange(e, setLocationThumbnailFile, 'locationThumbnailUrl')}
        isUploading={isUploading}
        isSaving={isSaving}
        handleProfileUpdate={handleProfileUpdate}
        resetForm={resetForm}
        displayIsArtist={displayIsArtist}
        user={user}
      />

      {displayIsArtist && <ArtistDealsManager user={user} />}
      {displayIsArtist && <ConventionDatesManager user={user} />}
      <UserPostsManager user={user} /> {/* General posts for all users */}
    </motion.div>
  );
};

export default ProfileSettings;