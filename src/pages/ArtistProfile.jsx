
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Calendar, Star, Heart, ExternalLink, Clock, Users } from 'lucide-react';

const ArtistProfile = () => {
  const { username } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [artist, setArtist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ stars: 5, comment: '' });
  const [isFollowing, setIsFollowing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    // Load artist data
    const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
    const foundArtist = users.find(u => u.username === username && u.isArtist);
    setArtist(foundArtist);

    if (foundArtist) {
      // Load reviews
      const allReviews = JSON.parse(localStorage.getItem('inklink_reviews') || '[]');
      const artistReviews = allReviews.filter(r => r.artistId === foundArtist.id);
      setReviews(artistReviews);

      // Check if current user is following
      if (user && foundArtist.followers) {
        setIsFollowing(foundArtist.followers.includes(user.id));
      }
    }
  }, [username, user]);

  const handleFollow = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to follow artists.",
        variant: "destructive"
      });
      return;
    }

    const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
    const artistIndex = users.findIndex(u => u.id === artist.id);
    
    if (artistIndex !== -1) {
      if (!users[artistIndex].followers) {
        users[artistIndex].followers = [];
      }

      if (isFollowing) {
        users[artistIndex].followers = users[artistIndex].followers.filter(id => id !== user.id);
        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: `You're no longer following ${artist.name}.`
        });
      } else {
        users[artistIndex].followers.push(user.id);
        setIsFollowing(true);
        toast({
          title: "Following",
          description: `You're now following ${artist.name}!`
        });
      }

      localStorage.setItem('inklink_users', JSON.stringify(users));
      setArtist(users[artistIndex]);
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to leave reviews.",
        variant: "destructive"
      });
      return;
    }

    // Check if user already reviewed this artist
    const existingReview = reviews.find(r => r.reviewerId === user.id);
    if (existingReview) {
      toast({
        title: "Review already exists",
        description: "You can only leave one review per artist.",
        variant: "destructive"
      });
      return;
    }

    const review = {
      id: Date.now().toString(),
      artistId: artist.id,
      reviewerId: user.id,
      reviewerName: user.name,
      reviewerPhoto: user.profilePhoto,
      stars: newReview.stars,
      comment: newReview.comment,
      createdDate: new Date().toISOString()
    };

    const allReviews = JSON.parse(localStorage.getItem('inklink_reviews') || '[]');
    allReviews.push(review);
    localStorage.setItem('inklink_reviews', JSON.stringify(allReviews));

    setReviews([...reviews, review]);
    setNewReview({ stars: 5, comment: '' });
    setShowReviewForm(false);

    toast({
      title: "Review posted!",
      description: "Thank you for your feedback."
    });
  };

  const getActivityStatus = (lastActive) => {
    if (!lastActive) return null;
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffHours = (now - lastActiveDate) / (1000 * 60 * 60);
    
    if (diffHours < 48) return { text: 'Just Updated', color: 'text-green-400' };
    if (diffHours < 168) return { text: 'Recently Active', color: 'text-yellow-400' };
    return null;
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length).toFixed(1)
    : 0;

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Artist not found</h2>
          <p className="text-muted-foreground">The artist you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const activityStatus = getActivityStatus(artist.lastActive);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-2xl p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={artist.profilePhoto} alt={artist.name} />
              <AvatarFallback className="ink-gradient text-white text-2xl">
                {artist.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{artist.name}</h1>
                {activityStatus && (
                  <div className={`flex items-center space-x-1 ${activityStatus.color}`}>
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{activityStatus.text}</span>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mb-4">@{artist.username}</p>
              
              {artist.bio && (
                <p className="text-foreground mb-4">{artist.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                {artist.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{artist.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{artist.followers?.length || 0} followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>{averageRating} ({reviews.length} reviews)</span>
                </div>
              </div>

              {artist.styles && artist.styles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {artist.styles.map((style, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleFollow}
                variant={isFollowing ? "outline" : "default"}
                className={!isFollowing ? "ink-gradient" : ""}
              >
                <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                {isFollowing ? 'Following' : 'Follow'}
              </Button>

              {artist.bookingStatus && artist.bookingLink && (
                <Button variant="outline" asChild>
                  <a href={artist.bookingLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Book Now
                  </a>
                </Button>
              )}
            </div>
          </div>

          {artist.bookingStatus && artist.bookedUntil && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-400">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Available for bookings</span>
                {artist.bookedUntil && (
                  <span className="text-sm">
                    • Booked until {new Date(artist.bookedUntil).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Portfolio */}
        {artist.portfolio && artist.portfolio.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-effect rounded-2xl p-8 mb-8"
          >
            <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
            <div className="portfolio-grid">
              {artist.portfolio.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-2">
                    <img
                      src={item.image}
                      alt={item.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  {item.caption && (
                    <p className="text-sm text-muted-foreground">{item.caption}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-effect rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Reviews ({reviews.length})</h2>
            {user && user.id !== artist.id && (
              <Button
                onClick={() => setShowReviewForm(!showReviewForm)}
                variant="outline"
              >
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
                      onClick={() => setNewReview({...newReview, stars: star})}
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
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
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
        </motion.div>
      </div>
    </div>
  );
};

export default ArtistProfile;
