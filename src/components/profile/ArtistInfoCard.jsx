import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';

// Helper function to format availability for display
const formatAvailability = (availability) => {
  if (!availability || typeof availability !== 'object' || Object.keys(availability).length === 0) {
    return [];
  }
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const formatTime = (time) => time ? new Date(`1970-01-01T${time}Z`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }) : '';
  
  return daysOrder
    .map(day => {
        const dayInfo = availability[day];
        if (dayInfo?.active && dayInfo.start && dayInfo.end) {
            return { day: day.charAt(0).toUpperCase() + day.slice(1), hours: `${formatTime(dayInfo.start)} - ${formatTime(dayInfo.end)}` };
        }
        return null;
    })
    .filter(Boolean);
};

const ArtistInfoCard = ({ artist, nextConvention }) => {
  if (!artist) return null;

  const formattedAvailability = formatAvailability(artist.general_availability);
  const showCard = nextConvention || formattedAvailability.length > 0 || artist.styles?.length > 0;

  if (!showCard) {
    // If there is no info to show, render a simple bottom border for the header
    return <div className="glass-effect rounded-b-2xl p-4 md:p-6 mb-8 border-t-0"></div>;
  }

  return (
    // This card has no top border/rounding to connect with the header above
    <div className="glass-effect rounded-b-2xl p-4 md:p-6 mb-8 border-t-0">
        <div className="space-y-4">
            {nextConvention && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center text-foreground"><Calendar className="w-4 h-4 mr-2 text-primary" /> Next Convention</h3>
                  <div className="text-xs bg-primary/10 p-2 rounded-md">
                    <p className="font-bold text-primary">{nextConvention.event_name}</p>
                    <p className="text-muted-foreground">{nextConvention.location}</p>
                    <p className="text-muted-foreground">{new Date(nextConvention.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
            )}

            {formattedAvailability.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center text-foreground"><Clock className="w-4 h-4 mr-2 text-primary" /> General Availability</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    {formattedAvailability.map(item => <div key={item.day} className="flex justify-between"><span className="font-medium text-foreground/90">{item.day}:</span><span className="text-muted-foreground">{item.hours}</span></div>)}
                  </div>
                </div>
            )}

             <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border/30">
                {artist.styles?.length > 0 && <div className="flex flex-wrap justify-center md:justify-start gap-1.5">{artist.styles.map(style => <Badge key={style} variant="secondary">{style}</Badge>)}</div>}
                <div className={`flex items-center text-xs font-medium ${artist.booking_status ? 'text-green-400' : 'text-red-500'}`}>
                    {artist.booking_status ? <CheckCircle className="w-4 h-4 mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                    {artist.booking_status ? 'Available for Booking' : (artist.booked_until ? `Booked until ${new Date(artist.booked_until).toLocaleDateString()}` : 'Not Available')}
                </div>
            </div>
        </div>
    </div>
  );
};

export default ArtistInfoCard;
