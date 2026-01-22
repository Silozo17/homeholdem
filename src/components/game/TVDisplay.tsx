import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassicTimerMode } from './tv/ClassicTimerMode';
import { DashboardMode } from './tv/DashboardMode';
import { TableViewMode } from './tv/TableViewMode';
import { TVControlPanel } from './tv/TVControlPanel';

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
}

interface GameSession {
  id: string;
  status: string;
  current_level: number;
  level_started_at: string | null;
  time_remaining_seconds: number | null;
  starting_chips: number;
  buy_in_amount: number;
  rebuy_amount: number;
  addon_amount: number;
  rebuy_chips: number;
  addon_chips: number;
  allow_rebuys: boolean;
  allow_addons: boolean;
}

interface GamePlayer {
  id: string;
  display_name: string;
  status: string;
  finish_position: number | null;
  table_number: number | null;
  seat_number: number | null;
}

interface GameTransaction {
  id: string;
  game_player_id: string;
  transaction_type: string;
  amount: number;
}

interface PayoutStructure {
  position: number;
  percentage: number;
  amount: number | null;
}

type DisplayMode = 'classic' | 'dashboard' | 'table';

interface TVDisplayProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  players: GamePlayer[];
  transactions: GameTransaction[];
  prizePool: number;
  currencySymbol: string;
  isAdmin: boolean;
  payouts?: PayoutStructure[];
  onExit: () => void;
  onUpdateSession: (updates: Partial<GameSession>) => void;
  onRefresh: () => void;
}

export function TVDisplay({
  session,
  blindStructure,
  players,
  transactions,
  prizePool,
  currencySymbol,
  isAdmin,
  payouts = [],
  onExit,
  onUpdateSession,
  onRefresh
}: TVDisplayProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('classic');
  const [showControls, setShowControls] = useState(false);
  const [idleTime, setIdleTime] = useState(0);

  const activePlayers = players.filter(p => p.status === 'active');
  const averageStack = activePlayers.length > 0 
    ? Math.round((activePlayers.length * (session.starting_chips || 10000)) / activePlayers.length)
    : 0;

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (!showControls) return;

    const timer = setInterval(() => {
      setIdleTime(prev => {
        if (prev >= 30) {
          setShowControls(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    const resetIdle = () => setIdleTime(0);
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('touchstart', resetIdle);

    return () => {
      clearInterval(timer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
    };
  }, [showControls]);

  // Request fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        // Fullscreen not supported or denied
      }
    };
    enterFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Exit Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExit}
        className="absolute top-4 right-4 z-50 text-white/50 hover:text-white hover:bg-white/10"
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Admin Controls Toggle */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowControls(true)}
          className="absolute top-4 right-16 z-50 text-white/50 hover:text-white hover:bg-white/10"
        >
          <Settings className="w-6 h-6" />
        </Button>
      )}

      {/* Display Modes */}
      {displayMode === 'classic' && (
        <ClassicTimerMode
          session={session}
          blindStructure={blindStructure}
          prizePool={prizePool}
          currencySymbol={currencySymbol}
          playersRemaining={activePlayers.length}
          totalPlayers={players.length}
          averageStack={averageStack}
          onUpdateSession={onUpdateSession}
          isAdmin={isAdmin}
        />
      )}

      {displayMode === 'dashboard' && (
        <DashboardMode
          session={session}
          blindStructure={blindStructure}
          players={players}
          transactions={transactions}
          prizePool={prizePool}
          currencySymbol={currencySymbol}
          onUpdateSession={onUpdateSession}
          payouts={payouts}
        />
      )}

      {displayMode === 'table' && (
        <TableViewMode
          session={session}
          blindStructure={blindStructure}
          players={players}
          prizePool={prizePool}
          currencySymbol={currencySymbol}
          playersRemaining={activePlayers.length}
          totalPlayers={players.length}
          onUpdateSession={onUpdateSession}
        />
      )}

      {/* Control Panel */}
      {showControls && isAdmin && (
        <TVControlPanel
          session={session}
          blindStructure={blindStructure}
          players={players}
          currencySymbol={currencySymbol}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          onUpdateSession={onUpdateSession}
          onClose={() => setShowControls(false)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
