import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CalendarClock, Paperclip, XCircle, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface BookingRequestFormProps {
  artistId: string;
  artistName: string;
  conventionDateId?: string | null;
  onSubmitSuccess?: () => void;
}

const BookingRequestForm: React.FC<BookingRequestFormProps> = ({ artistId, artistName, conventionDateId, onSubmitSuccess }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requestedDateTime, setRequestedDateTime] = useState<string>('');
  const [serviceDescription, setServiceDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [clientPhoneNumber, setClientPhoneNumber] = useState<string>('');
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image too large", description: "Image must be less than 5MB.", variant: "destructive" });
        return;
      }
      setReferenceImageFile(file);
      setReferenceImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setReferenceImageFile(null);
    setReferenceImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<{ url: string; publicId: string } | null> => {
    if (!file || !user) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'booking_references');
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formData,
      });

      if (uploadError || (uploadData as Record<string, unknown>).error) {
        throw new Error(uploadError?.message || (uploadData as Record<string, unknown>)?.error as string || 'Failed to upload booking reference image.');
      }
      return { url: (uploadData as Record<string, unknown>).secure_url as string, publicId: (uploadData as Record<string, unknown>).public_id as string };

    } catch (error) {
      toast({ title: "Upload Error", description: `Failed to upload image. ${(error as Error).message}`, variant: "destructive" });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    if (referenceImageFile) {
      const uploaded = await uploadImageToCloudinary(referenceImageFile);
      if (uploaded) {
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      } else {
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          artist_id: artistId,
          requested_datetime: requestedDateTime,
          service_description: serviceDescription || null,
          notes: notes || null,
          client_phone_number: clientPhoneNumber.trim() || null,
          status: 'pending',
          convention_date_id: conventionDateId || null,
          reference_image_url: imageUrl,
          reference_image_public_id: imagePublicId,
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
      setClientPhoneNumber('');
      removeImage();

    } catch (error) {
      toast({
        title: "Submission Failed",
        description: (error as Error).message || "Could not send booking request. Please try again.",
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
        <Label htmlFor="requestedDateTime">Preferred Date & Time*</Label>
        <Input
          id="requestedDateTime"
          type="datetime-local"
          value={requestedDateTime}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequestedDateTime(e.target.value)}
          className="mt-1"
          min={new Date().toISOString().slice(0, 16)}
          required
        />
      </div>
      <div>
        <Label htmlFor="clientPhoneNumber">Phone Number (Optional)</Label>
        <div className="relative mt-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="clientPhoneNumber"
            type="tel"
            value={clientPhoneNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientPhoneNumber(e.target.value)}
            placeholder="e.g., (555) 123-4567"
            className="pl-10"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="serviceDescription">Service Description (Optional)</Label>
        <Textarea
          id="serviceDescription"
          value={serviceDescription}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setServiceDescription(e.target.value)}
          placeholder="e.g., Small floral design on forearm, approx 2 hours"
          className="mt-1 min-h-[80px]"
        />
      </div>
      <div>
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          placeholder="Any specific requests or questions for the artist?"
          className="mt-1 min-h-[80px]"
        />
      </div>

      <div>
        <Label htmlFor="referenceImage">Reference Image (Optional, max 5MB)</Label>
        <div className="mt-1 flex items-center space-x-2">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="text-foreground">
            <Paperclip className="w-4 h-4 mr-2 text-foreground" /> Choose File
          </Button>
          <Input
            id="referenceImage"
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/png, image/jpeg, image/gif, image/webp"
            disabled={isSubmitting}
          />
          {referenceImageFile && <span className="text-sm text-muted-foreground truncate max-w-[150px]">{referenceImageFile.name}</span>}
        </div>
        {referenceImagePreview && (
          <div className="mt-2 relative w-32 h-32">
            <img src={referenceImagePreview} alt="Reference preview" className="rounded-md object-cover w-full h-full" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/70 hover:bg-destructive/90 group"
              onClick={removeImage}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full ink-gradient" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Booking Request'}
      </Button>
    </form>
  );
};

export default BookingRequestForm;
