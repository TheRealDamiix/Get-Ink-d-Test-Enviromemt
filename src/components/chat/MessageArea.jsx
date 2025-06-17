import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, AlertTriangle, Paperclip, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MessageBubble = ({ msg, currentUserId, onImageClick }) => {
    const isCurrentUser = msg.sender_id === currentUserId;
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
        >
        <div 
            className={`max-w-[75%] px-3 py-2 rounded-xl shadow-md ${
            isCurrentUser 
                ? 'bg-primary text-primary-foreground rounded-br-none' 
                : 'bg-muted rounded-bl-none'
            }`}
        >
            {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
            
            {msg.image_url && (
                <button 
                    onClick={() => onImageClick(msg.image_url)} 
                    className={cn("cursor-pointer block", msg.content && "mt-2")}
                >
                    <img src={msg.image_url} alt="Chat attachment" className="rounded-md max-w-[200px] max-h-[200px] object-cover border border-border/50" />
                </button>
            )}
            <p className={`text-xs mt-1.5 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'} text-right`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
        </div>
        </motion.div>
    );
};

const MessageArea = ({ conversationId, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachedImageFile, setAttachedImageFile] = useState(null);
    const [attachedImagePreview, setAttachedImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [otherUser, setOtherUser] = useState(null);
    const [imageToPreview, setImageToPreview] = useState(null);
    const messagesEndRef = useRef(null);
    const imageInputRef = useRef(null);
    const { toast } = useToast();
    const { fetchUnreadCount } = useAuth();

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView();
    }, []);

    const fetchMessagesAndDetails = useCallback(async () => {
        if (!conversationId || !currentUserId) return;
        setIsLoading(true);
        try {
            const { data: convData } = await supabase.from('conversations').select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)').eq('id', conversationId).single();
            setOtherUser(convData.user1_id === currentUserId ? convData.user2 : convData.user1);

            const { data: messagesData } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
            setMessages(messagesData || []);
            
            const { error: updateError } = await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('receiver_id', currentUserId);
            if (!updateError) fetchUnreadCount(currentUserId);
        } catch (error) {
            toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, currentUserId, toast, fetchUnreadCount]);

    useEffect(() => {
        fetchMessagesAndDetails();
    }, [fetchMessagesAndDetails]);

    useEffect(scrollToBottom, [messages]);
  
    useEffect(() => {
        if (!conversationId) return;
        const channel = supabase.channel(`messages:${conversationId}`);
        const subscription = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            (payload) => {
                setMessages(prev =>
