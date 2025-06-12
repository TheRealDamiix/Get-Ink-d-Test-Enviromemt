
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Heart, MapPin, Star, Clock, Settings, User } from 'lucide-react';

const ClientDashboard = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    location: ''
  });
  
  const [followedArtists, setFollowedArtists] = useState([]);

  useEffect(() => {
    if (!user || user.isArtist) {
      navigate('/');
      return;
    }

    setProfile({
      name: user.name || '',
      email: user.email || '',
      location: user.location || ''
    });

    // Load followed artists
    const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
    const artists = users.filter(u => u.isArtist && u.followers?.includes(user.id));
    setFollowedArtists(artists);
  }, [user, navigate]);

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    
    const updatedUser = {
      ...user,
      ...profile
    };
    
    updateUser(updatedUser);
    
    toast({
      title: "Profile updated!",
      description: "Your profile has been successfully updated."
    });
  };

  const handleUnfollow = (artistId) => {
    const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
    const artistIndex = users.findIndex(u => u.id === artistId);
    
    if (artistIndex !== -1) {
      users[artistIndex].followers = users[artistIndex].followers.filter(id => id !== user.id);
      localStorage.setItem('inklink_users', JSON.stringify(users));
      
      setFollowedArtists(followedArtists.filter(artist => artist.id !== artistId));
      
      toast({
        title: "Unfollowed",
        description: "You're no longer following this artist."
      });
    }
  };

  const getActivityStatus = (lastActive) => {
    if (!lastActive) return null;
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now - lastActiveDate) / (1000 * 60 * 60);
    
    if (diffHours < 48) return { text: 'Just Updated', color: 'text-green-400' };
    if (diffHours < 168) return { text: 'Recently Active', color: 'text-yellow-400' };
    return null;
  };

  if (!user || user.isArtist) {
    return null;
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold ink-text-gradient mb-6">Client Dashboard</h1>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{followedArtists.length}</p>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
              </div>
            </div>
            <div className="glass-effect rounded-xl p-6">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Reviews Written</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-effect rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Account Settings</h2>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  placeholder="Your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={profile.location}
                onChange={(e) => setProfile({...profile, location: e.target.value})}
                placeholder="City, State"
              />
            </div>

            <Button type="submit" className="ink-gradient">
              Update Profile
            </Button>
          </form>
        </motion.div>

        {/* Followed Artists */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect rounded-2xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Following ({followedArtists.length})</h2>
          </div>

          {followedArtists.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No artists followed yet</h3>
              <p className="text-muted-foreground mb-6">
                Discover and follow your favorite tattoo artists to stay updated with their latest work
              </p>
              <Button asChild className="ink-gradient">
                <Link to="/">Discover Artists</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {followedArtists.map((artist) => {
                const activityStatus = getActivityStatus(artist.lastActive);
                return (
                  <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Link to={`/artist/${artist.username}`} className="flex items-center space-x-3 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={artist.profilePhoto} alt={artist.name} />
                          <AvatarFallback className="ink-gradient text-white">
                            {artist.name?.charAt(0)?.toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold hover:text-primary transition-colors">
                            {artist.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">@{artist.username}</p>
                          {activityStatus && (
                            <div className={`flex items-center space-x-1 mt-1 ${activityStatus.color}`}>
                              <Clock className="w-3 h-3" />
                              <span className="text-xs font-medium">{activityStatus.text}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnfollow(artist.id)}
                      >
                        Unfollow
                      </Button>
                    </div>

                    {artist.location && (
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{artist.location}</span>
                      </div>
                    )}

                    {artist.styles && artist.styles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {artist.styles.slice(0, 3).map((style, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full"
                          >
                            {style}
                          </span>
                        ))}
                        {artist.styles.length > 3 && (
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                            +{artist.styles.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">4.8</span>
                      </div>
                      {artist.bookingStatus && (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                          Available
                        </span>
                      )}
                    </div>

                    {artist.portfolio && artist.portfolio.length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {artist.portfolio.slice(0, 3).map((image, idx) => (
                          <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                            <img
                              src={image.image}
                              alt={image.caption}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ClientDashboard;
