
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import UserReviewsDialog from '@/components/profile/UserReviewsDialog';
import { Link } from 'react-router-dom';

const ReviewsSection = ({ reviews, artistId, onReviewAdded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newReview, setNewReview] = useState({ stars: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserReviewsDialog, setShowUserReviewsDialog] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState(null);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to leave reviews.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (user.id === artistId) {
      toast({ title: "Cannot review yourself", description: "Artists cannot review their own profiles.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const existingReview = reviews.find(r => r.reviewer && r.reviewer.id === user.id);
    if (existingReview) {
      toast({ title: "Review already exists", description: "You can only leave one review per artist.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      await onReviewAdded({ stars: newReview.stars, comment: newReview.comment });
      setNewReview({ stars: 5, comment: '' });
      setShowReviewForm(false);
    } catch (error) {
      // Toast for error is handled in ArtistProfile's onReviewAdded
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUserReviews = (reviewer) => {
    setSelectedReviewer(reviewer);
    setShowUserReviewsDialog(true);
  };

  return (
    <>
      <div className="glass-effect rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Reviews ({reviews.length})</h2>
          {user && user.id !== artistId && !reviews.some(r => r.reviewer && r.reviewer.id === user.id) && (
            <Button onClick={() => setShowReviewForm(!showReviewForm)} variant="outline" disabled={isSubmitting}>
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
                    disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="ink-gradient" disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Post Review'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)} disabled={isSubmitting}>
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
                  <Link to={review.reviewer?.username ? `/user/${review.reviewer.username}` : '#'}>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={review.reviewer?.profile_photo_url} alt={review.reviewer?.name} />
                      <AvatarFallback className="ink-gradient text-white">
                        {review.reviewer?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <button 
                        onClick={() => handleOpenUserReviews(review.reviewer)} 
                        className="font-medium hover:text-primary transition-colors"
                        disabled={!review.reviewer}
                      >
                        {review.reviewer?.name || review.reviewer?.username || 'Anonymous'}
                      </button>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.stars ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
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
      {selectedReviewer && (
        <UserReviewsDialog
          userProfile={selectedReviewer}
          open={showUserReviewsDialog}
          onOpenChange={setShowUserReviewsDialog}
        />
      )}
    </>
  );
};

export default ReviewsSection;
