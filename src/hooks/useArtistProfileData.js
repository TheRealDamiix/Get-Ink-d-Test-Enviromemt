import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useArtistProfileData = (username) => {
  const { user, loading: authLoading, profileLoading: contextProfileLoading } = useAuth();
  const { toast } = useToast();
  // Use a ref so toast never needs to be in dependency arrays (avoids infinite loops)
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Keep a stable ref to the current user id so fetchData doesn't recreate on every auth update
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const [artist, setArtist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (signal) => {
    if (!username) {
      setIsLoading(false);
      setError('Username not provided.');
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
        .select('*')
        .eq('username', username)
        .eq('is_artist', true)
        .single();

      if (signal?.aborted) return;

      if (artistError || !artistData) {
        throw artistError || new Error('Artist not found or is not an artist.');
      }
      setArtist(artistData);

      const [
        { count: currentFollowerCount, error: followCountError },
        { data: portfolioData, error: portfolioError },
        { data: reviewsData, error: reviewsError },
      ] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', artistData.id),
        supabase.from('portfolio_images').select('*').eq('user_id', artistData.id).order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*, reviewer:profiles(id, name, username, profile_photo_url)')
          .eq('artist_id', artistData.id)
          .order('created_at', { ascending: false }),
      ]);

      if (signal?.aborted) return;

      if (followCountError) console.warn('Error fetching follower count:', followCountError.message);
      setFollowerCount(currentFollowerCount || 0);

      if (portfolioError) throw portfolioError;
      setPortfolio(portfolioData || []);

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

      const currentUserId = userIdRef.current;
      if (currentUserId && artistData.id) {
        const { data: followData, error: followCheckError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUserId)
          .eq('following_id', artistData.id)
          .maybeSingle();

        if (signal?.aborted) return;

        if (followCheckError) {
          console.warn('Error checking follow status:', followCheckError.message);
        } else {
          setIsFollowing(!!followData);
        }
      }
    } catch (err) {
      if (signal?.aborted) return;
      console.error('Error fetching artist profile data:', err);
      setError(err.message || 'Failed to load artist profile.');
      const msg = err.message?.toLowerCase() || '';
      if (err.code === 'PGRST116' || msg.includes('artist not found') || msg.includes('no rows')) {
        toastRef.current({
          title: 'Artist Not Found',
          description: `The profile for @${username} could not be found or is not an artist.`,
          variant: 'destructive',
        });
      } else {
        toastRef.current({
          title: 'Error Loading Profile',
          description: err.message || 'Could not load artist profile.',
          variant: 'destructive',
        });
      }
      setArtist(null);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [username]); // only username — user accessed via ref, toast via ref

  useEffect(() => {
    if (authLoading || contextProfileLoading) return;
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [username, authLoading, contextProfileLoading, fetchData]);

  const refreshFollowData = useCallback(async (currentArtistId) => {
    const currentUserId = userIdRef.current;
    if (!currentUserId || !currentArtistId) return;

    const { data: followData, error: followCheckError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', currentArtistId)
      .maybeSingle();

    if (!followCheckError) {
      setIsFollowing(!!followData);
    } else {
      console.warn('Error refreshing follow status:', followCheckError.message);
    }

    const { count: newFollowerCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', currentArtistId);
    setFollowerCount(newFollowerCount || 0);
  }, []);

  const addReviewToList = useCallback((newReview) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
    setArtist(prevArtist => ({
      ...prevArtist,
      reviews_data: [...(prevArtist?.reviews_data || []), { stars: newReview.stars }],
    }));
  }, []);

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
    setFollowerCount,
  };
};
