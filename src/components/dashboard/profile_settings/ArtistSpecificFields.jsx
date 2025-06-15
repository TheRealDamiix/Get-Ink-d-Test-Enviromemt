import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { X } from 'lucide-react';

const MAX_STYLES = 10;
const MAX_STYLE_LENGTH = 30;

const ArtistSpecificFields = ({ formData, setFormData }) => {
  const { styles, currentStyle, bookingStatus, bookedUntil, bookingLink } = formData;
  const { toast } = useToast();

  const onInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStyleAdd = () => {
    if (currentStyle.trim() && styles.length < MAX_STYLES && !styles.includes(currentStyle.trim()) && currentStyle.trim().length <= MAX_STYLE_LENGTH) {
      onInputChange('styles', [...styles, currentStyle.trim()]);
      onInputChange('currentStyle', '');
    } else if (styles.length >= MAX_STYLES) {
      toast({ title: "Style limit reached", description: `You can add a maximum of ${MAX_STYLES} styles.`, variant: "destructive" });
    } else if (currentStyle.trim().length > MAX_STYLE_LENGTH) {
      toast({ title: "Style too long", description: `Styles must be ${MAX_STYLE_LENGTH} characters or less.`, variant: "destructive" });
    }
  };

  const handleStyleRemove = (styleToRemove) => {
    onInputChange('styles', styles.filter(style => style !== styleToRemove));
  };

  return (
    <>
      <div>
        <Label htmlFor="styles">Tattoo Styles (up to {MAX_STYLES})</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="currentStyle"
            value={currentStyle}
            onChange={(e) => onInputChange('currentStyle', e.target.value)}
            placeholder={`e.g., Traditional (max ${MAX_STYLE_LENGTH} chars)`}
            maxLength={MAX_STYLE_LENGTH + 5}
          />
          <Button type="button" variant="secondary" onClick={handleStyleAdd} disabled={styles.length >= MAX_STYLES || !currentStyle.trim()}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {styles.map(s => (
            <span key={s} className="flex items-center bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
              {s}
              <Button type="button" variant="ghost" size="icon" className="h-4 w-4 ml-1 text-primary hover:text-destructive" onClick={() => handleStyleRemove(s)}>
                <X className="h-3 w-3" />
              </Button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="bookingLink">Booking Link (Optional)</Label>
        <Input id="bookingLink" type="url" value={bookingLink} onChange={(e) => onInputChange('bookingLink', e.target.value)} placeholder="https://yourbooking.site/artistname" className="mt-1" />
      </div>

      <div className="space-y-2">
        <Label>Booking Availability</Label>
        <div className="flex items-center space-x-2">
          <Checkbox id="bookingStatus" checked={bookingStatus} onCheckedChange={(checked) => onInputChange('bookingStatus', !!checked)} />
          <Label htmlFor="bookingStatus" className="font-normal">Currently Available for Bookings</Label>
        </div>
        {!bookingStatus && (
          <div>
            <Label htmlFor="bookedUntil">Booked Until (Optional)</Label>
            <Input
              id="bookedUntil"
              type="date"
              value={bookedUntil}
              onChange={(e) => onInputChange('bookedUntil', e.target.value)}
              className="mt-1"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default ArtistSpecificFields;