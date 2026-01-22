import { useEffect, useState } from 'react';
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

interface ClassicTimerModeProps {
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
  chipToCashRatio = 0.01
}: ClassicTimerModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { playAnnouncement } = useTournamentSounds();

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);

  // Initialize and manage timer
  useEffect(() => {
    if (session.time_remaining_seconds !== null) {
      setTimeRemaining(session.time_remaining_seconds);
    } else if (currentLevel) {
      setTimeRemaining(currentLevel.duration_minutes * 60);
    }
  }, [session.current_level, session.time_remaining_seconds, currentLevel]);

  useEffect(() => {
    if (session.status !== 'active') return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Level complete - auto advance
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
          return 0;
        }

        // Time warnings
        if (prev === 61) playAnnouncement('one_minute');
        if (prev === 11) playAnnouncement('ten_seconds');

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, session.current_level, blindStructure, onUpdateSession, playAnnouncement, currentLevel]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBlind = (chips: number) => {
    if (session.display_blinds_as_currency && chipToCashRatio > 0) {
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
      {/* Stats Bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/40 backdrop-blur-sm border-b border-emerald-900/30">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">LIVE</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <span className="text-2xl font-bold text-white">{playersRemaining}</span>
            <span className="text-lg">/ {totalPlayers} Players</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-sm text-amber-400/80 uppercase tracking-wider">Prize Pool</div>
            <div className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
              {currencySymbol}{prizePool.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/60 uppercase tracking-wider">Avg Stack</div>
            <div className="text-2xl font-semibold text-white">
              {averageStack.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Timer Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Level Badge */}
        <div className="mb-6">
          {currentLevel.is_break ? (
            <div className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/30">
              <span className="text-3xl font-bold text-white tracking-wide">☕ BREAK</span>
            </div>
          ) : (
            <div className="px-8 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30">
              <span className="text-3xl font-bold text-white tracking-wide">LEVEL {currentLevel.level}</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className={`text-[12rem] font-mono font-black tracking-tight leading-none ${getTimerColor()} drop-shadow-2xl`}>
          {formatTime(timeRemaining)}
        </div>

        {/* Blinds Display */}
        {!currentLevel.is_break && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg text-blue-400 uppercase tracking-wider mb-1">Small Blind</div>
                <div className="text-6xl font-bold text-blue-400">
                  {formatBlind(currentLevel.small_blind)}
                </div>
              </div>
              <div className="text-5xl text-white/30 font-light">/</div>
              <div className="text-center">
                <div className="text-lg text-amber-400 uppercase tracking-wider mb-1">Big Blind</div>
                <div className="text-6xl font-bold text-amber-400">
                  {formatBlind(currentLevel.big_blind)}
                </div>
              </div>
            </div>
            {currentLevel.ante > 0 && (
              <div className="text-center mt-2">
                <span className="text-xl text-rose-400">
                  Ante: <span className="font-bold">{formatBlind(currentLevel.ante)}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Next Level Preview */}
        {nextLevel && (
          <div className="mt-12 px-6 py-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="text-sm text-white/50 uppercase tracking-wider mb-1">
              Next {nextLevel.is_break ? 'Break' : `Level ${nextLevel.level}`}
            </div>
            {nextLevel.is_break ? (
              <div className="text-xl text-blue-400">☕ {nextLevel.duration_minutes} minute break</div>
            ) : (
              <div className="text-xl text-white/80">
                {formatBlind(nextLevel.small_blind)} / {formatBlind(nextLevel.big_blind)}
                {nextLevel.ante > 0 && (
                  <span className="text-rose-400 ml-2">(ante {formatBlind(nextLevel.ante)})</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-black/50">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
          style={{ 
            width: `${currentLevel ? ((currentLevel.duration_minutes * 60 - timeRemaining) / (currentLevel.duration_minutes * 60)) * 100 : 0}%` 
          }}
        />
      </div>
    </div>
  );
}
