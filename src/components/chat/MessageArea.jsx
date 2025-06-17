import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, AlertTriangle, MessageSquare, Paperclip, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
        {msg.content && msg.content !== "[Image]" && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
        {msg.image_url && (
          <button onClick={() => onImageClick(msg.image_url)} className="mt-2 cursor-pointer block">
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessagesAndDetails = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    setIsLoading(true);
    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*, user1:profiles!user1_id(*), user2:profiles!user2_id(*)')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      setOtherUser(convData.user1_id === currentUserId ? convData.user2 : convData.user1);

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
      
      // Mark messages as read
      await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('receiver_id', currentUserId);

    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, currentUserId, toast]);

  useEffect(() => {
    fetchMessagesAndDetails();
  }, [fetchMessagesAndDetails]);

  useEffect(scrollToBottom, [messages]);
  
  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`messages:${conversationId}`);
    const subscription = channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.receiver_id === currentUserId) {
            supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id).then();
        }
      }
    ).subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [conversationId, currentUserId]);

  const handleImageAttachment = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image too large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
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

  const uploadImage = async (file) => {
    if (!file || !currentUserId) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'chat_images');
      formData.append('public_id_name', `chat_${currentUserId}_${Date.now()}`);

      const { data, error } = await supabase.functions.invoke('upload-to-cloudinary', { body: formData });
      if (error || data.error) throw new Error(error?.message || data.error);
      return { url: data.secure_url, publicId: data.public_id };
    } catch (error) {
      toast({ title: "Upload Error", description: `Failed to upload image. ${error.message}`, variant: "destructive" });
      return null;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedImageFile) || !otherUser) return;
    setIsSending(true);

    let imageUrl = null;
    let imagePublicId = null;

    if (attachedImageFile) {
      const uploaded = await uploadImage(attachedImageFile);
      if (uploaded) {
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      } else {
        setIsSending(false);
        return;
      }
    }

    const contentToSend = newMessage.trim() || "[Image]";

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      receiver_id: otherUser.id,
      content: contentToSend,
      image_url: imageUrl,
      image_public_id: imagePublicId,
    });

    if (error) {
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } else {
      setNewMessage('');
      removeAttachedImage();
    }
    setIsSending(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!otherUser) return <div className="flex items-center justify-center h-full"><AlertTriangle className="w-8 h-8 text-destructive" /> <p className="ml-2">Could not load conversation.</p></div>;

  return (
    <>
      <div className="flex flex-col h-full bg-background/50">
        <header className="p-3 border-b border-border/50 flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={otherUser.profile_photo_url} alt={otherUser.name || otherUser.username} />
            <AvatarFallback>{(otherUser.name || otherUser.username)?.charAt(0)}</AvatarFallback>
          </Avatar>
          <h3 className="font-semibold">{otherUser.name || otherUser.username}</h3>
        </header>
        <main className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} onImageClick={setImageToPreview} />
          ))}
          <div ref={messagesEndRef} />
        </main>
        <footer className="p-4 border-t border-border/50">
          {attachedImagePreview && (
            <div className="mb-2 relative w-20 h-20">
              <img src={attachedImagePreview} alt="Preview" className="rounded-md object-cover w-full h-full" />
              <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive" onClick={removeAttachedImage} disabled={isSending}>
                <XCircle className="h-4 w-4 text-destructive-foreground" />
              </Button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageAttachment} disabled={isSending} />
            <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isSending}><Paperclip className="w-5 h-5" /></Button>
            <Input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={isSending} className="flex-1" />
            <Button type="submit" className="ink-gradient" disabled={isSending || (!newMessage.trim() && !attachedImageFile)}><Send className="w-4 h-4" /></Button>
          </form>
        </footer>
      </div>
      {imageToPreview && (
        <Dialog open={!!imageToPreview} onOpenChange={() => setImageToPreview(null)}>
          <DialogContent className="max-w-3xl p-2 glass-effect"><img src={imageToPreview} alt="Chat Preview" className="rounded-md max-h-[80vh] w-auto mx-auto" /></DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MessageArea;
