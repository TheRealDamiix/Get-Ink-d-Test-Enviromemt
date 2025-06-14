
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ReviewsSection = ({ reviews, artistId, onReviewAdded }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newReview, setNewReview] = useState({ stars: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to leave reviews.", variant: "destructive" });
      return;
    }

    const allReviews = JSON.parse(localStorage.getItem('inksnap_reviews') || '[]');
    const existingReview = allReviews.find(r => r.reviewerId === user.id && r.artistId === artistId);
    if (existingReview) {
      toast({ title: "Review already exists", description: "You can only leave one review per artist.", variant: "destructive" });
      return;
    }

    const review = {
      id: Date.now().toString(),
      artistId: artistId,
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerPhoto: user.profilePhoto,
      stars: newReview.stars,
      comment: newReview.comment,
      createdDate: new Date().toISOString()
    };
    
    allReviews.push(review);
    localStorage.setItem('inksnap_reviews', JSON.stringify(allReviews));

    onReviewAdded(review);
    setNewReview({ stars: 5, comment: '' });
    setShowReviewForm(false);
    toast({ title: "Review posted!", description: "Thank you for your feedback." });
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
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="ink-gradient">Post Review</Button>
            <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)}>
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
                  <AvatarImage src={review.reviewerPhoto} alt={review.reviewerName} />
                  <AvatarFallback className="ink-gradient text-white">
                    {review.reviewerName?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{review.reviewerName}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= review.stars ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.createdDate).toLocaleDateString()}
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
