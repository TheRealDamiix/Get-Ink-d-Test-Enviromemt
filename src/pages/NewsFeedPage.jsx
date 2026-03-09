import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Heart, MessageSquare, Image as ImageIcon, UserCircle, Edit3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserPostsManager from '@/components/dashboard/profile_settings/ArtistPostsManager';
import { AnimatePresence } from 'framer-motion';

const postsPerPage = 10;

const PostCard = ({ post }) => {
  const { toast } = useToast();

  const timeSince = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    if (seconds < 10) return 'just now';
    return Math.floor(seconds) + 's ago';
  };

  const handleNotImplemented = (feature) => {
    toast({
      title: `${feature} coming soon`,
      description: 'This feature is not yet available.',
    });
  };

  const profileLink = post.poster_is_artist ? `/artist/${post.poster_username}` : `/user/${post.poster_username}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-[0_0_20px_rgba(229,62,62,0.08)]"
      style={{ background: 'rgba(22,22,22,0.7)', backdropFilter: 'blur(12px)' }}
    >
      <div className="p-5">
        {/* Author row */}
        <Link to={profileLink} className="flex items-center gap-3 mb-4 group/author">
          <Avatar className="w-10 h-10 border-2 border-primary/30 group-hover/author:border-primary/60 transition-colors shrink-0">
            <AvatarImage src={post.poster_profile_photo_url} alt={post.poster_name} />
            <AvatarFallback className="ink-gradient text-primary-foreground font-bold text-sm">
              {post.poster_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight group-hover/author:text-primary transition-colors truncate">
              {post.poster_name || post.poster_username}
              {post.poster_is_artist && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/70 border border-primary/30 rounded px-1 py-0.5">Artist</span>}
            </h3>
            <p className="text-xs text-muted-foreground">@{post.poster_username} · {timeSince(post.created_at)}</p>
          </div>
        </Link>

        {post.title && <h4 className="text-base font-bold text-foreground mb-2 leading-snug">{post.title}</h4>}
        {post.content && <p className="text-sm text-foreground/75 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>}

        {post.image_url && (
          <div className="mb-2 -mx-1 rounded-xl overflow-hidden border border-border/30 max-h-[480px] bg-black/20">
            <img src={post.image_url} alt="Post image" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-5 py-2.5 border-t border-border/20 flex items-center gap-1">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/8 gap-1.5 text-xs" onClick={() => handleNotImplemented('Like')}>
          <Heart className="w-3.5 h-3.5" /> Like
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/8 gap-1.5 text-xs" onClick={() => handleNotImplemented('Comment')}>
          <MessageSquare className="w-3.5 h-3.5" /> Comment
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/8 gap-1.5 text-xs ml-auto" onClick={() => handleNotImplemented('Share')}>
          <UserCircle className="w-3.5 h-3.5" /> Share
        </Button>
      </div>
    </motion.div>
  );
};


const NewsFeedPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false);

  // Use refs for hasMore and isLoading so the callback stays stable
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const fetchPosts = useCallback(async (currentPage, initialLoad = false) => {
    if (!hasMoreRef.current && !initialLoad) return;
    if (isLoadingRef.current && !initialLoad) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          poster:profiles(id, username, name, profile_photo_url, is_artist)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * postsPerPage, currentPage * postsPerPage - 1);

      if (error) throw error;

      const formattedData = (data || []).map(p => ({
        ...p,
        poster_username: p.poster?.username,
        poster_name: p.poster?.name,
        poster_profile_photo_url: p.poster?.profile_photo_url,
        poster_is_artist: p.poster?.is_artist,
      }));

      setPosts(prevPosts => initialLoad ? formattedData : [...prevPosts, ...formattedData]);
      setHasMore(formattedData.length === postsPerPage);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toastRef.current({ title: 'Error', description: 'Could not load posts.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []); // stable — accesses state via refs or setters only

  useEffect(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  const loadMorePosts = () => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  };

  const handlePostCreatedOrUpdated = () => {
    setShowCreatePostDialog(false);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">Community</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight ink-text-gradient">News Feed</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Latest posts, deals, and inspiration from the InkSnap community.
          </p>
        </motion.div>

        {user && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 rounded-2xl border border-primary/15 hover:border-primary/25 transition-colors cursor-pointer"
            style={{ background: 'rgba(22,22,22,0.7)', backdropFilter: 'blur(12px)' }}
            onClick={() => setShowCreatePostDialog(true)}
          >
            <div className="flex items-center gap-3">
              <Avatar className="border-2 border-primary/30 shrink-0">
                <AvatarImage src={user.profile_photo_url || user.profile?.profile_photo_url} alt={user.name || user.username} />
                <AvatarFallback className="ink-gradient text-primary-foreground font-bold">
                  {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm text-muted-foreground/60">Share something with the community...</span>
              <Button className="ink-gradient shrink-0 shadow-md shadow-primary/20" size="sm" onClick={(e) => { e.stopPropagation(); setShowCreatePostDialog(true); }}>
                <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Post
              </Button>
            </div>
          </motion.div>
        )}

        {/* Custom overlay — avoids nested Radix Dialog aria-hidden conflict */}
        <AnimatePresence>
          {user && showCreatePostDialog && (
            <motion.div
              key="post-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreatePostDialog(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

              {/* Panel */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.18 }}
                className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar glass-effect rounded-2xl border border-border/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between px-6 pt-6 pb-0">
                  <div>
                    <h2 className="text-lg font-bold leading-tight">Manage Your Posts</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Create new posts or edit existing ones.</p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-1" onClick={() => setShowCreatePostDialog(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <UserPostsManager user={user} onPostCreatedOrUpdated={handlePostCreatedOrUpdated} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && posts.length === 0 && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading fresh inkspiration...</p>
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-border/30 p-8"
               style={{ background: 'rgba(22,22,22,0.6)', backdropFilter: 'blur(10px)' }}>
            <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
              <ImageIcon className="w-7 h-7 text-primary/50" />
            </div>
            <h2 className="text-xl font-bold mb-2">The Canvas is Clean</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">No posts yet. Be the first to share your work with the community!</p>
            {!user &&
              <Button asChild className="ink-gradient shadow-lg shadow-primary/20">
                <Link to="/auth">Sign In to Post</Link>
              </Button>
            }
          </div>
        )}

        {posts.length > 0 && (
          <div className="space-y-4">
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
