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
        bookedUntil: profileSource.booked_until ? new Date(profileSource.booked_until).toISOString().split('T')[0] : '',
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

  const uploadImageToCloudinary = async (file, folderName) => {
    if (!file || !user) return null;
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', folderName);
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', { body: uploadFormData });
      if (uploadError || uploadData.error) throw new Error(uploadError?.message || uploadData?.error || `Failed to upload ${folderName} image.`);
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

    try {
        if (profilePhotoFile) {
            const uploaded = await uploadImageToCloudinary(profilePhotoFile, 'profile_photos');
            if (uploaded) finalPhotoUrl = uploaded.url; else throw new Error("Profile photo upload failed.");
        }
        if (locationThumbnailFile) {
            const uploaded = await uploadImageToCloudinary(locationThumbnailFile, 'location_thumbnails');
            if (uploaded) finalLocationThumbnailUrl = uploaded.url; else throw new Error("Location thumbnail upload failed.");
        }

        // ***** FIX: Manually map state keys (camelCase) to DB columns (snake_case) *****
        const updates = {
            name: formData.name,
            username: formData.username,
            bio: formData.bio,
            location: formData.location,
            studio_name: formData.studio_name,
            styles: formData.styles,
            booking_status: formData.bookingStatus,
            booked_until: formData.bookingStatus ? null : (formData.bookedUntil || null),
            booking_link: formData.bookingLink,
            profile_photo_url: finalPhotoUrl,
            location_thumbnail_url: finalLocationThumbnailUrl,
            last_active: new Date().toISOString(),
        };

        const { error } = await updateUserContextAndDB(updates);
        if (error) throw error;
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
        toast({ title: "Update Error", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
        setProfilePhotoFile(null);
        setLocationThumbnailFile(null);
    }
  };

  return {
    formData, setFormData,
    handleProfilePhotoChange, handleLocationThumbnailChange,
    handleProfileUpdate, resetForm,
    isUploading, isSaving, isGeocoding,
    isLoading: authLoading || contextProfileLoading,
    user,
    displayIsArtist: user?.profile?.is_artist ?? false,
  };
};
