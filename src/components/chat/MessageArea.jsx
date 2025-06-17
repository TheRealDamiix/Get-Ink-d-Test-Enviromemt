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
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className={`max-w-[70%] px-3 py-2 rounded-xl shadow-md ${
          isCurrentUser 
            ? 'bg-primary text-primary-foreground rounded-br-none' 
            : 'bg-muted rounded-bl-none'
        }`}
      >
        {msg.content && msg.content !== "[Image]" && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
        {msg.image_url && (
          <button onClick={() => onImageClick(msg.image_url)} className="mt-2 cursor-pointer">
            <img src={msg.image_url} alt="Chat attachment" className="rounded-md max-w-[200px] max-h-[200px] object-cover border border-border/50" />
          </button>
        )}
        <p 
          className={`text-xs mt-1.5 ${
            isCurrentUser 
              ? 'text-primary-foreground/70 text-right' 
              : 'text-muted-foreground text-left'
          }`}
        >
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
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null); 
  const { toast } = useToast();
  const [imageToPreview, setImageToPreview] = useState(null);


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessagesAndConversationDetails = useCallback(async () => {
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
      
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);

    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, currentUserId, toast]);

  useEffect(() => {
    fetchMessagesAndConversationDetails();
  }, [fetchMessagesAndConversationDetails]);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          setMessages(prevMessages => [...prevMessages, payload.new]);
          if (payload.new.receiver_id === currentUserId) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to messages:${conversationId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error on messages:${conversationId}:`, status, err);
           toast({ title: "Realtime Chat Error", description: `Chat connection issue: ${status}. File uploads might be affected. Try refreshing.`, variant: "destructive" });
        }
      });


    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, toast]);

  const handleImageAttachment = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { 
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
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const uploadImageToCloudinary = async (file) => {
    if (!file || !currentUserId) return null;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'chat_images');
      formData.append('public_id_name', `chat_${currentUserId}_${Date.now()}`);

      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: formData,
      });

      if (uploadError || uploadData.error || !uploadData.secure_url) {
        let errorMessage = uploadError?.message || uploadData?.error || 'Failed to upload chat image.';
        if (errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('deadline_exceeded') || errorMessage.toLowerCase().includes('function timed out')) {
          errorMessage = "Image upload timed out. The file might be too large or the connection is unstable. Please try again.";
        }
        throw new Error(errorMessage);
      }
      return { url: uploadData.secure_url, publicId: uploadData.public_id };

    } catch (error) {
      console.error('Error uploading chat image to Cloudinary:', error);
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
      return null;
    }
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedImageFile) || !otherUser) return; 
    setIsSending(true);

    const tempId = `temp_${Date.now()}`;
    let imageUrl = null;
    let imagePublicId = null;
    
    if (attachedImageFile) {
      const uploaded = await uploadImageToCloudinary(attachedImageFile);
      if (uploaded) {
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      } else {
        setIsSending(false);
        return;
      }
    }
    
    let messageContent = newMessage.trim();
    if (!messageContent && imageUrl) {
      messageContent = "[Image]"; // Default content if only image is sent
    } else if (!messageContent && !imageUrl) {
      // This case should be prevented by the initial check, but as a safeguard:
      setIsSending(false);
      return;
    }


    const messageToSend = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      receiver_id: otherUser.id,
      content: messageContent,
      image_url: imageUrl, 
      image_public_id: imagePublicId, 
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages(prev => [...prev, messageToSend]);
    setNewMessage('');
    removeAttachedImage(); 

    try {
      const { data: sentMsg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          receiver_id: otherUser.id,
          content: messageToSend.content, // Ensure this is never null if column is NOT NULL
          image_url: messageToSend.image_url, 
          image_public_id: messageToSend.image_public_id, 
        })
        .select()
        .single();
      
      if (error) throw error;

      setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Error", description: `Could not send message. ${error.message}`, variant: "destructive" });
      setMessages(prev => prev.filter(m => m.id !== tempId)); 
    } finally {
      setIsSending(false);
    }
  };
  
  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <MessageSquare className="w-16 h-16 mb-4 text-primary/70" />
        <p className="text-lg">Select a conversation to start chatting</p>
        <p className="text-sm mt-1">Or find an artist and send them a message!</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  
  if (!otherUser) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <AlertTriangle className="w-12 h-12 mb-4 text-destructive" />
        <p className="text-lg">Could not load conversation details.</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/50 flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={otherUser.profile_photo_url} alt={otherUser.name || otherUser.username} />
          <AvatarFallback className="ink-gradient text-primary-foreground">
            {(otherUser.name || otherUser.username || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold">{otherUser.name || otherUser.username}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId} onImageClick={setImageToPreview} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border/50">
        {attachedImagePreview && (
          <div className="mb-2 relative w-20 h-20">
            <img src={attachedImagePreview} alt="Preview" className="rounded-md object-cover w-full h-full" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background/70 hover:bg-destructive/90 group"
              onClick={removeAttachedImage}
              disabled={isSending}
            >
              <XCircle className="h-3 w-3 text-destructive group-hover:text-destructive-foreground" />
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()} disabled={isSending}>
            <Paperclip className="w-5 h-5 text-foreground" />
          </Button>
          <Input 
            type="file" 
            ref={imageInputRef}
            className="hidden"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleImageAttachment}
            disabled={isSending}
          />
          <Input 
            type="text" 
            placeholder="Type your message..." 
            className="flex-1 bg-background/70 focus-visible:ring-primary" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
          />
          <Button type="submit" className="ink-gradient" disabled={isSending || (!newMessage.trim() && !attachedImageFile)}>
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
    {imageToPreview && (
      <Dialog open={!!imageToPreview} onOpenChange={() => setImageToPreview(null)}>
        <DialogContent className="max-w-3xl p-2 glass-effect">
          <img src={imageToPreview} alt="Chat Image Preview" className="rounded-md max-h-[80vh] w-auto mx-auto" />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default MessageArea;