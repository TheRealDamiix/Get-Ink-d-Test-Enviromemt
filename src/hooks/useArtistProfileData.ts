import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { Profile, PortfolioImage, Review } from '@/types';

export interface UseArtistProfileDataReturn {
  artist: Profile | null;
  reviews: Review[];
  portfolio: PortfolioImage[];
  isFollowing: boolean;
  followerCount: number;
  isLoading: boolean;
  error: string | null;
  fetchArtistData: (signal?: AbortSignal) => Promise<void>;
  refreshFollowData: (currentArtistId: string) => Promise<void>;
  addReviewToList: (newReview: Review) => void;
  setIsFollowing: React.Dispatch<React.SetStateAction<boolean>>;
  setFollowerCount: React.Dispatch<React.SetStateAction<number>>;
}

export const useArtistProfileData = (
  username: string | undefined
): UseArtistProfileDataReturn => {
  const { user, loading: authLoading, profileLoading: contextProfileLoading } = useAuth();
  const { toast } = useToast();
  // Use a ref so toast never needs to be in dependency arrays (avoids infinite loops)
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Keep a stable ref to the current user id so fetchData doesn't recreate on every auth update
  const userIdRef = useRef<string | undefined>(user?.id);
  userIdRef.current = user?.id;

  const [artist, setArtist] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
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
      setArtist(artistData as Profile);

      const [
        { count: currentFollowerCount, error: followCountError },
        { data: portfolioData, error: portfolioError },
        { data: reviewsData, error: reviewsError },
      ] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', artistData.id),
        supabase
          .from('portfolio_images')
          .select('*')
          .eq('artist_id', artistData.id)
          .order('created_at', { ascending: false }),
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
      setPortfolio((portfolioData as PortfolioImage[]) || []);

      if (reviewsError) throw reviewsError;
      setReviews((reviewsData as Review[]) || []);

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
      const error = err as Error & { code?: string };
      console.error('Error fetching artist profile data:', error);
      setError(error.message || 'Failed to load artist profile.');
      const msg = error.message?.toLowerCase() || '';
      if (
        error.code === 'PGRST116' ||
        msg.includes('artist not found') ||
        msg.includes('no rows')
      ) {
        toastRef.current({
          title: 'Artist Not Found',
          description: `The profile for @${username} could not be found or is not an artist.`,
          variant: 'destructive',
        });
      } else {
        toastRef.current({
          title: 'Error Loading Profile',
          description: error.message || 'Could not load artist profile.',
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

  const refreshFollowData = useCallback(async (currentArtistId: string) => {
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

  const addReviewToList = useCallback((newReview: Review) => {
    setReviews(prevReviews => [newReview, ...prevReviews]);
    setArtist(prevArtist => {
      if (!prevArtist) return prevArtist;
      return {
        ...prevArtist,
        reviews_data: [
          ...((prevArtist as Profile & { reviews_data?: Array<{ stars: number }> }).reviews_data || []),
          { stars: newReview.stars ?? newReview.rating ?? 0 },
        ],
      } as Profile;
    });
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
