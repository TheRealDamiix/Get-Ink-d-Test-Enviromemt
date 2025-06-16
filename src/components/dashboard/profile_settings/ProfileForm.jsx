import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UploadCloud, RotateCcw, Loader2, Building, Image as ImageIcon } from 'lucide-react';
import ArtistSpecificFields from '@/components/dashboard/profile_settings/ArtistSpecificFields';

const ProfileForm = ({
  formData,
  setFormData,
  handleProfilePhotoChange,
  handleLocationThumbnailChange,
  isUploading,
  isSaving,
  handleProfileUpdate,
  resetForm,
  displayIsArtist,
  user
}) => {
  const { name, username, bio, location, profilePhotoUrl, currentLatitude, currentLongitude, studio_name, locationThumbnailUrl } = formData;

  const onInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleProfileUpdate} className="space-y-6 p-6 glass-effect rounded-xl">
      <h2 className="text-2xl font-semibold mb-6">Profile Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col items-center space-y-4">
          <Label>Profile Photo</Label>
          <Avatar className="w-32 h-32 border-4 border-primary/50 shadow-lg">
            <AvatarImage src={profilePhotoUrl} alt={name} />
            <AvatarFallback className="ink-gradient text-5xl text-primary-foreground">
              {name?.charAt(0)?.toUpperCase() || username?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <Input
            id="profilePhoto"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleProfilePhotoChange}
            className="hidden"
          />
          <Button type="button" variant="outline" onClick={() => document.getElementById('profilePhoto').click()} disabled={isUploading || isSaving}>
            <UploadCloud className="mr-2 h-4 w-4" /> {isUploading ? "Uploading..." : "Change Photo"}
          </Button>
          {isUploading && <Loader2 className="w-5 h-5 animate-spin" />}
        </div>

        {displayIsArtist && (
          <div className="flex flex-col items-center space-y-4">
            <Label>Location/Shop Thumbnail (Optional)</Label>
            <div className="w-32 h-32 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-background/50 overflow-hidden">
              {locationThumbnailUrl ? (
                <img-replace src={locationThumbnailUrl} alt="Location thumbnail" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <Input
              id="locationThumbnail"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleLocationThumbnailChange}
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={() => document.getElementById('locationThumbnail').click()} disabled={isUploading || isSaving}>
              <UploadCloud className="mr-2 h-4 w-4" /> {isUploading ? "Uploading..." : "Change Thumbnail"}
            </Button>
          </div>
        )}
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => onInputChange('name', e.target.value)} placeholder="Your full name" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={username} onChange={(e) => onInputChange('username', e.target.value)} placeholder="Your unique username" className="mt-1" />
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => onInputChange('bio', e.target.value)} placeholder="Tell us about yourself..." className="mt-1 min-h-[100px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" value={location} onChange={(e) => onInputChange('location', e.target.value)} placeholder="City, State or full address" className="mt-1" />
          {(currentLatitude && currentLongitude) && (
            <p className="text-xs text-muted-foreground mt-1">Current coordinates: {currentLatitude.toFixed(4)}, {currentLongitude.toFixed(4)}</p>
          )}
        </div>
        {displayIsArtist && (
          <div>
            <Label htmlFor="studio_name">Tattoo Shop / Studio Name (Optional)</Label>
            <div className="relative mt-1">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="studio_name" 
                value={studio_name || ''} 
                onChange={(e) => onInputChange('studio_name', e.target.value)} 
                placeholder="e.g., Ink Masters Studio" 
                className="pl-10"
              />
            </div>
          </div>
        )}
      </div>


      {displayIsArtist && (
        <ArtistSpecificFields
          formData={formData}
          setFormData={setFormData}
          user={user}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border/30">
        <Button type="submit" className="ink-gradient w-full sm:w-auto" disabled={isSaving || isUploading}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving || isUploading}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset Form
        </Button>
      </div>
    </form>
  );
};

export default ProfileForm;