import { useEffect, useState, useCallback } from 'react';
import { useTournamentSounds } from '@/hooks/useTournamentSounds';

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
  display_blinds_as_currency?: boolean | null;
  level_started_at: string | null;
  time_remaining_seconds: number | null;
}

export interface ClassicTimerModeProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  prizePool: number;
  currencySymbol: string;
  playersRemaining: number;
  totalPlayers: number;
  averageStack: number;
  onUpdateSession: (updates: Partial<GameSession>) => void;
  isAdmin: boolean;
  chipToCashRatio?: number;
  blindsDisplayMode?: 'cash' | 'chips';
}

export function ClassicTimerMode({
  session,
  blindStructure,
  prizePool,
  currencySymbol,
  playersRemaining,
  totalPlayers,
  averageStack,
  onUpdateSession,
  isAdmin,
  chipToCashRatio = 0.01,
  blindsDisplayMode = 'cash'
}: ClassicTimerModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { playAnnouncement } = useTournamentSounds();

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);

  // Calculate time remaining from timestamps (drift-resistant)
  const calculateTimeRemaining = useCallback(() => {
    if (!currentLevel) return 0;
    
    if (session.status !== 'active') {
      return session.time_remaining_seconds ?? currentLevel.duration_minutes * 60;
    }
    
    if (!session.level_started_at) {
      return session.time_remaining_seconds ?? currentLevel.duration_minutes * 60;
    }
    
    const startTime = new Date(session.level_started_at).getTime();
    const initialSeconds = session.time_remaining_seconds ?? currentLevel.duration_minutes * 60;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    return Math.max(0, initialSeconds - elapsedSeconds);
  }, [session.status, session.level_started_at, session.time_remaining_seconds, currentLevel]);

  // Initialize and sync on changes
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
    if (session.status !== 'active') return;

    const interval = setInterval(() => {
      const newTime = calculateTimeRemaining();
      setTimeRemaining(newTime);

      // Time warnings
      if (newTime === 301) playAnnouncement('five_minutes');
      if (newTime === 61) playAnnouncement('one_minute');
      if (newTime === 11) playAnnouncement('ten_seconds');

      if (newTime <= 0) {
        const nextLevelData = blindStructure.find(b => b.level === session.current_level + 1);
        if (nextLevelData) {
          if (nextLevelData.is_break) {
            playAnnouncement('break_start');
          } else if (currentLevel?.is_break) {
            playAnnouncement('break_end');
          } else {
            playAnnouncement('blinds_up');
          }
          onUpdateSession({
            current_level: session.current_level + 1,
            time_remaining_seconds: nextLevelData.duration_minutes * 60,
            level_started_at: new Date().toISOString()
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, session.current_level, calculateTimeRemaining, blindStructure, onUpdateSession, playAnnouncement, currentLevel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBlind = (chips: number) => {
    if (blindsDisplayMode === 'cash' && chipToCashRatio > 0) {
      const value = chips * chipToCashRatio;
      if (value < 1) {
        return `${currencySymbol}${value.toFixed(2)}`;
      }
      return `${currencySymbol}${value.toFixed(2).replace(/\.00$/, '')}`;
    }
    return chips.toLocaleString();
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'text-red-500 animate-pulse';
    if (timeRemaining <= 60) return 'text-amber-400';
    return 'text-white';
  };

  if (!currentLevel) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-muted-foreground">No blind structure configured</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950">
      {/* Stats Bar - responsive with padding for overlay buttons and safe areas */}
      <div className="flex flex-wrap items-center justify-between px-4 pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-2 md:px-16 md:pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:pb-3 bg-black/40 backdrop-blur-sm border-b border-emerald-900/30 gap-2">
        <div className="flex items-center gap-3 md:gap-8">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium text-sm md:text-base">LIVE</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2 text-white/80">
            <span className="text-lg md:text-2xl font-bold text-white">{playersRemaining}</span>
            <span className="text-sm md:text-lg">/ {totalPlayers}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="text-center">
            <div className="text-xs md:text-sm text-amber-400/80 uppercase tracking-wider">Prize</div>
            <div className="text-lg md:text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
              {currencySymbol}{prizePool.toLocaleString()}
            </div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="text-xs md:text-sm text-white/60 uppercase tracking-wider">Avg Stack</div>
            <div className="text-lg md:text-2xl font-semibold text-white">
              {averageStack.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Timer Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8">
        {/* Level Badge */}
        <div className="mb-3 md:mb-6">
          {currentLevel.is_break ? (
            <div className="px-4 py-2 md:px-8 md:py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/30">
              <span className="text-lg md:text-3xl font-bold text-white tracking-wide">☕ BREAK</span>
            </div>
          ) : (
            <div className="px-4 py-2 md:px-8 md:py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30">
              <span className="text-lg md:text-3xl font-bold text-white tracking-wide">LEVEL {currentLevel.level}</span>
            </div>
          )}
        </div>

        {/* Timer - Responsive with clamp, scales from phone landscape to TV */}
        <div className={`text-[clamp(3rem,15vh,12rem)] font-mono font-black tracking-tight leading-none ${getTimerColor()} drop-shadow-2xl`}>
          {formatTime(timeRemaining)}
        </div>

        {/* Blinds Display - Responsive */}
        {!currentLevel.is_break && (
          <div className="mt-4 md:mt-8 flex flex-col items-center gap-2 md:gap-4">
            <div className="flex items-center gap-3 md:gap-6">
              <div className="text-center">
                <div className="text-xs md:text-lg text-blue-400 uppercase tracking-wider mb-0.5 md:mb-1">SB</div>
                <div className="text-[clamp(1.25rem,5vh,3.75rem)] font-bold text-blue-400">
                  {formatBlind(currentLevel.small_blind)}
                </div>
              </div>
              <div className="text-[clamp(1.5rem,4vh,3rem)] text-white/30 font-light">/</div>
              <div className="text-center">
                <div className="text-xs md:text-lg text-amber-400 uppercase tracking-wider mb-0.5 md:mb-1">BB</div>
                <div className="text-[clamp(1.25rem,5vh,3.75rem)] font-bold text-amber-400">
                  {formatBlind(currentLevel.big_blind)}
                </div>
              </div>
            </div>
            {currentLevel.ante > 0 && (
              <div className="text-center mt-1 md:mt-2">
                <span className="text-base md:text-xl text-rose-400">
                  Ante: <span className="font-bold">{formatBlind(currentLevel.ante)}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Next Level Preview - Responsive */}
        {nextLevel && (
          <div className="mt-6 md:mt-12 px-4 py-2 md:px-6 md:py-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-xs md:text-sm text-white/50 uppercase tracking-wider mb-0.5 md:mb-1">
              Next {nextLevel.is_break ? 'Break' : `Level ${nextLevel.level}`}
            </div>
            {nextLevel.is_break ? (
              <div className="text-base md:text-xl text-blue-400">☕ {nextLevel.duration_minutes} min break</div>
            ) : (
              <div className="text-base md:text-xl text-white/80">
                {formatBlind(nextLevel.small_blind)} / {formatBlind(nextLevel.big_blind)}
                {nextLevel.ante > 0 && (
                  <span className="text-rose-400 ml-2">(ante {formatBlind(nextLevel.ante)})</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar - Responsive */}
      <div className="mt-auto px-4 pb-4 md:pb-6">
        <div className="flex justify-between text-[10px] md:text-xs text-white/50 mb-1">
          <span>Progress</span>
          <span>Level {currentLevel.level} of {blindStructure.length}</span>
        </div>
        <div className="h-1.5 md:h-2 bg-black/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 rounded-full"
            style={{ 
              width: `${currentLevel ? ((currentLevel.duration_minutes * 60 - timeRemaining) / (currentLevel.duration_minutes * 60)) * 100 : 0}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}
