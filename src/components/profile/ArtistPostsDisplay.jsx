
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Newspaper, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const ArtistPostsDisplay = ({ artistId, artistUsername, artistName, artistProfilePhotoUrl }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    if (!artistId) {
      setPosts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('posts') 
      .select('*') 
      .eq('user_id', artistId) 
      .order('created_at', { ascending: false })
      .limit(5); 

    if (error) {
      toast({ title: "Error fetching artist posts", description: error.message, variant: "destructive" });
      setPosts([]);
    } else {
      setPosts(data || []);
    }
    setIsLoading(false);
  }, [artistId, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  if (isLoading) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-2">Loading Artist Updates...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="my-8 p-6 glass-effect rounded-xl text-center">
        <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-xl font-semibold">No Updates Yet</h3>
        <p className="text-muted-foreground">This user hasn't posted any updates.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-8 p-6 glass-effect rounded-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <Newspaper className="w-6 h-6 mr-3 text-primary" />
          Latest Posts
        </h2>
        <Link to="/feed" className="text-sm text-primary hover:underline">View all on Feed</Link>
      </div>
      <div className="space-y-6">
        {posts.map((post, index) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 border border-border/50 rounded-lg"
          >
            <div className="flex items-center mb-3">
              <Avatar className="w-9 h-9 mr-2.5 border border-primary/30">
                <AvatarImage src={artistProfilePhotoUrl} alt={artistName} />
                <AvatarFallback className="ink-gradient text-primary-foreground">
                  {artistName?.charAt(0)?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link to={`/artist/${artistUsername}`} className="font-semibold text-sm hover:underline">{artistName || artistUsername}</Link>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {post.image_url && (
              <div className="mb-3 rounded-md overflow-hidden max-h-80">
                <img src={post.image_url} alt="Post image" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ArtistPostsDisplay;