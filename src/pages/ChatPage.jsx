import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ConversationList from '@/components/chat/ConversationList';
import MessageArea from '@/components/chat/MessageArea';

const ChatPage = () => {
  const { user, loading: authLoading, fetchUnreadCount } = useAuth();
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
      const { data, error } = await supabase.rpc('get_conversations_with_details', { p_user_id: user.id });
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Could not load conversations.", variant: "destructive" });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchConversations();
    }
  }, [user, authLoading, fetchConversations]);
  
  // This useEffect now correctly handles the mobile dialog logic.
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
    } else {
      setSelectedConversationId(null);
    }
  }, [location.search]);
  
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectConversation = async (conversationId) => {
    navigate(`/chat?conversationId=${conversationId}`, { replace: true });
    await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('receiver_id', user.id);
    if (user) fetchUnreadCount(user.id); // Update global unread count
  };

  const handleCloseMobileDialog = () => {
    navigate('/chat', { replace: true });
  }

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }
  
  const showListOnDesktop = !isMobileView;
  const showAreaOnDesktop = !isMobileView && selectedConversationId;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl h-[calc(100vh-100px)] sm:h-[85vh] glass-effect rounded-2xl shadow-2xl overflow-hidden flex border border-border/30"
      >
        {/* Desktop Conversation List */}
        {showListOnDesktop && (
          <div className="w-2/5 lg:w-1/3 border-r border-border/50 p-2 sm:p-4 flex flex-col">
              <ConversationList 
                conversations={conversations} 
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversationId}
                currentUserId={user?.id}
                isLoading={isLoadingConversations}
              />
          </div>
        )}

        {/* Desktop Message Area */}
        <div className={cn("flex-col", isMobileView ? "hidden" : "flex w-3/5 lg:w-2/3")}>
            {showAreaOnDesktop ? (
              <MessageArea conversationId={selectedConversationId} currentUserId={user?.id} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                 <MessageSquare className="w-16 h-16 mb-4 text-primary/70" />
                 <p className="text-lg">Select a conversation</p>
              </div>
            )}
        </div>

        {/* Mobile View: List is shown by default */}
        {isMobileView && !selectedConversationId && (
            <div className="w-full p-2 sm:p-4 flex flex-col">
                <ConversationList 
                    conversations={conversations} 
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={selectedConversationId}
                    currentUserId={user?.id}
                    isLoading={isLoadingConversations}
                />
            </div>
        )}
      </motion.div>
      
      {/* Mobile View: Dialog opens for the selected conversation */}
      {isMobileView && selectedConversationId && (
         <Dialog open={isMobileView && !!selectedConversationId} onOpenChange={(open) => { if(!open) handleCloseMobileDialog() }}>
          <DialogContent className="p-0 m-0 h-screen max-h-screen w-screen max-w-full rounded-none border-none glass-effect flex flex-col">
             <MessageArea conversationId={selectedConversationId} currentUserId={user.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ChatPage;
