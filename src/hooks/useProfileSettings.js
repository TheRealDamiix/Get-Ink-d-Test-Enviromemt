import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useProfileSettings = () => {
  const { user, updateUser: updateUserContextAndDB, loading: authLoading, profileLoading: contextProfileLoading } = useAuth();
  const { toast } = useToast();

  const initialFormData = {
    name: '', username: '', bio: '', location: '', styles: [], currentStyle: '',
    bookingStatus: true, bookedUntil: '', bookingLink: '', profilePhotoUrl: '',
    currentLatitude: null, currentLongitude: null, studio_name: '', locationThumbnailUrl: '',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [locationThumbnailFile, setLocationThumbnailFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const resetForm = useCallback(() => {
    if (user) {
      const profileSource = user.profile || user;
      setFormData({
        name: profileSource.name || '',
        username: profileSource.username || '',
        bio: profileSource.bio || '',
        location: profileSource.location || '',
        styles: profileSource.styles || [],
        currentStyle: '',
        bookingStatus: profileSource.booking_status ?? true,
        bookedUntil: profileSource.booked_until || '',
        bookingLink: profileSource.booking_link || '',
        profilePhotoUrl: profileSource.profile_photo_url || '',
        currentLatitude: profileSource.latitude || null,
        currentLongitude: profileSource.longitude || null,
        studio_name: profileSource.studio_name || '',
        locationThumbnailUrl: profileSource.location_thumbnail_url || '',
      });
    }
    setProfilePhotoFile(null);
    setLocationThumbnailFile(null);
  }, [user]);

  useEffect(() => {
    if (user) resetForm();
  }, [user, resetForm]);
  
  // ***** FIX: Created specific handlers to be returned from the hook *****
  const handleProfilePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large", description: "Image must be less than 5MB.", variant: "destructive" }); return; }
      setProfilePhotoFile(file);
      setFormData(prev => ({ ...prev, profilePhotoUrl: URL.createObjectURL(file) }));
    }
  };

  const handleLocationThumbnailChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { toast({ title: "Image too large", description: "Image must be less than 5MB.", variant: "destructive" }); return; }
      setLocationThumbnailFile(file);
      setFormData(prev => ({ ...prev, locationThumbnailUrl: URL.createObjectURL(file) }));
    }
  };

  // ... (uploadImageToCloudinary and other functions remain the same) ...
  const uploadImageToCloudinary = async (file, folderName, publicIdNamePrefix = 'image') => {
    if (!file || !user) return null;
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      if (folderName) uploadFormData.append('folder', folderName);
      if (publicIdNamePrefix) uploadFormData.append('public_id_name', `${publicIdNamePrefix}_${user.id}_${Date.now()}`);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', { body: uploadFormData, });
      if (uploadError || uploadData.error || !uploadData.secure_url) throw new Error(uploadError?.message || uploadData?.error || `Failed to upload ${folderName} image.`);
      return { url: uploadData.secure_url, publicId: uploadData.public_id };
    } catch (error) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      return null;
    } finally { setIsUploading(false); }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    let finalPhotoUrl = formData.profilePhotoUrl;
    let finalLocationThumbnailUrl = formData.locationThumbnailUrl;

    if (profilePhotoFile) {
        const uploaded = await uploadImageToCloudinary(profilePhotoFile, 'profile_photos', 'profile');
        if (uploaded) finalPhotoUrl = uploaded.url; else { setIsSaving(false); return; }
    }
    if (locationThumbnailFile) {
        const uploaded = await uploadImageToCloudinary(locationThumbnailFile, 'location_thumbnails', 'location_thumb');
        if (uploaded) finalLocationThumbnailUrl = uploaded.url; else { setIsSaving(false); return; }
    }

    const updates = { ...formData, profilePhotoUrl: finalPhotoUrl, locationThumbnailUrl: finalLocationThumbnailUrl };
    delete updates.currentStyle; // Don't save this temporary field

    try {
        const { error } = await updateUserContextAndDB(updates);
        if (error) throw error;
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
        toast({ title: "Update Error", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return {
    formData, setFormData,
    handleProfilePhotoChange, handleLocationThumbnailChange, // Return specific handlers
    handleProfileUpdate, resetForm,
    isUploading, isSaving, isGeocoding,
    isLoading: authLoading || contextProfileLoading,
    user,
    displayIsArtist: user?.profile?.is_artist ?? false,
  };
};
