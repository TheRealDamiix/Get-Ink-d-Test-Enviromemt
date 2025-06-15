
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare } from 'lucide-react';

const MessageArea = () => {
  // Placeholder messages
  const messages = [
    // { id: 1, sender: 'other', text: 'Hello! How can I help you today?', time: '10:00 AM' },
    // { id: 2, sender: 'me', text: 'I was wondering about your availability.', time: '10:01 AM' },
  ];

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageSquare className="w-16 h-16 mb-4 text-primary/70" />
        <p className="text-lg">Select a conversation to start chatting</p>
        <p className="text-sm mt-1">(Full messaging feature coming soon!)</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.sender === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <p>{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center space-x-2">
          <Input type="text" placeholder="Type your message..." className="flex-1 bg-background/70" />
          <Button className="ink-gradient">
            <Send className="w-4 h-4 mr-2" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageArea;
