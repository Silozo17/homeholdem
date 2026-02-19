import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

interface ThreadMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export default function Inbox() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { conversations, loading, sendMessage, getThread, markAsRead, refresh } = useDirectMessages();

  const [activeUserId, setActiveUserId] = useState<string | null>(searchParams.get('user'));
  const [activeUserName, setActiveUserName] = useState('');
  const [activeUserAvatar, setActiveUserAvatar] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  // Load thread when activeUserId changes
  const loadThread = useCallback(async (userId: string) => {
    const msgs = await getThread(userId);
    setThread(msgs);
    markAsRead(userId);

    // Get profile info
    const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single();
    if (data) {
      setActiveUserName(data.display_name);
      setActiveUserAvatar(data.avatar_url);
    }
  }, [getThread, markAsRead]);

  useEffect(() => {
    if (activeUserId) loadThread(activeUserId);
  }, [activeUserId, loadThread]);

  // Realtime for active thread
  useEffect(() => {
    if (!activeUserId || !user) return;
    channelRef.current = supabase
      .channel(`dm-thread-${activeUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, (payload) => {
        const msg = payload.new as ThreadMessage;
        if (
          (msg.sender_id === user.id && msg.receiver_id === activeUserId) ||
          (msg.sender_id === activeUserId && msg.receiver_id === user.id)
        ) {
          setThread(prev => [...prev, msg]);
          if (msg.sender_id === activeUserId) markAsRead(activeUserId);
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [activeUserId, user, markAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread]);

  const handleSend = async () => {
    if (!activeUserId || !newMessage.trim()) return;
    setSending(true);
    await sendMessage(activeUserId, newMessage);
    setNewMessage('');
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd/MM');
  };

  // Thread view
  if (activeUserId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
          <div className="flex items-center gap-3 h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => { setActiveUserId(null); refresh(); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={activeUserAvatar ?? undefined} />
              <AvatarFallback className="text-xs">{activeUserName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-bold text-foreground truncate">{activeUserName}</span>
          </div>
        </header>
        <div className="h-14 safe-area-top" />

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-20">
          {thread.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] px-3 py-2 rounded-2xl text-sm',
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary text-secondary-foreground rounded-bl-md'
                )}>
                  <p>{msg.message}</p>
                  <p className={cn('text-[10px] mt-1', isMine ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 p-3 safe-area-bottom">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Conversation list view
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
        </div>
      </header>
      <div className="h-14 safe-area-top" />

      <main className="px-4 py-3 pb-24">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60">Tap a player at the poker table to send a message</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.user_id}
                onClick={() => setActiveUserId(conv.user_id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.avatar_url ?? undefined} />
                    <AvatarFallback>{conv.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center">
                    <span className={cn('font-semibold text-sm truncate', conv.unread_count > 0 && 'text-foreground')}>
                      {conv.display_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={cn(
                    'text-xs truncate',
                    conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {conv.last_message}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
