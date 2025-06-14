import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast'; // Corrected import


const PortfolioManager = ({ user, updateUser, toast, artistPortfolio, setArtistPortfolio }) => {
  const [newImage, setNewImage] = useState({ image: '', caption: '' });
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isAddingImage, setIsAddingImage] = useState(false);

  const handleAddImage = async () => {
    if (newImage.image.trim()) {
      setIsAddingImage(true);
      try {
        const { data, error } = await supabase
          .from('portfolio_images')
          .insert([
            { user_id: user.id, image_url: newImage.image, caption: newImage.caption }
          ])
          .select();

        if (error) {
          console.error("Error adding portfolio image:", error);
          toast({ title: "Error adding image", description: error.message, variant: "destructive" });
        } else if (data && data.length > 0) {
          setArtistPortfolio(prevPortfolio => [{ ...data[0], image: data[0].image_url, createdDate: data[0].created_at }, ...prevPortfolio]);
          setNewImage({ image: '', caption: '' });
          setShowImageDialog(false);
          toast({ title: "Image added!", description: "Your portfolio has been updated." });

          updateUser({ last_active: new Date().toISOString() });
        }
      } finally {
        setIsAddingImage(false);
      }
    }
  };

  const handleRemoveImage = async (imageIdToRemove) => {
    try {
      const { error } = await supabase
        .from('portfolio_images')
        .delete()
        .eq('id', imageIdToRemove);

      if (error) {
        console.error("Error removing portfolio image:", error);
        toast({ title: "Error removing image", description: error.message, variant: "destructive" });
      } else {
        setArtistPortfolio(artistPortfolio.filter(item => item.id !== imageIdToRemove));
        toast({ title: "Image removed", description: "The image has been removed from your portfolio." });

        updateUser({ last_active: new Date().toISOString() });
      }
    } catch (error) {
        console.error("Error removing portfolio image:", error);
        toast({ title: "Error removing image", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Portfolio Management</h2>
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogTrigger asChild>
            <Button className="ink-gradient" disabled={isAddingImage}><Plus className="w-4 h-4 mr-2" />Add Image</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Portfolio Image</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input id="image-url" value={newImage.image} onChange={(e) => setNewImage({ ...newImage, image: e.target.value })} placeholder="https://example.com/image.jpg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-caption">Caption (Optional)</Label>
                <Textarea id="image-caption" value={newImage.caption} onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })} placeholder="Describe this tattoo..." rows={3} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddImage} className="ink-gradient" disabled={isAddingImage}>
                  {isAddingImage ? 'Adding...' : 'Add Image'}
                </Button>
                <Button variant="outline" onClick={() => setShowImageDialog(false)} disabled={isAddingImage}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {artistPortfolio && artistPortfolio.length > 0 ? (
        <div className="portfolio-grid">
          {artistPortfolio.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="group relative">
              <div className="aspect-square rounded-lg overflow-hidden mb-2">
                <img src={item.image_url} alt={item.caption} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="sm" variant="destructive" onClick={() => handleRemoveImage(item.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {item.caption && <p className="text-sm text-muted-foreground">{item.caption}</p>}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No portfolio images yet</h3>
          <p className="text-muted-foreground mb-6">Start building your portfolio by adding your best tattoo work</p>
          <Button onClick={() => setShowImageDialog(true)} className="ink-gradient"><Plus className="w-4 h-4 mr-2" />Add Your First Image</Button>
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;
