import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
}

interface ActiveGame {
  sessionId: string;
  eventId: string;
  clubId: string;
  status: string;
  currentLevel: number;
  timeRemainingSeconds: number | null;
  levelStartedAt: string | null;
  blindStructure: BlindLevel[];
  prizePool: number;
  playersRemaining: number;
  currencySymbol: string;
}

interface ActiveGameContextType {
  activeGame: ActiveGame | null;
  allActiveGames: ActiveGame[];
  setActiveGame: (game: ActiveGame | null) => void;
  clearActiveGame: () => void;
  setCurrentClubId: (clubId: string | null) => void;
  currentClubId: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  'GBP': '£',
  'USD': '$',
  'EUR': '€',
  'PLN': 'zł',
  'AUD': 'A$',
  'CAD': 'C$',
};

const ActiveGameContext = createContext<ActiveGameContextType>({
  activeGame: null,
  allActiveGames: [],
  setActiveGame: () => {},
  clearActiveGame: () => {},
  setCurrentClubId: () => {},
  currentClubId: null,
});

export function ActiveGameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [allActiveGames, setAllActiveGames] = useState<ActiveGame[]>([]);
  const [currentClubId, setCurrentClubId] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  // Derive the active game based on current club context
  const activeGame = useMemo(() => {
    if (allActiveGames.length === 0) return null;
    
    // If viewing a specific club, prioritize that club's game
    if (currentClubId) {
      const clubGame = allActiveGames.find(g => g.clubId === currentClubId);
      if (clubGame) return clubGame;
    }
    
    // Otherwise return most recent (first in sorted list)
    return allActiveGames[0];
  }, [allActiveGames, currentClubId]);

  // Helper function to build full game data
  const buildGameData = useCallback(async (sessionId: string, eventId: string): Promise<ActiveGame | null> => {
    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) return null;

    const [blindsResult, playersResult, transactionsResult, eventResult] = await Promise.all([
      supabase
        .from('blind_structures')
        .select('*')
        .eq('game_session_id', sessionId)
        .order('level'),
      supabase
        .from('game_players')
        .select('id, status')
        .eq('game_session_id', sessionId),
      supabase
        .from('game_transactions')
        .select('amount, transaction_type')
        .eq('game_session_id', sessionId),
      supabase
        .from('events')
        .select('club_id')
        .eq('id', eventId)
        .single(),
    ]);

    const clubId = eventResult.data?.club_id;
    if (!clubId) return null;

    const { data: clubData } = await supabase
      .from('clubs')
      .select('currency')
      .eq('id', clubId)
      .single();

    const activePlayers = playersResult.data?.filter(p => p.status === 'active').length || 0;
    const prizePool = transactionsResult.data
      ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    return {
      sessionId,
      eventId,
      clubId,
      status: session.status,
      currentLevel: session.current_level,
      timeRemainingSeconds: session.time_remaining_seconds,
      levelStartedAt: session.level_started_at,
      blindStructure: blindsResult.data || [],
      prizePool,
      playersRemaining: activePlayers,
      currencySymbol: CURRENCY_SYMBOLS[clubData?.currency || 'GBP'] || '£',
    };
  }, []);

  const setActiveGame = useCallback((game: ActiveGame | null) => {
    if (game) {
      // Update or add to allActiveGames
      setAllActiveGames(prev => {
        const filtered = prev.filter(g => g.sessionId !== game.sessionId);
        return [game, ...filtered];
      });
    }
  }, []);

  const clearActiveGame = useCallback(() => {
    setAllActiveGames([]);
  }, []);

  // Fetch all active games for user's clubs
  const fetchAllActiveGames = useCallback(async () => {
    if (!user) return;

    // 1. Get all clubs the user is a member of
    const { data: memberships } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setAllActiveGames([]);
      return;
    }

    const clubIds = memberships.map(m => m.club_id);

    // 2. Find active game sessions in any of these clubs
    const { data: activeSessions } = await supabase
      .from('game_sessions')
      .select(`
        id,
        event_id,
        status,
        events!inner (
          id,
          club_id
        )
      `)
      .in('status', ['pending', 'active', 'paused'])
      .order('created_at', { ascending: false });

    // Filter to only sessions in user's clubs
    const userClubSessions = activeSessions?.filter(session => {
      const eventData = session.events as unknown as { id: string; club_id: string };
      return clubIds.includes(eventData.club_id);
    });

    if (!userClubSessions || userClubSessions.length === 0) {
      setAllActiveGames([]);
      return;
    }

    // 3. Build full game data for each active session
    const gameDataPromises = userClubSessions.map(session => 
      buildGameData(session.id, session.event_id)
    );
    
    const gamesData = await Promise.all(gameDataPromises);
    const validGames = gamesData.filter((g): g is ActiveGame => g !== null);
    
    setAllActiveGames(validGames);
  }, [user, buildGameData]);

  // Auto-detect active games on mount or user login
  useEffect(() => {
    if (!user) return;
    if (isInitializedRef.current) return;

    fetchAllActiveGames();
    isInitializedRef.current = true;
  }, [user, fetchAllActiveGames]);

  // Subscribe to global game_sessions changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-game-sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
      }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const session = payload.new as any;

          // Check if this session is in one of user's clubs
          const { data: eventData } = await supabase
            .from('events')
            .select('club_id')
            .eq('id', session.event_id)
            .single();

          if (!eventData) return;

          // Check if user is a member of this club
          const { data: membership } = await supabase
            .from('club_members')
            .select('id')
            .eq('club_id', eventData.club_id)
            .eq('user_id', user.id)
            .single();

          if (!membership) return; // Not a member, ignore

          // Handle based on status
          if (session.status === 'completed') {
            // Game ended - remove from active games
            setAllActiveGames(prev => prev.filter(g => g.sessionId !== session.id));
          } else if (['pending', 'active', 'paused'].includes(session.status)) {
            // Game started or updated - refresh this game's data
            const gameData = await buildGameData(session.id, session.event_id);
            if (gameData) {
              setAllActiveGames(prev => {
                const filtered = prev.filter(g => g.sessionId !== session.id);
                return [gameData, ...filtered];
              });
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, buildGameData]);

  // Subscribe to player and transaction updates for all active games
  useEffect(() => {
    if (allActiveGames.length === 0) return;

    const channels = allActiveGames.map(game => {
      return supabase
        .channel(`game-updates-${game.sessionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_session_id=eq.${game.sessionId}`,
        }, async () => {
          // Refetch player count
          const { data: players } = await supabase
            .from('game_players')
            .select('id, status')
            .eq('game_session_id', game.sessionId);

          const activePlayers = players?.filter(p => p.status === 'active').length || 0;

          setAllActiveGames(prev => prev.map(g => 
            g.sessionId === game.sessionId 
              ? { ...g, playersRemaining: activePlayers }
              : g
          ));
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_transactions',
          filter: `game_session_id=eq.${game.sessionId}`,
        }, async () => {
          // Refetch prize pool
          const { data: transactions } = await supabase
            .from('game_transactions')
            .select('amount, transaction_type')
            .eq('game_session_id', game.sessionId);

          const prizePool = transactions
            ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
            .reduce((sum, t) => sum + t.amount, 0) || 0;

          setAllActiveGames(prev => prev.map(g =>
            g.sessionId === game.sessionId
              ? { ...g, prizePool }
              : g
          ));
        })
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [allActiveGames.map(g => g.sessionId).join(',')]);

  // Clear active games when user logs out
  useEffect(() => {
    if (!user) {
      clearActiveGame();
      isInitializedRef.current = false;
      setCurrentClubId(null);
    }
  }, [user, clearActiveGame]);

  return (
    <ActiveGameContext.Provider value={{ 
      activeGame, 
      allActiveGames,
      setActiveGame, 
      clearActiveGame,
      setCurrentClubId,
      currentClubId,
    }}>
      {children}
    </ActiveGameContext.Provider>
  );
}

export const useActiveGame = () => useContext(ActiveGameContext);
