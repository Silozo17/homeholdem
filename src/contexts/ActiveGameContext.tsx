import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

const ActiveGameContext = createContext<ActiveGameContextType>({
  activeGame: null,
  setActiveGame: () => {},
  clearActiveGame: () => {},
});

export function ActiveGameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeGame, setActiveGameState] = useState<ActiveGame | null>(null);

  const setActiveGame = useCallback((game: ActiveGame | null) => {
    setActiveGameState(game);
    // Persist to sessionStorage so it survives page navigation
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

  // Restore from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('activeGame');
    if (stored) {
      try {
        const game = JSON.parse(stored);
        // Verify the game is still active
        if (game.status !== 'completed') {
          setActiveGameState(game);
        } else {
          sessionStorage.removeItem('activeGame');
        }
      } catch (e) {
        sessionStorage.removeItem('activeGame');
      }
    }
  }, []);

  // Subscribe to realtime updates for active game
  useEffect(() => {
    if (!activeGame) return;

    const channel = supabase
      .channel(`game-minibar-${activeGame.sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${activeGame.sessionId}`,
      }, (payload) => {
        const newData = payload.new as any;
        setActiveGameState(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            status: newData.status,
            currentLevel: newData.current_level,
            timeRemainingSeconds: newData.time_remaining_seconds,
          };
          // Clear if game is completed
          if (newData.status === 'completed') {
            sessionStorage.removeItem('activeGame');
            return null;
          }
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
    }
  }, [user, clearActiveGame]);

  return (
    <ActiveGameContext.Provider value={{ activeGame, setActiveGame, clearActiveGame }}>
      {children}
    </ActiveGameContext.Provider>
  );
}

export const useActiveGame = () => useContext(ActiveGameContext);
