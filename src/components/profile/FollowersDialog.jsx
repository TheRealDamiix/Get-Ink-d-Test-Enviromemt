import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Users, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const FollowersDialog = ({ artistId, artistName, open, onOpenChange }) => {
  const [followers, setFollowers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!artistId || !open) {
        setFollowers([]);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('follower:profiles!follower_id (id, username, name, profile_photo_url, created_at)')
          .eq('following_id', artistId)
          .order('created_at', { ascending: false });


        if (error) {
          console.error('Error fetching followers:', error);
          toast({ title: "Error", description: "Could not load followers.", variant: "destructive" });
          setFollowers([]);
        } else {
          setFollowers(data.map(f => f.follower).filter(Boolean));
        }
      } catch (e) {
        console.error("Unexpected error fetching followers:", e);
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
        setFollowers([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchFollowers();
    }
  }, [artistId, open, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="w-6 h-6 text-primary" /> Followers of {artistName}
          </DialogTitle>
          <DialogDescription>
            Users who are following this artist.
          </DialogDescription>
        </DialogHeader>
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 rounded-full"
            onClick={() => onOpenChange(false)}
        >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
        </Button>
        <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : followers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No followers yet.</p>
          ) : (
            <ul className="space-y-3">
              {followers.map((follower) => (
                <li key={follower.id}>
                  <Link 
                    to={`/user/${follower.username}`} 
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-primary/10 transition-colors group"
                  >
                    <Avatar className="w-12 h-12 border-2 border-transparent group-hover:border-primary/50 transition-all">
                      <AvatarImage src={follower.profile_photo_url} alt={follower.name} />
                      <AvatarFallback className="ink-gradient text-white">
                        {follower.name?.charAt(0)?.toUpperCase() || follower.username?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold group-hover:text-primary transition-colors">{follower.name || 'Unnamed User'}</p>
                      <p className="text-sm text-muted-foreground">@{follower.username}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowersDialog;