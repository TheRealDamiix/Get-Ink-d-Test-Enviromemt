import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient'; // Import supabase client

const ReviewsSection = ({ reviews, artistId, onReviewAdded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newReview, setNewReview] = useState({ stars: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleReviewSubmit = async (e) => { // Make function async
    e.preventDefault();
    
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to leave reviews.", variant: "destructive" });
      return;
    }

    setIsSubmittingReview(true); // Start loading state

    try {
      // Check if user has already reviewed this artist from DB (more reliable than localStorage)
      const { data: existingReview, error: existingReviewError } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('artist_id', artistId)
        .maybeSingle();

      if (existingReviewError && existingReviewError.code !== 'PGRST116') {
        throw new Error(existingReviewError.message);
      }

      if (existingReview) {
        toast({ title: "Review already exists", description: "You can only leave one review per artist.", variant: "destructive" });
        return;
      }

      // Insert review into Supabase
      const { data, error } = await supabase
        .from('reviews')
        .insert([
          {
            artist_id: artistId,
            reviewer_id: user.id,
            stars: newReview.stars,
            comment: newReview.comment,
            // created_at will be automatically set by Supabase if column has default value NOW()
          }
        ])
        .select(); // Select the inserted data to get auto-generated fields like id and created_at

      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.length > 0) {
        const postedReview = data[0];
        // Adapt the posted review data to match the expected format in reviews state
        onReviewAdded({
          ...postedReview,
          reviewer: {
            id: user.id,
            name: user.name, // Use user.name from AuthContext
            profile_photo_url: user.profile_photo_url // Use user.profile_photo_url from AuthContext
          }
        });
        setNewReview({ stars: 5, comment: '' });
        setShowReviewForm(false);
        toast({ title: "Review posted!", description: "Thank you for your feedback." });
      }

    } catch (error) {
      console.error("Error posting review:", error);
      toast({ title: "Error posting review", description: error.message || 'An unexpected error occurred.', variant: "destructive" });
    } finally {
      setIsSubmittingReview(false); // End loading state
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Reviews ({reviews.length})</h2>
        {user && user.id !== artistId && (
          <Button onClick={() => setShowReviewForm(!showReviewForm)} variant="outline">
            Write Review
          </Button>
        )}
      </div>

      {showReviewForm && (
        <form onSubmit={handleReviewSubmit} className="mb-8 p-6 border border-border rounded-lg">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setNewReview({ ...newReview, stars: star })}
                  className={`w-8 h-8 ${star <= newReview.stars ? 'text-yellow-400' : 'text-muted-foreground'}`}
                >
                  <Star className="w-full h-full fill-current" />
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Comment</label>
            <Textarea
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              placeholder="Share your experience..."
              required
              disabled={isSubmittingReview}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="ink-gradient" disabled={isSubmittingReview}>
              {isSubmittingReview ? 'Posting...' : 'Post Review'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)} disabled={isSubmittingReview}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-border pb-6 last:border-b-0">
              <div className="flex items-start gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.reviewer?.profile_photo_url || ''} alt={review.reviewer?.name || 'User'} /> {/* Use reviewer.profile_photo_url */}
                  <AvatarFallback className="ink-gradient text-white">
                    {review.reviewer?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{review.reviewer?.name}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= review.stars ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.created_at || review.createdDate).toLocaleDateString()} {/* Use created_at if available from DB */}
                    </span>
                  </div>
                  <p className="text-foreground">{review.comment}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewsSection;

export default ReviewsSection;
