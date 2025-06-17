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
  const { user, loading: authLoading, fetchUnreadCount, decrementUnreadCount } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const newLogoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/dc3f6a73-e4ae-4a98-96ee-f971fdcf05b8/adae335f6caa43250fd8bd69651ee119.png";


  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase.rpc('get_conversations_with_details', { p_user_id: user.id });
      if (error) throw error;
      const conversationsWithProfiles = (data || []).map(conv => ({ ...conv, otherUser: conv.other_user_profile }));
      setConversations(conversationsWithProfiles);
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const conversationIdFromUrl = searchParams.get('conversationId');
    setSelectedConversationId(conversationIdFromUrl || null);
  }, [location.search]);
  
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectConversation = async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation && conversation.unread_count > 0) {
        decrementUnreadCount(conversation.unread_count);
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
    }
    navigate(`/chat?conversationId=${conversationId}`, { replace: true });
  };

  const handleCloseMobileDialog = () => {
    navigate('/chat', { replace: true });
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }
  
  return (
    // Updated container to use full height and flexbox for auto-sizing
    <div className="h-full flex flex-col items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl h-full glass-effect rounded-2xl shadow-2xl overflow-hidden flex border border-border/30"
      >
        {/* --- DESKTOP --- */}
        {!isMobileView && (
          <>
            <div className="w-2/5 lg:w-1/3 border-r border-border/50 p-2 sm:p-4 flex flex-col">
              <ConversationList 
                conversations={conversations} 
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversationId}
                isLoading={isLoadingConversations}
              />
            </div>
            <div className="flex flex-col w-3/5 lg:w-2/3">
              <div className="p-2 border-b border-border/50 flex items-center justify-center gap-2 bg-muted/20 flex-shrink-0">
                  <img src={newLogoUrl} alt="InkSnap Logo" className="w-6 h-6 rounded-md object-contain" />
                  <h2 className="text-sm font-bold text-muted-foreground tracking-widest">InkSnap Advanced Shitty Chat System (IASCS)</h2>
              </div>
              {selectedConversationId ? (
                <MessageArea 
                  key={selectedConversationId}
                  conversationId={selectedConversationId} 
                  currentUserId={user?.id} 
                  onMessageSent={fetchConversations}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                   <MessageSquare className="w-16 h-16 mb-4 text-primary/70" />
                   <p className="text-lg">Select a conversation</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- MOBILE --- */}
        {isMobileView && (
            <div className="w-full p-2 sm:p-4 flex flex-col">
                <ConversationList 
                    conversations={conversations} 
                    onSelectConversation={handleSelectConversation}
                    selectedConversationId={selectedConversationId}
                    isLoading={isLoadingConversations}
                />
            </div>
        )}
      </motion.div>
      
      <Dialog open={isMobileView && !!selectedConversationId} onOpenChange={(open) => { if(!open) handleCloseMobileDialog() }}>
        <DialogContent className="p-0 m-0 h-screen max-h-screen w-screen max-w-full rounded-none border-none glass-effect flex flex-col">
            <MessageArea 
              key={selectedConversationId}
              conversationId={selectedConversationId} 
              currentUserId={user?.id}
              onMessageSent={fetchConversations}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatPage;
