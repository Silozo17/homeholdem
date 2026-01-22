import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Users, Trophy, Coins, Clock, ChevronRight } from 'lucide-react';

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
  starting_chips?: number;
}

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  table_number: number | null;
  seat_number: number | null;
  status: string;
  finish_position: number | null;
}

interface TVDisplayProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  players: GamePlayer[];
  prizePool: number;
  currencySymbol: string;
  onExit: () => void;
}

export function TVDisplay({
  session,
  blindStructure,
  players,
  prizePool,
  currencySymbol,
  onExit,
}: TVDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [dealerSeat, setDealerSeat] = useState(1);

  const currentLevel = blindStructure.find(b => b.level === session.current_level);
  const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);
  const activePlayers = players.filter(p => p.status === 'active');
  const seatedPlayers = activePlayers.filter(p => p.seat_number !== null);
  
  // Calculate average stack
  const totalChips = activePlayers.length * (session.starting_chips || 10000);
  const avgStack = activePlayers.length > 0 ? Math.round(totalChips / activePlayers.length) : 0;

  // Initialize and run timer
  useEffect(() => {
    if (session.time_remaining_seconds !== null) {
      setTimeRemaining(session.time_remaining_seconds);
    } else if (currentLevel) {
      setTimeRemaining(currentLevel.duration_minutes * 60);
    }
  }, [session.current_level, session.time_remaining_seconds, currentLevel]);

  useEffect(() => {
    if (session.status === 'active') {
      const interval = setInterval(() => {
        setTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session.status]);

  // Rotate dealer button every level change
  useEffect(() => {
    if (seatedPlayers.length > 0) {
      const seats = seatedPlayers.map(p => p.seat_number!).sort((a, b) => a - b);
      const currentIdx = session.current_level % seats.length;
      setDealerSeat(seats[currentIdx]);
    }
  }, [session.current_level, seatedPlayers]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 60;
  const isVeryLowTime = timeRemaining <= 10;

  // Get SB and BB seats (next two after dealer)
  const getPositionSeats = () => {
    if (seatedPlayers.length < 2) return { sb: null, bb: null };
    const seats = seatedPlayers.map(p => p.seat_number!).sort((a, b) => a - b);
    const dealerIdx = seats.indexOf(dealerSeat);
    if (dealerIdx === -1) return { sb: seats[0], bb: seats[1] };
    
    const sbIdx = (dealerIdx + 1) % seats.length;
    const bbIdx = (dealerIdx + 2) % seats.length;
    return { sb: seats[sbIdx], bb: seats[bbIdx] };
  };

  const { sb: sbSeat, bb: bbSeat } = getPositionSeats();

  // Calculate seat positions for oval table (10 seats max)
  const getSeatPositions = (numSeats: number = 10) => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < numSeats; i++) {
      const angle = (i / numSeats) * 2 * Math.PI - Math.PI / 2;
      const x = 50 + 42 * Math.cos(angle);
      const y = 50 + 38 * Math.sin(angle);
      positions.push({ x, y });
    }
    return positions;
  };

  const seatPositions = getSeatPositions(10);

  const getPlayerAtSeat = (seatNum: number) => {
    return seatedPlayers.find(p => p.seat_number === seatNum);
  };

  if (!currentLevel) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center" onClick={onExit}>
        <p className="text-muted-foreground">No blind structure configured</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#0a0a0a] flex flex-col cursor-pointer overflow-hidden"
      onClick={onExit}
    >
      {/* Top Stats Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/50 border-b border-border/20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-lg font-medium">{activePlayers.length} Players</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-lg font-medium text-gold-gradient">
              {currencySymbol}{prizePool.toLocaleString()} Prize Pool
            </span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg text-muted-foreground">Avg: {avgStack.toLocaleString()}</span>
          </div>
          <div className="text-sm text-muted-foreground">Tap to exit</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Side - Timer & Blinds */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Level */}
          <div className={cn(
            "text-2xl uppercase tracking-widest mb-4",
            currentLevel.is_break ? "text-yellow-500" : "text-muted-foreground"
          )}>
            {currentLevel.is_break ? '☕ BREAK' : `LEVEL ${currentLevel.level}`}
          </div>

          {/* Timer */}
          <div className={cn(
            "font-mono font-bold text-[10rem] leading-none mb-6 transition-colors",
            isVeryLowTime && "text-destructive animate-pulse",
            isLowTime && !isVeryLowTime && "text-yellow-500",
            !isLowTime && "text-foreground"
          )}>
            {formatTime(timeRemaining)}
          </div>

          {/* Blinds */}
          {!currentLevel.is_break && (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4 text-5xl font-bold">
                <span className="text-blue-400">{currentLevel.small_blind.toLocaleString()}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-yellow-400">{currentLevel.big_blind.toLocaleString()}</span>
              </div>
              {currentLevel.ante > 0 && (
                <div className="text-2xl text-muted-foreground">
                  Ante: <span className="text-red-400">{currentLevel.ante.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Next Level */}
          {nextLevel && (
            <div className="mt-8 flex items-center gap-2 text-xl text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span>Next:</span>
              {nextLevel.is_break ? (
                <span className="text-yellow-500">Break</span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-blue-400/70">{nextLevel.small_blind.toLocaleString()}</span>
                  <span>/</span>
                  <span className="text-yellow-400/70">{nextLevel.big_blind.toLocaleString()}</span>
                  {nextLevel.ante > 0 && (
                    <span className="text-red-400/70 ml-2">(ante {nextLevel.ante.toLocaleString()})</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Table Visualization */}
        <div className="w-[45%] flex items-center justify-center p-8">
          <div className="relative w-full max-w-lg aspect-[4/3]">
            {/* Table Felt */}
            <div className="absolute inset-[5%] rounded-[50%] bg-emerald-800 border-4 border-amber-900 shadow-2xl" />
            <div className="absolute inset-[7%] rounded-[50%] border border-emerald-600/30" />

            {/* Center info */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-xs uppercase tracking-wider text-emerald-300/50 mb-1">Pot</div>
              <div className="text-2xl font-bold text-gold-gradient">
                {currencySymbol}{prizePool.toLocaleString()}
              </div>
            </div>

            {/* Seats */}
            {seatPositions.map((pos, idx) => {
              const seatNum = idx + 1;
              const player = getPlayerAtSeat(seatNum);
              const isDealer = seatNum === dealerSeat;
              const isSB = seatNum === sbSeat;
              const isBB = seatNum === bbSeat;
              const isOccupied = !!player;

              return (
                <div
                  key={seatNum}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Position Badge */}
                  {isOccupied && (isDealer || isSB || isBB) && (
                    <div className={cn(
                      "absolute -top-6 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      isDealer && "bg-white text-black",
                      isSB && "bg-blue-500 text-white",
                      isBB && "bg-yellow-500 text-black"
                    )}>
                      {isDealer ? 'D' : isSB ? 'SB' : 'BB'}
                    </div>
                  )}

                  {/* Seat Circle */}
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all",
                    isOccupied
                      ? "bg-primary border-primary text-primary-foreground shadow-lg"
                      : "bg-muted/30 border-border/30 text-muted-foreground/50"
                  )}>
                    {isOccupied ? (
                      <span className="truncate px-1">
                        {player.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    ) : (
                      <span className="opacity-30">{seatNum}</span>
                    )}
                  </div>

                  {/* Player Name */}
                  {isOccupied && (
                    <div className="absolute -bottom-5 text-[10px] text-muted-foreground whitespace-nowrap max-w-[80px] truncate">
                      {player.display_name.split(' ')[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-center gap-8 py-4 bg-black/50 border-t border-border/20">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[8px] font-bold text-black">D</div>
          <span className="text-sm text-muted-foreground">Dealer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">SB</div>
          <span className="text-sm text-muted-foreground">Small Blind ({currentLevel.is_break ? '-' : currentLevel.small_blind.toLocaleString()})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[8px] font-bold text-black">BB</div>
          <span className="text-sm text-muted-foreground">Big Blind ({currentLevel.is_break ? '-' : currentLevel.big_blind.toLocaleString()})</span>
        </div>
        {currentLevel.ante > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-sm text-muted-foreground">Ante ({currentLevel.ante.toLocaleString()})</span>
          </div>
        )}
      </div>
    </div>
  );
}
