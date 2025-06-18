import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import ArtistHeader from '@/components/profile/ArtistHeader';
import PortfolioGrid from '@/components/profile/PortfolioGrid';
import ReviewsSection from '@/components/profile/ReviewsSection';
import ConventionDatesSection from '@/components/profile/ConventionDatesSection';
import ArtistPostsDisplay from '@/components/profile/ArtistPostsDisplay';
import ArtistDealsDisplay from '@/components/profile/ArtistDealsDisplay';
import ImageDialog from '@/components/profile/ImageDialog';
import BookingRequestForm from '@/components/bookings/BookingRequestForm';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CalendarPlus, MessageSquare } from 'lucide-react';

const ArtistProfile = () => {
  const { username } = useParams();
  const { user, loading: authLoading, profileLoading: contextProfileLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [conventionDates, setConventionDates] = useState([]);
  const [nextConvention, setNextConvention] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingContext, setBookingContext] = useState({ conventionDateId: null, generalBooking: false });
  const portfolioRef = useRef(null);
  const newLogoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/dc3f6a73-e4ae-4a98-96ee-f971fdcf05b8/adae335f6caa43250fd8bd69651ee119.png";


  const fetchArtistData = useCallback(async () => {
    setPageLoading(true);
    setArtist(null); 
    setReviews([]);
    setPortfolio([]);
    setConventionDates([]);
    setNextConvention(null);
    setIsFollowing(false);
    setFollowerCount(0);

    try {
      const { data: artistData, error: artistError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('is_artist', true)
        .single();

      if (artistError || !artistData) {
        toast({
            title: "Artist Not Found",
            description: `The profile for @${username} could not be found or is not an artist.`,
            variant: "destructive"
        });
        setArtist(null);
        setPageLoading(false);
        return;
      }
      
      setArtist(artistData);

      // Fetch all related data in parallel
      const [
        { count: currentFollowerCount },
        { data: portfolioData },
        { data: reviewsData },
        { data: conventionsData }
      ] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', artistData.id),
        supabase.from('portfolio_images').select('*').eq('user_id', artistData.id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, name, username, profile_photo_url)').eq('artist_id', artistData.id).order('created_at', { ascending: false }),
        supabase.from('convention_dates').select('*').eq('artist_id', artistData.id).order('start_date', { ascending: true })
      ]);

      setFollowerCount(currentFollowerCount || 0);
      setPortfolio(portfolioData || []);
      setReviews(reviewsData || []);
      
      const allConventions = conventionsData || [];
      setConventionDates(allConventions);

      // Find the next upcoming convention
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextUpcomingConvention = allConventions
          .filter(conv => new Date(conv.start_date) >= today)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
      setNextConvention(nextUpcomingConvention || null);

      // Check follow status if a user is logged in
      if (user && artistData.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*', {count: 'exact'})
          .eq('follower_id', user.id)
          .eq('following_id', artistData.id)
          .maybeSingle(); 
        setIsFollowing(!!followData);
      }

    } catch (error) {
      console.error("Error fetching artist profile data:", error.message);
      toast({ title: "An unexpected error occurred", description: error.message, variant: "destructive"});
      setArtist(null);
    } finally {
      setPageLoading(false);
    }
  }, [username, user, toast]);
  
  useEffect(() => {
    if (!authLoading && !contextProfileLoading) {
      fetchArtistData();
    }
  }, [fetchArtistData, authLoading, contextProfileLoading]);

  const handleFollow = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to follow artists.", variant: "destructive" });
      return;
    }
    if (!artist || !artist.id) return;

    if (isFollowing) {
      await supabase.from('follows').delete().match({ follower_id: user.id, following_id: artist.id });
      setIsFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: artist.id });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };
  
  const handleReviewAdded = async (reviewData) => {
    if (!user || !artist) return;
    try {
        const { data: newReview } = await supabase.from('reviews').insert({ artist_id: artist.id, reviewer_id: user.id, ...reviewData }).select('*, reviewer:profiles!reviews_reviewer_id_fkey(*)').single();
        if (newReview) setReviews(prev => [newReview, ...prev]);
        toast({ title: "Review posted!", description: "Thank you for your feedback." });
    } catch (error) {
        toast({ title: "Failed to post review", description: error.message, variant: "destructive" });
    }
  };

  const openBookingDialog = (conventionId = null) => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to request a booking.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (user.id === artist?.id) return;
    setBookingContext({ conventionDateId: conventionId, generalBooking: !conventionId });
    setShowBookingDialog(true);
  };
  
  const handleMessageArtist = async () => {
    if (!user || !artist) return;
     try {
        const { data: existing } = await supabase.rpc('start_or_get_conversation', { p_user1_id: user.id, p_user2_id: artist.id }).single();
        if (existing?.conversation_id) navigate(`/chat?conversationId=${existing.conversation_id}`);
    } catch (error) {
        toast({ title: "Error", description: `Could not start conversation: ${error.message}`, variant: "destructive" });
    }
  };

  const handleWorksClick = () => portfolioRef.current?.scrollIntoView({ behavior: 'smooth' });
  
  const isLoading = authLoading || contextProfileLoading || pageLoading;

  if (isLoading) {
     return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 glass-effect rounded-xl">
          <h2 className="text-3xl font-bold mb-3 ink-text-gradient">Artist Not Found</h2>
          <p className="text-muted-foreground mb-6">The artist profile for <span className="font-semibold text-foreground">@{username}</span> couldn't be loaded.</p>
          <Button onClick={() => navigate('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }
  
  const artistHeaderData = { ...artist, portfolio_count: portfolio.length, followers_count: followerCount };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ArtistHeader 
            artist={artistHeaderData} 
            reviews={reviews} 
            isFollowing={isFollowing} 
            handleFollow={handleFollow}
            onWorksClick={handleWorksClick}
            nextConvention={nextConvention} 
          />
        </motion.div>

        {user && user.id !== artist.id && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="my-6 flex flex-col sm:flex-row justify-center items-center gap-4">
            {artist.booking_status && (
              <Button onClick={() => openBookingDialog()} className="ink-gradient px-8 py-6 text-lg w-full sm:w-auto">
                <CalendarPlus className="w-5 h-5 mr-2" /> Request General Booking
              </Button>
            )}
            <Button onClick={handleMessageArtist} variant="outline" className="px-8 py-6 text-lg w-full sm:w-auto">
              <MessageSquare className="w-5 h-5 mr-2" /> Message Artist
            </Button>
          </motion.div>
        )}

        <ArtistDealsDisplay artistId={artist.id} />
        <ConventionDatesSection artistId={artist.id} dates={conventionDates} loading={isLoading} />
        <ArtistPostsDisplay artistId={artist.id} artistUsername={artist.username} artistName={artist.name} artistProfilePhotoUrl={artist.profile_photo_url} />

        <div ref={portfolioRef}>
          {portfolio?.length > 0 && <PortfolioGrid portfolio={portfolio} onImageSelect={setSelectedImage} />}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ReviewsSection reviews={reviews} artistId={artist.id} artistProfile={artist} onReviewAdded={handleReviewAdded} />
        </motion.div>
      </div>

      <ImageDialog selectedImage={selectedImage} artist={artist} onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)} />
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="glass-effect p-0 relative flex flex-col max-h-[90vh]">
            <div style={{ backgroundImage: `url(${newLogoUrl})` }} className="absolute inset-0 bg-center bg-contain bg-no-repeat opacity-5 z-0" />
            <div className="relative z-10 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <DialogHeader>
                    <DialogTitle>Request Booking with {artist.name || artist.username}</DialogTitle>
                </DialogHeader>
                <BookingRequestForm artistId={artist.id} artistName={artist.name || artist.username} conventionDateId={bookingContext.conventionDateId} onSubmitSuccess={() => setShowBookingDialog(false)} />
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistProfile;
