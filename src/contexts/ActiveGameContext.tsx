import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  setActiveGame: (game: ActiveGame | null) => void;
  clearActiveGame: () => void;
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
  setActiveGame: () => {},
  clearActiveGame: () => {},
});

export function ActiveGameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeGame, setActiveGameState] = useState<ActiveGame | null>(null);
  const userClubIdsRef = useRef<string[]>([]);
  const isInitializedRef = useRef(false);

  // Helper function to refresh active game data
  const refreshActiveGame = useCallback(async (sessionId: string, eventId: string) => {
    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) return;

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

    const { data: clubData } = await supabase
      .from('clubs')
      .select('currency')
      .eq('id', eventResult.data?.club_id)
      .single();

    const activePlayers = playersResult.data?.filter(p => p.status === 'active').length || 0;
    const prizePool = transactionsResult.data
      ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const gameData: ActiveGame = {
      sessionId,
      eventId,
      status: session.status,
      currentLevel: session.current_level,
      timeRemainingSeconds: session.time_remaining_seconds,
      levelStartedAt: session.level_started_at,
      blindStructure: blindsResult.data || [],
      prizePool,
      playersRemaining: activePlayers,
      currencySymbol: CURRENCY_SYMBOLS[clubData?.currency || 'GBP'] || '£',
    };

    setActiveGameState(gameData);
    sessionStorage.setItem('activeGame', JSON.stringify(gameData));
  }, []);

  const setActiveGame = useCallback((game: ActiveGame | null) => {
    setActiveGameState(game);
    if (game) {
      sessionStorage.setItem('activeGame', JSON.stringify(game));
    } else {
      sessionStorage.removeItem('activeGame');
    }
  }, []);

  const clearActiveGame = useCallback(() => {
    setActiveGameState(null);
    sessionStorage.removeItem('activeGame');
  }, []);

  // Auto-detect active games on mount or user login
  useEffect(() => {
    if (!user) return;
    if (isInitializedRef.current) return;

    const fetchActiveGames = async () => {
      // 1. Check if there's cached data and validate it against the database
      const stored = sessionStorage.getItem('activeGame');
      let cachedSessionId: string | null = null;
      
      if (stored) {
        try {
          const cached = JSON.parse(stored);
          cachedSessionId = cached.sessionId;
          
          // Validate the cached session is still active in the database
          const { data: validSession } = await supabase
            .from('game_sessions')
            .select('id, status')
            .eq('id', cached.sessionId)
            .maybeSingle();
          
          if (!validSession || validSession.status === 'completed') {
            // Cached data is stale - clear it
            sessionStorage.removeItem('activeGame');
            setActiveGameState(null);
            cachedSessionId = null;
          } else {
            // Cache is valid, use it for fast initial render
            setActiveGameState(cached);
          }
        } catch (e) {
          sessionStorage.removeItem('activeGame');
          setActiveGameState(null);
        }
      }

      // 2. Get all clubs the user is a member of
      const { data: memberships } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        isInitializedRef.current = true;
        return;
      }

      const clubIds = memberships.map(m => m.club_id);
      userClubIdsRef.current = clubIds;

      // 3. Find active game sessions in any of these clubs
      const { data: activeSessions } = await supabase
        .from('game_sessions')
        .select(`
          id,
          event_id,
          status,
          current_level,
          time_remaining_seconds,
          level_started_at,
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

      if (userClubSessions && userClubSessions.length > 0) {
        const session = userClubSessions[0];
        
        // 4. If the freshest active game is different from cached, update to the new one
        if (session.id !== cachedSessionId) {
          await refreshActiveGame(session.id, session.event_id);
        }
      } else if (cachedSessionId) {
        // No active games found but we had cached data - clear it
        sessionStorage.removeItem('activeGame');
        setActiveGameState(null);
      }

      isInitializedRef.current = true;
    };

    fetchActiveGames();
  }, [user, refreshActiveGame]);

  // Subscribe to global game_sessions changes for user's clubs
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
            // Game ended - clear if this was our active game OR if cached game matches
            const stored = sessionStorage.getItem('activeGame');
            if (stored) {
              try {
                const cached = JSON.parse(stored);
                if (cached.sessionId === session.id) {
                  sessionStorage.removeItem('activeGame');
                  setActiveGameState(null);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
            // Also clear state if it matches
            setActiveGameState(prev => 
              prev?.sessionId === session.id ? null : prev
            );
          } else if (['pending', 'active', 'paused'].includes(session.status)) {
            // Game started or updated - always refresh to get latest data
            await refreshActiveGame(session.id, session.event_id);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshActiveGame]);

  // Subscribe to player and transaction updates for the active game
  useEffect(() => {
    if (!activeGame) return;

    const channel = supabase
      .channel(`game-updates-${activeGame.sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_session_id=eq.${activeGame.sessionId}`,
      }, async () => {
        // Refetch player count
        const { data: players } = await supabase
          .from('game_players')
          .select('id, status')
          .eq('game_session_id', activeGame.sessionId);

        const activePlayers = players?.filter(p => p.status === 'active').length || 0;

        setActiveGameState(prev => {
          if (!prev) return null;
          const updated = { ...prev, playersRemaining: activePlayers };
          sessionStorage.setItem('activeGame', JSON.stringify(updated));
          return updated;
        });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_transactions',
        filter: `game_session_id=eq.${activeGame.sessionId}`,
      }, async () => {
        // Refetch prize pool
        const { data: transactions } = await supabase
          .from('game_transactions')
          .select('amount, transaction_type')
          .eq('game_session_id', activeGame.sessionId);

        const prizePool = transactions
          ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
          .reduce((sum, t) => sum + t.amount, 0) || 0;

        setActiveGameState(prev => {
          if (!prev) return null;
          const updated = { ...prev, prizePool };
          sessionStorage.setItem('activeGame', JSON.stringify(updated));
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGame?.sessionId]);

  // Clear active game when user logs out
  useEffect(() => {
    if (!user) {
      clearActiveGame();
      isInitializedRef.current = false;
      userClubIdsRef.current = [];
    }
  }, [user, clearActiveGame]);

  return (
    <ActiveGameContext.Provider value={{ activeGame, setActiveGame, clearActiveGame }}>
      {children}
    </ActiveGameContext.Provider>
  );
}

export const useActiveGame = () => useContext(ActiveGameContext);
