import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveGame } from '@/contexts/ActiveGameContext';

export function TournamentMiniBar() {
  const navigate = useNavigate();
  const { activeGame } = useActiveGame();
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Calculate time remaining from timestamps (drift-resistant)
  const calculateTimeRemaining = useCallback(() => {
    if (!activeGame) return 0;
    
    // When paused, use stored time
    if (activeGame.status !== 'active') {
      return activeGame.timeRemainingSeconds ?? 0;
    }
    
    // When active, calculate from levelStartedAt timestamp
    if (!activeGame.levelStartedAt) {
      return activeGame.timeRemainingSeconds ?? 0;
    }
    
    const startTime = new Date(activeGame.levelStartedAt).getTime();
    const initialSeconds = activeGame.timeRemainingSeconds ?? 0;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    return Math.max(0, initialSeconds - elapsedSeconds);
  }, [activeGame]);

  // Initialize and recalculate on changes
  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining());
  }, [calculateTimeRemaining]);

  // Recalculate when app returns from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeRemaining(calculateTimeRemaining());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [calculateTimeRemaining]);

  // Timer tick - recalculates from timestamp each second
  useEffect(() => {
    if (activeGame?.status !== 'active') return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeGame?.status, calculateTimeRemaining]);

  if (!activeGame || activeGame.status === 'completed') {
    return null;
  }

  const currentLevel = activeGame.blindStructure?.find(
    b => b.level === activeGame.currentLevel
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBlind = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    }
    return value.toLocaleString();
  };

  const handleClick = () => {
    navigate(`/event/${activeGame.eventId}/game`);
  };

  const isActive = activeGame.status === 'active';
  const isPaused = activeGame.status === 'paused';

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed top-[calc(4rem+env(safe-area-inset-top,0px))] left-3 right-3 z-40",
        "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900",
        "border-2 rounded-2xl px-5 py-3",
        "shadow-lg backdrop-blur-xl",
        "transition-all duration-300",
        "hover:scale-[1.01] active:scale-[0.99]",
        isActive 
          ? "border-emerald-400/50 shadow-emerald-500/30" 
          : "border-amber-400/50 shadow-amber-500/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isActive 
              ? "bg-emerald-500/20" 
              : "bg-amber-500/20"
          )}>
            {isActive ? (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <Pause className="w-4 h-4 text-amber-400" />
            )}
          </div>

          {/* Timer */}
          <span className={cn(
            "font-mono text-xl font-bold",
            timeRemaining <= 60 ? "text-amber-400" : "text-white"
          )}>
            {formatTime(timeRemaining)}
          </span>

          {/* Blinds */}
          {currentLevel && !currentLevel.is_break && (
            <div className="flex items-center gap-1">
              <span className="text-blue-400 font-medium">
                {formatBlind(currentLevel.small_blind)}
              </span>
              <span className="text-white/30">/</span>
              <span className="text-amber-400 font-medium">
                {formatBlind(currentLevel.big_blind)}
              </span>
            </div>
          )}

          {currentLevel?.is_break && (
            <span className="text-blue-400 font-medium">☕ Break</span>
          )}

          {/* Players */}
          {activeGame.playersRemaining > 0 && (
            <span className="text-white/60 text-sm">
              {activeGame.playersRemaining} left
            </span>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-white/40" />
      </div>
    </button>
  );
}
