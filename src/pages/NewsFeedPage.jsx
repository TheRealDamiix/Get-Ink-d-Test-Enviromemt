
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Newspaper, Heart, MessageSquare, Image as ImageIcon, UserCircle, Clock, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserPostsManager from '@/components/dashboard/profile_settings/ArtistPostsManager'; 

const PostCard = ({ post, onLike, onComment }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const timeSince = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    if (seconds < 10) return "just now";
    return Math.floor(seconds) + "s ago";
  };

  const handleNotImplemented = (feature) => {
    toast({
      title: `🚧 ${feature} Feature`,
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };
  
  const profileLink = post.poster_is_artist ? `/artist/${post.poster_username}` : `/user/${post.poster_username}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-xl overflow-hidden shadow-lg border border-border/50"
    >
      <div className="p-5">
        <div className="flex items-center mb-4">
          <Link to={profileLink} className="flex items-center">
            <Avatar className="w-11 h-11 mr-3 border-2 border-primary/40">
              <AvatarImage src={post.poster_profile_photo_url} alt={post.poster_name} />
              <AvatarFallback className="ink-gradient text-primary-foreground">
                {post.poster_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{post.poster_name || post.poster_username}</h3>
              <p className="text-xs text-muted-foreground">@{post.poster_username} &bull; {timeSince(post.created_at)}</p>
            </div>
          </Link>
        </div>
        
        {post.title && <h4 className="text-lg font-semibold text-foreground/95 mb-2">{post.title}</h4>}
        {post.content && <p className="text-sm text-foreground/90 mb-4 whitespace-pre-wrap">{post.content}</p>}
        
        {post.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden max-h-[500px]">
            <img-replace src={post.image_url} alt="Post image" className="w-full h-full object-contain" />
          </div>
        )}
      </div>
      
      <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => handleNotImplemented('Like')}>
          <Heart className="w-4 h-4 mr-2" /> Like
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => handleNotImplemented('Comment')}>
          <MessageSquare className="w-4 h-4 mr-2" /> Comment
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => handleNotImplemented('Share')}>
          <UserCircle className="w-4 h-4 mr-2" /> Share
        </Button>
      </div>
    </motion.div>
  );
};


const NewsFeedPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 10;
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false);

  const fetchPosts = useCallback(async (currentPage, initialLoad = false) => {
    if (!hasMore && !initialLoad && !isLoading) return;
    setIsLoading(true);
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        poster:profiles!posts_user_id_fkey (
          id, 
          username, 
          name, 
          profile_photo_url,
          is_artist
        )
      `)
      .order('created_at', { ascending: false })
      .range((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1);

    try {
      const { data, error } = await query;
      if (error) throw error;

      const formattedData = data ? data.map(p => ({
        ...p,
        poster_username: p.poster?.username,
        poster_name: p.poster?.name,
        poster_profile_photo_url: p.poster?.profile_photo_url,
        poster_is_artist: p.poster?.is_artist
      })) : [];


      if (formattedData) {
        setPosts(prevPosts => initialLoad ? formattedData : [...prevPosts, ...formattedData]);
        setHasMore(formattedData.length === postsPerPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({ title: "Error", description: "Could not load posts.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, hasMore, postsPerPage, isLoading]);

  useEffect(() => {
    fetchPosts(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const loadMorePosts = () => {
    if (!isLoading && hasMore) {
      setPage(prevPage => {
        const nextPage = prevPage + 1;
        fetchPosts(nextPage);
        return nextPage;
      });
    }
  };
  
  const handlePostCreatedOrUpdated = () => {
    setShowCreatePostDialog(false); 
    fetchPosts(1, true); 
  };


  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-background to-card/5">
      <div className="container mx-auto max-w-2xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center mb-3">
            <Newspaper className="w-10 h-10 mr-3 text-primary" />
            <h1 className="text-4xl font-bold ink-text-gradient">News Feed</h1>
          </div>
          <p className="text-muted-foreground">
            Catch up on the latest posts, deals, and inspirations from the community.
          </p>
        </motion.div>

        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 p-4 glass-effect rounded-xl"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user.profile_photo_url || user.profile?.profile_photo_url} alt={user.name || user.username} />
                <AvatarFallback className="ink-gradient text-primary-foreground">
                  {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="outline" 
                className="flex-1 justify-start text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreatePostDialog(true)}
              >
                What's on your mind, {user.name || user.username}?
              </Button>
              <Button className="ink-gradient" onClick={() => setShowCreatePostDialog(true)}>
                <Edit3 className="w-4 h-4 mr-2 sm:mr-0" /><span className="hidden sm:inline ml-2">Create Post</span>
              </Button>
            </div>
          </motion.div>
        )}
        
        {showCreatePostDialog && user && (
           <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="w-full max-w-lg">
                <UserPostsManager user={user} onPostCreatedOrUpdated={handlePostCreatedOrUpdated} />
                <Button variant="ghost" onClick={() => setShowCreatePostDialog(false)} className="mt-2 w-full">Cancel</Button>
             </div>
           </div>
        )}


        {isLoading && posts.length === 0 && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading fresh inkspiration...</p>
          </div>
        )}

        {!isLoading && posts.length === 0 && (
           <div className="text-center py-12 glass-effect rounded-xl p-8">
            <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">The Canvas is Clean!</h2>
            <p className="text-muted-foreground mb-6">No posts to show right now. Be the first to share something!</p>
            {!user && 
              <Button asChild className="ink-gradient">
                <Link to="/auth">Sign In to Post</Link>
              </Button>
            }
          </div>
        )}

        {posts.length > 0 && (
          <div className="space-y-8">
            {posts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        {isLoading && posts.length > 0 && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </div>
        )}

        {!isLoading && hasMore && posts.length > 0 && (
          <div className="text-center mt-10">
            <Button onClick={loadMorePosts} variant="outline" className="ink-gradient hover:opacity-90">
              Load More Posts
            </Button>
          </div>
        )}
         {!isLoading && !hasMore && posts.length > 0 && (
          <p className="text-center text-muted-foreground mt-10">You've reached the end of the feed!</p>
        )}
      </div>
    </div>
  );
};

export default NewsFeedPage;
