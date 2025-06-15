import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Eye, RefreshCw, Loader2, Settings, Image, CalendarDays, BookOpenCheck } from 'lucide-react';
import ArtistStats from '@/components/dashboard/ArtistStats';
import ProfileSettings from '@/components/dashboard/ProfileSettings';
import PortfolioManager from '@/components/dashboard/PortfolioManager';
import ArtistBookingList from '@/components/bookings/ArtistBookingList';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { supabase } from '@/lib/supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const ArtistDashboard = () => {
  const { user, updateUser, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [stats, setStats] = useState({ followers_count: 0, portfolio_count: 0, reviews_count: 0, total_rating_sum: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "profile");

  const isArtist = user?.is_artist ?? (user?.profile?.is_artist ?? false);
  const userId = user?.id;
  const userUsername = user?.username ?? (user?.profile?.username ?? '');

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isArtist) {
        navigate('/client-dashboard');
      }
    }
  }, [user, authLoading, profileLoading, navigate, isArtist]);
  
  useEffect(() => {
    const fetchStats = async () => {
      if (userId && isArtist) { 
        setIsStatsLoading(true);
        try {
          const { count: followersCount, error: followersError } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);
          if (followersError) throw followersError;

          const { count: portfolioCount, error: portfolioError } = await supabase
            .from('portfolio_images')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          if (portfolioError) throw portfolioError;
          
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select('stars')
            .eq('artist_id', userId);
          if (reviewsError) throw reviewsError;

          const reviewsCount = reviewsData ? reviewsData.length : 0;
          const totalRatingSum = reviewsData ? reviewsData.reduce((sum, review) => sum + review.stars, 0) : 0;

          setStats({ 
            followers_count: followersCount || 0, 
            portfolio_count: portfolioCount || 0, 
            reviews_count: reviewsCount,
            total_rating_sum: totalRatingSum 
          });

        } catch (error) {
          console.error("Error fetching stats:", error);
          toast({ title: "Error fetching stats", description: "Could not load dashboard statistics.", variant: "destructive" });
        } finally {
          setIsStatsLoading(false);
        }
      } else if (!authLoading && !profileLoading) {
         setIsStatsLoading(false);
      }
    };

    if (!authLoading && !profileLoading && user && isArtist) {
      fetchStats();
    } else if (!authLoading && !profileLoading) {
      setIsStatsLoading(false);
    }
    
  }, [user, authLoading, profileLoading, toast, userId, isArtist]);

  const handleVisibilityRefresh = async () => {
    if (user) {
      const { error } = await updateUser({ last_active: new Date().toISOString() });
      if (error) {
        toast({ title: "Error refreshing visibility", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Visibility refreshed!", description: "Your profile has been moved to the top of search results." });
      }
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  
  const isLoading = authLoading || profileLoading || (user && isArtist && isStatsLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mr-3" />
        <span className="text-lg text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (!user || !isArtist) { 
    return <div className="min-h-screen flex items-center justify-center text-lg">Access Denied or User Not Loaded. Redirecting...</div>;
  }
  
  const artistProfileForStats = {
    ...(user.profile || {}),
    name: user.name || user.profile?.name || 'Artist',
    username: userUsername,
    ...stats
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-background text-foreground">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 gap-4">
            <h1 className="text-3xl font-bold ink-text-gradient">Artist Dashboard</h1>
            <div className="flex flex-wrap gap-3">
              {userUsername && (
                <Button variant="outline" asChild>
                  <a href={`/artist/${userUsername}`} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" /> View Profile
                  </a>
                </Button>
              )}
              <Button onClick={handleVisibilityRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
          <ArtistStats user={artistProfileForStats} />
        </motion.div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 glass-effect">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Profile & Conventions
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Image className="w-4 h-4" /> Portfolio
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4" /> Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ProfileSettings />
            </motion.div>
          </TabsContent>
          <TabsContent value="portfolio">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <PortfolioManager />
            </motion.div>
          </TabsContent>
          <TabsContent value="bookings">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <ArtistBookingList />
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
            All your profile data, portfolio images, and reviews will be permanently removed.
          </p>
          <DeleteAccountDialog />
        </motion.div>
      </div>
    </div>
  );
};

export default ArtistDashboard;