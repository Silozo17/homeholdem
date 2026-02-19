import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface Conversation {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export function useDirectMessages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: messages } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!messages || messages.length === 0) {
      setConversations([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Group by other user
    const grouped = new Map<string, Message[]>();
    for (const msg of messages) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!grouped.has(otherId)) grouped.set(otherId, []);
      grouped.get(otherId)!.push(msg);
    }

    const otherIds = [...grouped.keys()];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', otherIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

    let totalUnread = 0;
    const convos: Conversation[] = otherIds.map(otherId => {
      const msgs = grouped.get(otherId)!;
      const latest = msgs[0];
      const unread = msgs.filter(m => m.receiver_id === user.id && !m.read_at).length;
      totalUnread += unread;
      const profile = profileMap.get(otherId);
      return {
        user_id: otherId,
        display_name: profile?.display_name ?? 'Unknown',
        avatar_url: profile?.avatar_url ?? null,
        last_message: latest.message,
        last_message_at: latest.created_at,
        unread_count: unread,
      };
    });

    convos.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    setConversations(convos);
    setUnreadCount(totalUnread);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    channelRef.current = supabase
      .channel('dm-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          fetchConversations();
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user, fetchConversations]);

  const getThread = useCallback(async (otherUserId: string): Promise<Message[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    return (data ?? []) as Message[];
  }, [user]);

  const sendMessage = useCallback(async (receiverId: string, text: string) => {
    if (!user || !text.trim()) return;
    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      message: text.trim(),
    });
  }, [user]);

  const markAsRead = useCallback(async (otherUserId: string) => {
    if (!user) return;
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .eq('receiver_id', user.id)
      .is('read_at', null);
    fetchConversations();
  }, [user, fetchConversations]);

  return {
    conversations,
    unreadCount,
    loading,
    getThread,
    sendMessage,
    markAsRead,
    refresh: fetchConversations,
  };
}
