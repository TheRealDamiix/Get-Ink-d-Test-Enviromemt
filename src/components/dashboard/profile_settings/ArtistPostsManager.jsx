
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, Image as ImageIcon, Newspaper, Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';

const UserPostsManager = ({ user, onPostCreatedOrUpdated }) => {
  const [posts, setPosts] = useState([]);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [currentPost, setCurrentPost] = useState({ 
    id: null, 
    title: '', 
    content: '', 
    image_file: null, 
    existing_image_url: null, 
    existing_public_id: null 
  });
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef(null);

  const fetchPosts = useCallback(async () => {
    if (!user?.id) {
      setPosts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error fetching posts", description: error.message, variant: "destructive" });
      setPosts([]);
    } else {
      setPosts(data || []);
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleOpenPostDialog = (post = null) => {
    if (!user?.id) {
      toast({ title: "User not loaded", description: "Cannot manage posts without user data.", variant: "destructive" });
      return;
    }
    if (post) {
      setCurrentPost({
        id: post.id,
        title: post.title || '', 
        content: post.content || '',
        image_file: null,
        existing_image_url: post.image_url,
        existing_public_id: post.image_public_id,
      });
      setIsEditingPost(true);
    } else {
      setCurrentPost({ id: null, title: '', content: '', image_file: null, existing_image_url: null, existing_public_id: null });
      setIsEditingPost(false);
    }
    setShowPostDialog(true);
  };

  const handleImageFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image too large", description: "Image must be less than 5MB.", variant: "destructive" });
        return;
      }
      setCurrentPost(prev => ({ ...prev, image_file: file, existing_image_url: URL.createObjectURL(file) }));
    }
  };
  
  const uploadImageToCloudinaryFormData = async (file, folderName, fileNamePrefix = 'image') => {
    if (!file || !user) return null;
    setIsLoading(true); 
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${fileNamePrefix}_${user.id}_${Date.now()}.${fileExt}`;
      
      const formDataForUpload = new FormData();
      formDataForUpload.append('file', file);
      formDataForUpload.append('fileName', fileName);
      formDataForUpload.append('folder', folderName);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formDataForUpload, 
      });

      if (uploadError || !uploadData || !uploadData.secure_url) {
        let errorMessage = `Failed to upload ${folderName} image.`;
        if (uploadError?.message) errorMessage = uploadError.message;
        else if (uploadData?.error) errorMessage = uploadData.error;
        throw new Error(errorMessage);
      }
      return { url: uploadData.secure_url, publicId: uploadData.public_id };
    } catch (error) {
      console.error(`Error uploading ${folderName} image:`, error);
      toast({ title: "Upload Error", description: `Failed to upload ${folderName} image. ${error.message}`, variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false); 
    }
  };


  const handleSavePost = async () => {
    if (!user?.id || (!currentPost.content.trim() && !currentPost.title.trim())) { 
      toast({ title: "Missing content", description: "Post title or content cannot be empty.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    let imageUrl = currentPost.existing_image_url;
    let imagePublicId = currentPost.existing_public_id;

    if (currentPost.image_file) {
      const uploaded = await uploadImageToCloudinaryFormData(currentPost.image_file, 'user_posts', 'post');
      if (uploaded) {
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
        if (isEditingPost && currentPost.existing_public_id && currentPost.existing_public_id !== imagePublicId) {
           await supabase.functions.invoke('delete-from-cloudinary', { body: { public_ids: [currentPost.existing_public_id] } });
        }
      } else {
        setIsLoading(false);
        return; 
      }
    } else if (!currentPost.existing_image_url && isEditingPost && currentPost.existing_public_id) {
      try {
        await supabase.functions.invoke('delete-from-cloudinary', { body: { public_ids: [currentPost.existing_public_id] } });
        imageUrl = null;
        imagePublicId = null;
      } catch (error) {
         toast({ title: "Image Deletion Failed", description: "Could not remove old image from Cloudinary.", variant: "destructive" });
      }
    }

    const payload = {
      user_id: user.id,
      title: currentPost.title.trim() || null, 
      content: currentPost.content.trim() || null,
      image_url: imageUrl,
      image_public_id: imagePublicId,
    };

    let error;
    if (isEditingPost && currentPost.id) {
      const { error: updateError } = await supabase.from('posts').update(payload).eq('id', currentPost.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('posts').insert(payload);
      error = insertError;
    }

    if (error) {
      toast({ title: "Error saving post", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Post ${isEditingPost ? 'updated' : 'created'}!`, variant: "default" });
      setShowPostDialog(false);
      fetchPosts();
      if (onPostCreatedOrUpdated) onPostCreatedOrUpdated();
    }
    setIsLoading(false);
  };

  const handleDeletePost = async (post) => {
    setIsLoading(true);
    const { error: dbError } = await supabase.from('posts').delete().eq('id', post.id);
    if (dbError) {
      toast({ title: "Error deleting post", description: dbError.message, variant: "destructive" });
    } else {
      if (post.image_public_id) {
        try {
          await supabase.functions.invoke('delete-from-cloudinary', { body: { public_ids: [post.image_public_id] } });
        } catch (cloudinaryError) {
          toast({ title: "Warning", description: "Post deleted from database, but failed to remove image from Cloudinary.", variant: "default" });
        }
      }
      toast({ title: "Post deleted", variant: "default" });
      fetchPosts();
      if (onPostCreatedOrUpdated) onPostCreatedOrUpdated();
    }
    setIsLoading(false);
  };

  return (
    <div className="mt-8 p-6 glass-effect rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center"><Newspaper className="w-5 h-5 mr-2 text-primary" /> Your Posts</h2>
        <Button onClick={() => handleOpenPostDialog()} className="ink-gradient" disabled={!user?.id || isLoading}>
          <PlusCircle className="w-4 h-4 mr-2" /> Create Post
        </Button>
      </div>
      {isLoading && posts.length === 0 ? (
        <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">You haven't created any posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <motion.div 
              key={post.id} 
              className="flex flex-col sm:flex-row items-start justify-between p-4 border border-border/50 rounded-md gap-3"
              initial={{ opacity: 0, y:10 }} animate={{ opacity:1, y:0 }}
            >
              <div className="flex-1">
                {post.image_url && (
                  <img-replace src={post.image_url} alt="Post image" className="w-full max-w-xs h-auto rounded-md mb-2 object-cover" />
                )}
                {post.title && <h4 className="font-semibold text-md mb-1">{post.title}</h4>}
                {post.content && <p className="text-sm whitespace-pre-wrap">{post.content}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Posted: {new Date(post.created_at).toLocaleDateString()}
                  {post.updated_at && new Date(post.updated_at).getTime() !== new Date(post.created_at).getTime() 
                    ? ` (Edited: ${new Date(post.updated_at).toLocaleDateString()})` 
                    : ''}
                </p>
              </div>
              <div className="space-x-2 self-start sm:self-center flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => handleOpenPostDialog(post)} disabled={isLoading}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post)} className="text-destructive hover:text-destructive/80" disabled={isLoading}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="glass-effect sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditingPost ? 'Edit' : 'Create'} Post</DialogTitle>
            <DialogDescription>Share your thoughts, updates, or anything new!</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="post-title">Title (Optional)</Label>
              <Input id="post-title" value={currentPost.title} onChange={e => setCurrentPost({ ...currentPost, title: e.target.value })} placeholder="Post title..." />
            </div>
            <div>
              <Label htmlFor="post-content">Content</Label>
              <Textarea id="post-content" value={currentPost.content} onChange={e => setCurrentPost({ ...currentPost, content: e.target.value })} placeholder="What's on your mind?" className="min-h-[120px]" />
            </div>
            <div>
              <Label htmlFor="post-image">Image (Optional)</Label>
              <div className="mt-1 flex items-center space-x-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="text-foreground">
                  <Paperclip className="w-4 h-4 mr-2 text-foreground" /> Choose File
                </Button>
                <Input 
                  id="post-image" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageFileChange} 
                  className="hidden" 
                  ref={fileInputRef}
                />
                {currentPost.image_file && <span className="text-sm text-muted-foreground truncate max-w-[150px]">{currentPost.image_file.name}</span>}
              </div>
              {currentPost.existing_image_url && (
                <div className="mt-2 relative w-40 h-40">
                  <img-replace src={currentPost.existing_image_url} alt="Preview" className="w-full h-full object-cover rounded-md" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setCurrentPost(prev => ({...prev, image_file: null, existing_image_url: null, existing_public_id: null }))}
                  >
                    <Trash2 className="h-3 w-3"/>
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
            <Button onClick={handleSavePost} className="ink-gradient" disabled={isLoading || (!currentPost.content.trim() && !currentPost.title.trim())}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditingPost ? 'Save Changes' : 'Create Post')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserPostsManager;