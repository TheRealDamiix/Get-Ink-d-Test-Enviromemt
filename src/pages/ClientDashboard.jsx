import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Heart, Star, Clock, Settings, BookOpenCheck, Loader2, MessageSquare as MessageSquareText } from 'lucide-react';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import ClientBookingList from '@/components/bookings/ClientBookingList';
import UserReviewsDialog from '@/components/profile/UserReviewsDialog';
import { supabase } from '@/lib/supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ClientDashboard = () => {
  const { user, updateUser, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    location: ''
  });
  
  const [followedArtists, setFollowedArtists] = useState([]);
  const [reviewsWrittenCount, setReviewsWrittenCount] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [showUserReviewsDialog, setShowUserReviewsDialog] = useState(false);


  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (user.is_artist) {
        navigate('/artist-dashboard');
        return;
      }
    }

    if(user) {
      setProfileData({
        name: user.name || user.profile?.name || '',
        email: user.email || '',
        location: user.location || user.profile?.location || ''
      });

      const fetchData = async () => {
        setIsDataLoading(true);
        try {
          const { data: artistsData, error: artistsError } = await supabase
            .from('follows')
            .select('artist:profiles!following_id(*)')
            .eq('follower_id', user.id);
          
          if (artistsError) console.error('Error fetching followed artists:', artistsError);
          else setFollowedArtists(artistsData.map(f => f.artist).filter(Boolean));

          const { count, error: reviewError } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('reviewer_id', user.id);
          if (reviewError) console.error('Error fetching review count:', reviewError);
          else setReviewsWrittenCount(count || 0);

        } catch (error) {
          console.error("Error in client dashboard data fetch:", error);
          toast({ title: "Error loading data", description: "Could not load all dashboard information.", variant: "destructive"});
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchData();
    }
  }, [user, navigate, authLoading, profileLoading, toast]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await updateUser({
      name: profileData.name,
      location: profileData.location
    });

    if (error) {
       toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
       toast({ title: "Profile updated!", description: "Your profile has been successfully updated." });
    }
  };

  const handleUnfollow = async (artistId) => {
    if (!user) return;
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', artistId);
      
    if (error) {
      toast({ title: "Error unfollowing", description: error.message, variant: "destructive" });
    } else {
      setFollowedArtists(followedArtists.filter(artist => artist.id !== artistId));
      toast({ title: "Unfollowed", description: "You're no longer following this artist." });
    }
  };

  const getActivityStatus = (lastActive) => {
    if (!lastActive) return null;
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 48) return { text: 'Just Updated', color: 'text-green-400' };
    if (diffHours < 168) return { text: 'Recently Active', color: 'text-yellow-400' };
    return null;
  };

  const isLoading = authLoading || profileLoading || isDataLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mr-3" />
        <span className="text-lg text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }
  
  if (!user || user.is_artist) {
    return <div className="min-h-screen flex items-center justify-center text-lg">Access Denied or User Not Loaded. Redirecting...</div>;
  }


  return (
    <>
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold ink-text-gradient mb-6">Client Dashboard</h1>
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
            <button 
              onClick={() => setShowUserReviewsDialog(true)} 
              className="glass-effect rounded-xl p-6 text-left hover:border-primary/50 transition-all"
              disabled={!user}
            >
              <div className="flex items-center gap-3">
                <MessageSquareText className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold">{reviewsWrittenCount}</p>
                  <p className="text-sm text-muted-foreground">Reviews Written</p>
                </div>
              </div>
            </button>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 glass-effect">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <Heart className="w-4 h-4" /> Following
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4" /> My Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-effect rounded-2xl p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Account Settings</h2>
              </div>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} placeholder="Your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={profileData.email} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={profileData.location} onChange={(e) => setProfileData({...profileData, location: e.target.value})} placeholder="City, State" />
                </div>
                <Button type="submit" className="ink-gradient">Update Profile</Button>
              </form>
            </motion.div>
          </TabsContent>

          <TabsContent value="following">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-effect rounded-2xl p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">Following ({followedArtists.length})</h2>
              </div>
              {followedArtists.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No artists followed yet</h3>
                  <p className="text-muted-foreground mb-6">Discover and follow your favorite tattoo artists to stay updated.</p>
                  <Button asChild className="ink-gradient"><Link to="/">Discover Artists</Link></Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {followedArtists.map((artist) => {
                    const activityStatus = getActivityStatus(artist.last_active);
                    return (
                      <motion.div key={artist.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <Link to={`/artist/${artist.username}`} className="flex items-center space-x-3 flex-1">
                            <Avatar className="w-12 h-12"><AvatarImage src={artist.profile_photo_url} alt={artist.name} /><AvatarFallback className="ink-gradient text-white">{artist.name?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback></Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold hover:text-primary transition-colors">{artist.name}</h3>
                              <p className="text-sm text-muted-foreground">@{artist.username}</p>
                              {activityStatus && (
                                <div className={`flex items-center space-x-1 mt-1 ${activityStatus.color}`}><Clock className="w-3 h-3" /><span className="text-xs font-medium">{activityStatus.text}</span></div>
                              )}
                            </div>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => handleUnfollow(artist.id)}>Unfollow</Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="bookings">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-effect rounded-2xl p-8 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <BookOpenCheck className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold">My Bookings</h2>
              </div>
              <ClientBookingList />
            </motion.div>
          </TabsContent>
        </Tabs>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6 }}
          className="mt-12 glass-effect rounded-2xl p-8"
        >
          <h2 className="text-2xl font-bold mb-4 text-destructive">Danger Zone</h2>
          <p className="text-muted-foreground mb-6">
            Deleting your account is a permanent action and cannot be undone. 
            All your profile data and activity will be permanently removed.
          </p>
          <DeleteAccountDialog />
        </motion.div>

      </div>
    </div>
    {user && (
        <UserReviewsDialog
          userProfile={user.profile || user} // Pass the full user profile object
          open={showUserReviewsDialog}
          onOpenChange={setShowUserReviewsDialog}
        />
      )}
    </>
  );
};

export default ClientDashboard;