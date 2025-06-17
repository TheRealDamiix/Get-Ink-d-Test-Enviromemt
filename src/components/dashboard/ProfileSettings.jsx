
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import ProfileForm from '@/components/dashboard/profile_settings/ProfileForm';
import ConventionDatesManager from '@/components/dashboard/profile_settings/ConventionDatesManager';
import UserPostsManager from '@/components/dashboard/profile_settings/ArtistPostsManager';
import ArtistDealsManager from '@/components/dashboard/profile_settings/ArtistDealsManager';
import { useProfileSettings } from '@/hooks/useProfileSettings';

const ProfileSettings = () => {
  const {
    formData,
    setFormData,
    handleFileChange,
    handleProfileUpdate,
    resetForm,
    isUploading,
    isSaving,
    isGeocoding,
    isLoading,
    user,
    displayIsArtist,
  } = useProfileSettings();

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <ProfileForm
        formData={formData}
        setFormData={setFormData}
        handleProfilePhotoChange={(e) => handleFileChange(e, 'setProfilePhotoFile', 'profilePhotoUrl')}
        handleLocationThumbnailChange={(e) => handleFileChange(e, 'setLocationThumbnailFile', 'locationThumbnailUrl')}
        isUploading={isUploading}
        isSaving={isSaving}
        isGeocoding={isGeocoding}
        handleProfileUpdate={handleProfileUpdate}
        resetForm={resetForm}
        displayIsArtist={displayIsArtist}
        user={user}
      />

      {displayIsArtist && <ArtistDealsManager user={user} />}
      {displayIsArtist && <ConventionDatesManager user={user} />}
      <UserPostsManager user={user} />
    </motion.div>
  );
};

export default ProfileSettings;