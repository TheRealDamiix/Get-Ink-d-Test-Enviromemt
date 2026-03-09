
import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare as MessageSquareText } from 'lucide-react';

const AllArtistReviewsDialog = ({ artistProfile, allReviews, open, onOpenChange }) => {
  const artistName = artistProfile?.name || artistProfile?.username || 'Artist';
  const currentReviews = Array.isArray(allReviews) ? allReviews : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" /> All Reviews for {artistName}
          </DialogTitle>
          <DialogDescription>
            Browse all feedback for {artistName}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto py-4 pr-2 custom-scrollbar">
          {currentReviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">This artist has no reviews yet.</p>
          ) : (
            <ul className="space-y-6">
              {currentReviews.map((review) => (
                <li key={review.id} className="border-b border-border/30 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    <Link 
                        to={review.reviewer?.username ? `/user/${review.reviewer.username}` : '#'}
                        onClick={() => onOpenChange(false)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={review.reviewer?.profile_photo_url} alt={review.reviewer?.name} />
                        <AvatarFallback className="ink-gradient text-white">
                          {review.reviewer?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link 
                            to={review.reviewer?.username ? `/user/${review.reviewer.username}` : '#'}
                            onClick={() => onOpenChange(false)}
                            className="font-medium hover:text-primary transition-colors"
                        >
                          {review.reviewer?.name || review.reviewer?.username || 'Anonymous'}
                        </Link>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${s <= review.stars ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                      <p className="text-foreground mt-2">{review.comment}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AllArtistReviewsDialog;
