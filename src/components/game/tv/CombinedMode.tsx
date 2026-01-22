import { useEffect, useState } from 'react';
import { useTournamentSounds } from '@/hooks/useTournamentSounds';
import { Trophy, Users, Coins, TrendingUp } from 'lucide-react';

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
  starting_chips: number;
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

interface CombinedModeProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  players: GamePlayer[];
  transactions: GameTransaction[];
  prizePool: number;
  currencySymbol: string;
  onUpdateSession: (updates: Partial<GameSession>) => void;
  payouts?: PayoutStructure[];
  chipToCashRatio?: number;
}

export function CombinedMode({
  session,
  blindStructure,
  players,
  transactions,
  prizePool,
  currencySymbol,
  onUpdateSession,
  payouts = [],
  chipToCashRatio = 0.01
}: CombinedModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { playAnnouncement } = useTournamentSounds();

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);
  const activePlayers = players.filter(p => p.status === 'active');
  const eliminatedPlayers = players.filter(p => p.status === 'eliminated');
  const totalLevels = blindStructure.length;
  const progressPercent = ((session.current_level - 1) / Math.max(totalLevels - 1, 1)) * 100;

  // Calculate totals
  const totalBuyIns = transactions.filter(t => t.transaction_type === 'buyin').length;
  const totalRebuys = transactions.filter(t => t.transaction_type === 'rebuy').length;
  const totalAddons = transactions.filter(t => t.transaction_type === 'addon').length;
  const totalChipsInPlay = activePlayers.length * session.starting_chips + 
    totalRebuys * (transactions.find(t => t.transaction_type === 'rebuy')?.chips || session.starting_chips) +
    totalAddons * (transactions.find(t => t.transaction_type === 'addon')?.chips || 0);
  const averageStack = activePlayers.length > 0 ? Math.round(totalChipsInPlay / activePlayers.length) : 0;

  // Dealer positions
  const seatedPlayers = activePlayers.filter(p => p.seat_number !== null).sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0));
  const dealerIndex = session.current_level % Math.max(seatedPlayers.length, 1);
  const dealerSeat = seatedPlayers[dealerIndex]?.seat_number || 1;
  const sbSeat = seatedPlayers[(dealerIndex + 1) % seatedPlayers.length]?.seat_number;
  const bbSeat = seatedPlayers[(dealerIndex + 2) % seatedPlayers.length]?.seat_number;

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
        if (prev === 61) playAnnouncement('one_minute');
        if (prev === 11) playAnnouncement('ten_seconds');
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
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, session.current_level, blindStructure, onUpdateSession, playAnnouncement, currentLevel?.is_break]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBlind = (chips: number) => {
    if (session.display_blinds_as_currency) {
      const cashValue = chips * chipToCashRatio;
      return `${currencySymbol}${cashValue.toFixed(2)}`;
    }
    return chips.toLocaleString();
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'text-red-500 animate-pulse';
    if (timeRemaining <= 60) return 'text-amber-400';
    return 'text-white';
  };

  // Seat positions for mini table (pill shape)
  const seatPositions: Record<number, { x: number; y: number }> = {
    1: { x: 30, y: 90 }, 10: { x: 50, y: 95 }, 9: { x: 70, y: 90 },
    2: { x: 8, y: 65 }, 3: { x: 8, y: 35 },
    4: { x: 30, y: 10 }, 5: { x: 50, y: 5 }, 6: { x: 70, y: 10 },
    7: { x: 92, y: 35 }, 8: { x: 92, y: 65 },
  };

  const getPlayerAtSeat = (seatNum: number) => {
    return activePlayers.find(p => p.seat_number === seatNum);
  };

  const getSeatBadge = (seatNum: number) => {
    if (seatNum === dealerSeat) return 'D';
    if (seatNum === sbSeat) return 'SB';
    if (seatNum === bbSeat) return 'BB';
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
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-16 py-3 bg-black/40 backdrop-blur-sm border-b border-emerald-900/30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-semibold">LIVE</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Users className="w-4 h-4" />
            <span>{activePlayers.length}/{players.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-white/50">Prize Pool</div>
            <div className="text-lg font-bold text-emerald-400">{currencySymbol}{prizePool.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/50">Avg Stack</div>
            <div className="text-lg font-bold text-white">{averageStack.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Timer & Blinds */}
        <div className="w-[35%] flex flex-col p-6 border-r border-white/10">
          {/* Level Badge */}
          <div className="mb-2">
            {currentLevel.is_break ? (
              <div className="inline-flex px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600">
                <span className="text-lg font-bold text-white">☕ BREAK</span>
              </div>
            ) : (
              <div className="inline-flex px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600">
                <span className="text-lg font-bold text-white">LEVEL {currentLevel.level}</span>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className={`text-7xl font-mono font-black tracking-tight leading-none ${getTimerColor()}`}>
            {formatTime(timeRemaining)}
          </div>

          {/* Blinds */}
          {!currentLevel.is_break && (
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-400">{formatBlind(currentLevel.small_blind)}</span>
              <span className="text-2xl text-white/30">/</span>
              <span className="text-3xl font-bold text-amber-400">{formatBlind(currentLevel.big_blind)}</span>
              {currentLevel.ante > 0 && (
                <span className="text-lg text-rose-400 ml-2">(ante {formatBlind(currentLevel.ante)})</span>
              )}
            </div>
          )}

          {/* Next Level */}
          {nextLevel && (
            <div className="mt-3 text-sm text-white/60">
              Next: {nextLevel.is_break ? '☕ Break' : `${formatBlind(nextLevel.small_blind)}/${formatBlind(nextLevel.big_blind)}`}
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-auto grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/50 mb-1">Buy-ins</div>
              <div className="text-xl font-bold text-white">{totalBuyIns}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-xs text-white/50 mb-1">Rebuys</div>
              <div className="text-xl font-bold text-white">{totalRebuys}</div>
            </div>
          </div>
        </div>

        {/* Center Column - Mini Table View */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md aspect-[2.5/1]">
            {/* Outer Rail */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 shadow-2xl" />
            {/* Inner Rail */}
            <div className="absolute inset-[4%] rounded-full bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700" />
            {/* Felt Surface */}
            <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-800 shadow-inner" />
            
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-emerald-300/40 text-xs font-medium tracking-[0.3em]">NO LIMIT</div>
                <div className="text-emerald-300/60 text-sm font-bold tracking-wider">TEXAS HOLD'EM</div>
              </div>
            </div>

            {/* Seats */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(seatNum => {
              const pos = seatPositions[seatNum];
              const player = getPlayerAtSeat(seatNum);
              const badge = getSeatBadge(seatNum);

              return (
                <div
                  key={seatNum}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  {player ? (
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                        badge === 'D' ? 'bg-white text-black' : 'bg-slate-800 text-white border-2 border-emerald-500/50'
                      }`}>
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          player.display_name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      {badge && badge !== 'D' && (
                        <span className={`absolute -bottom-1 -right-1 px-1 py-0.5 rounded text-[8px] font-bold ${
                          badge === 'SB' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-black'
                        }`}>
                          {badge}
                        </span>
                      )}
                      {badge === 'D' && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[8px] font-bold rounded-full flex items-center justify-center shadow">
                          D
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-900/60 border border-white/10 flex items-center justify-center text-[10px] text-white/30">
                      {seatNum}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column - Players & Payouts */}
        <div className="w-[25%] flex flex-col p-4 border-l border-white/10 overflow-hidden">
          {/* Active Players */}
          <div className="flex-1 overflow-hidden">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Users className="w-3 h-3" /> Active ({activePlayers.length})
            </h3>
            <div className="space-y-1 overflow-y-auto max-h-40">
              {activePlayers.slice(0, 8).map((player, idx) => (
                <div key={player.id} className="flex items-center gap-2 py-1 px-2 bg-white/5 rounded text-sm">
                  <span className="text-white/50 w-4">{idx + 1}</span>
                  <span className="text-white truncate">{player.display_name}</span>
                </div>
              ))}
              {activePlayers.length > 8 && (
                <div className="text-xs text-white/40 px-2">+{activePlayers.length - 8} more</div>
              )}
            </div>
          </div>

          {/* Payouts */}
          {payouts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Trophy className="w-3 h-3" /> Payouts
              </h3>
              <div className="space-y-1">
                {payouts.slice(0, 4).map(payout => (
                  <div key={payout.position} className="flex items-center justify-between text-sm">
                    <span className={`${payout.position === 1 ? 'text-amber-400' : payout.position === 2 ? 'text-slate-300' : payout.position === 3 ? 'text-amber-600' : 'text-white/60'}`}>
                      {payout.position === 1 ? '🥇' : payout.position === 2 ? '🥈' : payout.position === 3 ? '🥉' : `${payout.position}th`}
                    </span>
                    <span className="text-white font-medium">
                      {currencySymbol}{(payout.amount || (prizePool * payout.percentage / 100)).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-4">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>Tournament Progress</span>
          <span>Level {session.current_level} of {totalLevels}</span>
        </div>
        <div className="h-2 bg-black/50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
