import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Eye, RefreshCw } from 'lucide-react';
import ArtistStats from '@/components/dashboard/ArtistStats';
import ProfileSettings from '@/components/dashboard/ProfileSettings';
import PortfolioManager from '@/components/dashboard/PortfolioManager';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { supabase } from '@/lib/supabaseClient';

const ArtistDashboard = () => {
  const { user, updateUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ followers: 0, reviews: 0 }); // Removed portfolio from stats
  const [artistPortfolio, setArtistPortfolio] = useState([]); // State for actual portfolio images
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!user.is_artist) { // Correctly uses user.is_artist
      navigate('/client-dashboard');
      return;
    }

    const fetchDashboardData = async () => {
      setIsDataLoading(true);
      try {
        // Fetch counts for stats
        const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
        const { count: reviewsCount } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('artist_id', user.id);
        setStats({ followers: followersCount || 0, reviews: reviewsCount || 0 });

        // Fetch actual portfolio images
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolio_images')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (portfolioError) {
          console.error("Error fetching portfolio images:", portfolioError);
          setArtistPortfolio([]);
        } else {
          setArtistPortfolio(portfolioData);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error loading dashboard", description: "Could not load all dashboard data.", variant: "destructive" });
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchDashboardData();

  }, [user, authLoading, navigate, toast]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  if (!user || !user.is_artist) {
    return <div className="min-h-screen flex items-center justify-center">Access Denied. Redirecting...</div>;
  }

  if (isDataLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading dashboard data...</div>;
  }

  const handleVisibilityRefresh = () => {
    if (user) {
      updateUser({ last_active: new Date().toISOString() }); // Correctly uses last_active
      toast({ title: "Visibility refreshed!", description: "Your profile has been moved to the top of search results." });
    }
  };

  // Pass separate counts to ArtistStats and the actual portfolio array
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between mb-6 gap-4">
            <h1 className="text-3xl font-bold ink-text-gradient">Artist Dashboard</h1>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a href={`/artist/${user.username}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-2" /> View Profile
                </a>
              </Button>
              <Button onClick={handleVisibilityRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
          {/* Pass counts directly to ArtistStats, and include portfolio length from fetched data */}
          <ArtistStats user={{...user, followers: {length: stats.followers}, portfolio: {length: artistPortfolio.length}}} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ProfileSettings user={user} updateUser={updateUser} toast={toast} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          {/* Pass the actual artistPortfolio array */}
          <PortfolioManager user={user} updateUser={updateUser} toast={toast} artistPortfolio={artistPortfolio} setArtistPortfolio={setArtistPortfolio} />
        </motion.div>

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
