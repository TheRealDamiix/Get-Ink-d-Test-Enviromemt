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
import ArtistDealsDisplay from '@/components/profile/ArtistDealsDisplay'; // Added import
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingContext, setBookingContext] = useState({ conventionDateId: null, generalBooking: false });
  const portfolioRef = useRef(null);


  const fetchArtistData = useCallback(async () => {
    setPageLoading(true);
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

      if (artistError || !artistData) {
        console.error('Error fetching artist:', artistError ? artistError.message : 'No artist data found for username: ' + username);
        if (artistError && artistError.code === 'PGRST116') { 
             toast({
                title: "Artist Not Found",
                description: `The profile for @${username} could not be found or is not an artist.`,
                variant: "destructive"
            });
        } else {
            toast({
                title: "Error Loading Profile",
                description: artistError?.message || "Could not load artist profile.",
                variant: "destructive"
            });
        }
        setArtist(null);
        setPageLoading(false);
        return;
      }
      
      const { count: currentFollowerCount, error: followCountError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', artistData.id);

      if (followCountError) console.error("Error fetching follower count:", followCountError);
      
      setArtist(artistData);
      setFollowerCount(currentFollowerCount || 0);

      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('user_id', artistData.id)
        .order('created_at', { ascending: false });

      if (portfolioError) {
        console.error('Error fetching portfolio:', portfolioError.message);
        toast({ title: "Error fetching portfolio", description: portfolioError.message, variant: "destructive"});
      } else {
        setPortfolio(portfolioData || []);
      }
      
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, name, username, profile_photo_url)')
        .eq('artist_id', artistData.id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError.message);
        toast({ title: "Error fetching reviews", description: reviewsError.message, variant: "destructive"});
      } else {
        setReviews(reviewsData || []);
      }

      if (user && artistData.id) {
        const { data: followData, error: followCheckError } = await supabase
          .from('follows')
          .select('*', {count: 'exact'})
          .eq('follower_id', user.id)
          .eq('following_id', artistData.id)
          .maybeSingle(); 
        
        if (followCheckError && followCheckError.code !== 'PGRST116') { 
          console.error('Error checking follow status:', followCheckError.message);
          toast({ title: "Error checking follow status", description: followCheckError.message, variant: "destructive"});
        } else {
          setIsFollowing(!!followData);
        }
      }
    } catch (error) {
      console.error("General error in fetchArtistData:", error.message);
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
    if (!artist || !artist.id) { 
        toast({ title: "Error", description: "Artist data not available.", variant: "destructive" });
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
        setFollowerCount(c => Math.max(0, c - 1));
        toast({ title: "Unfollowed", description: `You're no longer following ${artist.name || artist.username}.` });
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
        toast({ title: "Following!", description: `You're now following ${artist.name || artist.username}!` });
      }
    }
  };
  
  const handleReviewAdded = async (reviewData) => {
    if (!user || !artist || !artist.id) { 
        toast({ title: "Error", description: "User or artist data missing.", variant: "destructive" });
        return;
    }
    try {
        const { data: newReview, error } = await supabase
            .from('reviews')
            .insert({
                artist_id: artist.id,
                reviewer_id: user.id,
                stars: reviewData.stars,
                comment: reviewData.comment,
            })
            .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, name, username, profile_photo_url)')
            .single();

        if (error) {
            throw error;
        }
        
        setReviews(prevReviews => [newReview, ...prevReviews]);
        toast({ title: "Review posted!", description: "Thank you for your feedback." });

    } catch (error) {
        console.error("Error posting review:", error);
        toast({ title: "Failed to post review", description: error.message, variant: "destructive" });
    }
  };

  const openBookingDialog = (conventionId = null) => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to request a booking.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (user.id === artist?.id) {
      toast({ title: "Cannot book yourself", description: "Artists cannot book their own services.", variant: "destructive" });
      return;
    }
    setBookingContext({ conventionDateId: conventionId, generalBooking: !conventionId });
    setShowBookingDialog(true);
  };

  const handleMessageArtist = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to message artists.", variant: "destructive" });
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!artist || !artist.id) {
      toast({ title: "Error", description: "Artist data not available.", variant: "destructive" });
      return;
    }
    if (user.id === artist.id) {
      toast({ title: "Cannot message yourself", description: "You cannot start a conversation with yourself.", variant: "destructive" });
      return;
    }

    try {
      const orFilter = `user1_id.eq.${user.id},user2_id.eq.${artist.id},and(user1_id.eq.${artist.id},user2_id.eq.${user.id})`;
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .or(orFilter)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingConversation) {
        navigate(`/chat?conversationId=${existingConversation.id}`);
      } else {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({ user1_id: user.id, user2_id: artist.id })
          .select('id')
          .single();
        
        if (createError) throw createError;
        navigate(`/chat?conversationId=${newConversation.id}`);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({ title: "Error", description: "Could not start conversation. " + error.message, variant: "destructive" });
    }
  };

  const handleWorksClick = () => {
    portfolioRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const isLoading = authLoading || contextProfileLoading || pageLoading;

  if (isLoading) {
     return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mr-3" />
        <span className="text-lg text-muted-foreground">Loading artist profile...</span>
      </div>
     );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 glass-effect rounded-xl">
          <h2 className="text-3xl font-bold mb-3 ink-text-gradient">Artist Not Found</h2>
          <p className="text-muted-foreground mb-6">The artist profile for <span className="font-semibold text-foreground">@{username}</span> couldn't be loaded or doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }
  
  const artistHeaderData = {
    ...artist,
    portfolio_count: portfolio.length,
    followers_count: followerCount,
    reviews_count: reviews.length
  };

  const canEdit = user && user.id === artist.id;

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
          />
        </motion.div>

        {!canEdit && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }}
            className="my-6 flex flex-col sm:flex-row justify-center items-center gap-4"
          >
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
        <ConventionDatesSection artistId={artist.id} artistProfile={artist} />
        <ArtistPostsDisplay 
          artistId={artist.id} 
          artistUsername={artist.username}
          artistName={artist.name}
          artistProfilePhotoUrl={artist.profile_photo_url}
        />


        <div ref={portfolioRef}>
          {portfolio && portfolio.length > 0 && (
            <PortfolioGrid portfolio={portfolio} onImageSelect={setSelectedImage} />
          )}
          {portfolio && portfolio.length === 0 && !pageLoading && (
             <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.2 }}
              className="text-center py-12 glass-effect rounded-xl my-8"
            >
              <h3 className="text-xl font-semibold mb-2">Portfolio is Empty</h3>
              <p className="text-muted-foreground">This artist hasn't uploaded any portfolio images yet.</p>
            </motion.div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ReviewsSection reviews={reviews} artistId={artist.id} artistProfile={artist} onReviewAdded={handleReviewAdded} />
        </motion.div>
      </div>

      <ImageDialog 
        selectedImage={selectedImage} 
        artist={artist}
        onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)}
      />

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="glass-effect max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>
              {bookingContext.conventionDateId ? `Book at ${artist.name}'s Convention Spot` : `Request Booking with ${artist.name || artist.username}`}
            </DialogTitle>
            <DialogDescription>
              {bookingContext.conventionDateId ? 
                `Fill out the form to request a booking during this convention.` :
                `Please provide your preferred date and details for the booking.`
              }
            </DialogDescription>
          </DialogHeader>
          <BookingRequestForm 
            artistId={artist.id} 
            artistName={artist.name || artist.username}
            conventionDateId={bookingContext.conventionDateId}
            onSubmitSuccess={() => {
              setShowBookingDialog(false);
              toast({ title: "Booking Request Sent!", description: "The artist will review your request soon."});
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistProfile;
