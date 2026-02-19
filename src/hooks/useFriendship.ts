import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FriendWithProfile {
  friendship_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  country_code: string | null;
  direction: 'sent' | 'received';
  status: string;
}

export function useFriendship() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendWithProfile[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!data) { setLoading(false); return; }

    const otherIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    const uniqueIds = [...new Set(otherIds)];

    let profiles: Record<string, { display_name: string; avatar_url: string | null; country_code: string | null }> = {};
    if (uniqueIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, country_code')
        .in('id', uniqueIds);
      if (profileData) {
        profiles = Object.fromEntries(profileData.map(p => [p.id, p]));
      }
    }

    const mapped: FriendWithProfile[] = data.map(f => {
      const isSent = f.requester_id === user.id;
      const otherId = isSent ? f.addressee_id : f.requester_id;
      const p = profiles[otherId];
      return {
        friendship_id: f.id,
        user_id: otherId,
        display_name: p?.display_name ?? 'Unknown',
        avatar_url: p?.avatar_url ?? null,
        country_code: p?.country_code ?? null,
        direction: isSent ? 'sent' : 'received',
        status: f.status,
      };
    });

    setFriends(mapped.filter(f => f.status === 'accepted'));
    setPendingReceived(mapped.filter(f => f.status === 'pending' && f.direction === 'received'));
    setPendingSent(mapped.filter(f => f.status === 'pending' && f.direction === 'sent'));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFriendships(); }, [fetchFriendships]);

  const getFriendshipStatus = useCallback(async (targetUserId: string): Promise<FriendshipStatus> => {
    if (!user) return 'none';
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (!data) return 'none';
    if (data.status === 'accepted') return 'accepted';
    if (data.status === 'pending') {
      return data.requester_id === user.id ? 'pending_sent' : 'pending_received';
    }
    return 'none';
  }, [user]);

  const sendRequest = useCallback(async (targetUserId: string) => {
    if (!user) return;
    await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: targetUserId });
    fetchFriendships();
  }, [user, fetchFriendships]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    fetchFriendships();
  }, [fetchFriendships]);

  const declineRequest = useCallback(async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchFriendships();
  }, [fetchFriendships]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchFriendships();
  }, [fetchFriendships]);

  const cancelRequest = useCallback(async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchFriendships();
  }, [fetchFriendships]);

  return {
    friends,
    pendingReceived,
    pendingSent,
    loading,
    getFriendshipStatus,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    cancelRequest,
    refresh: fetchFriendships,
  };
}
