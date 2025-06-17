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

const MessageArea = ({ conversationId, current
