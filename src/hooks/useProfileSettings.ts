import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { ProfileFormData } from '@/types';

export interface UseProfileSettingsReturn {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLocationThumbnailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProfileUpdate: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  isUploading: boolean;
  isSaving: boolean;
  isGeocoding: boolean;
  isLoading: boolean;
  user: ReturnType<typeof useAuth>['user'];
  displayIsArtist: boolean;
}

const initialFormData: ProfileFormData = {
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

export const useProfileSettings = (): UseProfileSettingsReturn => {
  const {
    user,
    updateUser: updateUserContextAndDB,
    loading: authLoading,
    profileLoading: contextProfileLoading,
  } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [locationThumbnailFile, setLocationThumbnailFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding] = useState(false);

  const buildFormDataFromUser = useCallback(
    (currentUser: typeof user): ProfileFormData | null => {
      if (!currentUser) return null;
      const profileSource =
        (currentUser as { profile?: Record<string, unknown> }).profile ?? currentUser;
      const p = profileSource as Record<string, unknown>;
      return {
        name: (p.name as string) || '',
        username: (p.username as string) || '',
        bio: (p.bio as string) || '',
        location: (p.location as string) || '',
        styles: (p.styles as string[]) || [],
        currentStyle: '',
        bookingStatus: (p.booking_status as boolean) ?? true,
        bookedUntil: p.booked_until
          ? new Date(p.booked_until as string).toISOString().split('T')[0]
          : '',
        bookingLink: (p.booking_link as string) || '',
        profilePhotoUrl: (p.profile_photo_url as string) || '',
        currentLatitude: (p.latitude as number) || null,
        currentLongitude: (p.longitude as number) || null,
        studio_name: (p.studio_name as string) || '',
        locationThumbnailUrl: (p.location_thumbnail_url as string) || '',
      };
    },
    []
  );

  const resetForm = useCallback(() => {
    const data = buildFormDataFromUser(user);
    if (data) setFormData(data);
    setProfilePhotoFile(null);
    setLocationThumbnailFile(null);
  }, [user, buildFormDataFromUser]);

  // Only reset the form when the user ID changes (login/logout), not on every profile update.
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const newId = user?.id ?? null;
    if (newId !== prevUserIdRef.current) {
      prevUserIdRef.current = newId;
      if (user) {
        const data = buildFormDataFromUser(user);
        if (data) setFormData(data);
        setProfilePhotoFile(null);
        setLocationThumbnailFile(null);
      }
    }
  }, [user, buildFormDataFromUser]);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toastRef.current({
          title: 'Image too large',
          description: 'Image must be less than 5MB.',
          variant: 'destructive',
        });
        return;
      }
      setProfilePhotoFile(file);
      setFormData(prev => ({ ...prev, profilePhotoUrl: URL.createObjectURL(file) }));
    }
  };

  const handleLocationThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toastRef.current({
          title: 'Image too large',
          description: 'Image must be less than 5MB.',
          variant: 'destructive',
        });
        return;
      }
      setLocationThumbnailFile(file);
      setFormData(prev => ({ ...prev, locationThumbnailUrl: URL.createObjectURL(file) }));
    }
  };

  const uploadImageToCloudinary = async (
    file: File,
    folderName: string
  ): Promise<{ url: string; publicId: string } | null> => {
    if (!file || !user) return null;
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', folderName);
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'upload-to-cloudinary',
        { body: uploadFormData }
      );
      if (uploadError || (uploadData as { error?: string })?.error) {
        throw new Error(
          uploadError?.message ||
            (uploadData as { error?: string })?.error ||
            `Failed to upload ${folderName} image.`
        );
      }
      const result = uploadData as { secure_url: string; public_id: string };
      return { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      toastRef.current({
        title: 'Upload Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    let finalPhotoUrl = formData.profilePhotoUrl;
    let finalLocationThumbnailUrl = formData.locationThumbnailUrl;

    try {
      if (profilePhotoFile) {
        const uploaded = await uploadImageToCloudinary(profilePhotoFile, 'profile_photos');
        if (uploaded) finalPhotoUrl = uploaded.url;
        else throw new Error('Profile photo upload failed.');
      }
      if (locationThumbnailFile) {
        const uploaded = await uploadImageToCloudinary(
          locationThumbnailFile,
          'location_thumbnails'
        );
        if (uploaded) finalLocationThumbnailUrl = uploaded.url;
        else throw new Error('Location thumbnail upload failed.');
      }

      const updates = {
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        location: formData.location,
        studio_name: formData.studio_name,
        styles: formData.styles,
        booking_status: formData.bookingStatus,
        booked_until: formData.bookingStatus ? null : formData.bookedUntil || null,
        booking_link: formData.bookingLink,
        profile_photo_url: finalPhotoUrl,
        location_thumbnail_url: finalLocationThumbnailUrl,
        last_active: new Date().toISOString(),
      };

      const { error } = await updateUserContextAndDB(updates);
      if (error) throw error;
      toastRef.current({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      toastRef.current({
        title: 'Update Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setProfilePhotoFile(null);
      setLocationThumbnailFile(null);
    }
  };

  const userRecord = user as (typeof user & { profile?: { is_artist?: boolean }; is_artist?: boolean }) | null;

  return {
    formData,
    setFormData,
    handleProfilePhotoChange,
    handleLocationThumbnailChange,
    handleProfileUpdate,
    resetForm,
    isUploading,
    isSaving,
    isGeocoding,
    isLoading: authLoading || contextProfileLoading,
    user,
    displayIsArtist: userRecord?.profile?.is_artist ?? userRecord?.is_artist ?? false,
  };
};
