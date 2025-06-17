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
    // This component's code remains the same
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

const MessageArea = ({ conversationId, currentUserId, onMessageSent }) => {
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
    const { fetchUnreadCount } = useAuth();

    // Updated auto-scroll logic for better reliability
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
        }
    }, []);

    const fetchMessagesAndDetails = useCallback(async () => {
        // ... (this function remains the same as before)
    }, [conversationId, currentUserId, toast, fetchUnreadCount]);

    useEffect(() => {
        fetchMessagesAndDetails();
    }, [fetchMessagesAndDetails]);

    // This useEffect now uses a small timeout to ensure the DOM is ready before scrolling
    useEffect(() => {
        const timer = setTimeout(() => {
            scrollToBottom();
        }, 50); // A small delay to ensure the new message is rendered
        return () => clearTimeout(timer);
    }, [messages, scrollToBottom]);

    useEffect(() => {
        // ... (real-time subscription logic remains the same)
    }, [conversationId, currentUserId]);

    const handleSendMessage = async (e) => {
        // ... (this function's logic remains the same as before)
    };

    // ... (other helper functions like handleImageAttachment remain the same)

    if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!otherUser) return <div className="flex-1 flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-destructive" /> <p className="ml-2">Could not load conversation.</p></div>;

    return (
        <div className="flex flex-col h-full bg-background/50 flex-1">
            <header className="p-3 border-b border-border/50 flex items-center gap-3 flex-shrink-0">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={otherUser.profile_photo_url} alt={otherUser.name || otherUser.username} />
                    <AvatarFallback>{(otherUser.name || otherUser.username)?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">{otherUser.name || otherUser.username}</h3>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} onImageClick={setImageToPreview} />)}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t border-border/50 flex-shrink-0">
                {/* ... (footer JSX remains the same) ... */}
            </footer>
            {imageToPreview && (
                <Dialog open={!!imageToPreview} onOpenChange={() => setImageToPreview(null)}>
                    <DialogContent className="max-w-3xl p-2 glass-effect"><img src={imageToPreview} alt="Chat Preview" className="rounded-md max-h-[80vh] w-auto mx-auto" /></DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default MessageArea;
