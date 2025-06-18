import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2, MessageSquare, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ConversationList from '@/components/chat/ConversationList';
import MessageArea from '@/components/chat/MessageArea';
import ArtistInfoPanel from '@/components/chat/ArtistInfoPanel';
import { Button } from '@/components/ui/button';

const ChatPage = () => {
  const { user, loading: authLoading, fetchUnreadCount, decrementUnreadCount } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [selectedConversationDetails, setSelectedConversationDetails] = useState({ otherUser: null, bookings: [] });

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase.rpc('get_conversations_with_details', { p_user_id: user.id });
      if (error) throw error;
      const convosWithProfiles = (data || []).map(conv => ({ ...conv, otherUser: conv.other_user_profile }));
      setConversations(convosWithProfiles);
    } catch (error) {
      toast({ title: "Error", description: "Could not load conversations.", variant: "destructive" });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) fetchConversations();
  }, [user, authLoading, fetchConversations]);
  
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectConversation = useCallback(async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation?.otherUser) return;

    if (conversation.unread_count > 0) {
      decrementUnreadCount(conversation.unread_count);
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
    }
    
    // Fetch bookings for the info panel
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .or(`(artist_id.eq.${conversation.otherUser.id},client_id.eq.${user.id}),(artist_id.eq.${user.id},client_id.eq.${conversation.otherUser.id})`)
        .order('requested_datetime', { ascending: false });

      if(bookingsError) throw bookingsError;
      
      setSelectedConversationDetails({ otherUser: conversation.otherUser, bookings: bookingsData || [] });

    } catch(error) {
      toast({title: "Error fetching bookings", description: error.message, variant: "destructive"});
      setSelectedConversationDetails({ otherUser: conversation.otherUser, bookings: [] });
    }

    navigate(`/chat?conversationId=${conversationId}`, { replace: true });
    setSelectedConversationId(conversationId);
  }, [conversations, user, navigate, toast, decrementUnreadCount]);
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl && conversations.length > 0) {
        if(selectedConversationId !== conversationIdFromUrl) {
           handleSelectConversation(conversationIdFromUrl);
        }
    } else if (!conversationIdFromUrl) {
      setSelectedConversationId(null);
      setSelectedConversationDetails({ otherUser: null, bookings: [] });
    }
  }, [location.search, conversations, handleSelectConversation, selectedConversationId]);

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;
  }
  
  const selectedArtist = selectedConversationDetails.otherUser?.is_artist ? selectedConversationDetails.otherUser : null;

  return (
    <div className="h-full flex flex-col items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-7xl h-full glass-effect rounded-2xl shadow-2xl overflow-hidden flex border border-border/30"
      >
        {/* Conversation List (Sidebar) */}
        <div className={cn("border-r border-border/50 p-2 sm:p-4 flex-col", isMobileView ? (selectedConversationId ? 'hidden md:flex w-full md:w-1/3' : 'flex w-full') : 'flex w-[320px]')}>
          <ConversationList 
            conversations={conversations} 
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
            isLoading={isLoadingConversations}
          />
        </div>

        {/* Main Chat Area */}
        <div className={cn("flex flex-col flex-1 relative", isMobileView && !selectedConversationId && "hidden")}>
           {/* Faint Background Logo */}
          <div 
            style={{ backgroundImage: `url(https://storage.googleapis.com/hostinger-horizons-assets-prod/dc3f6a73-e4ae-4a98-96ee-f971fdcf05b8/adae335f6caa43250fd8bd69651ee119.png)` }} 
            className="absolute inset-0 bg-center bg-contain bg-no-repeat opacity-[0.02] z-0 pointer-events-none"
          />
          <div className="relative z-10 flex flex-col h-full">
            {selectedConversationId ? (
              <>
                 <header className="p-3 border-b border-border/50 flex items-center justify-between gap-3 flex-shrink-0 bg-card/20">
                    <div className="flex items-center gap-3">
                      {/* Avatar and Name here are handled inside MessageArea */}
                    </div>
                    {selectedArtist && (
                       <Button variant="ghost" size="icon" onClick={() => setShowInfoPanel(!showInfoPanel)}>
                           <Info className="w-5 h-5" />
                       </Button>
                    )}
                 </header>
                 <MessageArea 
                  key={selectedConversationId}
                  conversationId={selectedConversationId} 
                  otherUser={selectedConversationDetails.otherUser}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                 <MessageSquare className="w-16 h-16 mb-4 text-primary/70" />
                 <h2 className="text-xl font-bold">Select a conversation</h2>
                 <p className="text-sm">Start chatting with artists and clients.</p>
              </div>
            )}
          </div>
        </div>

        {/* Artist Info Panel */}
        {(selectedArtist && (isMobileView ? showInfoPanel : true)) && (
            <div className={cn("border-l border-border/50", isMobileView ? 'absolute top-0 right-0 h-full z-20 w-4/5 max-w-[320px] bg-background' : 'w-[320px] flex-shrink-0')}>
                <ArtistInfoPanel artist={selectedArtist} bookings={selectedConversationDetails.bookings} />
            </div>
        )}
      </motion.div>
    </div>
  );
};

export default ChatPage;
