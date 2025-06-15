import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CalendarX2, Inbox, UserCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const ClientBookingList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, artist:profiles!artist_id(id, name, username, profile_photo_url)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        toast({ title: "Error fetching bookings", description: error.message, variant: "destructive" });
      } else {
        setBookings(data || []);
      }
      setIsLoading(false);
    };
    fetchBookings();
  }, [user, toast]);

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    setIsCancelling(true);
    
    toast({
      title: "🚧 Feature In Progress",
      description: "Cancelling bookings isn't fully implemented. This is a placeholder action.",
      duration: 5000,
    });

    // Placeholder for actual cancellation logic
    setTimeout(() => {
      setBookings(prev => prev.map(b => b.id === bookingToCancel.id ? {...b, status: 'cancelled_by_client'} : b));
      setBookingToCancel(null);
      setIsCancelling(false);
    }, 1500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (isLoading) {
    return <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 glass-effect rounded-xl">
        <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
        <p className="text-muted-foreground">You haven't made any booking requests. Find an artist to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bookings.map(booking => (
        <div key={booking.id} className="p-6 glass-effect rounded-xl border border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UserCircle className="w-6 h-6 text-primary" />
                <h4 className="text-lg font-semibold">
                  Booking with: {booking.artist?.name || booking.artist?.username || 'Unknown Artist'}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4 inline mr-1.5" />
                Requested: {formatDate(booking.requested_datetime)}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: <span className={`font-medium ${
                  booking.status === 'pending' ? 'text-yellow-400' :
                  booking.status === 'confirmed' ? 'text-green-400' :
                  booking.status.startsWith('cancelled') ? 'text-red-500' : 'text-foreground'
                }`}>{booking.status.replace(/_/g, ' ')}</span>
              </p>
            </div>
            {booking.status === 'pending' && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => setBookingToCancel(booking)}
                className="mt-2 sm:mt-0 self-start sm:self-center"
              >
                <CalendarX2 className="w-4 h-4 mr-2" /> Cancel Request
              </Button>
            )}
          </div>
          {booking.service_description && <p className="text-sm mt-3 pt-3 border-t border-border/30">Service: {booking.service_description}</p>}
          {booking.notes && <p className="text-sm mt-2 text-muted-foreground">Notes: {booking.notes}</p>}
        </div>
      ))}

      <Dialog open={!!bookingToCancel} onOpenChange={() => setBookingToCancel(null)}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle>Cancel Booking Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your booking request with {bookingToCancel?.artist?.name || 'this artist'} for {formatDate(bookingToCancel?.requested_datetime)}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isCancelling}>Back</Button></DialogClose>
            <Button onClick={handleCancelBooking} variant="destructive" disabled={isCancelling}>
              {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, Cancel Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientBookingList;