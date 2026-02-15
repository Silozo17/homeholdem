import { useMemo, useState, useEffect, useCallback } from 'react';
import { GameState } from '@/lib/poker/types';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { PlayerSeat } from './PlayerSeat';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { WinnerOverlay } from './WinnerOverlay';
import { TableFelt } from './TableFelt';
import { DealerCharacter } from './DealerCharacter';
import { TurnTimer } from './TurnTimer';
import { usePokerSounds, PokerSoundEvent } from '@/hooks/usePokerSounds';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import leatherBg from '@/assets/leather-bg.jpg';

interface PokerTableProProps {
  state: GameState;
  isHumanTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  maxBet: number;
  onAction: (action: any) => void;
  onNextHand: () => void;
  onQuit: () => void;
}

const SEAT_POSITIONS: Record<number, { x: number; y: number }[]> = {
  2: [
    { x: 50, y: 86 },
    { x: 50, y: 8 },
  ],
  3: [
    { x: 50, y: 86 },
    { x: 15, y: 30 },
    { x: 85, y: 30 },
  ],
  4: [
    { x: 50, y: 86 },
    { x: 85, y: 50 },
    { x: 50, y: 8 },
    { x: 15, y: 50 },
  ],
  5: [
    { x: 50, y: 86 },
    { x: 88, y: 55 },
    { x: 75, y: 8 },
    { x: 25, y: 8 },
    { x: 12, y: 55 },
  ],
  6: [
    { x: 50, y: 86 },
    { x: 88, y: 60 },
    { x: 80, y: 8 },
    { x: 50, y: 3 },
    { x: 20, y: 8 },
    { x: 12, y: 60 },
  ],
  7: [
    { x: 50, y: 86 },
    { x: 88, y: 65 },
    { x: 85, y: 25 },
    { x: 62, y: 3 },
    { x: 38, y: 3 },
    { x: 15, y: 25 },
    { x: 12, y: 65 },
  ],
  8: [
    { x: 50, y: 86 },
    { x: 88, y: 65 },
    { x: 88, y: 25 },
    { x: 65, y: 3 },
    { x: 35, y: 3 },
    { x: 12, y: 25 },
    { x: 12, y: 65 },
    { x: 75, y: 86 },
  ],
  9: [
    { x: 50, y: 86 },
    { x: 88, y: 70 },
    { x: 90, y: 35 },
    { x: 72, y: 3 },
    { x: 50, y: 0 },
    { x: 28, y: 3 },
    { x: 10, y: 35 },
    { x: 12, y: 70 },
    { x: 25, y: 86 },
  ],
};

export function PokerTablePro({
  state, isHumanTurn, amountToCall, canCheck, maxBet, onAction, onNextHand, onQuit,
}: PokerTableProProps) {
  const humanPlayer = state.players.find(p => p.id === 'human');
  const isShowdown = state.phase === 'hand_complete' || state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';
  const [showAllinFlash, setShowAllinFlash] = useState(false);
  const { play, enabled: soundEnabled, toggle: toggleSound } = usePokerSounds();

  // Track previous phase for sound triggers
  const [prevPhase, setPrevPhase] = useState(state.phase);
  const [prevHandNumber, setPrevHandNumber] = useState(state.handNumber);
  const [dealerExpression, setDealerExpression] = useState<'neutral' | 'smile' | 'surprise'>('neutral');

  // Showdown hand name display
  const [showHandName, setShowHandName] = useState<string | null>(null);

  // Sound triggers on phase changes
  useEffect(() => {
    if (state.phase !== prevPhase) {
      if (state.phase === 'dealing' || (state.phase === 'preflop' && prevPhase === 'dealing')) {
        play('shuffle');
      }
      if (state.phase === 'flop') play('flip');
      if (state.phase === 'turn' || state.phase === 'river') play('flip');
      if (state.phase === 'hand_complete') {
        play('win');
        setDealerExpression('smile');
        setTimeout(() => setDealerExpression('neutral'), 2500);
      }
      setPrevPhase(state.phase);
    }
    if (state.handNumber !== prevHandNumber) {
      setPrevHandNumber(state.handNumber);
    }
  }, [state.phase, state.handNumber, prevPhase, prevHandNumber, play]);

  // Play "your turn" sound
  useEffect(() => {
    if (isHumanTurn) play('yourTurn');
  }, [isHumanTurn, play]);

  // All-in flash + sound
  useEffect(() => {
    const anyAllIn = state.players.some(p => p.lastAction?.startsWith('All-in'));
    if (anyAllIn) {
      setShowAllinFlash(true);
      play('allIn');
      setDealerExpression('surprise');
      const t = setTimeout(() => {
        setShowAllinFlash(false);
        setDealerExpression('neutral');
      }, 600);
      return () => clearTimeout(t);
    }
  }, [state.players.map(p => p.lastAction).join(','), play]);

  // Show hand name during showdown
  useEffect(() => {
    if (state.phase === 'hand_complete') {
      const remaining = state.players.filter(p => p.status === 'active' || p.status === 'all-in');
      if (remaining.length > 1 && state.communityCards.length >= 3) {
        const winnerResults = remaining
          .map(p => ({ player: p, hand: evaluateHand([...p.holeCards, ...state.communityCards]) }))
          .sort((a, b) => b.hand.score - a.hand.score);
        if (winnerResults[0]) {
          setShowHandName(winnerResults[0].hand.name);
          setTimeout(() => setShowHandName(null), 2200);
        }
      }
    }
  }, [state.phase]);

  // Sound on player actions
  const handleAction = useCallback((action: any) => {
    if (action.type === 'check') play('check');
    else if (action.type === 'call') play('chipClink');
    else if (action.type === 'raise') play('chipStack');
    else if (action.type === 'all-in') play('allIn');
    onAction(action);
  }, [onAction, play]);

  const playerCount = state.players.length;
  const positions = SEAT_POSITIONS[Math.min(Math.max(playerCount, 2), 9)] || SEAT_POSITIONS[9];

  const winners = useMemo(() => {
    if (state.phase !== 'hand_complete' && state.phase !== 'game_over') return [];
    return state.players
      .filter(p => p.lastAction?.includes('!') || (isGameOver && p.chips > 0))
      .map(p => {
        const hand = p.holeCards.length >= 2 && state.communityCards.length >= 3
          ? evaluateHand([...p.holeCards, ...state.communityCards])
          : { rank: 0, name: 'N/A', score: 0, bestCards: [] };
        return { name: p.name, hand, chips: p.chips };
      });
  }, [state.phase, state.players, state.communityCards, isGameOver]);

  const gameStats = useMemo(() => ({
    handsPlayed: state.handsPlayed,
    handsWon: state.handsWon,
    bestHandName: state.bestHandName,
    biggestPot: state.biggestPot,
    duration: Date.now() - state.startTime,
  }), [state.handsPlayed, state.handsWon, state.bestHandName, state.biggestPot, state.startTime]);

  const currentPlayerIdx = state.currentPlayerIndex;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Leather background */}
      <img src={leatherBg} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* All-in flash */}
      {showAllinFlash && (
        <div className="absolute inset-0 z-30 bg-gradient-to-r from-destructive/0 via-primary/15 to-destructive/0 allin-flash pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 z-20 safe-area-top shrink-0 relative"
        style={{
          background: 'linear-gradient(180deg, hsl(0 0% 0% / 0.5), hsl(0 0% 0% / 0.3))',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(43 74% 49% / 0.15)',
        }}
      >
        <button onClick={onQuit} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
          <ArrowLeft className="h-3.5 w-3.5 text-foreground/80" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 60% 40%))',
              color: 'hsl(160 30% 8%)',
              boxShadow: '0 1px 4px rgba(200,160,40,0.3)',
            }}
          >
            #{state.handNumber}
          </span>
          <span className="text-[10px] text-foreground/60 font-medium">
            {state.smallBlind}/{state.bigBlind}
          </span>
        </div>
        <button
          onClick={toggleSound}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5 text-foreground/80" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-foreground/40" />
          )}
        </button>
      </div>

      {/* Main table area */}
      <div className="flex-1 relative z-10">
        <TableFelt className="absolute inset-0">
          {/* Dealer character at top center */}
          <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: '12%' }}>
            <DealerCharacter expression={dealerExpression} />
          </div>

          {/* Pot display */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '38%' }}>
            <PotDisplay pot={state.pot} />
          </div>

          {/* Community cards */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10 flex gap-1.5 items-center" style={{ top: '48%' }}>
            {state.communityCards.map((card, i) => (
              <CardDisplay
                key={`${card.suit}-${card.rank}-${i}`}
                card={card}
                size="md"
                dealDelay={i * 0.12}
                isWinner={false}
              />
            ))}
            {state.communityCards.length === 0 && (
              <div className="text-[10px] text-foreground/20 italic font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                Waiting for cards...
              </div>
            )}
          </div>

          {/* Hand name reveal at showdown */}
          {showHandName && (
            <div
              className="absolute left-1/2 top-1/2 z-30 animate-hand-name-reveal pointer-events-none"
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              <span
                className="text-xl font-black uppercase tracking-wider"
                style={{
                  fontFamily: 'Georgia, serif',
                  background: 'linear-gradient(135deg, hsl(43 74% 60%), hsl(43 90% 75%), hsl(43 74% 50%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 2px 8px hsl(43 74% 49% / 0.6))',
                }}
              >
                {showHandName}
              </span>
            </div>
          )}

          {/* Gold shimmer particles during showdown */}
          {state.phase === 'hand_complete' && !isGameOver && (
            <div className="absolute inset-0 z-25 pointer-events-none overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full animate-particle-float"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${30 + Math.random() * 30}%`,
                    background: 'radial-gradient(circle, hsl(43 74% 60%), hsl(43 74% 49% / 0))',
                    animationDelay: `${i * 0.2}s`,
                    boxShadow: '0 0 4px hsl(43 74% 49% / 0.6)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Phase indicator */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '62%' }}>
            <span className={cn(
              'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
              (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') && 'animate-phase-flash',
            )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
              {state.phase === 'preflop' ? 'Pre-Flop' : state.phase === 'hand_complete' ? 'Showdown' : state.phase}
            </span>
          </div>

          {/* Player seats */}
          {state.players.map((player, i) => {
            const pos = positions[i] || { x: 50, y: 50 };
            const isHuman = player.id === 'human';
            const showCards = isHuman || (isShowdown && (player.status === 'active' || player.status === 'all-in'));
            const isActive = currentPlayerIdx === i && !isShowdown;

            return (
              <div
                key={player.id}
                className={cn(
                  'absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300',
                  // Dim non-active seats when it's someone's turn
                  !isShowdown && !isActive && state.phase !== 'dealing' && state.phase !== 'idle' ? 'seat-dimmed' : 'seat-active',
                )}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
              >
                <PlayerSeat
                  player={player}
                  isCurrentPlayer={isActive}
                  showCards={showCards}
                  isHuman={isHuman}
                  isShowdown={isShowdown}
                />
              </div>
            );
          })}
        </TableFelt>
      </div>

      {/* Betting controls */}
      {isHumanTurn && humanPlayer && humanPlayer.status === 'active' && (
        <div className="px-3 pb-2 pt-1 z-20 safe-area-bottom shrink-0 relative"
          style={{ background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.7))' }}
        >
          <BettingControls
            canCheck={canCheck}
            amountToCall={amountToCall}
            minRaise={state.minRaise}
            maxBet={maxBet}
            playerChips={humanPlayer.chips}
            bigBlind={state.bigBlind}
            pot={state.pot}
            onAction={handleAction}
          />
        </div>
      )}

      {/* YOUR TURN indicator */}
      {isHumanTurn && humanPlayer && humanPlayer.status === 'active' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <span className="text-[10px] px-3 py-1 rounded-full font-black animate-turn-pulse"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.3), hsl(43 74% 49% / 0.15))',
              color: 'hsl(43 74% 60%)',
              border: '1px solid hsl(43 74% 49% / 0.4)',
              textShadow: '0 0 8px hsl(43 74% 49% / 0.5)',
            }}
          >
            YOUR TURN
          </span>
        </div>
      )}

      {/* Winner banner */}
      {state.phase === 'hand_complete' && !isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={false} onNextHand={onNextHand} onQuit={onQuit} />
      )}

      {/* Game over overlay */}
      {isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={true} stats={gameStats} onNextHand={onNextHand} onQuit={onQuit} />
      )}
    </div>
  );
}
