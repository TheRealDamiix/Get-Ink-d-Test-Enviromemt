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
import { Link } from 'react-router-dom';

const MessageBubble = ({ msg, currentUserId, onImageClick }) => {
    const isCurrentUser = msg.sender_id === currentUserId;
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`max-w-[75%] px-3 py-2 rounded-xl shadow-md ${ isCurrentUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none' }`}>
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

const MessageArea = ({ conversationId, otherUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachedImageFile, setAttachedImageFile] = useState(null);
    const [attachedImagePreview, setAttachedImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [imageToPreview, setImageToPreview] = useState(null);
    const messagesEndRef = useRef(null);
    const imageInputRef = useRef(null);
    const { user: currentUser, fetchUnreadCount } = useAuth();
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchMessages = async () => {
            if (!conversationId) return;
            setIsLoading(true);
            try {
                const { data: messagesData, error: messagesError } = await supabase
                    .from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
                if (messagesError) throw messagesError;
                setMessages(messagesData || []);
                await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('receiver_id', currentUser.id);
                fetchUnreadCount(currentUser.id);
            } catch (error) {
                toast({ title: "Error Loading Messages", description: error.message, variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
    }, [conversationId, currentUser, toast, fetchUnreadCount]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    useEffect(() => {
        if (!conversationId || !currentUser) return;
        const channel = supabase.channel(`messages:${conversationId}`);
        const subscription = channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            (payload) => {
                if (payload.new.sender_id === otherUser?.id) {
                    setMessages(prev => [...prev, payload.new]);
                }
            }
        ).subscribe();
        return () => supabase.removeChannel(channel);
    }, [conversationId, currentUser, otherUser]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !attachedImageFile) || !otherUser) return;
        setIsSending(true);

        let imageUrl = null, imagePublicId = null;
        if (attachedImageFile) {
            const formData = new FormData();
            formData.append('file', attachedImageFile);
            formData.append('folder', 'chat_images');
            const { data, error } = await supabase.functions.invoke('upload-to-cloudinary', { body: formData });
            if (error || data.error) {
                toast({ title: "Upload Error", description: `Failed to upload image: ${error?.message || data.error}`, variant: "destructive" });
                setIsSending(false);
                return;
            }
            imageUrl = data.secure_url;
            imagePublicId = data.public_id;
        }

        const { data: sentMessage, error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            receiver_id: otherUser.id,
            content: newMessage.trim(),
            image_url: imageUrl,
            image_public_id: imagePublicId,
        }).select().single();

        if (error) {
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        } else {
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage('');
            if (imageInputRef.current) imageInputRef.current.value = '';
            setAttachedImageFile(null);
            setAttachedImagePreview(null);
        }
        setIsSending(false);
    };

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

    if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!otherUser) return <div className="flex-1 flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-destructive" /> <p className="ml-2">Could not load conversation partner.</p></div>;

    const profileLink = otherUser.is_artist ? `/artist/${otherUser.username}` : `/user/${otherUser.username}`;

    return (
        <div className="flex flex-col h-full flex-1">
             <header className="p-3 border-b border-border/50 flex items-center gap-3 flex-shrink-0 bg-card/20">
                <Link to={profileLink}>
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={otherUser.profile_photo_url} alt={otherUser.name || otherUser.username} />
                        <AvatarFallback>{(otherUser.name || otherUser.username)?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Link>
                <Link to={profileLink}>
                    <h3 className="font-semibold hover:underline">{otherUser.name || otherUser.username}</h3>
                </Link>
            </header>
            <main className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser.id} onImageClick={setImageToPreview} />)}
                <div ref={messagesEndRef} />
            </main>
            <footer className="p-4 border-t border-border/50 flex-shrink-0 bg-card/20">
                {attachedImagePreview && (
                    <div className="mb-2 relative w-20 h-20">
                        <img src={attachedImagePreview} alt="Preview" className="rounded-md object-cover w-full h-full" />
                        <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive group" onClick={removeAttachedImage} disabled={isSending}>
                            <XCircle className="h-4 w-4 text-destructive group-hover:text-destructive-foreground" />
                        </Button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isSending}><Paperclip className="w-5 h-5" /></Button>
                    <Input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageAttachment} disabled={isSending} />
                    <Input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={isSending} className="flex-1 bg-background" />
                    <Button type="submit" className="ink-gradient" disabled={isSending || (!newMessage.trim() && !attachedImageFile)}><Send className="w-4 h-4" /></Button>
                </form>
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
