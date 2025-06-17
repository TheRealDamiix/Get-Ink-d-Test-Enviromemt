
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CalendarDays, MapPin, Loader2, BookOpen, BookLock, CalendarPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import BookingRequestForm from '@/components/bookings/BookingRequestForm'; 
import { useNavigate } from 'react-router-dom';

const ConventionDatesSection = ({ artistId, artistProfile }) => {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedConventionForBooking, setSelectedConventionForBooking] = useState(null);

  useEffect(() => {
    const fetchConventionDates = async () => {
      if (!artistId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('convention_dates')
        .select('*')
        .eq('artist_id', artistId)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching convention dates:', error);
        toast({ title: "Error", description: "Could not load convention dates.", variant: "destructive" });
      } else {
        setDates(data || []);
      }
      setLoading(false);
    };

    fetchConventionDates();
  }, [artistId, toast]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleRequestBookingForConvention = (convention) => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to request a booking.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    if (user.id === artistId) {
      toast({ title: "Cannot book yourself", description: "Artists cannot book their own services.", variant: "destructive" });
      return;
    }
    if (!convention.accepting_bookings || convention.is_fully_booked) {
      toast({ title: "Booking Not Available", description: "This artist is not accepting bookings for this event or is fully booked.", variant: "default" });
      return;
    }
    setSelectedConventionForBooking(convention);
    setShowBookingDialog(true);
  };


  if (loading) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-2">Loading Convention Dates...</p>
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-xl font-semibold">No Upcoming Conventions</h3>
        <p className="text-muted-foreground">This artist hasn't listed any convention dates yet.</p>
      </div>
    );
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-8 p-6 glass-effect rounded-xl"
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <CalendarDays className="w-6 h-6 mr-3 text-primary text-foreground" />
          Convention & Guest Spot Dates
        </h2>
        <div className="space-y-4">
          {dates.map((event, index) => (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 border border-border/50 rounded-lg hover:border-primary/70 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary">{event.event_name}</h3>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4 mr-2 text-foreground" />
                  <span>{event.location}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(event.start_date)}
                  {event.end_date && ` - ${formatDate(event.end_date)}`}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  {event.accepting_bookings ? (
                    event.is_fully_booked ? (
                      <span className="flex items-center text-orange-500"><BookLock className="w-3 h-3 mr-1 text-foreground" /> Fully Booked</span>
                    ) : (
                      <span className="flex items-center text-green-500"><BookOpen className="w-3 h-3 mr-1 text-foreground" /> Accepting Bookings</span>
                    )
                  ) : (
                    <span className="flex items-center text-red-500"><BookLock className="w-3 h-3 mr-1 text-foreground" /> Bookings Closed</span>
                  )}
                </div>
              </div>
              {event.accepting_bookings && !event.is_fully_booked && user && user.id !== artistId && (
                <Button 
                  size="sm" 
                  className="ink-gradient mt-2 sm:mt-0"
                  onClick={() => handleRequestBookingForConvention(event)}
                >
                  <CalendarPlus className="w-4 h-4 mr-2 text-white" /> Request Booking
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="glass-effect max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Booking for {selectedConventionForBooking?.event_name}</DialogTitle>
            <DialogDescription>
              Fill out the form to request a booking with {artistProfile?.name || artistProfile?.username} during this event.
              Event Dates: {formatDate(selectedConventionForBooking?.start_date)} {selectedConventionForBooking?.end_date ? ` - ${formatDate(selectedConventionForBooking?.end_date)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <BookingRequestForm 
            artistId={artistId} 
            artistName={artistProfile?.name || artistProfile?.username}
            conventionDateId={selectedConventionForBooking?.id}
            onSubmitSuccess={() => {
              setShowBookingDialog(false);
              toast({ title: "Booking Request Sent!", description: "The artist will review your request soon."});
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConventionDatesSection;
