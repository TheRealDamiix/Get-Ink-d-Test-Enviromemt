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
  const [stats, setStats] = useState({ followers: 0, portfolio: 0, reviews: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Combine useEffect for redirection to avoid race conditions
  useEffect(() => {
    if (!authLoading) { // Only run checks once authentication state is known
      if (!user) { // If no user, redirect to auth page
        navigate('/auth'); //
      } else if (!user.is_artist) { // If user is not an artist, redirect to client dashboard
        navigate('/client-dashboard'); //
      }
      // If user exists AND is_artist is true, no redirection, continue loading data.
    }
  }, [user, authLoading, navigate]);

  // Existing useEffect for fetching stats, no changes needed here as it depends on `user` and `authLoading`
  useEffect(() => {
    const fetchStats = async () => {
      if (user && user.is_artist) {
        setIsDataLoading(true);
        try {
          const { count: followersCount } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
          const { count: portfolioCount } = await supabase.from('portfolio_images').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
          const { count: reviewsCount } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('artist_id', user.id);
          setStats({ followers: followersCount || 0, portfolio: portfolioCount || 0, reviews: reviewsCount || 0 });
        } catch (error) {
          console.error("Error fetching stats:", error);
          toast({ title: "Error fetching stats", description: "Could not load dashboard statistics.", variant: "destructive" });
        } finally {
          setIsDataLoading(false);
        }
      } else if (!authLoading && user && !user.is_artist) { // If auth is not loading, and user is client, set data loading to false as well
        setIsDataLoading(false);
      } else if (!authLoading && !user) { // If auth is not loading, and no user, set data loading to false as well
        setIsDataLoading(false);
      }
    };

    if (!authLoading) { // Only fetch stats once auth state is settled
      fetchStats();
    }
  }, [user, authLoading, toast]);

  const handleVisibilityRefresh = () => {
    if (user) {
      updateUser({ last_active: new Date().toISOString() });
      toast({ title: "Visibility refreshed!", description: "Your profile has been moved to the top of search results." });
    }
  };

  // Modified conditional return statements
  // Show loading while auth is still determining user and profile type
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  // Once auth is not loading, if user is still null or not an artist, display denied/redirecting
  if (!user || !user.is_artist) {
    // The useEffect above will handle the navigation to /auth or /client-dashboard
    return <div className="min-h-screen flex items-center justify-center">Access Denied. Redirecting...</div>;
  }

  // Only show data loading if user is confirmed as artist AND data is still loading
  if (isDataLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading artist data...</div>;
  }

  const userWithStats = {...user, portfolio: {length: stats.portfolio}, followers: {length: stats.followers}, reviews: {length: stats.reviews}};

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
          <ArtistStats user={userWithStats} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ProfileSettings user={user} updateUser={updateUser} toast={toast} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <PortfolioManager user={user} updateUser={updateUser} toast={toast} />
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