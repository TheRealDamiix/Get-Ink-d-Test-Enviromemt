import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CalendarCheck, Inbox, UserCircle, Clock } from 'lucide-react';
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

const ArtistBookingList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionType, setActionType] = useState(''); // 'confirm' or 'cancel'
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, client:profiles!client_id(id, name, username, email, profile_photo_url)')
        .eq('artist_id', user.id)
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

  const handleAction = async () => {
    if (!selectedBooking || !actionType) return;
    setIsProcessingAction(true);

    let newStatus = '';
    if (actionType === 'confirm') newStatus = 'confirmed';
    else if (actionType === 'cancel') newStatus = 'cancelled_by_artist';
    else {
      setIsProcessingAction(false);
      return;
    }
    
    toast({
      title: "🚧 Feature In Progress",
      description: `Updating booking status to ${newStatus} isn't fully implemented. This is a placeholder.`,
      duration: 5000,
    });

    // Placeholder for actual update logic
    setTimeout(() => {
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? {...b, status: newStatus} : b));
      setSelectedBooking(null);
      setActionType('');
      setIsProcessingAction(false);
    }, 1500);
  };
  
  const openActionDialog = (booking, type) => {
    setSelectedBooking(booking);
    setActionType(type);
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
        <h3 className="text-xl font-semibold mb-2">No Booking Requests Yet</h3>
        <p className="text-muted-foreground">Clients will be able to send you booking requests soon!</p>
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
                  Request from: {booking.client?.name || booking.client?.username || 'Unknown Client'}
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
                }`}>{booking.status.replace('_', ' ')}</span>
              </p>
            </div>
            {booking.status === 'pending' && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 self-start sm:self-center">
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => openActionDialog(booking, 'confirm')}>Confirm</Button>
                <Button size="sm" variant="destructive" onClick={() => openActionDialog(booking, 'cancel')}>Decline</Button>
              </div>
            )}
          </div>
          {booking.service_description && <p className="text-sm mt-3 pt-3 border-t border-border/30">Service: {booking.service_description}</p>}
          {booking.notes && <p className="text-sm mt-2 text-muted-foreground">Notes: {booking.notes}</p>}
        </div>
      ))}

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle>{actionType === 'confirm' ? 'Confirm Booking' : 'Cancel Booking'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to {actionType} this booking request from {selectedBooking?.client?.name || 'this client'} for {formatDate(selectedBooking?.requested_datetime)}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingAction}>Back</Button></DialogClose>
            <Button 
              onClick={handleAction} 
              className={actionType === 'confirm' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}
              disabled={isProcessingAction}
            >
              {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Yes, ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistBookingList;