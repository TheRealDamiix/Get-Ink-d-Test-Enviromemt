
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

const ConversationList = () => {
  // Placeholder data
  const conversations = [
    // { id: 1, name: 'Artist One', lastMessage: 'Hey, are you available for a consult?', unread: 2, avatar: '/placeholder-avatar1.jpg' },
    // { id: 2, name: 'Client Two', lastMessage: 'Thanks for the awesome tattoo!', unread: 0, avatar: '/placeholder-avatar2.jpg' },
  ];

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-sm">Loading conversations...</p>
        <p className="text-xs mt-1">(Feature coming soon)</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto h-full">
      {conversations.map((conv) => (
        <div key={conv.id} className="flex items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={conv.avatar} alt={conv.name} />
            <AvatarFallback className="ink-gradient text-primary-foreground">{conv.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h4 className="font-medium">{conv.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
          </div>
          {conv.unread > 0 && (
            <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{conv.unread}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConversationList;
