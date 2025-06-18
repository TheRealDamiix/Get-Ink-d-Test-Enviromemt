import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, ExternalLink, MapPin, Palette } from 'lucide-react';

const ArtistInfoPanel = ({ artist, bookings }) => {
  if (!artist) return null;

  const upcomingBookings = bookings.filter(b => new Date(b.requested_datetime) > new Date());

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="w-full h-full bg-card/40 p-4 flex flex-col custom-scrollbar overflow-y-auto">
      {/* Artist Info */}
      <div className="text-center mb-6">
        <Avatar className="w-24 h-24 mx-auto mb-3 border-4 border-primary/50 shadow-lg">
          <AvatarImage src={artist.profile_photo_url} alt={artist.name} />
          <AvatarFallback className="ink-gradient text-3xl">{artist.name?.charAt(0) || 'A'}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{artist.name}</h2>
        <p className="text-sm text-muted-foreground">@{artist.username}</p>
        <div className={`flex items-center justify-center mt-2 text-xs font-medium ${artist.booking_status ? 'text-green-400' : 'text-red-500'}`}>
          <div className={`w-2 h-2 rounded-full mr-1.5 ${artist.booking_status ? 'bg-green-400' : 'bg-red-500'}`}></div>
          {artist.booking_status ? 'Available for Booking' : 'Bookings Closed'}
        </div>
      </div>

      {/* Details Section */}
      <div className="space-y-4 text-sm">
        {artist.location && (
          <div className="flex items-start">
            <MapPin className="w-4 h-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
            <p>{artist.location}</p>
          </div>
        )}
        
        {artist.styles && artist.styles.length > 0 && (
          <div className="flex items-start">
            <Palette className="w-4 h-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {artist.styles.map(style => <Badge key={style} variant="secondary">{style}</Badge>)}
            </div>
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={`/artist/${artist.username}`}>
                <ExternalLink className="w-4 h-4 mr-2" /> View Full Profile
            </Link>
        </Button>
      </div>

      {/* Bookings Section */}
      <div className="mt-6 pt-4 border-t border-border/50">
        <h3 className="text-md font-semibold mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            Your Bookings
        </h3>
        {upcomingBookings.length > 0 ? (
            <div className="space-y-3">
                {upcomingBookings.map(booking => (
                    <div key={booking.id} className="text-xs p-2.5 rounded-md bg-background/50">
                        <p className="font-semibold text-primary">{booking.status === 'confirmed' ? 'Confirmed Appointment' : 'Pending Request'}</p>
                        <p className="text-muted-foreground flex items-center mt-1"><Clock className="w-3 h-3 mr-1.5" />{formatDate(booking.requested_datetime)}</p>
                        {booking.status === 'confirmed' && booking.duration_minutes && (
                            <p className="text-muted-foreground flex items-center"><CheckCircle className="w-3 h-3 mr-1.5 text-green-400" />{booking.duration_minutes} minutes</p>
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-xs text-muted-foreground text-center py-4">You have no upcoming bookings with this artist.</p>
        )}
      </div>
    </div>
  );
};

export default ArtistInfoPanel;
