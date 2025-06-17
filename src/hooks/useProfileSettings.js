import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useProfileSettings = () => {
  const { user, updateUser: updateUserContextAndDB, loading: authLoading, profileLoading: contextProfileLoading } = useAuth();
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
  const [isGeocoding, setIsGeocoding] = useState(false);

  const resetForm = useCallback(() => {
    const profileSource = user?.profile || user || {};
    setFormData({
      name: profileSource.name || '',
      username: profileSource.username || '',
      bio: profileSource.bio || '',
      location: profileSource.location || '',
      styles: profileSource.styles || [],
      currentStyle: '',
      bookingStatus: profileSource.booking_status === null || profileSource.booking_status === undefined ? true : profileSource.booking_status,
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
    if (!authLoading && !contextProfileLoading && user) {
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

  const uploadImageToCloudinary = async (file, folderName, publicIdNamePrefix = 'image') => {
    if (!file || !user) return null;
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      if (folderName) uploadFormData.append('folder', folderName);
      if (publicIdNamePrefix) uploadFormData.append('public_id_name', `${publicIdNamePrefix}_${user.id}_${Date.now()}`);


      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: uploadFormData,
      });
      
      if (uploadError || uploadData.error || !uploadData.secure_url) {
        const errorMessage = uploadError?.message || uploadData?.error || `Failed to upload ${folderName} image.`;
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

  const deleteImageFromCloudinary = async (publicId) => {
    if (!publicId) return;
    try {
        await supabase.functions.invoke('delete-from-cloudinary', { 
            body: { public_ids: [publicId] } 
        });
    } catch (error) {
        console.warn(`Could not delete old image ${publicId} from Cloudinary:`, error.message);
        // Optionally toast a warning, but usually silent is fine for background cleanup
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
      const uploaded = await uploadImageToCloudinary(profilePhotoFile, 'profile_photos', 'profile');
      if (uploaded) {
        finalPhotoUrl = uploaded.url;
        finalPhotoPublicId = uploaded.publicId;
        if (user.profile?.profile_photo_public_id && user.profile.profile_photo_public_id !== finalPhotoPublicId) {
          await deleteImageFromCloudinary(user.profile.profile_photo_public_id);
        }
      } else { // Upload failed
        setIsSaving(false); return;
      }
    }

    let finalLocationThumbnailUrl = formData.locationThumbnailUrl;
    let finalLocationThumbnailPublicId = user.profile?.location_thumbnail_public_id || null;
    if (locationThumbnailFile) {
      const uploaded = await uploadImageToCloudinary(locationThumbnailFile, 'location_thumbnails', 'location_thumb');
      if (uploaded) {
        finalLocationThumbnailUrl = uploaded.url;
        finalLocationThumbnailPublicId = uploaded.publicId;
        if (user.profile?.location_thumbnail_public_id && user.profile.location_thumbnail_public_id !== finalLocationThumbnailPublicId) {
          await deleteImageFromCloudinary(user.profile.location_thumbnail_public_id);
        }
      } else { // Upload failed
        setIsSaving(false); return;
      }
    } else if (!formData.locationThumbnailUrl && user.profile?.location_thumbnail_public_id) { // User removed existing thumbnail
      await deleteImageFromCloudinary(user.profile.location_thumbnail_public_id);
      finalLocationThumbnailUrl = null;
      finalLocationThumbnailPublicId = null;
    }

    let lat = formData.currentLatitude;
    let lon = formData.currentLongitude;
    const previousLocation = user.profile?.location || '';

    if (formData.location && formData.location.trim() !== previousLocation.trim()) {
      setIsGeocoding(true);
      try {
        toast({ title: "Geocoding Location", description: "Finding coordinates for your new location...", duration: 2000 });
        const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode-address', {
          body: JSON.stringify({ address: formData.location.trim() }),
        });

        if (geoData && !geoError && geoData.latitude && geoData.longitude) {
          lat = geoData.latitude;
          lon = geoData.longitude;
          toast({ title: "Location Geocoded", description: `Coordinates found: ${geoData.displayName.substring(0,40)}...`, variant: "default" });
        } else {
           const errorMsg = geoError?.message || geoData?.error || "Could not find precise coordinates.";
           console.warn('Geocoding issue:', errorMsg);
           toast({ title: "Geocoding Update", description: errorMsg.includes("not found") ? "Location text saved. Coordinates not found." : `Geocoding: ${errorMsg}`, variant: "default", duration: 4000 });
           lat = null; 
           lon = null;
        }
      } catch (err) {
        console.error('Error calling geocode-address function:', err);
        toast({ title: "Geocoding Error", description: "Error finding coordinates. Location text saved.", variant: "destructive", duration: 4000 });
        lat = null; lon = null; 
      } finally {
        setIsGeocoding(false);
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
      const { error } = await updateUserContextAndDB(updates);
      if (error) throw error;
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
      console.error('Error updating profile:', error);
      let description = "Failed to update profile. Please try again.";
      if (error.message?.includes('profiles_username_key')) {
        description = "Username already taken. Please choose another one.";
      } else if (error.message) {
        description = error.message;
      }
      toast({ title: "Update Error", description, variant: "destructive" });
    } finally {
      setIsSaving(false);
      setProfilePhotoFile(null);
      setLocationThumbnailFile(null);
    }
  };

  const isLoadingOverall = authLoading || contextProfileLoading;

  return {
    formData,
    setFormData,
    profilePhotoFile,
    locationThumbnailFile,
    handleFileChange,
    handleProfileUpdate,
    resetForm,
    isUploading,
    isSaving,
    isGeocoding,
    isLoading: isLoadingOverall,
    user,
    displayIsArtist: user?.is_artist ?? user?.profile?.is_artist ?? false,
  };
};