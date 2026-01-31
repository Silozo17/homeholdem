import { useState, useEffect } from 'react';
import { X, Settings, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassicTimerMode } from './tv/ClassicTimerMode';
import { DashboardMode } from './tv/DashboardMode';
import { TableViewMode } from './tv/TableViewMode';
import { CombinedMode } from './tv/CombinedMode';
import { PortraitTimerMode } from './tv/PortraitTimerMode';
import { TVControlPanel } from './tv/TVControlPanel';
import { useWakeLock } from '@/hooks/useWakeLock';

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
  display_blinds_as_currency: boolean | null;
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
  chips: number | null;
}

interface PayoutStructure {
  position: number;
  percentage: number;
  amount: number | null;
}

type TVLayoutMode = 'classic' | 'dashboard' | 'table' | 'combined';
type BlindsDisplayMode = 'cash' | 'chips';

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
  chipToCashRatio?: number;
  blindsDisplayMode?: BlindsDisplayMode;
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
  onRefresh,
  chipToCashRatio = 0.01,
  blindsDisplayMode = 'cash'
}: TVDisplayProps) {
  const [layoutMode, setLayoutMode] = useState<TVLayoutMode>('classic');
  const [showControls, setShowControls] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const [isLandscape, setIsLandscape] = useState(true);
  const { requestWakeLock, releaseWakeLock, isActive: wakeLockActive } = useWakeLock();

  // Detect orientation changes
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscape(landscape);
    };
    
    checkOrientation();
    
    const mql = window.matchMedia('(orientation: landscape)');
    mql.addEventListener('change', checkOrientation);
    
    return () => mql.removeEventListener('change', checkOrientation);
  }, []);

  const activePlayers = players.filter(p => p.status === 'active');
  const totalChipsInPlay = transactions
    .filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
    .reduce((sum, t) => sum + (t.chips || 0), 0);
  const averageStack = activePlayers.length > 0 
    ? Math.round(totalChipsInPlay / activePlayers.length)
    : 0;

  // Auto-hide controls after inactivity (unless pinned)
  useEffect(() => {
    if (!showControls || pinned) {
      setIdleTime(0);
      return;
    }

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
  }, [showControls, pinned]);

  // Request fullscreen, landscape orientation, and wake lock on mount
  useEffect(() => {
    const enterTVMode = async () => {
      try {
        // Enter fullscreen first (required for orientation lock on most browsers)
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        
        // Lock to landscape orientation
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          try {
            await screen.orientation.lock('landscape');
          } catch (err) {
            // Orientation lock not supported or denied
            console.log('Orientation lock not supported:', err);
          }
        }
        
        // Request wake lock to prevent screen from sleeping
        await requestWakeLock();
      } catch (err) {
        console.log('TV mode setup partial:', err);
      }
    };
    
    enterTVMode();

    return () => {
      // Unlock orientation
      if (screen.orientation && typeof screen.orientation.unlock === 'function') {
        try {
          screen.orientation.unlock();
        } catch (err) {
          // Ignore unlock errors
        }
      }
      
      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      
      // Release wake lock
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  const handleExit = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit();
  };

  // Portrait mode - use dedicated portrait layout
  if (!isLandscape) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
        {/* Exit Button with safe area */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExit}
          className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] left-[max(1rem,env(safe-area-inset-left,1rem))] z-50 text-white/70 hover:text-white hover:bg-white/20 backdrop-blur-sm bg-black/40"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Wake Lock Indicator */}
        {wakeLockActive && (
          <div className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] left-14 z-50 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        )}

        {/* Admin Controls Toggle */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls(!showControls)}
            className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] right-[max(1rem,env(safe-area-inset-right,1rem))] z-50 text-white/70 hover:text-white hover:bg-white/20 backdrop-blur-sm bg-black/40"
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}

        <PortraitTimerMode
          session={session}
          blindStructure={blindStructure}
          prizePool={prizePool}
          currencySymbol={currencySymbol}
          playersRemaining={activePlayers.length}
          totalPlayers={players.length}
          onUpdateSession={onUpdateSession}
          isAdmin={isAdmin}
          chipToCashRatio={chipToCashRatio}
        />
      </div>
    );
  }

  // Landscape mode - existing modes
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex">
      {/* Main TV Display Area */}
      <div className="flex-1 relative">
        {/* Exit Button - positioned in header bar area with safe padding */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExit}
          className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] left-[max(1rem,env(safe-area-inset-left,1rem))] z-50 text-white/70 hover:text-white hover:bg-white/20 backdrop-blur-sm bg-black/40"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Wake Lock Indicator */}
        {wakeLockActive && (
          <div className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] left-14 z-50 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 hidden sm:inline">Screen on</span>
          </div>
        )}

        {/* Admin Controls Toggle - positioned in header bar area */}
        {isAdmin && !showControls && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls(true)}
            className="absolute top-[max(1rem,env(safe-area-inset-top,1rem))] right-[max(1rem,env(safe-area-inset-right,1rem))] z-50 text-white/70 hover:text-white hover:bg-white/20 backdrop-blur-sm bg-black/40"
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}

        {/* Display Modes */}
        {layoutMode === 'classic' && (
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
            chipToCashRatio={chipToCashRatio}
            blindsDisplayMode={blindsDisplayMode}
          />
        )}

        {layoutMode === 'dashboard' && (
          <DashboardMode
            session={session}
            blindStructure={blindStructure}
            players={players}
            transactions={transactions}
            prizePool={prizePool}
            currencySymbol={currencySymbol}
            onUpdateSession={onUpdateSession}
            payouts={payouts}
            chipToCashRatio={chipToCashRatio}
            blindsDisplayMode={blindsDisplayMode}
          />
        )}

        {layoutMode === 'table' && (
          <TableViewMode
            session={session}
            blindStructure={blindStructure}
            players={players}
            prizePool={prizePool}
            currencySymbol={currencySymbol}
            playersRemaining={activePlayers.length}
            totalPlayers={players.length}
            onUpdateSession={onUpdateSession}
            chipToCashRatio={chipToCashRatio}
            blindsDisplayMode={blindsDisplayMode}
          />
        )}

        {layoutMode === 'combined' && (
          <CombinedMode
            session={session}
            blindStructure={blindStructure}
            players={players}
            transactions={transactions}
            prizePool={prizePool}
            currencySymbol={currencySymbol}
            onUpdateSession={onUpdateSession}
            payouts={payouts}
            chipToCashRatio={chipToCashRatio}
            blindsDisplayMode={blindsDisplayMode}
          />
        )}
      </div>

      {/* Right Sidebar Control Panel */}
      {showControls && isAdmin && (
        <TVControlPanel
          session={session}
          blindStructure={blindStructure}
          players={players}
          currencySymbol={currencySymbol}
          displayMode={layoutMode}
          onDisplayModeChange={setLayoutMode}
          onUpdateSession={onUpdateSession}
          onClose={() => setShowControls(false)}
          onRefresh={onRefresh}
          pinned={pinned}
          onPinnedChange={setPinned}
        />
      )}
    </div>
  );
}
