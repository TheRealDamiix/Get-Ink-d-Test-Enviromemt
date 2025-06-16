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
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768); // Adjusted breakpoint for better tablet/mobile split

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*), last_message:messages!last_message_id(content, created_at, sender_id, receiver_id, is_read))')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsLast: true });

      if (error) throw error;
      
      const convsWithDetails = await Promise.all(data.map(async (conv) => {
        const { count, error: unreadError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (unreadError) console.error("Error fetching unread count for conv:", conv.id, unreadError);

        return {
          ...conv,
          last_message_content: conv.last_message?.content,
          last_message_at: conv.last_message?.created_at || conv.updated_at,
          unread_count: unreadError ? 0 : count || 0,
        };
      }));
      setConversations(convsWithDetails.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));

    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({ title: "Error", description: "Could not load conversations.", variant: "destructive" });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/chat');
    } else if (user) {
      fetchConversations();
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
    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
    } else if (conversations.length > 0 && !selectedConversationId) {
      // Optionally select the first conversation if none is in URL
      // setSelectedConversationId(conversations[0].id);
    }
  }, [location.search, conversations, selectedConversationId]);

  useEffect(() => {
    if (!user?.id) return;
    const conversationsSubscription = supabase
      .channel('public:conversations_and_messages_chatpage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `or(user1_id.eq.${user.id},user2_id.eq.${user.id})` },
        () => fetchConversations()
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          // Check if the new message belongs to an existing conversation or if it's for the current user
          const messageIsForCurrentUser = payload.new.receiver_id === user.id;
          const conversationExists = conversations.some(c => c.id === payload.new.conversation_id);
          
          if (messageIsForCurrentUser || conversationExists) {
             fetchConversations(); // Refetch all conversations to update list order and unread counts
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
           if (payload.new.is_read && conversations.some(c => c.id === payload.new.conversation_id)) {
            fetchConversations(); // Refetch to update unread counts
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsSubscription);
    };
  }, [user, fetchConversations, conversations]);


  const handleSelectConversation = async (conversationId) => {
    setSelectedConversationId(conversationId);
    navigate(`/chat?conversationId=${conversationId}`, { replace: true });
    
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error("Error marking messages as read:", error);
    } else {
      setConversations(prev => prev.map(c => c.id === conversationId ? {...c, unread_count: 0} : c));
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
            <ConversationList 
              conversations={conversations} 
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversationId}
              currentUserId={user.id}
              isLoading={isLoadingConversations}
            />
          </div>
        )}
        
        {showMessageArea && (
          <div className={cn(
            "flex-col",
            isMobileView && !selectedConversationId ? "hidden" : "flex w-full md:w-3/5 lg:w-2/3"
          )}>
            <MessageArea conversationId={selectedConversationId} currentUserId={user.id} />
          </div>
        )}
      </motion.div>
      
      {/* This Dialog is for fullscreen mobile message view, might not be needed if MessageArea handles its own display logic */}
      {isMobileView && selectedConversationId && (
         <Dialog open={isMobileView && !!selectedConversationId} onOpenChange={(open) => { if(!open) setSelectedConversationId(null); navigate('/chat')}}>
          <DialogContent className="p-0 m-0 h-screen max-h-screen w-screen max-w-full rounded-none border-none glass-effect flex flex-col">
             <MessageArea conversationId={selectedConversationId} currentUserId={user.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ChatPage;