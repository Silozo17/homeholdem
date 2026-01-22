import { useEffect, useState } from 'react';
import { Trophy, Users, Coins, TrendingUp } from 'lucide-react';
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

interface DashboardModeProps {
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

export function DashboardMode({
  session,
  blindStructure,
  players,
  transactions,
  prizePool,
  currencySymbol,
  onUpdateSession,
  payouts = [],
  chipToCashRatio = 0.01
}: DashboardModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { playAnnouncement } = useTournamentSounds();

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);
  const activePlayers = players.filter(p => p.status === 'active');
  const eliminatedPlayers = players.filter(p => p.status === 'eliminated').sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));

  // Calculate player buy-in totals for ranking
  const playerTotals = activePlayers.map(player => {
    const playerTxns = transactions.filter(t => t.game_player_id === player.id);
    const total = playerTxns.reduce((sum, t) => sum + t.amount, 0);
    return { ...player, totalBuyIn: total };
  }).sort((a, b) => b.totalBuyIn - a.totalBuyIn);

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

  const totalLevels = blindStructure.length;
  const progressPercent = (session.current_level / totalLevels) * 100;

  // Calculate next break
  const nextBreak = blindStructure.find(b => b.level > session.current_level && b.is_break);
  const levelsUntilBreak = nextBreak ? nextBreak.level - session.current_level : null;

  if (!currentLevel) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-2xl text-muted-foreground">No blind structure configured</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950">
      {/* Left Side - Timer */}
      <div className="flex-1 flex flex-col p-8 pt-16">
        {/* Level Badge */}
        <div className="mb-4">
          {currentLevel.is_break ? (
            <div className="inline-flex px-6 py-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600">
              <span className="text-xl font-bold text-white">☕ BREAK TIME</span>
            </div>
          ) : (
            <div className="inline-flex px-6 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600">
              <span className="text-xl font-bold text-white">LEVEL {currentLevel.level}</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className={`text-[10rem] font-mono font-black tracking-tight leading-none ${getTimerColor()}`}>
          {formatTime(timeRemaining)}
        </div>

        {/* Blinds */}
        {!currentLevel.is_break && (
          <div className="mt-6 flex items-baseline gap-4">
            <span className="text-5xl font-bold text-blue-400">{formatBlind(currentLevel.small_blind)}</span>
            <span className="text-4xl text-white/30">/</span>
            <span className="text-5xl font-bold text-amber-400">{formatBlind(currentLevel.big_blind)}</span>
            {currentLevel.ante > 0 && (
              <span className="text-2xl text-rose-400 ml-4">(ante {formatBlind(currentLevel.ante)})</span>
            )}
          </div>
        )}

        {/* Next Level */}
        {nextLevel && (
          <div className="mt-6 text-lg text-white/60">
            Next: {nextLevel.is_break ? '☕ Break' : `${formatBlind(nextLevel.small_blind)}/${formatBlind(nextLevel.big_blind)}`}
            {nextLevel.ante > 0 && !nextLevel.is_break && ` (ante ${formatBlind(nextLevel.ante)})`}
          </div>
        )}

        {/* Tournament Progress */}
        <div className="mt-auto pb-6">
          <div className="flex items-center justify-between text-sm text-white/60 mb-2">
            <span>Tournament Progress</span>
            <span>Level {session.current_level} of {totalLevels}</span>
          </div>
          <div className="h-3 rounded-full bg-black/50 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {levelsUntilBreak && levelsUntilBreak > 0 && (
            <div className="mt-2 text-sm text-blue-400">
              ☕ Break in {levelsUntilBreak} level{levelsUntilBreak > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Stats */}
      <div className="w-[400px] bg-black/40 backdrop-blur-sm border-l border-white/10 flex flex-col">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 p-4 border-b border-white/10">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Players</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {activePlayers.length}<span className="text-lg text-white/40">/{players.length}</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Coins className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Prize Pool</span>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
              {currencySymbol}{prizePool.toLocaleString()}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 col-span-2">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Average Stack</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {activePlayers.length > 0 
                ? Math.round(prizePool / activePlayers.length * 100).toLocaleString() 
                : 0} chips
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" /> Active Players
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {playerTotals.map((player, index) => (
              <div 
                key={player.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-amber-500 text-black' : 
                    index === 1 ? 'bg-slate-400 text-black' : 
                    index === 2 ? 'bg-amber-700 text-white' : 
                    'bg-white/10 text-white/60'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-white font-medium">{player.display_name}</span>
                </div>
                {player.table_number && player.seat_number && (
                  <span className="text-xs text-white/40">T{player.table_number} S{player.seat_number}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payouts */}
        {payouts.length > 0 && (
          <div className="border-t border-white/10">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Payouts
              </h3>
            </div>
            <div className="p-2">
              {payouts.slice(0, 4).map((payout) => (
                <div 
                  key={payout.position}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      payout.position === 1 ? 'bg-amber-500 text-black' : 
                      payout.position === 2 ? 'bg-slate-400 text-black' : 
                      payout.position === 3 ? 'bg-amber-700 text-white' : 
                      'bg-white/10 text-white/60'
                    }`}>
                      {payout.position}
                    </div>
                    <span className="text-white/60 text-sm">{payout.percentage}%</span>
                  </div>
                  <span className="text-amber-400 font-semibold">
                    {currencySymbol}{(payout.amount || (prizePool * payout.percentage / 100)).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
