import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, MessageSquare, Image as ImageIcon, Star, Edit3, CheckCircle, XCircle, ExternalLink, Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import FollowersDialog from '@/components/profile/FollowersDialog';
import AllArtistReviewsDialog from '@/components/profile/AllArtistReviewsDialog';


const formatAvailability = (availability) => {
  if (!availability || typeof availability !== 'object' || Object.keys(availability).length === 0) return [];
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const formatTime = (time) => time ? new Date(`1970-01-01T${time}Z`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) : '';
  return daysOrder.map(day => {
    const dayInfo = availability[day];
    if (dayInfo?.active && dayInfo.start && dayInfo.end) {
      return { day: day.charAt(0).toUpperCase() + day.slice(1), hours: `${formatTime(dayInfo.start)} - ${formatTime(dayInfo.end)}` };
    }
    return null;
  }).filter(Boolean);
};

const ArtistHeader = ({ artist, reviews, isFollowing, handleFollow, onWorksClick, nextConvention }) => {
  const { user } = useAuth();
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showAllReviewsDialog, setShowAllReviewsDialog] = useState(false);

  if (!artist) return null;

  const currentReviews = Array.isArray(reviews) ? reviews : [];
  const averageRating = currentReviews.length > 0 ? (currentReviews.reduce((acc, review) => acc + review.stars, 0) / currentReviews.length).toFixed(1) : 0;
  const canEdit = user && user.id === artist.id;
  const formattedAvailability = formatAvailability(artist.general_availability);
  const isValidUrl = (string) => { try { new URL(string); return true; } catch (_) { return false; } };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-effect rounded-2xl p-4 md:p-6 mb-8 relative overflow-hidden">
        {artist.location_thumbnail_url && <div className="absolute inset-0 bg-cover bg-center opacity-10 z-0" style={{ backgroundImage: `url(${artist.location_thumbnail_url})` }}></div>}
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-primary/70 shadow-lg">
              <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
              <AvatarFallback className="ink-gradient text-3xl md:text-4xl text-primary-foreground">{artist.name?.charAt(0)?.toUpperCase() || 'A'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-bold">{artist.name || 'Unnamed Artist'}</h1>
              <p className="text-md text-muted-foreground mb-1">@{artist.username}</p>
              {artist.location && <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start"><MapPin className="w-3 h-3 mr-1.5" /> {artist.location}</p>}
            </div>
            {!canEdit && <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"} size="sm" className={`mt-2 sm:mt-0 ${isFollowing ? '' : 'ink-gradient'}`}>{isFollowing ? 'Unfollow' : 'Follow'}</Button>}
            {canEdit && <Button asChild variant="outline" size="sm" className="mt-2 sm:mt-0"><Link to="/artist-dashboard?tab=profile"><Edit3 className="w-4 h-4 mr-2" /> Edit</Link></Button>}
          </div>

          <div className="grid grid-cols-4 gap-1 text-center mb-4">
            <button onClick={() => artist.followers_count > 0 && setShowFollowersDialog(true)} className="p-2 rounded-lg hover:bg-primary/10 transition-colors"><Users className="w-5 h-5 mx-auto mb-1 text-primary" /><p className="text-sm font-semibold">{artist.followers_count || 0}</p><p className="text-xs text-muted-foreground">Followers</p></button>
            <button onClick={() => currentReviews.length > 0 && setShowAllReviewsDialog(true)} className="p-2 rounded-lg hover:bg-primary/10 transition-colors"><MessageSquare className="w-5 h-5 mx-auto mb-1 text-yellow-400" /><p className="text-sm font-semibold">{currentReviews.length || 0}</p><p className="text-xs text-muted-foreground">Reviews</p></button>
            <button onClick={onWorksClick} className="p-2 rounded-lg hover:bg-primary/10 transition-colors"><ImageIcon className="w-5 h-5 mx-auto mb-1 text-green-400" /><p className="text-sm font-semibold">{artist.portfolio_count || 0}</p><p className="text-xs text-muted-foreground">Works</p></button>
            <div className="p-2"><Star className="w-5 h-5 mx-auto mb-1 text-orange-400 fill-current" /><p className="text-sm font-semibold">{averageRating > 0 ? averageRating : 'N/A'}</p><p className="text-xs text-muted-foreground">Rating</p></div>
          </div>

          {artist.bio && <p className="text-sm text-foreground/90 mb-4 text-center md:text-left leading-relaxed">{artist.bio}</p>}

          {nextConvention && (
            <div className="mb-4 pt-3 border-t border-border/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center text-foreground"><Calendar className="w-4 h-4 mr-2 text-primary" /> Next Convention</h3>
              <div className="text-xs bg-primary/10 p-2 rounded-md">
                <p className="font-bold text-primary">{nextConvention.event_name}</p>
                <p className="text-muted-foreground">{nextConvention.location}</p>
                <p className="text-muted-foreground">{new Date(nextConvention.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          )}

          {formattedAvailability.length > 0 && (
            <div className="mb-4 pt-3 border-t border-border/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center text-foreground"><Clock className="w-4 h-4 mr-2 text-primary" /> General Availability</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                {formattedAvailability.map(item => <div key={item.day} className="flex justify-between"><span className="font-medium text-foreground/90">{item.day}:</span><span className="text-muted-foreground">{item.hours}</span></div>)}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border/30">
            {artist.styles?.length > 0 && <div className="flex flex-wrap justify-center md:justify-start gap-1.5">{artist.styles.map(style => <Badge key={style} variant="secondary">{style}</Badge>)}</div>}
            <div className={`flex items-center text-xs font-medium ${artist.booking_status ? 'text-green-400' : 'text-red-500'}`}><div className={`w-2 h-2 rounded-full mr-2 ${artist.booking_status ? 'bg-green-400' : 'bg-red-500'}`}></div>{artist.booking_status ? 'Available' : 'Booked'}</div>
          </div>
        </div>
      </motion.div>

      <FollowersDialog artistId={artist.id} artistName={artist.name || artist.username} open={showFollowersDialog} onOpenChange={setShowFollowersDialog} />
      <AllArtistReviewsDialog allReviews={currentReviews} artistProfile={artist} open={showAllReviewsDialog} onOpenChange={setShowAllReviewsDialog} />
    </>
  );
};

export default ArtistHeader;
