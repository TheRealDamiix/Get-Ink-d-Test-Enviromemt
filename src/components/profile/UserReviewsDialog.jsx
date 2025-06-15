
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Star, MessageSquare as MessageSquareText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const UserReviewsDialog = ({ userProfile, open, onOpenChange }) => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserReviews = async () => {
      if (!userProfile?.id || !open) {
        setReviews([]);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*, artist:profiles!reviews_artist_id_fkey (id, username, name, profile_photo_url)')
          .eq('reviewer_id', userProfile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching user reviews:', error);
          toast({ title: "Error", description: "Could not load reviews by this user.", variant: "destructive" });
          setReviews([]);
        } else {
          setReviews(data || []);
        }
      } catch (e) {
        console.error("Unexpected error fetching user reviews:", e);
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchUserReviews();
    }
  }, [userProfile, open, toast]);

  const userName = userProfile?.name || userProfile?.username || 'User';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" /> Reviews by {userName}
          </DialogTitle>
          <DialogDescription>
            All reviews written by {userName}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto py-4 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">This user hasn't written any reviews yet.</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li key={review.id} className="border border-border/50 p-4 rounded-lg">
                  <div className="flex items-start gap-3 mb-2">
                    {review.artist && (
                       <Link 
                        to={`/artist/${review.artist.username}`} 
                        onClick={() => onOpenChange(false)}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={review.artist.profile_photo_url} alt={review.artist.name} />
                          <AvatarFallback className="ink-gradient text-white">
                            {review.artist.name?.charAt(0)?.toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    )}
                    <div className="flex-1">
                      {review.artist && (
                        <Link 
                          to={`/artist/${review.artist.username}`} 
                          onClick={() => onOpenChange(false)}
                          className="font-medium hover:text-primary transition-colors"
                        >
                            Review for: {review.artist.name || review.artist.username}
                        </Link>
                      )}
                      <div className="flex items-center mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${s <= review.stars ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">{review.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserReviewsDialog;
