import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, XCircle, Search, Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import type { PortfolioImageRow } from '@/components/profile/PortfolioGrid';

interface ProfileSummary {
  id: string;
  username: string;
  name: string | null;
  profile_photo_url: string | null;
}

interface ImageTagRow {
  id: string;
  portfolio_image_id: string;
  tagged_user_id: string | null;
  tagger_user_id: string | null;
  pos_x: number;
  pos_y: number;
  tagged_user: ProfileSummary;
}

interface ArtistSummary {
  id: string;
  username: string;
  name: string | null;
  profile_photo_url: string | null;
}

// ─── UserSearchForTaggingDialog ──────────────────────────────────────────────

interface UserSearchForTaggingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserSelect: (user: ProfileSummary) => void;
}

const UserSearchForTaggingDialog = ({ open, onOpenChange, onUserSelect }: UserSearchForTaggingDialogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSearchResults([]);
      return;
    }

    const fetchUsers = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, name, profile_photo_url')
          .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
          .limit(5);

        if (error) throw error;
        setSearchResults((data as ProfileSummary[]) || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: "Error searching users", description: message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    const debounceFetch = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounceFetch);
  }, [searchTerm, open, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tag a User</DialogTitle>
          <DialogDescription>Search for a user to tag in this image.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {isLoading && <div className="text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>}
          <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
            {searchResults.length > 0 ? searchResults.map(user => (
              <Button
                key={user.id}
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-3"
                onClick={() => { onUserSelect(user); onOpenChange(false); }}
              >
                <Avatar className="w-8 h-8 mr-3">
                  <AvatarImage src={user.profile_photo_url ?? undefined} alt={user.name ?? undefined} />
                  <AvatarFallback>{user.name?.charAt(0) || user.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{user.name || user.username}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </Button>
            )) : (searchTerm.trim().length >= 2 && !isLoading && <p className="text-sm text-muted-foreground text-center py-2">No users found.</p>)}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── ImageDialog ─────────────────────────────────────────────────────────────

interface TagPosition {
  x_percent: number;
  y_percent: number;
}

interface ImageDialogProps {
  selectedImage: PortfolioImageRow | null;
  artist: ArtistSummary | null;
  onOpenChange: (open: boolean) => void;
}

const ImageDialog = ({ selectedImage, artist, onOpenChange }: ImageDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tags, setTags] = useState<ImageTagRow[]>([]);
  const [isTaggingMode, setIsTaggingMode] = useState(false);
  const [newTagPosition, setNewTagPosition] = useState<TagPosition | null>(null);
  const [showUserSearchDialog, setShowUserSearchDialog] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const canManageTags = user && selectedImage && (user.id === selectedImage.user_id || user.id === artist?.id);

  useEffect(() => {
    const fetchTags = async () => {
      if (!selectedImage?.id) {
        setTags([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('image_tags')
          .select('*, tagged_user:profiles!tagged_user_id(id, username, name, profile_photo_url)')
          .eq('portfolio_image_id', selectedImage.id);
        if (error) throw error;
        setTags((data as ImageTagRow[]) || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast({ title: "Error fetching tags", description: message, variant: "destructive" });
      }
    };

    if (selectedImage) {
      fetchTags();
    } else {
      setTags([]);
      setIsTaggingMode(false);
      setNewTagPosition(null);
    }
  }, [selectedImage, toast]);

  const handleImageClickForTagging = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isTaggingMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setNewTagPosition({
      x_percent: (x / rect.width) * 100,
      y_percent: (y / rect.height) * 100,
    });
    setShowUserSearchDialog(true);
  };

  const handleUserSelectedForTag = async (taggedUser: ProfileSummary) => {
    if (!newTagPosition || !selectedImage || !user) return;
    try {
      const { data: newTag, error } = await supabase
        .from('image_tags')
        .insert({
          portfolio_image_id: selectedImage.id,
          tagged_user_id: taggedUser.id,
          tagger_user_id: user.id,
          pos_x: newTagPosition.x_percent.toFixed(2),
          pos_y: newTagPosition.y_percent.toFixed(2),
        })
        .select('*, tagged_user:profiles!tagged_user_id(id, username, name, profile_photo_url)')
        .single();

      if (error) throw error;
      setTags(prev => [...prev, newTag as ImageTagRow]);
      toast({ title: "User Tagged!", description: `${taggedUser.name || taggedUser.username} has been tagged.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: "Error tagging user", description: message, variant: "destructive" });
    } finally {
      setNewTagPosition(null);
      setIsTaggingMode(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from('image_tags').delete().eq('id', tagId);
      if (error) throw error;
      setTags(prev => prev.filter(tag => tag.id !== tagId));
      toast({ title: "Tag removed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: "Error removing tag", description: message, variant: "destructive" });
    }
  };

  if (!selectedImage) return null;

  return (
    <>
      <Dialog open={!!selectedImage} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) setIsTaggingMode(false); }}>
        <DialogContent className="max-w-3xl glass-effect p-0 max-h-[90vh] flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-3 flex-grow overflow-hidden">
            <div
              className={`md:col-span-2 aspect-[4/3] md:aspect-auto relative ${isTaggingMode ? 'cursor-crosshair' : ''} flex items-center justify-center bg-black/50`}
              onClick={handleImageClickForTagging}
            >
              <img
                ref={imageRef}
                src={selectedImage.cloudinary_url}
                alt={selectedImage.caption || 'Portfolio image'}
                className="max-w-full max-h-full object-contain"
              />
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="absolute p-1 bg-primary/80 rounded-full shadow-lg group"
                  style={{ left: `${tag.pos_x}%`, top: `${tag.pos_y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <UserPlus className="w-3 h-3 text-primary-foreground" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block p-2 bg-background text-foreground text-xs rounded shadow-xl whitespace-nowrap z-50">
                    <Link to={`/user/${tag.tagged_user.username}`} onClick={() => onOpenChange(false)} className="hover:underline">
                      {tag.tagged_user.name || tag.tagged_user.username}
                    </Link>
                    {canManageTags && user && (user.id === tag.tagger_user_id || user.id === selectedImage.user_id) && (
                      <Button variant="ghost" size="icon" className="ml-2 h-5 w-5 text-destructive hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id); }}>
                        <XCircle className="h-3 w-3 text-white" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 flex flex-col overflow-y-auto">
              <DialogHeader className="mb-4">
                {artist && (
                  <div className="flex items-center mb-3">
                    <Avatar className="w-10 h-10 mr-3">
                      <AvatarImage src={artist.profile_photo_url ?? undefined} alt={artist.name ?? undefined} />
                      <AvatarFallback className="ink-gradient text-white">
                        {artist.name?.charAt(0)?.toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-lg">{artist.name || artist.username}</DialogTitle>
                      <DialogDescription>@{artist.username}</DialogDescription>
                    </div>
                  </div>
                )}
                {selectedImage.caption && (
                  <p className="text-sm text-foreground">{selectedImage.caption}</p>
                )}
              </DialogHeader>

              <div className="mt-auto space-y-3">
                {canManageTags && (
                  <Button variant={isTaggingMode ? "destructive" : "outline"} className="w-full" onClick={() => setIsTaggingMode(!isTaggingMode)}>
                    <Tag className="w-4 h-4 mr-2 text-foreground" /> {isTaggingMode ? "Cancel Tagging" : "Tag People"}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Image uploaded on {new Date(selectedImage.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <UserSearchForTaggingDialog
        open={showUserSearchDialog}
        onOpenChange={setShowUserSearchDialog}
        onUserSelect={handleUserSelectedForTag}
      />
    </>
  );
};

export default ImageDialog;
