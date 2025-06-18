import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, MessageSquare, Image as ImageIcon, Star, Edit3, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import FollowersDialog from '@/components/profile/FollowersDialog';
import AllArtistReviewsDialog from '@/components/profile/AllArtistReviewsDialog';

const ArtistHeader = ({ artist, reviews, isFollowing, handleFollow, onWorksClick }) => {
  const { user } = useAuth();
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showAllReviewsDialog, setShowAllReviewsDialog] = useState(false);

  if (!artist) return null;

  const currentReviews = Array.isArray(reviews) ? reviews : [];

  const averageRating = currentReviews.length > 0 
    ? (currentReviews.reduce((acc, review) => acc + review.stars, 0) / currentReviews.length).toFixed(1) 
    : 0;

  const canEdit = user && user.id === artist.id;

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;  
    }
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect rounded-2xl p-4 md:p-6 mb-8 relative overflow-hidden" // Reduced padding
      >
        {artist.location_thumbnail_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10 z-0"
            style={{ backgroundImage: `url(${artist.location_thumbnail_url})` }}
          ></div>
        )}
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-primary/70 shadow-lg"> {/* Smaller Avatar */}
              <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
              <AvatarFallback className="ink-gradient text-3xl md:text-4xl text-primary-foreground">
                {artist.name?.charAt(0)?.toUpperCase() || artist.username?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold">{artist.name || 'Unnamed Artist'}</h1> {/* Smaller Font */}
              <p className="text-md text-muted-foreground mb-1">@{artist.username}</p> {/* Smaller Font */}
              {artist.location && (
                <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start">
                  <MapPin className="w-3 h-3 mr-1.5 text-foreground" /> {artist.location}
                </p>
              )}
              {artist.studio_name && (
                <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start mt-1">
                  <span className="font-semibold mr-1.5">Studio:</span> {artist.studio_name}
                </p>
              )}
            </div>
             {!canEdit && (
              <Button 
                onClick={handleFollow} 
                variant={isFollowing ? "outline" : "default"}
                size="sm" // Smaller button
                className={`mt-2 sm:mt-0 ${isFollowing ? '' : 'ink-gradient'}`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
            {canEdit && (
               <Button asChild variant="outline" size="sm" className="mt-2 sm:mt-0">
                <Link to="/artist-dashboard?tab=profile">
                  <Edit3 className="w-4 h-4 mr-2 text-foreground" /> Edit Profile
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-4"> {/* Reduced gap */}
            <button onClick={() => artist.followers_count > 0 && setShowFollowersDialog(true)} className={`p-2 rounded-lg ${artist.followers_count > 0 ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'}`}>
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" /> {/* Smaller Icon */}
              <p className="text-sm font-semibold">{artist.followers_count || 0}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </button>
            <button onClick={() => currentReviews.length > 0 && setShowAllReviewsDialog(true)} className={`p-2 rounded-lg ${currentReviews.length > 0 ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'}`}>
              <MessageSquare className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
              <p className="text-sm font-semibold">{currentReviews.length || 0}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </button>
             <button onClick={onWorksClick} className={`p-2 rounded-lg ${artist.portfolio_count > 0 ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'}`}>
              <ImageIcon className="w-5 h-5 mx-auto mb-1 text-green-400" />
              <p className="text-sm font-semibold">{artist.portfolio_count || 0}</p>
              <p className="text-xs text-muted-foreground">Works</p>
            </button>
            <div className="p-2">
              <Star className="w-5 h-5 mx-auto mb-1 text-orange-400 fill-current" />
              <p className="text-sm font-semibold">{averageRating > 0 ? averageRating : 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </div>
          
          {artist.bio && <p className="text-sm text-foreground/90 mb-4 text-center md:text-left leading-relaxed">{artist.bio}</p>}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border/30">
             {artist.styles && artist.styles.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                  {artist.styles.map(style => (
                    <Badge key={style} variant="secondary">{style}</Badge>
                  ))}
                </div>
              )}
            <div className={`flex items-center text-xs font-medium ${artist.booking_status ? 'text-green-400' : 'text-red-500'}`}>
              {artist.booking_status ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
              {artist.booking_status ? 'Available' : 'Booked'}
            </div>
          </div>
        </div>
      </motion.div>

      <FollowersDialog 
        artistId={artist.id} 
        artistName={artist.name || artist.username}
        open={showFollowersDialog} 
        onOpenChange={setShowFollowersDialog} 
      />
      <AllArtistReviewsDialog
        allReviews={currentReviews}
        artistProfile={artist}
        open={showAllReviewsDialog}
        onOpenChange={setShowAllReviewsDialog}
      />
    </>
  );
};

export default ArtistHeader;
