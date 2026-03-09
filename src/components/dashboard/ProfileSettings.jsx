import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import ProfileForm from '@/components/dashboard/profile_settings/ProfileForm';
import ConventionDatesManager from '@/components/dashboard/profile_settings/ConventionDatesManager';
import UserPostsManager from '@/components/dashboard/profile_settings/ArtistPostsManager';
import ArtistDealsManager from '@/components/dashboard/profile_settings/ArtistDealsManager';
import AvailabilityManager from '@/components/dashboard/profile_settings/AvailabilityManager';
import { useProfileSettings } from '@/hooks/useProfileSettings';

const ProfileSettings = () => {
  const {
    formData, setFormData,
    // ***** FIX: Use the specific handlers from the hook *****
    handleProfilePhotoChange,
    handleLocationThumbnailChange,
    handleProfileUpdate, resetForm,
    isUploading, isSaving, isGeocoding, isLoading,
    user, displayIsArtist,
  } = useProfileSettings();

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user) {
    return <div className="flex justify-center items-center h-64"><p className="text-muted-foreground">Could not load user data.</p></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <ProfileForm
        formData={formData} setFormData={setFormData}
        handleProfilePhotoChange={handleProfilePhotoChange}
        handleLocationThumbnailChange={handleLocationThumbnailChange}
        isUploading={isUploading} isSaving={isSaving} isGeocoding={isGeocoding}
        handleProfileUpdate={handleProfileUpdate}
        resetForm={resetForm}
        displayIsArtist={displayIsArtist} user={user}
      />
      {displayIsArtist && <AvailabilityManager />}
      {displayIsArtist && <ArtistDealsManager user={user} />}
      {displayIsArtist && <ConventionDatesManager user={user} />}
      <UserPostsManager user={user} />
    </motion.div>
  );
};

export default ProfileSettings;
