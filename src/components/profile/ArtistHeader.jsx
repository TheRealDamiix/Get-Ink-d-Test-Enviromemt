
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Edit3, Star, MessageSquare, Image as ImageIcon, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FollowersDialog from '@/components/profile/FollowersDialog';

const ArtistHeader = ({ artist, reviews, isFollowing, handleFollow }) => {
  const { user } = useAuth();
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);

  if (!artist) return null;

  const totalStars = reviews.reduce((acc, review) => acc + review.stars, 0);
  const averageRating = reviews.length > 0 ? (totalStars / reviews.length).toFixed(1) : 'N/A';

  const canEdit = user && user.id === artist.id;

  return (
    <>
      <div className="glass-effect rounded-2xl p-6 md:p-8 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-primary/50 shadow-lg">
            <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
            <AvatarFallback className="ink-gradient text-4xl text-primary-foreground">
              {artist.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-1">{artist.name}</h1>
            <p className="text-lg text-muted-foreground mb-3">@{artist.username}</p>
            
            {artist.location && (
              <div className="flex items-center justify-center sm:justify-start text-sm text-muted-foreground mb-1">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{artist.location}</span>
              </div>
            )}

            <div className="flex items-center justify-center sm:justify-start space-x-4 my-3">
              <button onClick={() => setShowFollowersDialog(true)} className="flex items-center text-sm hover:text-primary transition-colors">
                <Users className="w-4 h-4 mr-1 text-primary" />
                <span>{artist.followers_count || 0} Followers</span>
              </button>
              <div className="flex items-center text-sm">
                <MessageSquare className="w-4 h-4 mr-1 text-primary" />
                <span>{artist.reviews_count || 0} Reviews</span>
              </div>
              <div className="flex items-center text-sm">
                <ImageIcon className="w-4 h-4 mr-1 text-primary" />
                <span>{artist.portfolio_count || 0} Works</span>
              </div>
            </div>

            {artist.bio && <p className="text-sm text-foreground my-4">{artist.bio}</p>}
            
            {artist.styles && artist.styles.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
                {artist.styles.map((style, index) => (
                  <span key={index} className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full font-medium">
                    {style}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center sm:justify-start space-x-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="text-lg font-semibold">{averageRating}</span>
              <span className="text-sm text-muted-foreground">({reviews.length} reviews)</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center sm:justify-start">
              {canEdit ? (
                <Button asChild className="ink-gradient w-full sm:w-auto">
                  <Link to="/artist-dashboard?tab=settings">
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
                  </Link>
                </Button>
              ) : (
                <Button onClick={handleFollow} className="ink-gradient w-full sm:w-auto">
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
              )}
              {artist.booking_link && (
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <a href={artist.booking_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Book Now
                  </a>
                </Button>
              )}
            </div>
              {artist.booking_status !== null && (
                  <div className={`mt-4 flex items-center justify-center sm:justify-start text-sm font-medium ${artist.booking_status ? 'text-green-500' : 'text-red-500'}`}>
                      {artist.booking_status ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                      {artist.booking_status ? 'Available for Bookings' : 'Currently Not Available'}
                      {artist.booked_until && !artist.booking_status && (
                          <span className="text-muted-foreground ml-1">(until {new Date(artist.booked_until).toLocaleDateString()})</span>
                      )}
                  </div>
              )}
          </div>
        </div>
      </div>
      {artist && artist.id && (
        <FollowersDialog
          artistId={artist.id}
          artistName={artist.name || artist.username}
          open={showFollowersDialog}
          onOpenChange={setShowFollowersDialog}
        />
      )}
    </>
  );
};

export default ArtistHeader;
