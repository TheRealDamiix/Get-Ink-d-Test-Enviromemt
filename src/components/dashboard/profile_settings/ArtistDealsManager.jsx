
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, Tag, DollarSign, X, Paperclip, CalendarClock } from 'lucide-react';
import { motion } from 'framer-motion';

const ArtistDealsManager = ({ user, onDealCreatedOrUpdated }) => {
  const [deals, setDeals] = useState([]);
  const [showDealDialog, setShowDealDialog] = useState(false);
  const [currentDeal, setCurrentDeal] = useState({ 
    id: null, 
    title: '', 
    deal_description: '',
    price: '',
    image_file: null, 
    existing_image_url: null, 
    existing_image_public_id: null, 
    valid_until: '' 
  });
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef(null);

  const fetchDeals = useCallback(async () => {
    if (!user?.id) {
      setDeals([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('artist_deals')
      .select('*')
      .eq('artist_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error fetching deals", description: error.message, variant: "destructive" });
      setDeals([]);
    } else {
      setDeals(data || []);
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleOpenDealDialog = (deal = null) => {
    if (!user?.id) {
      toast({ title: "User not loaded", description: "Cannot manage deals without user data.", variant: "destructive" });
      return;
    }
    if (deal) {
      setCurrentDeal({
        id: deal.id,
        title: deal.title || '',
        deal_description: deal.deal_description || '',
        price: deal.price !== null && deal.price !== undefined ? String(deal.price) : '',
        image_file: null,
        existing_image_url: deal.image_url,
        existing_image_public_id: deal.image_public_id, 
        valid_until: deal.valid_until ? deal.valid_until.split('T')[0] : ''
      });
      setIsEditingDeal(true);
    } else {
      setCurrentDeal({ id: null, title: '', deal_description: '', price: '', image_file: null, existing_image_url: null, existing_image_public_id: null, valid_until: '' });
      setIsEditingDeal(false);
    }
    setShowDealDialog(true);
  };

  const handleImageFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "Image too large", description: "Image must be less than 5MB.", variant: "destructive" });
        return;
      }
      setCurrentDeal(prev => ({ ...prev, image_file: file, existing_image_url: URL.createObjectURL(file) }));
    }
  };
  
  const uploadImageToCloudinary = async (file) => {
    if (!file || !user) return null;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'deal_images');
      formData.append('public_id_name', `deal_${user.id}_${Date.now()}`);
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formData,
      });

      if (uploadError || uploadData.error || !uploadData.secure_url) {
        const errorMessage = uploadError?.message || uploadData?.error || 'Failed to upload deal image.';
        throw new Error(errorMessage);
      }
      return { url: uploadData.secure_url, publicId: uploadData.public_id };

    } catch (error) {
      console.error('Error uploading deal image to Cloudinary:', error);
      toast({ title: "Upload Error", description: `Failed to upload image. ${error.message}`, variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImageFromCloudinary = async (publicId) => {
    if (!publicId) return;
    try {
      await supabase.functions.invoke('delete-from-cloudinary', {
        body: { public_ids: [publicId] }
      });
    } catch (error) {
      console.warn(`Could not delete old image ${publicId} from Cloudinary:`, error.message);
    }
  };

  const handleSaveDeal = async () => {
    if (!user?.id || !currentDeal.title.trim()) {
      toast({ title: "Missing title", description: "Deal title cannot be empty.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    let imageUrl = currentDeal.existing_image_url;
    let imagePublicId = currentDeal.existing_image_public_id; 

    if (currentDeal.image_file) {
      const uploaded = await uploadImageToCloudinary(currentDeal.image_file);
      if (uploaded) {
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
        if (isEditingDeal && currentDeal.existing_image_public_id && currentDeal.existing_image_public_id !== imagePublicId) {
           await deleteImageFromCloudinary(currentDeal.existing_image_public_id);
        }
      } else {
        setIsLoading(false);
        return; 
      }
    } else if (!currentDeal.existing_image_url && isEditingDeal && currentDeal.existing_image_public_id) { 
      await deleteImageFromCloudinary(currentDeal.existing_image_public_id);
      imageUrl = null;
      imagePublicId = null;
    }

    const dealPrice = parseFloat(currentDeal.price);

    const payload = {
      artist_id: user.id,
      title: currentDeal.title.trim(),
      deal_description: currentDeal.deal_description.trim() || null,
      price: !isNaN(dealPrice) ? dealPrice : null,
      image_url: imageUrl,
      image_public_id: imagePublicId, 
      valid_until: currentDeal.valid_until ? new Date(currentDeal.valid_until).toISOString() : null,
    };

    let error;
    if (isEditingDeal && currentDeal.id) {
      const { error: updateError } = await supabase.from('artist_deals').update(payload).eq('id', currentDeal.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('artist_deals').insert(payload);
      error = insertError;
    }

    if (error) {
      toast({ title: "Error saving deal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Deal ${isEditingDeal ? 'updated' : 'created'}!`, variant: "default" });
      setShowDealDialog(false);
      fetchDeals();
      if (onDealCreatedOrUpdated) onDealCreatedOrUpdated();
    }
    setIsLoading(false);
  };

  const handleDeleteDeal = async (deal) => {
    setIsLoading(true);
    const { error: dbError } = await supabase.from('artist_deals').delete().eq('id', deal.id);
    if (dbError) {
      toast({ title: "Error deleting deal", description: dbError.message, variant: "destructive" });
    } else {
      if (deal.image_public_id) { 
        await deleteImageFromCloudinary(deal.image_public_id);
      }
      toast({ title: "Deal deleted", variant: "default" });
      fetchDeals();
      if (onDealCreatedOrUpdated) onDealCreatedOrUpdated();
    }
    setIsLoading(false);
  };

  return (
    <div className="mt-8 p-6 glass-effect rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center"><Tag className="w-5 h-5 mr-2 text-primary" /> Your Deals</h2>
        <Button onClick={() => handleOpenDealDialog()} className="ink-gradient" disabled={!user?.id || isLoading || isUploading}>
          <PlusCircle className="w-4 h-4 mr-2" /> Create Deal
        </Button>
      </div>
      {isLoading && deals.length === 0 ? (
        <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
      ) : deals.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">You haven't created any deals yet.</p>
      ) : (
        <div className="space-y-4">
          {deals.map(deal => (
            <motion.div 
              key={deal.id} 
              className="flex flex-col sm:flex-row items-start justify-between p-4 border border-border/50 rounded-md gap-3"
              initial={{ opacity: 0, y:10 }} animate={{ opacity:1, y:0 }}
            >
              <div className="flex-1">
                {deal.image_url && (
                  <img src={deal.image_url} alt={deal.title || "Deal image"} className="w-full max-w-xs h-auto rounded-md mb-2 object-cover" />
                )}
                <h3 className="font-semibold text-lg">{deal.title}</h3>
                {deal.deal_description && <p className="text-sm whitespace-pre-wrap mt-1">{deal.deal_description}</p>}
                {deal.price !== null && deal.price !== undefined && <p className="text-sm font-medium text-primary mt-1">Price: ${Number(deal.price).toFixed(2)}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {deal.valid_until ? `Valid until: ${new Date(deal.valid_until).toLocaleDateString()}` : 'Ongoing deal'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(deal.created_at).toLocaleDateString()}
                  {deal.updated_at && new Date(deal.updated_at).getTime() !== new Date(deal.created_at).getTime() 
                    ? ` (Edited: ${new Date(deal.updated_at).toLocaleDateString()})` 
                    : ''}
                </p>
              </div>
              <div className="space-x-2 self-start sm:self-center flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDealDialog(deal)} disabled={isLoading || isUploading}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteDeal(deal)} className="text-destructive hover:text-destructive/80" disabled={isLoading || isUploading}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showDealDialog} onOpenChange={(open) => {
          if (isLoading || isUploading) return; 
          setShowDealDialog(open);
        }}>
        <DialogContent 
          className="glass-effect sm:max-w-lg max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
             if (isLoading || isUploading) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{isEditingDeal ? 'Edit' : 'Create'} Deal</DialogTitle>
            <DialogDescription>Share your special offers and promotions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="deal-title">Title*</Label>
              <Input id="deal-title" value={currentDeal.title} onChange={e => setCurrentDeal({ ...currentDeal, title: e.target.value })} placeholder="e.g., 20% Off Flash Tattoos" />
            </div>
            <div>
              <Label htmlFor="deal-description">Description (Optional)</Label>
              <Textarea id="deal-description" value={currentDeal.deal_description} onChange={e => setCurrentDeal({ ...currentDeal, deal_description: e.target.value })} placeholder="Details about the deal..." className="min-h-[100px]" />
            </div>
            <div>
              <Label htmlFor="deal-price">Price (Optional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="deal-price" type="number" step="0.01" value={currentDeal.price} onChange={e => setCurrentDeal({ ...currentDeal, price: e.target.value })} placeholder="e.g., 50.00" className="pl-8" />
              </div>
            </div>
            <div>
              <Label htmlFor="deal-image">Image (Optional, max 5MB)</Label>
              <div className="mt-1 flex items-center space-x-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="text-foreground">
                  <Paperclip className="w-4 h-4 mr-2 text-foreground" /> Choose File
                </Button>
                <Input 
                  id="deal-image" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageFileChange} 
                  className="hidden" 
                  ref={fileInputRef}
                />
                {currentDeal.image_file && <span className="text-sm text-muted-foreground truncate max-w-[150px]">{currentDeal.image_file.name}</span>}
              </div>
              {currentDeal.existing_image_url && (
                <div className="mt-2 relative w-40 h-40">
                  <img src={currentDeal.existing_image_url} alt="Preview" className="w-full h-full object-cover rounded-md" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setCurrentDeal(prev => ({...prev, image_file: null, existing_image_url: null, existing_image_public_id: null }))}
                  >
                    <Trash2 className="h-3 w-3"/>
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="deal-valid-until">Valid Until (Optional)</Label>
              <div className="relative mt-1">
                <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="deal-valid-until" type="date" value={currentDeal.valid_until} onChange={e => setCurrentDeal({ ...currentDeal, valid_until: e.target.value })} className="pl-10" min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
             <DialogClose asChild>
              <Button 
                variant="ghost" 
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                disabled={isLoading || isUploading}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDealDialog(false)} disabled={isLoading || isUploading}>Cancel</Button>
              <Button onClick={handleSaveDeal} className="ink-gradient" disabled={isLoading || isUploading || !currentDeal.title.trim()}>
                { (isLoading || isUploading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditingDeal ? 'Save Changes' : 'Create Deal')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistDealsManager;