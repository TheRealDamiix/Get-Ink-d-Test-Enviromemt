import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ConversationList from '@/components/chat/ConversationList';
import MessageArea from '@/components/chat/MessageArea';
import ArtistInfoPanel from '@/components/chat/ArtistInfoPanel';
import UserInfoPanel from '@/components/chat/UserInfoPanel';
import type { PageMeta, Profile, Booking } from '@/types';

import type { Conversation } from '@/types';

interface ConversationWithDetails extends Conversation {
  other_user_profile?: Profile;
  otherUser?: Profile;
  last_message_content?: string | null;
  [key: string]: unknown;
}

interface SelectedConversationDetails {
  otherUser: Profile | null;
  bookings: Booking[];
}

const ChatPage = () => {
  const { user, loading: authLoading, fetchUnreadCount, decrementUnreadCount } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isMobileView, setIsMobileView] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [selectedConversationDetails, setSelectedConversationDetails] = useState<SelectedConversationDetails>({ otherUser: null, bookings: [] });

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase.rpc('get_conversations_with_details', { p_user_id: user.id });
      if (error) throw error;
      const convosWithProfiles = ((data as ConversationWithDetails[]) || []).map(conv => ({ ...conv, otherUser: conv.other_user_profile }));
      setConversations(convosWithProfiles);
    } catch (error: unknown) {
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

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation?.otherUser) return;

    if ((conversation.unread_count ?? 0) > 0) {
      decrementUnreadCount(conversation.unread_count as number);
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
    }

    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .or(`and(artist_id.eq.${(conversation.otherUser as Profile).id},client_id.eq.${user!.id}),and(artist_id.eq.${user!.id},client_id.eq.${(conversation.otherUser as Profile).id})`)
        .order('requested_datetime', { ascending: false });

      if(bookingsError) throw bookingsError;

      setSelectedConversationDetails({ otherUser: conversation.otherUser as Profile, bookings: (bookingsData as Booking[]) || [] });

    } catch(error: unknown) {
      const err = error as { message?: string };
      toast({title: "Error fetching bookings", description: err.message, variant: "destructive"});
      setSelectedConversationDetails({ otherUser: conversation.otherUser as Profile, bookings: [] });
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

  const currentUserIsArtist = user?.profile?.is_artist;
  const otherUser = selectedConversationDetails.otherUser;

  return (
    <div className="h-full flex flex-col items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-7xl h-full glass-effect rounded-2xl shadow-2xl overflow-hidden flex border border-border/30"
      >
        <div className={cn("border-r border-border/50 p-2 sm:p-4 flex-col", isMobileView ? (selectedConversationId ? 'hidden md:flex w-full md:w-1/3' : 'flex w-full') : 'flex w-[320px]')}>
          <ConversationList
            conversations={conversations}
            onSelectConversation={handleSelectConversation}
            selectedConversationId={selectedConversationId}
            isLoading={isLoadingConversations}
          />
        </div>

        <div className={cn("flex flex-col flex-1 relative", isMobileView && !selectedConversationId && "hidden")}>
          <div className="absolute inset-0 z-0 pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            {selectedConversationId ? (
              <MessageArea key={selectedConversationId} conversationId={selectedConversationId} otherUser={otherUser} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                 <MessageSquare className="w-16 h-16 mb-4 text-primary/70" />
                 <h2 className="text-xl font-bold">Select a conversation</h2>
              </div>
            )}
          </div>
        </div>

        {otherUser && !isMobileView && (
          <div className="w-[320px] flex-shrink-0 border-l border-border/50">
            {currentUserIsArtist ? (
              <UserInfoPanel
                client={otherUser}
                artist={user!.profile ?? null}
                bookings={selectedConversationDetails.bookings}
              />
            ) : (
              otherUser.is_artist && <ArtistInfoPanel artist={otherUser} bookings={selectedConversationDetails.bookings} />
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ChatPage;

export const meta: PageMeta = {
  title: 'Messages | InkSnap',
};
