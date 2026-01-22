import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GameSession {
  id: string;
  event_id: string;
  status: string;
  current_level: number;
  level_started_at: string | null;
  time_remaining_seconds: number | null;
  buy_in_amount: number;
  rebuy_amount: number;
  addon_amount: number;
  starting_chips: number;
  rebuy_chips: number;
  addon_chips: number;
  allow_rebuys: boolean;
  allow_addons: boolean;
  rebuy_until_level: number | null;
}

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
}

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  table_number: number | null;
  seat_number: number | null;
  status: string;
  finish_position: number | null;
  eliminated_at: string | null;
}

interface GameTransaction {
  id: string;
  game_player_id: string;
  transaction_type: string;
  amount: number;
  chips: number | null;
  notes: string | null;
  created_at: string;
}

// Default blind structure
const DEFAULT_BLINDS: Omit<BlindLevel, 'id' | 'game_session_id'>[] = [
  { level: 1, small_blind: 25, big_blind: 50, ante: 0, duration_minutes: 15, is_break: false },
  { level: 2, small_blind: 50, big_blind: 100, ante: 0, duration_minutes: 15, is_break: false },
  { level: 3, small_blind: 75, big_blind: 150, ante: 0, duration_minutes: 15, is_break: false },
  { level: 4, small_blind: 100, big_blind: 200, ante: 25, duration_minutes: 15, is_break: false },
  { level: 5, small_blind: 0, big_blind: 0, ante: 0, duration_minutes: 10, is_break: true }, // Break
  { level: 6, small_blind: 150, big_blind: 300, ante: 50, duration_minutes: 15, is_break: false },
  { level: 7, small_blind: 200, big_blind: 400, ante: 50, duration_minutes: 15, is_break: false },
  { level: 8, small_blind: 300, big_blind: 600, ante: 75, duration_minutes: 15, is_break: false },
  { level: 9, small_blind: 400, big_blind: 800, ante: 100, duration_minutes: 15, is_break: false },
  { level: 10, small_blind: 0, big_blind: 0, ante: 0, duration_minutes: 10, is_break: true }, // Break
  { level: 11, small_blind: 500, big_blind: 1000, ante: 100, duration_minutes: 15, is_break: false },
  { level: 12, small_blind: 600, big_blind: 1200, ante: 200, duration_minutes: 15, is_break: false },
  { level: 13, small_blind: 800, big_blind: 1600, ante: 200, duration_minutes: 15, is_break: false },
  { level: 14, small_blind: 1000, big_blind: 2000, ante: 300, duration_minutes: 15, is_break: false },
  { level: 15, small_blind: 1500, big_blind: 3000, ante: 400, duration_minutes: 15, is_break: false },
];

export function useGameSession(eventId: string) {
  const { user } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null);
  const [blindStructure, setBlindStructure] = useState<BlindLevel[]>([]);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [transactions, setTransactions] = useState<GameTransaction[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !eventId) return;

    // Check if user is admin
    const { data: eventData } = await supabase
      .from('events')
      .select('club_id')
      .eq('id', eventId)
      .single();

    if (eventData) {
      setClubId(eventData.club_id);
      const { data: memberData } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', eventData.club_id)
        .eq('user_id', user.id)
        .single();

      setIsAdmin(memberData?.role === 'owner' || memberData?.role === 'admin');
    }

    // Fetch game session
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionData) {
      setSession(sessionData as GameSession);

      // Fetch blind structure
      const { data: blindsData } = await supabase
        .from('blind_structures')
        .select('*')
        .eq('game_session_id', sessionData.id)
        .order('level');

      if (blindsData) {
        setBlindStructure(blindsData as BlindLevel[]);
      }

      // Fetch players
      const { data: playersData } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_session_id', sessionData.id)
        .order('created_at');

      if (playersData) {
        setPlayers(playersData as GamePlayer[]);
      }

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('game_transactions')
        .select('*')
        .eq('game_session_id', sessionData.id)
        .order('created_at');

      if (transactionsData) {
        setTransactions(transactionsData as GameTransaction[]);
      }
    }

    setLoading(false);
  }, [user, eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`game_session_${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.new) {
            setSession(payload.new as GameSession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  const createSession = async () => {
    if (!user || !eventId) return;

    // Create session
    const { data: newSession, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        event_id: eventId,
        status: 'pending',
      })
      .select()
      .single();

    if (sessionError) {
      toast.error('Failed to create game session');
      return;
    }

    // Create default blind structure
    const blindsToInsert = DEFAULT_BLINDS.map(blind => ({
      ...blind,
      game_session_id: newSession.id,
    }));

    await supabase.from('blind_structures').insert(blindsToInsert);

    // Add players from RSVPs
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'going')
      .eq('is_waitlisted', false);

    if (rsvps && rsvps.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', rsvps.map(r => r.user_id));

      const playersToInsert = profiles?.map(p => ({
        game_session_id: newSession.id,
        user_id: p.id,
        display_name: p.display_name,
      })) || [];

      if (playersToInsert.length > 0) {
        await supabase.from('game_players').insert(playersToInsert);
      }
    }

    toast.success('Tournament created!');
    fetchData();
  };

  const updateSession = async (updates: Partial<GameSession>) => {
    if (!session) return;

    const { error } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', session.id);

    if (error) {
      toast.error('Failed to update session');
      return;
    }

    setSession(prev => prev ? { ...prev, ...updates } : null);
  };

  return {
    session,
    blindStructure,
    players,
    transactions,
    clubId,
    isAdmin,
    loading,
    createSession,
    updateSession,
    refetch: fetchData,
  };
}
