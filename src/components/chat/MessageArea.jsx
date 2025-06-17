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
                    <button onClick={() => onImageClick(msg.image_url)} className={cn("cursor-pointer block", msg.content && "mt-2")}>
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
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [otherUser, setOtherUser] = useState(null);
    const [imageToPreview, setImageToPreview] = useState(null);
    const messagesEndRef = useRef(null);
    const imageInputRef = useRef(null);
    const { toast } = useToast();
    const { fetchUnreadCount, decrementUnreadCount } = useAuth();

    const fetchMessagesAndDetails = useCallback(async () => {
        if (!conversationId || !currentUserId) return;
        setIsLoading(true);
        try {
            const { data: convData } = await supabase.from('conversations').select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)').eq('id', conversationId).single();
            setOtherUser(convData.user1_id === currentUserId ? convData.user2 : convData.user1);

            const { data: messagesData } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
            setMessages(messagesData || []);
            
            await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('receiver_id', currentUserId);
            // This now relies on the global subscription in AuthContext to update the count, but a manual refetch is a good fallback.
            fetchUnreadCount(currentUserId);
        } catch (error) {
            toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, currentUserId, toast, fetchUnreadCount]);

    useEffect(() => {
        fetchMessagesAndDetails();
    }, [fetchMessagesAndDetails]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    useEffect(() => {
        if (!conversationId || !currentUserId) return;
        const channel = supabase.channel(`messages:${conversationId}`);
        const subscription = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            (payload) => {
                // Only add the message via subscription if it's from the OTHER user.
                // Your own messages are added instantly after sending.
                if (payload.new.sender_id !== currentUserId) {
                    setMessages(prev => [...prev, payload.new]);
                }
            }
        ).subscribe();
        return () => supabase.removeChannel(channel);
    }, [conversationId, currentUserId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachedImageFile) || !otherUser) return;
        setIsSending(true);

        let imageUrl = null, imagePublicId = null;

        if (attachedImageFile) {
            const formData = new FormData();
            formData.append('file', attachedImageFile);
            formData.append('folder', 'chat_images');
            const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', { body: formData });
            
            if (uploadError || uploadData.error) {
                toast({ title: "Upload Error", description: `Failed to upload image: ${uploadError?.message || uploadData.error}`, variant: "destructive" });
                setIsSending(false);
                return;
            }
            imageUrl = uploadData.secure_url;
            imagePublicId = uploadData.public_id;
        }

        let contentToSend = newMessage.trim() || (imageUrl ? "[Image]" : null);
        if (!contentToSend) {
            setIsSending(false);
            return;
        }

        // Use .select().single() to get the created message back immediately.
        const { data: sentMessage, error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            receiver_id: otherUser.id,
            content: contentToSend,
            image_url: imageUrl,
            image_public_id: imagePublicId,
        }).select().single();

        if (error) {
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        } else {
            // Instantly add the confirmed message to the UI.
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage('');
            setAttachedImageFile(null);
            setAttachedImagePreview(null);
            if(imageInputRef.current) imageInputRef.current.value = '';
        }
        setIsSending(false);
    };

    // Keep handleImageAttachment and removeAttachedImage as they are.
    const handleImageAttachment = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({ title: "Image too large", description: "Image must be less than 5MB.", variant: "destructive" });
                return;
            }
            setAttachedImageFile(file);
            setAttachedImagePreview(URL.createObjectURL(file));
        }
    };
    
    const removeAttachedImage = () => {
        setAttachedImageFile(null);
        setAttachedImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    // The rest of the component's JSX remains the same.
    if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!otherUser) return <div className="flex items-center justify-center h-full"><AlertTriangle className="w-8 h-8 text-destructive" /> <p className="ml-2">Could not load conversation.</p></div>;

    return (
      <>
        {/* JSX for the component... */}
      </>
    )
};
