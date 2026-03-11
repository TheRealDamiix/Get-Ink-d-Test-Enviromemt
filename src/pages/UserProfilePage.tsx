import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, MessageSquare as MessageSquareIcon, Palette, Frown } from 'lucide-react';
import UserReviewsDialog from '@/components/profile/UserReviewsDialog';
import { useAuth } from '@/contexts/AuthContext';
import type { PageMeta, Profile } from '@/types';

const UserProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reviewsWrittenCount, setReviewsWrittenCount] = useState<number>(0);
  const [showUserReviewsDialog, setShowUserReviewsDialog] = useState<boolean>(false);
  const [userNotFound, setUserNotFound] = useState<boolean>(false);

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    setUserNotFound(false);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('username', username).single();

      if (error || !data) {
        setUserNotFound(true);
      } else {
        setProfile(data as Profile);
        const { count } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('reviewer_id', (data as Profile).id);
        setReviewsWrittenCount(count || 0);
      }
    } catch (e: unknown) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [username, toast]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleMessageUser = async () => {
    if (!currentUser) {
      toast({ title: "Please sign in", description: "You must be logged in to message users.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (!profile || currentUser.id === profile.id) {
      toast({ title: "Cannot message yourself", variant: "destructive" });
      return;
    }

    try {
      const { data: existing } = await supabase
        .rpc('start_or_get_conversation', { p_user1_id: currentUser.id, p_user2_id: profile.id })
        .single();

      if (existing && (existing as { conversation_id?: string }).conversation_id) {
        navigate(`/chat?conversationId=${(existing as { conversation_id: string }).conversation_id}`);
      } else {
        toast({ title: "Error", description: "Could not start or find conversation.", variant: "destructive" });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Error starting conversation:", error);
      toast({ title: "Error", description: `Could not start conversation: ${err.message}`, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;
  if (userNotFound) return <div className="min-h-screen flex items-center justify-center text-center p-4"><Frown className="w-24 h-24 mb-6" /><h1 className="text-4xl font-bold">User Not Found</h1></div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-center p-4"><UserCircle className="w-24 h-24 mb-6" /><h1 className="text-4xl font-bold">Profile Error</h1></div>;

  return (
    <>
      <div className="min-h-screen py-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto max-w-2xl">
          <div className="glass-effect rounded-2xl p-8 text-center shadow-xl">
            <Avatar className="w-32 h-32 mx-auto mb-6 border-4 border-primary/50">
              <AvatarImage src={profile.profile_photo_url ?? undefined} alt={profile.name ?? undefined} />
              <AvatarFallback className="ink-gradient text-5xl">{profile.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <h1 className="text-4xl font-bold mb-2">{profile.name || 'User'}</h1>
            <p className="text-xl text-muted-foreground mb-6">@{profile.username}</p>
            {profile.bio && <p className="text-foreground mb-6 max-w-md mx-auto">{profile.bio}</p>}

            <div className="flex justify-center space-x-4 mb-8">
              <Button variant="ghost" onClick={() => reviewsWrittenCount > 0 && setShowUserReviewsDialog(true)} disabled={reviewsWrittenCount === 0}>
                <MessageSquareIcon className="w-5 h-5 mr-2" /> {reviewsWrittenCount} Reviews Written
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {currentUser && currentUser.id !== profile.id && (
                <Button onClick={handleMessageUser} className="ink-gradient">
                  <MessageSquareIcon className="w-4 h-4 mr-2" /> Message User
                </Button>
              )}
              {profile.is_artist && (
                <Button asChild variant="outline">
                  <RouterLink to={`/artist/${profile.username}`}><Palette className="w-4 h-4 mr-2" /> View Artist Profile</RouterLink>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      <UserReviewsDialog open={showUserReviewsDialog} onOpenChange={setShowUserReviewsDialog} userProfile={profile} />
    </>
  );
};

export default UserProfilePage;

export const meta: PageMeta = {
  title: 'User Profile | InkSnap',
};
