import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const ConversationListItem = ({ conv, onSelectConversation, selectedConversationId }) => {
  // Use the pre-processed 'otherUser' object for simplicity and reliability
  const otherUser = conv.otherUser;
  if (!otherUser) return null; // Failsafe if other user's data is missing

  const lastMessageContent = conv.last_message_content || 'No messages yet...';
  const lastMessageTime = conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <motion.button
      key={conv.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelectConversation(conv.id)}
      className={cn(
        "w-full flex items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-left",
        selectedConversationId === conv.id && "bg-primary/10"
      )}
    >
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage src={otherUser.profile_photo_url} alt={otherUser.name || otherUser.username} />
        <AvatarFallback className="ink-gradient text-primary-foreground">
          {(otherUser.name || otherUser.username || 'U').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <h4 className="font-medium text-sm truncate">{otherUser.name || otherUser.username}</h4>
        <p className="text-xs text-muted-foreground truncate">{lastMessageContent}</p>
      </div>
      <div className="ml-2 text-right">
        {conv.unread_count > 0 && (
          <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 mb-1 inline-block">
            {conv.unread_count}
          </span>
        )}
        <p className="text-xs text-muted-foreground">{lastMessageTime}</p>
      </div>
    </motion.button>
  );
};

const ConversationList = ({ conversations, onSelectConversation, selectedConversationId, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <MessageSquare className="w-12 h-12 mb-4 text-primary/70" />
        <p className="text-sm">No conversations yet.</p>
        <p className="text-xs mt-1">Start a chat by messaging an artist from their profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 overflow-y-auto h-full custom-scrollbar pr-1">
      {conversations.map((conv) => (
        <ConversationListItem
          key={conv.id}
          conv={conv}
          onSelectConversation={onSelectConversation}
          selectedConversationId={selectedConversationId}
        />
      ))}
    </div>
  );
};

export default ConversationList;
