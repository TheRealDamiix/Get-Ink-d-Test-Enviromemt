import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

  const fetchConversationsWithRpc = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase.rpc('get_conversations_with_details', {
        p_user_id: user.id
      });

      if (error) throw error;
      
      const convsWithParsedProfile = data.map(conv => ({
        ...conv,
        user1: conv.user1_id === user.id ? user.profile : conv.other_user_profile, 
        user2: conv.user2_id === user.id ? user.profile : conv.other_user_profile,
      }));

      setConversations(convsWithParsedProfile || []);

    } catch (error) {
      console.error("Error fetching conversations via RPC:", error);
      toast({ title: "Error", description: "Could not load conversations.", variant: "destructive" });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/chat');
    } else if (user) {
      fetchConversationsWithRpc();
    }
  }, [user, authLoading, navigate, fetchConversationsWithRpc]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
    }
  }, [location.search]);

  useEffect(() => {
    if (!user?.id) return;

    const channelName = `chatpage-subs-${user.id}`;
    const conversationsSubscription = supabase.channel(channelName);

    conversationsSubscription
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'conversations', 
          filter: `or(user1_id.eq.${user.id},user2_id.eq.${user.id})` 
        },
        (payload) => {
          console.log('Conversation change received!', payload);
          fetchConversationsWithRpc();
        }
      )
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => {
          console.log('New message received!', payload);
          const messageIsForCurrentUser = payload.new.receiver_id === user.id;
          const conversationExists = conversations.some(c => c.id === payload.new.conversation_id);
          if (messageIsForCurrentUser || conversationExists) {
             fetchConversationsWithRpc(); 
          }
        }
      )
      .on(
        'postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages', 
          filter: `receiver_id=eq.${user.id}` 
        },
        (payload) => {
           console.log('Message update received!', payload);
           if (payload.new.is_read !== payload.old.is_read && conversations.some(c => c.id === payload.new.conversation_id)) {
            fetchConversationsWithRpc();
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to ${channelName}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error on ${channelName}:`, status, err);
          toast({ title: "Realtime Error", description: `Chat connection issue: ${status}. Try refreshing.`, variant: "destructive" });
        }
      });

    return () => {
      supabase.removeChannel(conversationsSubscription);
    };
  }, [user, fetchConversationsWithRpc, conversations, toast]);


  const handleSelectConversation = async (conversationId) => {
    setSelectedConversationId(conversationId);
    navigate(`/chat?conversationId=${conversationId}`, { replace: true });
    
    setConversations(prev => prev.map(c => c.id === conversationId ? {...c, unread_count: 0} : c));

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error("Error marking messages as read:", error);
    }
  };
  
  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }

  const showConversationList = !isMobileView || !selectedConversationId;
  const showMessageArea = !isMobileView || selectedConversationId;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-background to-card/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl h-[calc(100vh-100px)] sm:h-[85vh] glass-effect rounded-2xl shadow-2xl overflow-hidden flex border border-border/30"
      >
        {showConversationList && (
          <div className={cn(
            "border-r border-border/50 p-2 sm:p-4 flex flex-col",
            isMobileView && selectedConversationId ? "hidden" : "w-full md:w-2/5 lg:w-1/3" 
          )}>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-semibold ink-text-gradient">Messages</h2>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              <ConversationList 
                conversations={conversations} 
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversationId}
                currentUserId={user.id}
                isLoading={isLoadingConversations}
              />
            </div>
          </div>
        )}
        
        {showMessageArea && (
          <div className={cn(
            "flex-col",
            isMobileView && !selectedConversationId ? "hidden" : "flex w-full md:w-3/5 lg:w-2/3"
          )}>
            {selectedConversationId ? (
              <MessageArea conversationId={selectedConversationId} currentUserId={user.id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                 <Users className="w-16 h-16 mb-4 text-primary/70" />
                 <p className="text-lg">Select a conversation</p>
                 <p className="text-sm mt-1">Or find an artist and send them a message!</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
      
      {isMobileView && selectedConversationId && (
         <Dialog open={isMobileView && !!selectedConversationId} onOpenChange={(open) => { if(!open) { setSelectedConversationId(null); navigate('/chat');} }}>
          <DialogContent className="p-0 m-0 h-screen max-h-screen w-screen max-w-full rounded-none border-none glass-effect flex flex-col">
             <MessageArea conversationId={selectedConversationId} currentUserId={user.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ChatPage;