
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Calendar, Star, Heart, ExternalLink, Clock, Users } from 'lucide-react';

const ArtistHeader = ({ artist, reviews, isFollowing, handleFollow }) => {
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
  
  const activityStatus = getActivityStatus(artist.lastActive);

  return (
    <div className="glass-effect rounded-2xl p-8 mb-8">
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
          
          {artist.bio && <p className="text-foreground mb-4">{artist.bio}</p>}

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
                <span key={idx} className="px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">
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
    </div>
  );
};

export default ArtistHeader;
