import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useArtistProfileData = (username) => {
  const { user, loading: authLoading, profileLoading: contextProfileLoading } = useAuth();
  const { toast } = useToast();

  const [artist, setArtist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!username) {
      setIsLoading(false);
      setError("Username not provided.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setArtist(null);
    setReviews([]);
    setPortfolio([]);
    setIsFollowing(false);
    setFollowerCount(0);

    try {
      const { data: artistData, error: artistError } = await supabase
        .from('profiles')
        .select('*, reviews_data:reviews!reviews_artist_id_fkey(stars)')
        .eq('username', username)
        .eq('is_artist', true)
        .single();

      if (artistError || !artistData) {
        throw artistError || new Error('Artist not found or is not an artist.');
      }
      setArtist(artistData);

      const [
        { count: currentFollowerCount, error: followCountError },
        { data: portfolioData, error: portfolioError },
        { data: reviewsData, error: reviewsError }
      ] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', artistData.id),
        supabase.from('portfolio_images').select('*').eq('user_id', artistData.id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, name, username, profile_photo_url)').eq('artist_id', artistData.id).order('created_at', { ascending: false })
      ]);

      if (followCountError) console.warn("Error fetching follower count:", followCountError.message);
      setFollowerCount(currentFollowerCount || 0);

      if (portfolioError) throw portfolioError;
      setPortfolio(portfolioData || []);

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      if (user && artistData.id) {
        const { data: followData, error: followCheckError } = await supabase
          .from('follows')
          .select('*', { count: 'exact' })
          .eq('follower_id', user.id)
          .eq('following_id', artistData.id)
          .maybeSingle();
        
        if (followCheckError && followCheckError.code !== 'PGRST116') {
            console.warn('Error checking follow status:', followCheckError.message);
        }
        setIsFollowing(!!followData);
      }

    } catch (err) {
      console.error("Error fetching artist profile data:", err);
      setError(err.message || 'Failed to load artist profile.');
      if (err.code === 'PGRST116' || err.message.toLowerCase().includes('artist not found')) {
        toast({ title: "Artist Not Found", description: `The profile for @${username} could not be found or is not an artist.`, variant: "destructive" });
      } else {
        toast({ title: "Error Loading Profile", description: err.message || "Could not load artist profile.", variant: "destructive" });
      }
      setArtist(null);
    } finally {
      setIsLoading(false);
    }
  }, [username, user, toast]);

  useEffect(() => {
    if (!authLoading && !contextProfileLoading) {
      fetchData();
    }
  }, [username, authLoading, contextProfileLoading, fetchData]);

  const refreshFollowData = useCallback(async (currentArtistId) => {
     if (!user || !currentArtistId) return;
      const { data: followData, error: followCheckError } = await supabase
          .from('follows')
          .select('*', {count: 'exact'})
          .eq('follower_id', user.id)
          .eq('following_id', currentArtistId)
          .maybeSingle(); 
        if (!followCheckError || followCheckError.code === 'PGRST116') {
          setIsFollowing(!!followData);
        }
        const { count: newFollowerCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', currentArtistId);
        setFollowerCount(newFollowerCount || 0);
  }, [user]);

  const addReviewToList = (newReview) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
    setArtist(prevArtist => ({
      ...prevArtist,
      reviews_data: [...(prevArtist.reviews_data || []), { stars: newReview.stars }]
    }));
  };


  return {
    artist,
    reviews,
    portfolio,
    isFollowing,
    followerCount,
    isLoading: isLoading || authLoading || contextProfileLoading,
    error,
    fetchArtistData: fetchData, 
    refreshFollowData,
    addReviewToList,
    setIsFollowing,
    setFollowerCount
  };
};