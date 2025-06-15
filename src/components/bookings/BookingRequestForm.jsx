import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CalendarClock } from 'lucide-react';

const BookingRequestForm = ({ artistId, artistName, onSubmitSuccess }) => {
  const { toast } = useToast();
  const [requestedDateTime, setRequestedDateTime] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requestedDateTime) {
      toast({ title: "Missing Date/Time", description: "Please select a date and time for your booking.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    toast({
      title: "🚧 Feature In Progress",
      description: "Submitting booking requests isn't fully implemented yet. This is a placeholder action.",
      duration: 5000,
    });
    
    // Placeholder for actual submission logic
    setTimeout(() => {
      console.log({ artistId, requestedDateTime, serviceDescription, notes });
      if (onSubmitSuccess) onSubmitSuccess();
      setIsSubmitting(false);
      setRequestedDateTime('');
      setServiceDescription('');
      setNotes('');
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-4">
        <CalendarClock className="w-12 h-12 mx-auto text-primary mb-2" />
        <h3 className="text-xl font-semibold">Request Booking with {artistName}</h3>
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
      <Button type="submit" className="w-full ink-gradient" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Booking Request'}
      </Button>
    </form>
  );
};

export default BookingRequestForm;