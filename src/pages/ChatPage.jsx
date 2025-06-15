
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ConversationList from '@/components/chat/ConversationList';
import MessageArea from '@/components/chat/MessageArea';

const ChatPage = () => {
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: "🚧 Coming Soon!",
      description: "Messaging feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      duration: 5000,
    });
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-card/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl h-[70vh] glass-effect rounded-2xl shadow-2xl overflow-hidden flex"
      >
        <div className="w-1/3 border-r border-border/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold ink-text-gradient">Conversations</h2>
            <Users className="w-6 h-6 text-primary" />
          </div>
          <ConversationList />
        </div>
        <div className="w-2/3 flex flex-col p-4">
          <MessageArea />
        </div>
      </motion.div>
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-center text-muted-foreground"
      >
        The full messaging experience is under construction. Stay tuned!
      </motion.p>
    </div>
  );
};

export default ChatPage;
