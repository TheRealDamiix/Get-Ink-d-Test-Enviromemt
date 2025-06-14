
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ImageDialog = ({ selectedImage, artist, onOpenChange }) => {
  return (
    <Dialog open={!!selectedImage} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 w-[95vw] h-auto max-h-[90vh] glass-effect rounded-2xl overflow-hidden">
        {selectedImage && artist && (
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] h-full">
            <div className="bg-black flex items-center justify-center overflow-hidden">
              <img src={selectedImage.image} alt={selectedImage.caption} className="w-auto h-auto max-w-full max-h-[90vh] object-contain" />
            </div>
            <div className="p-6 flex flex-col overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 border-b border-border pb-4">
                <Avatar>
                  <AvatarImage src={artist.profilePhoto} />
                  <AvatarFallback>{artist.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{artist.name}</p>
                  <p className="text-sm text-muted-foreground">@{artist.username}</p>
                </div>
              </div>
              <p className="flex-grow text-sm mb-4">{selectedImage.caption || "No caption for this image."}</p>
              <p className="text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
                Posted on {new Date(selectedImage.createdDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageDialog;
