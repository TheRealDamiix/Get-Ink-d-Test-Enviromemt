import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast'; // Corrected import


const ProfileSettings = ({ user, updateUser, toast }) => {
  const [profile, setProfile] = useState({
    name: user.name || '',
    bio: user.bio || '',
    location: user.location || '',
    styles: user.styles || [],
    booking_status: user.booking_status || false, // Use snake_case
    booked_until: user.booked_until || '',       // Use snake_case
    booking_link: user.booking_link || ''         // Use snake_case
  });
  const [newStyle, setNewStyle] = useState('');

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    // Ensure data sent to updateUser matches Supabase schema (snake_case)
    const updatedData = { 
      name: profile.name,
      bio: profile.bio,
      location: profile.location,
      styles: profile.styles,
      booking_status: profile.booking_status,
      booked_until: profile.booked_until,
      booking_link: profile.booking_link,
      last_active: new Date().toISOString() // Ensure last_active is updated
    };
    updateUser(updatedData);
    toast({ title: "Profile updated!", description: "Your profile has been successfully updated." });
  };

  const handleAddStyle = () => {
    if (newStyle.trim() && !profile.styles.includes(newStyle.trim())) {
      setProfile(prev => ({ ...prev, styles: [...prev.styles, newStyle.trim()] }));
      setNewStyle('');
    }
  };

  const handleRemoveStyle = (styleToRemove) => {
    setProfile(prev => ({ ...prev, styles: prev.styles.filter(style => style !== styleToRemove) }));
  };

  return (
    <div className="glass-effect rounded-2xl p-8 mb-8">
      <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
      <form onSubmit={handleProfileUpdate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Your full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="City, State" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Tell clients about yourself and your style..." rows={4} />
        </div>
        <div className="space-y-4">
          <Label>Tattoo Styles</Label>
          <div className="flex gap-2">
            <Input value={newStyle} onChange={(e) => setNewStyle(e.target.value)} placeholder="Add a style (e.g., Traditional, Realism)" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStyle())} />
            <Button type="button" onClick={handleAddStyle} variant="outline"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.styles.map((style, idx) => (
              <span key={idx} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-2">
                {style}
                <button type="button" onClick={() => handleRemoveStyle(style)} className="text-primary hover:text-primary/70">×</button>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="booking-status" checked={profile.booking_status} onCheckedChange={(checked) => setProfile({ ...profile, booking_status: checked })} />
            <Label htmlFor="booking-status">Currently accepting bookings</Label>
          </div>
          {profile.booking_status && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
              <div className="space-y-2">
                <Label htmlFor="booked-until">Booked Until (Optional)</Label>
                <Input id="booked-until" type="date" value={profile.booked_until} onChange={(e) => setProfile({ ...profile, booked_until: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-link">Booking Link</Label>
                <Input id="booking-link" value={profile.booking_link} onChange={(e) => setProfile({ ...profile, booking_link: e.target.value })} placeholder="https://your-booking-site.com" />
              </div>
            </div>
          )}
        </div>
        <Button type="submit" className="ink-gradient">Update Profile</Button>
      </form>
    </div>
  );
};

export default ProfileSettings;
