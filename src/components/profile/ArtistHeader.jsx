
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
        className="glass-effect rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden"
      >
        {artist.location_thumbnail_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10 z-0"
            style={{ backgroundImage: `url(${artist.location_thumbnail_url})` }}
          ></div>
        )}
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/70 shadow-lg">
              <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
              <AvatarFallback className="ink-gradient text-4xl md:text-5xl text-primary-foreground">
                {artist.name?.charAt(0)?.toUpperCase() || artist.username?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-1">{artist.name || 'Unnamed Artist'}</h1>
              <p className="text-lg text-muted-foreground mb-2">@{artist.username}</p>
              {artist.location && (
                <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start mb-1">
                  <MapPin className="w-4 h-4 mr-1.5 text-foreground" /> {artist.location}
                </p>
              )}
              {artist.studio_name && (
                <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start">
                  <span className="font-semibold mr-1.5">Studio:</span> {artist.studio_name}
                </p>
              )}
            </div>
            {!canEdit && (
              <Button 
                onClick={handleFollow} 
                variant={isFollowing ? "outline" : "default"}
                className={`mt-4 md:mt-0 ${isFollowing ? '' : 'ink-gradient'}`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
            )}
            {canEdit && (
               <Button asChild variant="outline" className="mt-4 md:mt-0">
                <Link to="/artist-dashboard?tab=profile">
                  <Edit3 className="w-4 h-4 mr-2 text-foreground" /> Edit Profile
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-6">
            <button onClick={() => artist.followers_count > 0 && setShowFollowersDialog(true)} className={`p-3 rounded-lg ${artist.followers_count > 0 ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'}`}>
              <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="font-semibold">{artist.followers_count || 0}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </button>
            <button onClick={() => currentReviews.length > 0 && setShowAllReviewsDialog(true)} className={`p-3 rounded-lg ${currentReviews.length > 0 ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'}`}>
              <MessageSquare className="w-6 h-6 mx-auto mb-1 text-yellow-400" />
              <p className="font-semibold">{currentReviews.length || 0}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </button>
            <button onClick={onWorksClick} className={`p-3 rounded-lg ${artist.portfolio_count > 0 ? 'hover:bg-primary/10 cursor-pointer' : 'cursor-default'}`}>
              <ImageIcon className="w-6 h-6 mx-auto mb-1 text-green-400" />
              <p className="font-semibold">{artist.portfolio_count || 0}</p>
              <p className="text-xs text-muted-foreground">Works</p>
            </button>
            <div className="p-3">
              <Star className="w-6 h-6 mx-auto mb-1 text-orange-400 fill-current" />
              <p className="font-semibold">{averageRating > 0 ? averageRating : 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Avg. Rating</p>
            </div>
          </div>

          {artist.bio && <p className="text-foreground/90 mb-4 text-center md:text-left leading-relaxed">{artist.bio}</p>}

          {artist.styles && artist.styles.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              {artist.styles.map(style => (
                <Badge key={style} variant="secondary" className="text-sm">{style}</Badge>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/30">
            <div className={`flex items-center ${artist.booking_status ? 'text-green-400' : 'text-red-500'}`}>
              {artist.booking_status ? <CheckCircle className="w-5 h-5 mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
              <span className="font-medium">
                {artist.booking_status ? 'Available for Booking' : 
                  (artist.booked_until ? `Booked until ${new Date(artist.booked_until).toLocaleDateString()}` : 'Currently Not Available')}
              </span>
            </div>
            {artist.booking_link && isValidUrl(artist.booking_link) ? (
              <Button variant="outline" size="sm" asChild>
                <a href={artist.booking_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2 text-foreground" /> Booking Info
                </a>
              </Button>
            ) : artist.booking_link ? (
                 <Button variant="outline" size="sm" disabled>
                  <ExternalLink className="w-4 h-4 mr-2 text-foreground" /> Invalid Booking Link
                </Button>
            ) : null}
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