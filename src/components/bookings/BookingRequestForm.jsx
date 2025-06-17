import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CalendarClock, Paperclip, XCircle, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

const BookingRequestForm = ({ artistId, artistName, conventionDateId, onSubmitSuccess }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requestedDateTime, setRequestedDateTime] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [clientPhoneNumber, setClientPhoneNumber] = useState('');
  const [referenceImageFile, setReferenceImageFile] = useState(null); 
  const [referenceImagePreview, setReferenceImagePreview] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null); 

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { 
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

  const uploadImageToCloudinary = async (file) => {
    if (!file || !user) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'booking_references');
      formData.append('public_id_name', `booking_${user.id}_${Date.now()}`);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formData,
      });

      if (uploadError || uploadData.error || !uploadData.secure_url) {
        const errorMessage = uploadError?.message || uploadData?.error || 'Failed to upload booking reference image.';
        throw new Error(errorMessage);
      }
      return { url: uploadData.secure_url, publicId: uploadData.public_id };

    } catch (error) {
      console.error('Error uploading booking reference to Cloudinary:', error);
      toast({ title: "Upload Error", description: `Failed to upload image. ${error.message}`, variant: "destructive" });
      return null;
    }
  };

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
    
    let imageUrl = null;
    let imagePublicId = null; 
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
      const { data, error } = await supabase
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
        <Label htmlFor="requestedDateTime">Preferred Date & Time*</Label>
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
        <Label htmlFor="clientPhoneNumber">Phone Number (Optional)</Label>
        <div className="relative mt-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="clientPhoneNumber"
            type="tel"
            value={clientPhoneNumber}
            onChange={(e) => setClientPhoneNumber(e.target.value)}
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
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background
