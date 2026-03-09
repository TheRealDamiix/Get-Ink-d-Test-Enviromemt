import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Star, MessageSquare as MessageSquareText, X, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

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
      <DialogContent className="glass-effect sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquareText className="w-6 h-6 text-primary" /> Reviews by {userName}
          </DialogTitle>
          <DialogDescription>
            All reviews written by {userName}.
          </DialogDescription>
        </DialogHeader>
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 rounded-full"
            onClick={() => onOpenChange(false)}
        >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </Button>
        <div className="max-h-[70vh] overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <MessageSquareText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">This user hasn't written any reviews yet.</p>
            </div>
          ) : (
            <ul className="space-y-5">
              {reviews.map((review) => (
                <li key={review.id} className="bg-background/40 border border-border/50 p-4 rounded-xl shadow-sm">
                  <div className="flex items-start gap-4 mb-2">
                    {review.artist && (
                       <Link 
                        to={`/artist/${review.artist.username}`} 
                        onClick={() => onOpenChange(false)}
                        className="shrink-0"
                      >
                        <Avatar className="w-12 h-12 border-2 border-primary/30">
                          <AvatarImage src={review.artist.profile_photo_url} alt={review.artist.name} />
                          <AvatarFallback className="ink-gradient text-white">
                            {review.artist.name?.charAt(0)?.toUpperCase() || review.artist.username?.charAt(0)?.toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    )}
                    <div className="flex-1">
                      {review.artist && (
                        <Link 
                          to={`/artist/${review.artist.username}`} 
                          onClick={() => onOpenChange(false)}
                          className="font-semibold text-base hover:text-primary transition-colors flex items-center group"
                        >
                            Review for: {review.artist.name || review.artist.username}
                            <ExternalLink className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                        </Link>
                      )}
                      <div className="flex items-center mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${s <= review.stars ? 'text-yellow-400 fill-current' : 'text-muted-foreground/50'}`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md leading-relaxed">{review.comment}</p>
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