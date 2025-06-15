
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
          .select('follower:profiles!follower_id (id, username, name, profile_photo_url)')
          .eq('following_id', artistId);

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
      <DialogContent className="glass-effect sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Followers of {artistName}
          </DialogTitle>
          <DialogDescription>
            Users who are following this artist.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto py-4 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : followers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No followers yet.</p>
          ) : (
            <ul className="space-y-3">
              {followers.map((follower) => (
                <li key={follower.id}>
                  <Link 
                    to={`/user/${follower.username}`} 
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={follower.profile_photo_url} alt={follower.name} />
                      <AvatarFallback className="ink-gradient text-white">
                        {follower.name?.charAt(0)?.toUpperCase() || follower.username?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{follower.name || 'Unnamed User'}</p>
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
