import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ConversationList from '@/components/chat/ConversationList';
import MessageArea from '@/components/chat/MessageArea';

const ChatPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase.rpc('get_conversations_with_details', {
        p_user_id: user.id
      });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({ title: "Error", description: "Could not load conversations.", variant: "destructive" });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth?redirect=/chat');
      } else {
        fetchConversations();
      }
    }
  }, [user, authLoading, navigate, fetchConversations]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const conversationIdFromUrl = searchParams.get('conversationId');
    setSelectedConversationId(conversationIdFromUrl);
  }, [location.search]);

  // Updated real-time subscription with better status handling
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`public:chat:${user.id}`);
    
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      (payload) => {
        const relevantConversation = payload.table === 'conversations' && (payload.new?.user1_id === user.id || payload.new?.user2_id === user.id);
        const relevantMessage = payload.table === 'messages' && (payload.new?.receiver_id === user.id || payload.new?.sender_id === user.id);

        if (relevantConversation || relevantMessage) {
            fetchConversations();
        }
      }
    ).subscribe((status, err) => {
        switch (status) {
          case 'SUBSCRIBED':
            console.log(`ChatPage: Subscribed successfully to user's chat channel.`);
            fetchConversations(); // Fetch latest data on successful connection/reconnection
            break;
          case 'TIMED_OUT':
            toast({ title: "Chat Connection Timed Out", description: "Reconnecting...", variant: "default" });
            break;
          case 'CHANNEL_ERROR':
            console.error('ChatPage Subscription Error:', err);
            toast({ title: "Chat Connection Error", description: "A connection error occurred. Please refresh.", variant: "destructive" });
            break;
          case 'CLOSED':
            console.log(`ChatPage: Channel explicitly closed.`);
            break;
        }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations, toast]);

  const handleSelectConversation = async (conversationId) => {
    setSelectedConversationId(conversationId);
    navigate(`/chat?conversationId=${conversationId}`, { replace: true });
    
    setConversations(prev => prev.map(c => c.id === conversationId ? {...c, unread_count: 0} : c));
    
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', user.id);
  };
  
  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  const showConversationList = !isMobileView || !selectedConversationId;
  const showMessageArea = !isMobileView || !!selectedConversationId;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-background to-card/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl h-[calc(100vh-100px)] sm:h-[85vh] glass-effect rounded-2xl shadow-2xl overflow-hidden flex border border-border/30"
      >
        {showConversationList && (
          <div className={cn("border-r border-border/50 p-2 sm:p-4 flex flex-col", isMobileView ? "w-full" : "w-2/5 lg:w-1/3")}>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-semibold ink-text-gradient">Messages</h2>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              <ConversationList 
                conversations={conversations} 
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversationId}
                currentUserId={user?.id}
                isLoading={isLoadingConversations}
              />
            </div>
          </div>
        )}
        
        {showMessageArea && (
          <div className={cn("flex-col", isMobileView ? "hidden" : "flex w-3/5 lg:w-2/3")}>
            {selectedConversationId ? (
              <MessageArea conversationId={selectedConversationId} currentUserId={user?.id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                 <MessageSquare className="w-16 h-16 mb-4 text-primary/70" />
                 <p className="text-lg">Select a conversation</p>
                 <p className="text-sm mt-1">Or find a user and send them a message!</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ChatPage;
