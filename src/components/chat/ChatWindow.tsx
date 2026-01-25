import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { notifyNewChatMessageInApp } from '@/lib/in-app-notifications';

interface Message {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface ChatWindowProps {
  clubId: string;
  eventId?: string;
  className?: string;
}

export function ChatWindow({ clubId, eventId, className }: ChatWindowProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat-${clubId}-${eventId || 'club'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: eventId 
            ? `event_id=eq.${eventId}` 
            : `club_id=eq.${clubId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch the profile for this message
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', newMsg.user_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, profile: profile || undefined }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, eventId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    
    // Using type assertion since types may not be regenerated yet
    let query = (supabase as any)
      .from('chat_messages')
      .select('id, message, user_id, created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (eventId) {
      query = query.eq('event_id', eventId);
    } else {
      query = query.is('event_id', null);
    }

    const { data: messagesData, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
      return;
    }

    if (messagesData && messagesData.length > 0) {
      // Fetch profiles for all users
      const userIds = [...new Set((messagesData as any[]).map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const messagesWithProfiles = (messagesData as any[]).map((msg: any) => ({
        ...msg,
        profile: profileMap.get(msg.user_id),
      }));

      setMessages(messagesWithProfiles);
    }

    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    // Using type assertion since types may not be regenerated yet
    const { error } = await (supabase as any)
      .from('chat_messages')
      .insert({
        club_id: clubId,
        event_id: eventId || null,
        user_id: user.id,
        message: newMessage.trim(),
      });

    if (error) {
      toast.error(t('chat.send_failed'));
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
      
      // Send in-app notifications to other club members (fire and forget)
      sendChatNotifications();
    }
    setSending(false);
  };
  
  // Throttled chat notifications - only send one per user per 5 minutes
  const lastNotificationRef = React.useRef<number>(0);
  const sendChatNotifications = async () => {
    const now = Date.now();
    const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
    
    if (now - lastNotificationRef.current < THROTTLE_MS) {
      return; // Throttled
    }
    lastNotificationRef.current = now;
    
    try {
      // Get other club members
      const { data: members } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', clubId)
        .neq('user_id', user!.id);
      
      if (!members || members.length === 0) return;
      
      // Get sender name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user!.id)
        .single();
      
      const userIds = members.map(m => m.user_id);
      notifyNewChatMessageInApp(
        userIds,
        profile?.display_name || 'Someone',
        clubId,
        user!.id,
        eventId
      ).catch(console.error);
    } catch (err) {
      console.error('Failed to send chat notifications:', err);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-muted-foreground">{t('chat.loading')}</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-3xl mb-2 opacity-30">💬</div>
            <p className="text-sm text-muted-foreground">
              {t('chat.no_messages')}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg.message}
                senderName={msg.profile?.display_name || 'Unknown'}
                avatarUrl={msg.profile?.avatar_url}
                timestamp={msg.created_at}
                isOwnMessage={msg.user_id === user?.id}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </ScrollArea>

      <form onSubmit={sendMessage} className="p-3 border-t border-border/50 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('chat.type_message')}
          className="flex-1 bg-secondary/50"
          disabled={sending}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newMessage.trim() || sending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
