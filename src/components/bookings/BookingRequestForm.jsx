import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CalendarClock } from 'lucide-react'; // Paperclip, XCircle removed
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const BookingRequestForm = ({ artistId, artistName, conventionDateId, onSubmitSuccess }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requestedDateTime, setRequestedDateTime] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [notes, setNotes] = useState('');
  // const [referenceImageFile, setReferenceImageFile] = useState(null); // Hidden
  // const [referenceImagePreview, setReferenceImagePreview] = useState(null); // Hidden
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const fileInputRef = useRef(null); // Hidden

  // handleImageChange and removeImage functions can be commented out or removed
  // const handleImageChange = (e) => { ... };
  // const removeImage = () => { ... };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not logged in", description: "Please log in to send a booking request.", variant: "destructive" });
      return;
    }
    if (!requestedDateTime) {
      toast({ title: "Missing Date/Time", description: "Please select a date and time for your booking.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    // Image upload logic is removed/commented out for now
    // let imageUrl = null;
    // let imagePublicId = null;
    // if (referenceImageFile) { ... }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          artist_id: artistId,
          requested_datetime: requestedDateTime,
          service_description: serviceDescription || null,
          notes: notes || null,
          status: 'pending',
          convention_date_id: conventionDateId || null,
          // reference_image_url: imageUrl, // Field kept in DB but not populated
          // reference_image_public_id: imagePublicId, // Field kept in DB but not populated
        });

      if (error) throw error;

      toast({
        title: "Booking Request Sent!",
        description: `Your request to ${artistName} has been sent.`,
      });
      if (onSubmitSuccess) onSubmitSuccess();
      setRequestedDateTime('');
      setServiceDescription('');
      setNotes('');
      // removeImage(); // Hidden

    } catch (error) {
      console.error("Error submitting booking request:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not send booking request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-4">
        <CalendarClock className="w-12 h-12 mx-auto text-foreground mb-2" />
        <h3 className="text-xl font-semibold">Request Booking with {artistName}</h3>
        {conventionDateId && <p className="text-sm text-muted-foreground">For convention/event booking</p>}
      </div>
      <div>
        <Label htmlFor="requestedDateTime">Preferred Date & Time</Label>
        <Input
          id="requestedDateTime"
          type="datetime-local"
          value={requestedDateTime}
          onChange={(e) => setRequestedDateTime(e.target.value)}
          className="mt-1"
          min={new Date().toISOString().slice(0, 16)}
          required
        />
      </div>
      <div>
        <Label htmlFor="serviceDescription">Service Description (Optional)</Label>
        <Textarea
          id="serviceDescription"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          placeholder="e.g., Small floral design on forearm, approx 2 hours"
          className="mt-1 min-h-[80px]"
        />
      </div>
      <div>
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any specific requests or questions for the artist?"
          className="mt-1 min-h-[80px]"
        />
      </div>
      {/* Reference Image Section Hidden
      <div>
        <Label htmlFor="referenceImage">Reference Image (Optional, max 5MB)</Label>
        <div className="mt-1 flex items-center space-x-2">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="w-4 h-4 mr-2" /> Choose File
          </Button>
          <Input
            id="referenceImage"
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/png, image/jpeg, image/gif, image/webp"
          />
          {referenceImageFile && <span className="text-sm text-muted-foreground truncate max-w-[150px]">{referenceImageFile.name}</span>}
        </div>
        {referenceImagePreview && (
          <div className="mt-2 relative w-32 h-32">
            <img-replace src={referenceImagePreview} alt="Reference preview" className="rounded-md object-cover w-full h-full" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/70 hover:bg-destructive/90 group"
              onClick={removeImage}
            >
              <XCircle className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
            </Button>
          </div>
        )}
      </div>
      */}
      <Button type="submit" className="w-full ink-gradient" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Booking Request'}
      </Button>
    </form>
  );
};

export default BookingRequestForm;