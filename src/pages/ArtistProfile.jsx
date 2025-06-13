
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import ArtistHeader from '@/components/profile/ArtistHeader';
import PortfolioGrid from '@/components/profile/PortfolioGrid';
import ReviewsSection from '@/components/profile/ReviewsSection';
import ImageDialog from '@/components/profile/ImageDialog';
import { supabase } from '@/lib/supabaseClient';

const ArtistProfile = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [artist, setArtist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchArtistData = useCallback(async () => {
    setLoading(true);
    const { data: artistData, error: artistError } = await supabase
      .from('profiles')
      .select(`*, follows!following_id(count)`)
      .eq('username', username)
      .eq('is_artist', true)
      .single();

    if (artistError || !artistData) {
      console.error('Error fetching artist:', artistError);
      setArtist(null);
      setLoading(false);
      return;
    }
    
    setArtist(artistData);
    setFollowerCount(artistData.follows[0]?.count || 0);

    const { data: portfolioData, error: portfolioError } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('user_id', artistData.id)
      .order('created_at', { ascending: false });

    if (portfolioError) console.error('Error fetching portfolio:', portfolioError);
    else setPortfolio(portfolioData);

    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`*, reviewer:profiles(id, name, profile_photo_url)`)
      .eq('artist_id', artistData.id);

    if (reviewsError) console.error('Error fetching reviews:', reviewsError);
    else setReviews(reviewsData);

    if (user) {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', artistData.id)
        .maybeSingle();
      
      if (followError) console.error('Error checking follow status:', followError);
      else setIsFollowing(!!followData);
    }
    setLoading(false);
  }, [username, user]);
  
  useEffect(() => {
    fetchArtistData();
  }, [fetchArtistData]);

  const handleFollow = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to follow artists.", variant: "destructive" });
      return;
    }

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', artist.id);
      if (error) {
        toast({ title: "Error unfollowing", description: error.message, variant: "destructive" });
      } else {
        setIsFollowing(false);
        setFollowerCount(c => c - 1);
        toast({ title: "Unfollowed", description: `You're no longer following ${artist.name}.` });
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: artist.id });
      if (error) {
        toast({ title: "Error following", description: error.message, variant: "destructive" });
      } else {
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
        toast({ title: "Following!", description: `You're now following ${artist.name}!` });
      }
    }
  };

  const handleReviewAdded = (newReview) => {
    setReviews(prevReviews => [...prevReviews, { ...newReview, reviewer: { id: user.id, name: user.name, profile_photo_url: user.profile_photo_url } }]);
  };
  
  if (loading) {
     return <div className="min-h-screen flex items-center justify-center">Loading artist profile...</div>;
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Artist not found</h2>
          <p className="text-muted-foreground">The artist you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const artistWithData = {...artist, portfolio: portfolio, followers: {length: followerCount}};

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ArtistHeader artist={artistWithData} reviews={reviews} isFollowing={isFollowing} handleFollow={handleFollow} />
        </motion.div>

        {portfolio && portfolio.length > 0 && (
          <PortfolioGrid portfolio={portfolio} onImageSelect={setSelectedImage} />
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ReviewsSection reviews={reviews} artistId={artist.id} onReviewAdded={handleReviewAdded} />
        </motion.div>
      </div>

      <ImageDialog 
        selectedImage={selectedImage} 
        artist={artist}
        onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)}
      />
    </div>
  );
};

export default ArtistProfile;
