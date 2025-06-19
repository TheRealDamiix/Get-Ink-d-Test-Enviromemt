import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BookingRequestForm from '@/components/bookings/BookingRequestForm'; 
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Loader2, BookOpen, BookLock, CalendarPlus } from 'lucide-react';

const formatTourDate = (startDateStr, endDateStr) => {
    const startDate = new Date(startDateStr);
    const options = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    const startFormatted = startDate.toLocaleDateString('en-US', options);
    if (!endDateStr) return startFormatted;
    const endDate = new Date(endDateStr);
    if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })} ${startDate.getUTCDate()}-${endDate.getUTCDate()}`;
    }
    return `${startFormatted} - ${endDate.toLocaleDateString('en-US', options)}`;
};

const ConventionDatesSection = ({ artistId, artistProfile, dates, loading }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedConventionForBooking, setSelectedConventionForBooking] = useState(null);

  const handleRequestBookingForConvention = (convention) => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to request a booking.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (user.id === artistId) return;
    if (!convention.accepting_bookings || convention.is_fully_booked) return;
    setSelectedConventionForBooking(convention);
    setShowBookingDialog(true);
  };

  if (loading) {
    return <div className="my-8 p-6 glass-effect rounded-xl text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>;
  }

  if (dates.length === 0) {
    return <div className="my-8 p-6 glass-effect rounded-xl text-center"><CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><h3 className="text-xl font-semibold">No Upcoming Conventions</h3></div>;
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="my-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center"><CalendarDays className="w-6 h-6 mr-3 text-primary" /> Tour Dates</h2>
        <div className="glass-effect rounded-xl p-4 space-y-2">
          {dates.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-2 border-b border-border/20 last:border-b-0">
              <div className="flex items-center gap-4">
                  <div className="text-center w-16 flex-shrink-0"><p className="text-sm font-bold text-primary uppercase">{formatTourDate(event.start_date, event.end_date)}</p></div>
                  <div>
                      <h3 className="font-semibold text-foreground">{event.event_name}</h3>
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                  </div>
              </div>
              {event.accepting_bookings && !event.is_fully_booked && user && user.id !== artistId ? (
                <Button size="sm" variant="outline" onClick={() => handleRequestBookingForConvention(event)} className="ml-4 flex-shrink-0">Book</Button>
              ) : (<div className="text-xs text-muted-foreground ml-4 flex-shrink-0">{event.is_fully_booked ? 'Booked' : 'Closed'}</div>)}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ***** FIX: Added scrollable classes to DialogContent ***** */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="glass-effect sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
                <DialogTitle>Request Booking for {selectedConventionForBooking?.event_name}</DialogTitle>
            </DialogHeader>
            <BookingRequestForm 
                artistId={artistId} 
                artistName={artistProfile?.name || artistProfile?.username}
                conventionDateId={selectedConventionForBooking?.id}
                onSubmitSuccess={() => setShowBookingDialog(false)}
            />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConventionDatesSection;
