import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CalendarCheck, Inbox, UserCircle, Clock, CheckCircle, XCircle, Image as ImageIcon, Phone } from 'lucide-react';
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
import { Dialog as ImagePreviewDialog, DialogContent as ImagePreviewDialogContent } from '@/components/ui/dialog';


const ArtistBookingList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionType, setActionType] = useState(''); 
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [imageToPreview, setImageToPreview] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*, client:profiles!bookings_client_id_fkey(id, name, username, profile_photo_url, email)')
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
    let successMessage = '';

    if (actionType === 'confirm') {
      newStatus = 'confirmed';
      successMessage = 'Booking confirmed!';
    } else if (actionType === 'decline') {
      newStatus = 'declined_by_artist';
      successMessage = 'Booking declined.';
    } else {
      setIsProcessingAction(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedBooking.id)
        .select()
        .single();

      if (error) throw error;

      setBookings(prev => prev.map(b => (b.id === selectedBooking.id ? data : b)));
      toast({ title: "Success", description: successMessage });
    } catch (error) {
      console.error(`Error ${actionType}ing booking:`, error);
      toast({ title: `Error ${actionType}ing booking`, description: error.message, variant: "destructive" });
    } finally {
      setSelectedBooking(null);
      setActionType('');
      setIsProcessingAction(false);
    }
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
        <p className="text-muted-foreground">When clients send you booking requests, they'll appear here.</p>
      </div>
    );
  }

  return (
    <>
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
              {booking.client?.email && <p className="text-sm text-muted-foreground mb-1">Email: {booking.client.email}</p>}
              {booking.client_phone_number && <p className="text-sm text-muted-foreground mb-1"><Phone className="w-4 h-4 inline mr-1.5 text-foreground" /> Phone: {booking.client_phone_number}</p>}
              <p className="text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4 inline mr-1.5 text-foreground" />
                Requested: {formatDate(booking.requested_datetime)}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: <span className={`font-medium ${
                  booking.status === 'pending' ? 'text-yellow-400' :
                  booking.status === 'confirmed' ? 'text-green-400' :
                  booking.status.includes('declined') || booking.status.includes('cancelled') ? 'text-red-500' : 'text-foreground'
                }`}>{booking.status.replace(/_/g, ' ')}</span>
              </p>
            </div>
            {booking.status === 'pending' && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0 self-start sm:self-center">
                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => openActionDialog(booking, 'confirm')}>
                  <CheckCircle className="w-4 h-4 mr-2 text-white" /> Confirm
                </Button>
                <Button size="sm" variant="destructive" onClick={() => openActionDialog(booking, 'decline')}>
                  <XCircle className="w-4 h-4 mr-2 text-white" /> Decline
                </Button>
              </div>
            )}
          </div>
          {booking.service_description && <p className="
