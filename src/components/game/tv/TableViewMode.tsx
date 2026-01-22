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
}

export function TableViewMode({
  session,
  blindStructure,
  players,
  prizePool,
  currencySymbol,
  playersRemaining,
  totalPlayers,
  onUpdateSession
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

  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'text-red-500 animate-pulse';
    if (timeRemaining <= 60) return 'text-amber-400';
    return 'text-white';
  };

  // Seat positions around oval table (10 seats)
  const seatPositions = [
    { top: '85%', left: '50%', transform: 'translate(-50%, -50%)' },   // 1 - bottom center
    { top: '75%', left: '20%', transform: 'translate(-50%, -50%)' },   // 2 - bottom left
    { top: '50%', left: '5%', transform: 'translate(-50%, -50%)' },    // 3 - left center
    { top: '25%', left: '20%', transform: 'translate(-50%, -50%)' },   // 4 - top left
    { top: '10%', left: '35%', transform: 'translate(-50%, -50%)' },   // 5 - top left-center
    { top: '10%', left: '65%', transform: 'translate(-50%, -50%)' },   // 6 - top right-center
    { top: '25%', left: '80%', transform: 'translate(-50%, -50%)' },   // 7 - top right
    { top: '50%', left: '95%', transform: 'translate(-50%, -50%)' },   // 8 - right center
    { top: '75%', left: '80%', transform: 'translate(-50%, -50%)' },   // 9 - bottom right
    { top: '85%', left: '50%', transform: 'translate(-50%, -50%)' },   // 10 - alternate bottom
  ];

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
      {/* Top Stats Bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/50 backdrop-blur-sm border-b border-emerald-900/30">
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
              <div className="text-2xl font-bold text-blue-400">{currentLevel.small_blind.toLocaleString()}</div>
            </div>
            <div className="text-2xl text-white/30">/</div>
            <div className="text-center">
              <div className="text-xs text-amber-400/80 uppercase">BB</div>
              <div className="text-2xl font-bold text-amber-400">{currentLevel.big_blind.toLocaleString()}</div>
            </div>
            {currentLevel.ante > 0 && (
              <>
                <div className="text-2xl text-white/30">+</div>
                <div className="text-center">
                  <div className="text-xs text-rose-400/80 uppercase">Ante</div>
                  <div className="text-2xl font-bold text-rose-400">{currentLevel.ante}</div>
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

      {/* Table Visualization */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-full max-w-5xl aspect-[2/1]">
          {/* Table */}
          <div className="absolute inset-8 rounded-[50%] bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 shadow-2xl">
            {/* Rail */}
            <div className="absolute inset-2 rounded-[50%] bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700" />
            {/* Felt */}
            <div className="absolute inset-4 rounded-[50%] bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-800 shadow-inner">
              {/* Felt pattern overlay */}
              <div className="absolute inset-0 rounded-[50%] opacity-30" 
                   style={{ backgroundImage: 'repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }} 
              />
              
              {/* Center Logo/Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-white/20 tracking-wider">HOME HOLD'EM</div>
                <div className="mt-4 text-6xl font-bold bg-gradient-to-r from-amber-300/50 via-yellow-400/50 to-amber-300/50 bg-clip-text text-transparent">
                  {currencySymbol}{prizePool.toLocaleString()}
                </div>
                <div className="text-xl text-white/30 mt-2">PRIZE POOL</div>
              </div>
            </div>
          </div>

          {/* Seats */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seatNum, index) => {
            const player = getPlayerAtSeat(seatNum);
            const badge = getSeatBadge(seatNum);
            const position = seatPositions[index];

            return (
              <div
                key={seatNum}
                className="absolute"
                style={position}
              >
                {player ? (
                  <div className={`relative flex flex-col items-center p-3 rounded-xl backdrop-blur-sm transition-all ${
                    badge?.label === 'D' ? 'bg-white/20 ring-2 ring-white/50' :
                    badge?.label === 'SB' ? 'bg-blue-500/20 ring-2 ring-blue-400/50' :
                    badge?.label === 'BB' ? 'bg-amber-500/20 ring-2 ring-amber-400/50' :
                    'bg-black/40'
                  }`}>
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                      {player.display_name.charAt(0).toUpperCase()}
                    </div>
                    {/* Name */}
                    <div className="mt-1 text-sm font-medium text-white max-w-[100px] truncate">
                      {player.display_name}
                    </div>
                    {/* Position Badge */}
                    {badge && (
                      <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${badge.color}`}>
                        {badge.label}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-sm">
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
              Level {nextLevel.level}: {nextLevel.small_blind}/{nextLevel.big_blind}
              {nextLevel.ante > 0 && <span className="text-rose-400 ml-2">(ante {nextLevel.ante})</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
