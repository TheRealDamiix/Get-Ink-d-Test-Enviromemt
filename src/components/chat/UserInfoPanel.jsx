import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Compass, Calendar, CheckCircle, XCircle, Clock, History } from 'lucide-react';
import { calculateDistance, cn } from '@/lib/utils';

const BookingStatusBadge = ({ status }) => {
    const statusMap = {
        confirmed: 'bg-green-500/20 text-green-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        cancelled_by_client: 'bg-red-500/20 text-red-500',
        declined_by_artist: 'bg-red-500/20 text-red-500',
    };
    return (
        <Badge variant="outline" className={cn("text-xs border", statusMap[status] || 'bg-muted')}>
            {status.replace(/_/g, ' ')}
        </Badge>
    );
};


const UserInfoPanel = ({ client, artist, bookings }) => {
  if (!client) return null;

  const distance = (client.latitude && client.longitude && artist?.latitude && artist.longitude)
    ? calculateDistance(artist.latitude, artist.longitude, client.latitude, client.longitude)
    : null;

  const now = new Date();
  const upcomingBookings = bookings.filter(b => new Date(b.requested_datetime) >= now).sort((a, b) => new Date(a.requested_datetime) - new Date(b.requested_datetime));
  const pastBookings = bookings.filter(b => new Date(b.requested_datetime) < now).sort((a, b) => new Date(b.requested_datetime) - new Date(a.requested_datetime));


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full h-full bg-card/40 p-4 flex flex-col custom-scrollbar overflow-y-auto">
      {/* Client Info */}
      <div className="text-center mb-4 flex-shrink-0">
        <Avatar className="w-20 h-20 mx-auto mb-3 border-4 border-secondary shadow-lg">
          <AvatarImage src={client.profile_photo_url} alt={client.name} />
          <AvatarFallback className="bg-muted text-3xl">{client.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-bold">{client.name}</h2>
        <p className="text-xs text-muted-foreground">@{client.username}</p>
      </div>

      {/* Details Section */}
      <div className="space-y-3 text-sm pb-4 border-b border-border/50 flex-shrink-0">
        {client.location && (
          <div className="flex items-start"><MapPin className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" /><p>{client.location}</p></div>
        )}
        {distance !== null && (
          <div className="flex items-start"><Compass className="w-4 h-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" /><p>~ <span className="font-bold text-primary">{distance} mi</span> away</p></div>
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={`/user/${client.username}`}><ExternalLink className="w-4 h-4 mr-2" /> View Full Profile</Link>
        </Button>
      </div>

      {/* Bookings Section */}
      <div className="mt-4 flex-grow overflow-y-auto custom-scrollbar pr-1">
        <h3 className="text-md font-semibold mb-3 flex items-center"><Calendar className="w-4 h-4 mr-2 text-primary" /> Booking History</h3>
        {bookings.length > 0 ? (
            <div className="space-y-4">
                {upcomingBookings.length > 0 && (
                    <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Upcoming</p>
                        {upcomingBookings.map(b => (
                            <div key={b.id} className="text-xs p-2 rounded-md bg-background/50 mb-2">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold">{formatDate(b.requested_datetime)}</p>
                                    <BookingStatusBadge status={b.status} />
                                </div>
                                {b.service_description && <p className="text-muted-foreground mt-1 line-clamp-2">“{b.service_description}”</p>}
                            </div>
                        ))}
                    </div>
                )}
                {pastBookings.length > 0 && (
                    <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground mb-1"><History className="w-3 h-3 inline mr-1" />Past</p>
                        {pastBookings.map(b => (
                             <div key={b.id} className="text-xs p-2 rounded-md bg-background/50 mb-2 opacity-70">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold">{formatDate(b.requested_datetime)}</p>
                                    <BookingStatusBadge status={b.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No booking history with this user.</p>
        )}
      </div>
    </div>
  );
};

export default UserInfoPanel;
