
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Home, UserCircle, MessageSquare as MessageSquareText, Palette, Frown } from 'lucide-react';
import UserReviewsDialog from '@/components/profile/UserReviewsDialog';

const UserProfilePage = () => {
  const { username } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsWrittenCount, setReviewsWrittenCount] = useState(0);
  const [showUserReviewsDialog, setShowUserReviewsDialog] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    setUserNotFound(false);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        if (error && (error.code === 'PGRST116' || error.details?.includes('0 rows'))) {
          setUserNotFound(true);
        } else {
          toast({ title: "Error loading profile", description: `Could not load profile for @${username}. ${error?.message || ''}`, variant: "destructive" });
        }
        setProfile(null);
      } else {
        setProfile(data);
        const { count, error: reviewError } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('reviewer_id', data.id);
        if (reviewError) console.error('Error fetching review count:', reviewError);
        else setReviewsWrittenCount(count || 0);
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred while fetching the profile.", variant: "destructive" });
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [username, toast]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-2xl font-semibold text-foreground">Loading User Profile</h2>
        <p className="text-muted-foreground">Just a moment, fetching @{username}'s details...</p>
      </div>
    );
  }

  if (userNotFound) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-4">
        <Frown className="w-24 h-24 text-primary/70 mb-6" />
        <h1 className="text-4xl font-bold mb-3">User Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8">Sorry, we couldn't find a profile for <span className="font-semibold text-foreground">@{username}</span>.</p>
        <Button onClick={() => navigate('/')} className="ink-gradient">
          <Home className="w-4 h-4 mr-2 text-white" /> Go to Homepage
        </Button>
      </div>
    );
  }
  
  if (!profile && !isLoading) { 
     return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-4">
        <UserCircle className="w-24 h-24 text-destructive mb-6" />
        <h1 className="text-4xl font-bold mb-3">Profile Error</h1>
        <p className="text-lg text-muted-foreground mb-8">There was an issue loading this user's profile. Please try again later.</p>
        <Button onClick={() => navigate('/')} className="ink-gradient">
          <Home className="w-4 h-4 mr-2 text-white" /> Go to Homepage
        </Button>
      </div>
    );
  }


  return (
    <>
      <div className="min-h-screen py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto max-w-2xl"
        >
          <div className="glass-effect rounded-2xl p-8 text-center shadow-xl">
            <Avatar className="w-32 h-32 mx-auto mb-6 border-4 border-primary/50 shadow-lg">
              <AvatarImage src={profile.profile_photo_url} alt={profile.name || profile.username} />
              <AvatarFallback className="ink-gradient text-5xl text-primary-foreground">
                {profile.name?.charAt(0)?.toUpperCase() || profile.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-4xl font-bold mb-2">{profile.name || 'Unnamed User'}</h1>
            <p className="text-xl text-muted-foreground mb-6">@{profile.username}</p>
            
            {profile.bio && (
              <p className="text-foreground mb-6 max-w-md mx-auto leading-relaxed">{profile.bio}</p>
            )}

            {profile.location && (
              <p className="text-muted-foreground mb-6 flex items-center justify-center">
                <span className="inline-block mr-2 text-primary">📍</span>{profile.location}
              </p>
            )}

            <div className="flex justify-center space-x-4 mb-8">
              <button 
                onClick={() => reviewsWrittenCount > 0 && setShowUserReviewsDialog(true)}
                className={`flex items-center text-muted-foreground ${reviewsWrittenCount > 0 ? 'hover:text-primary cursor-pointer' : 'cursor-default'}`}
                disabled={reviewsWrittenCount === 0}
              >
                <MessageSquareText className="w-5 h-5 mr-2 text-primary" />
                <span>{reviewsWrittenCount} Reviews Written</span>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {reviewsWrittenCount > 0 && (
                <Button onClick={() => setShowUserReviewsDialog(true)} variant="outline" className="w-full sm:w-auto">
                  <MessageSquareText className="w-4 h-4 mr-2 text-foreground" /> View All Reviews
                </Button>
              )}
              {profile.is_artist && (
                <Button asChild className="ink-gradient w-full sm:w-auto">
                  <RouterLink to={`/artist/${profile.username}`}>
                    <Palette className="w-4 h-4 mr-2 text-white" /> View Artist Profile
                  </RouterLink>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      {profile && (
        <UserReviewsDialog
          userProfile={profile}
          open={showUserReviewsDialog}
          onOpenChange={(isOpen) => {
            setShowUserReviewsDialog(isOpen);
          }}
        />
      )}
    </>
  );
};

export default UserProfilePage;