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

interface GamePlayer {
  id: string;
  display_name: string;
  status: string;
  finish_position: number | null;
  table_number: number | null;
  seat_number: number | null;
  avatar_url?: string | null;
}

interface TableViewModeProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  players: GamePlayer[];
  prizePool: number;
  currencySymbol: string;
  playersRemaining: number;
  totalPlayers: number;
  onUpdateSession: (updates: Partial<GameSession>) => void;
  chipToCashRatio?: number;
}

export function TableViewMode({
  session,
  blindStructure,
  players,
  prizePool,
  currencySymbol,
  playersRemaining,
  totalPlayers,
  onUpdateSession,
  chipToCashRatio = 0.01
}: TableViewModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { playAnnouncement } = useTournamentSounds();

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);
  const activePlayers = players.filter(p => p.status === 'active');

  // Determine dealer position (rotates with level)
  const seatedPlayers = activePlayers.filter(p => p.seat_number !== null).sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0));
  const dealerIndex = session.current_level % Math.max(seatedPlayers.length, 1);
  const dealerSeat = seatedPlayers[dealerIndex]?.seat_number || 1;
  const sbSeat = seatedPlayers[(dealerIndex + 1) % seatedPlayers.length]?.seat_number;
  const bbSeat = seatedPlayers[(dealerIndex + 2) % seatedPlayers.length]?.seat_number;

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
        if (prev === 301) playAnnouncement('five_minutes');
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

  // Seat positions: 2 on each end, 3 on top, 3 on bottom (classic 10-player layout)
  const seatPositionsBySeat: Record<number, { top: string; left: string; transform: string }> = {
    // Bottom row (3 seats)
    1:  { top: '95%', left: '30%', transform: 'translate(-50%, -50%)' },
    10: { top: '95%', left: '50%', transform: 'translate(-50%, -50%)' },
    9:  { top: '95%', left: '70%', transform: 'translate(-50%, -50%)' },
    // Left end (2 seats stacked)
    2:  { top: '65%', left: '2%', transform: 'translate(-50%, -50%)' },
    3:  { top: '35%', left: '2%', transform: 'translate(-50%, -50%)' },
    // Top row (3 seats)
    4:  { top: '5%', left: '30%', transform: 'translate(-50%, -50%)' },
    5:  { top: '5%', left: '50%', transform: 'translate(-50%, -50%)' },
    6:  { top: '5%', left: '70%', transform: 'translate(-50%, -50%)' },
    // Right end (2 seats stacked)
    7:  { top: '35%', left: '98%', transform: 'translate(-50%, -50%)' },
    8:  { top: '65%', left: '98%', transform: 'translate(-50%, -50%)' },
  };

  const getPlayerAtSeat = (seatNum: number) => {
    return activePlayers.find(p => p.seat_number === seatNum);
  };

  const getSeatBadge = (seatNum: number) => {
    if (seatNum === dealerSeat) return { label: 'D', color: 'bg-white text-black' };
    if (seatNum === sbSeat) return { label: 'SB', color: 'bg-blue-500 text-white' };
    if (seatNum === bbSeat) return { label: 'BB', color: 'bg-amber-500 text-black' };
    return null;
  };

  if (!currentLevel) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-muted-foreground">No blind structure configured</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950 overflow-hidden">
      {/* Top Stats Bar - with padding for overlay buttons */}
      <div className="flex items-center justify-between pl-20 pr-20 py-4 bg-black/50 backdrop-blur-sm border-b border-emerald-900/30">
        {/* Timer */}
        <div className="flex items-center gap-6">
          <div>
            {currentLevel.is_break ? (
              <span className="text-xl font-bold text-blue-400">☕ BREAK</span>
            ) : (
              <span className="text-xl font-bold text-emerald-400">LEVEL {currentLevel.level}</span>
            )}
          </div>
          <div className={`text-5xl font-mono font-black ${getTimerColor()}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>

        {/* Blinds */}
        {!currentLevel.is_break && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-blue-400/80 uppercase">SB</div>
              <div className="text-2xl font-bold text-blue-400">{formatBlind(currentLevel.small_blind)}</div>
            </div>
            <div className="text-2xl text-white/30">/</div>
            <div className="text-center">
              <div className="text-xs text-amber-400/80 uppercase">BB</div>
              <div className="text-2xl font-bold text-amber-400">{formatBlind(currentLevel.big_blind)}</div>
            </div>
            {currentLevel.ante > 0 && (
              <>
                <div className="text-2xl text-white/30">+</div>
                <div className="text-center">
                  <div className="text-xs text-rose-400/80 uppercase">Ante</div>
                  <div className="text-2xl font-bold text-rose-400">{formatBlind(currentLevel.ante)}</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-white/50 uppercase">Players</div>
            <div className="text-2xl font-bold text-white">{playersRemaining}/{totalPlayers}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-amber-400/80 uppercase">Prize Pool</div>
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
              {currencySymbol}{prizePool.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Table Visualization - Pill/Racetrack Shape */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="relative w-full max-w-5xl aspect-[2.5/1]">
          {/* Outer Rail - Pill Shape */}
          <div className="absolute inset-4 md:inset-8 rounded-full bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 shadow-2xl shadow-amber-950/50">
            {/* Inner Rail */}
            <div className="absolute inset-2 md:inset-3 rounded-full bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700" />
            {/* Felt Surface */}
            <div className="absolute inset-3 md:inset-5 rounded-full bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-800 shadow-inner overflow-hidden">
              {/* Felt pattern overlay */}
              <div className="absolute inset-0 opacity-20" 
                   style={{ 
                     backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 0, transparent 1px, rgba(0,0,0,0.1) 1px, rgba(0,0,0,0.1) 2px)',
                     backgroundSize: '8px 8px'
                   }} 
              />
              
              {/* Club name - small at top */}
              <div className="absolute top-3 md:top-6 left-1/2 -translate-x-1/2 text-base md:text-xl font-bold text-white/15 tracking-[0.2em]">
                HOME HOLD'EM
              </div>
              
              {/* Betting Area / Community Cards Zone */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  {/* Top text (upside down for far players) */}
                  <div className="text-[10px] md:text-sm text-amber-400/30 tracking-[0.25em] font-semibold rotate-180 mb-2 md:mb-4">
                    NO LIMIT TEXAS HOLD'EM
                  </div>
                  
                  {/* Card outlines with hearts */}
                  <div className="flex items-center gap-2 md:gap-4">
                    {/* Left heart */}
                    <span className="text-red-500/40 text-xl md:text-3xl">♥</span>
                    
                    {/* 5 Card placeholders */}
                    <div className="flex gap-1 md:gap-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div 
                          key={i}
                          className="w-6 h-9 md:w-10 md:h-14 rounded border-2 border-dashed border-white/20 bg-black/10"
                        />
                      ))}
                    </div>
                    
                    {/* Right heart */}
                    <span className="text-red-500/40 text-xl md:text-3xl">♥</span>
                  </div>
                  
                  {/* Bottom text */}
                  <div className="text-[10px] md:text-sm text-amber-400/30 tracking-[0.25em] font-semibold mt-2 md:mt-4">
                    NO LIMIT TEXAS HOLD'EM
                  </div>
                </div>
              </div>
              
              {/* Prize pool - positioned below betting area */}
              <div className="absolute bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 text-center">
                <div className="text-lg md:text-3xl font-bold bg-gradient-to-r from-amber-300/50 via-yellow-400/50 to-amber-300/50 bg-clip-text text-transparent">
                  {currencySymbol}{prizePool.toLocaleString()}
                </div>
                <div className="text-[10px] md:text-xs text-white/25 tracking-wider">PRIZE POOL</div>
              </div>
            </div>
          </div>

          {/* Seats */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seatNum) => {
            const player = getPlayerAtSeat(seatNum);
            const badge = getSeatBadge(seatNum);
            const position = seatPositionsBySeat[seatNum];

            return (
              <div
                key={seatNum}
                className="absolute"
                style={position}
              >
              {player ? (
                  <div className={`relative flex flex-col items-center p-2 md:p-3 rounded-xl backdrop-blur-sm transition-all ${
                    badge?.label === 'D' ? 'bg-white/20 ring-2 ring-white/50' :
                    badge?.label === 'SB' ? 'bg-blue-500/20 ring-2 ring-blue-400/50' :
                    badge?.label === 'BB' ? 'bg-amber-500/20 ring-2 ring-amber-400/50' :
                    'bg-black/40'
                  }`}>
                    {/* Avatar - circular with profile image */}
                    {player.avatar_url ? (
                      <img 
                        src={player.avatar_url} 
                        alt={player.display_name}
                        className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover border-2 border-white/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-base md:text-lg font-bold text-white shadow-lg border-2 border-white/20">
                        {player.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Name */}
                    <div className="mt-1 text-xs md:text-sm font-medium text-white max-w-[80px] md:max-w-[100px] truncate">
                      {player.display_name}
                    </div>
                    {/* Position Badge */}
                    {badge && (
                      <div className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shadow-lg ${badge.color}`}>
                        {badge.label}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-xs md:text-sm">
                    {seatNum}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Level Preview */}
      {nextLevel && (
        <div className="px-8 py-4 bg-black/30 border-t border-white/10 flex items-center justify-center gap-4">
          <span className="text-white/50">NEXT:</span>
          {nextLevel.is_break ? (
            <span className="text-blue-400 font-semibold">☕ {nextLevel.duration_minutes} min break</span>
          ) : (
            <span className="text-white font-semibold">
              Level {nextLevel.level}: {formatBlind(nextLevel.small_blind)}/{formatBlind(nextLevel.big_blind)}
              {nextLevel.ante > 0 && <span className="text-rose-400 ml-2">(ante {formatBlind(nextLevel.ante)})</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
