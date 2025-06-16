
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Upload, Trash2, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PortfolioManager = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImageCaption, setNewImageCaption] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (user?.id) {
        setIsLoadingPortfolio(true);
        const { data, error } = await supabase
          .from('portfolio_images')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching portfolio:', error);
          toast({ title: "Error", description: "Could not load portfolio images.", variant: "destructive" });
        } else {
          setPortfolioImages(data || []);
        }
        setIsLoadingPortfolio(false);
      }
    };
    fetchPortfolio();
  }, [user, toast]);

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
       if (event.target.files[0].size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        setNewImageFile(null);
        event.target.value = ""; 
        return;
      }
      setNewImageFile(event.target.files[0]);
    }
  };

  const handleAddImage = async () => {
    if (!newImageFile || !user) return;
    setIsUploading(true);

    try {
      const fileExt = newImageFile.name.split('.').pop();
      const fileName = `${user.id}_portfolio_${Date.now()}.${fileExt}`;

      const formDataForUpload = new FormData();
      formDataForUpload.append('file', newImageFile);
      formDataForUpload.append('fileName', fileName);
      formDataForUpload.append('folder', 'portfolio_images'); 
      if (newImageCaption) {
         formDataForUpload.append('caption', newImageCaption);
      }

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formDataForUpload,
      });
      
      if (uploadError) {
        console.error("Upload error details:", uploadError);
        let errorMessage = "Image upload failed.";
        if (uploadError.message) {
          errorMessage = uploadError.message;
        } else if (typeof uploadError === 'object' && uploadError.error) {
          errorMessage = uploadError.error;
        }
        throw new Error(errorMessage);
      }

      if (!uploadData || !uploadData.secure_url) {
        console.error("Upload data missing URL:", uploadData);
        throw new Error("Image upload failed to return URL.");
      }

      const { secure_url, public_id } = uploadData;

      const { data: dbData, error: dbError } = await supabase
        .from('portfolio_images')
        .insert({
          user_id: user.id,
          cloudinary_url: secure_url,
          cloudinary_public_id: public_id,
          caption: newImageCaption || null,
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(dbError.message || 'Failed to save image to database.');
      }
      
      setPortfolioImages(prev => [dbData, ...prev]);
      setNewImageFile(null);
      setNewImageCaption('');
      setShowImageDialog(false);
      toast({ title: "Image added!", description: "Your portfolio has been updated." });
      updateUser({ last_active: new Date().toISOString() });

    } catch (error) {
      console.error("Error adding image:", error);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (imageToRemove) => {
    if (!user || !imageToRemove.cloudinary_public_id || !imageToRemove.id) return;
    
    const originalImages = [...portfolioImages];
    setPortfolioImages(prev => prev.filter(img => img.id !== imageToRemove.id));

    try {
      const { error: cloudinaryError } = await supabase.functions.invoke('delete-from-cloudinary', {
        body: { publicId: imageToRemove.cloudinary_public_id },
      });

      if (cloudinaryError) {
        console.warn("Cloudinary deletion might have failed or image not found:", cloudinaryError.message);
      }

      const { error: dbError } = await supabase
        .from('portfolio_images')
        .delete()
        .eq('id', imageToRemove.id)
        .eq('user_id', user.id);

      if (dbError) {
        throw new Error(dbError.message || 'Failed to delete image from database.');
      }
      
      toast({ title: "Image removed", description: "The image has been removed from your portfolio." });
      updateUser({ last_active: new Date().toISOString() });

    } catch (error) {
      console.error("Error removing image:", error);
      setPortfolioImages(originalImages);
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Portfolio Management</h2>
        <Dialog open={showImageDialog} onOpenChange={(isOpen) => {
          setShowImageDialog(isOpen);
          if (!isOpen) {
            setNewImageFile(null); 
            setNewImageCaption('');
          }
        }}>
          <DialogTrigger asChild>
            <Button className="ink-gradient"><Plus className="w-4 h-4 mr-2" />Add Image</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Portfolio Image</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="image-file">Image File (Max 5MB)</Label>
                <Input id="image-file" type="file" accept="image/*" onChange={handleFileChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-caption">Caption (Optional)</Label>
                <Textarea id="image-caption" value={newImageCaption} onChange={(e) => setNewImageCaption(e.target.value)} placeholder="Describe this tattoo..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isUploading}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddImage} className="ink-gradient" disabled={isUploading || !newImageFile}>
                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Add Image"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoadingPortfolio ? (
        <div className="text-center py-12 text-muted-foreground">Loading portfolio...</div>
      ) : portfolioImages && portfolioImages.length > 0 ? (
        <div className="portfolio-grid">
          {portfolioImages.map((item, idx) => (
            <motion.div key={item.id || idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} className="group relative">
              <div className="aspect-square rounded-lg overflow-hidden mb-2">
                <img-replace src={item.cloudinary_url} alt={item.caption || 'Portfolio image'} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="sm" variant="destructive" onClick={() => handleRemoveImage(item)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {item.caption && <p className="text-sm text-muted-foreground line-clamp-2">{item.caption}</p>}
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