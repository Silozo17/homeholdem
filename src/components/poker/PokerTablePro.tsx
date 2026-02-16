import { useMemo, useState, useEffect, useCallback } from 'react';
import { GameState } from '@/lib/poker/types';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { PlayerSeat } from './PlayerSeat';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { WinnerOverlay } from './WinnerOverlay';
import { TableFelt } from './TableFelt';
import { TableStage } from './TableStage';
import { DealerCharacter } from './DealerCharacter';
import { TurnTimer } from './TurnTimer';
import { getSeatPositions } from '@/lib/poker/ui/seatLayout';
import { usePokerSounds, PokerSoundEvent } from '@/hooks/usePokerSounds';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Z } from './z';
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

function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  useEffect(() => {
    const handler = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  return isLandscape;
}

/*
 * Z-index layering model:
 *  0  - leather bg + dark overlay
 *  1  - TableFelt (rail, felt, vignette, betting line)
 *  5  - Pot display
 *  5  - Community cards
 *  5  - Phase indicator
 *  10 - Dealer character
 *  15 - Player seats
 *  20 - Hand name reveal / particles
 *  25 - All-in flash
 *  30 - Winner overlay
 *  40 - Header bar
 *  50 - Action bar (betting controls)
 *  50 - YOUR TURN badge
 */

export function PokerTablePro({
  state, isHumanTurn, amountToCall, canCheck, maxBet, onAction, onNextHand, onQuit,
}: PokerTableProProps) {
  const humanPlayer = state.players.find(p => p.id === 'human');
  const isShowdown = state.phase === 'hand_complete' || state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';
  const [showAllinFlash, setShowAllinFlash] = useState(false);
  const { play, enabled: soundEnabled, toggle: toggleSound } = usePokerSounds();

  const [prevPhase, setPrevPhase] = useState(state.phase);
  const [prevHandNumber, setPrevHandNumber] = useState(state.handNumber);
  const [dealerExpression, setDealerExpression] = useState<'neutral' | 'smile' | 'surprise'>('neutral');
  const [showHandName, setShowHandName] = useState<string | null>(null);

  // Sound triggers
  useEffect(() => {
    if (state.phase !== prevPhase) {
      if (state.phase === 'dealing' || (state.phase === 'preflop' && prevPhase === 'dealing')) play('shuffle');
      if (state.phase === 'flop') play('flip');
      if (state.phase === 'turn' || state.phase === 'river') play('flip');
      if (state.phase === 'hand_complete') {
        play('win');
        setDealerExpression('smile');
        setTimeout(() => setDealerExpression('neutral'), 2500);
      }
      setPrevPhase(state.phase);
    }
    if (state.handNumber !== prevHandNumber) setPrevHandNumber(state.handNumber);
  }, [state.phase, state.handNumber, prevPhase, prevHandNumber, play]);

  useEffect(() => { if (isHumanTurn) play('yourTurn'); }, [isHumanTurn, play]);

  useEffect(() => {
    const anyAllIn = state.players.some(p => p.lastAction?.startsWith('All-in'));
    if (anyAllIn) {
      setShowAllinFlash(true);
      play('allIn');
      setDealerExpression('surprise');
      const t = setTimeout(() => { setShowAllinFlash(false); setDealerExpression('neutral'); }, 600);
      return () => clearTimeout(t);
    }
  }, [state.players.map(p => p.lastAction).join(','), play]);

  useEffect(() => {
    if (state.phase === 'hand_complete') {
      const remaining = state.players.filter(p => p.status === 'active' || p.status === 'all-in');
      if (remaining.length > 1 && state.communityCards.length >= 3) {
        const best = remaining
          .map(p => ({ player: p, hand: evaluateHand([...p.holeCards, ...state.communityCards]) }))
          .sort((a, b) => b.hand.score - a.hand.score);
        if (best[0]) {
          setShowHandName(best[0].hand.name);
          setTimeout(() => setShowHandName(null), 2200);
        }
      }
    }
  }, [state.phase]);

  const handleAction = useCallback((action: any) => {
    if (action.type === 'check') play('check');
    else if (action.type === 'call') play('chipClink');
    else if (action.type === 'raise') play('chipStack');
    else if (action.type === 'all-in') play('allIn');
    onAction(action);
  }, [onAction, play]);

  const isLandscape = useIsLandscape();
  const positions = getSeatPositions(state.players.length, isLandscape);
  const currentPlayerIdx = state.currentPlayerIndex;

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

  return (
    <TableStage>
      {/* Leather background */}
      <img src={leatherBg} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} style={{ zIndex: Z.BG }} />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" style={{ zIndex: Z.BG }} />

      {/* All-in flash */}
      {showAllinFlash && (
        <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-primary/15 to-destructive/0 allin-flash pointer-events-none" style={{ zIndex: Z.ALLIN_FLASH }} />
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 h-9 shrink-0 relative"
        style={{
          zIndex: Z.HEADER,
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
        <button onClick={toggleSound} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-foreground/80" /> : <VolumeX className="h-3.5 w-3.5 text-foreground/40" />}
        </button>
      </div>

      {/* Main table area — fills remaining space */}
      <div className="flex-1 relative" style={{ zIndex: Z.TABLE }}>
        <TableFelt className="absolute inset-0">
          {/* Dealer above the table, top-center */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: isLandscape ? '22%' : '24%', zIndex: Z.DEALER, position: 'absolute' }}
          >
            <DealerCharacter expression={dealerExpression} />
          </div>

          {/* Pot */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: isLandscape ? '36%' : '38%', zIndex: Z.CARDS }}
          >
            <PotDisplay pot={state.pot} />
          </div>

          {/* Community cards */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex gap-1.5 items-center"
            style={{ top: isLandscape ? '46%' : '48%', zIndex: Z.CARDS }}
          >
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

          {/* Hand name at showdown */}
          {showHandName && (
            <div className="absolute left-1/2 top-1/2 animate-hand-name-reveal pointer-events-none" style={{ transform: 'translate(-50%, -50%)', zIndex: Z.EFFECTS }}>
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

          {/* Showdown particles */}
          {state.phase === 'hand_complete' && !isGameOver && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.EFFECTS }}>
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
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: isLandscape ? '57%' : '58%', zIndex: Z.CARDS }}>
            <span className={cn(
              'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
              (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') && 'animate-phase-flash',
            )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
              {state.phase === 'preflop' ? 'Pre-Flop' : state.phase === 'hand_complete' ? 'Showdown' : state.phase}
            </span>
          </div>

          {/* Player seats */}
          {state.players.map((player, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const isHuman = player.id === 'human';
            const showCards = isHuman || (isShowdown && (player.status === 'active' || player.status === 'all-in'));
            const isActive = currentPlayerIdx === i && !isShowdown;

            return (
              <div
                key={player.id}
                className={cn(
                  'absolute transition-opacity duration-300',
                  !isShowdown && !isActive && state.phase !== 'dealing' && state.phase !== 'idle' ? 'seat-dimmed' : 'seat-active',
                )}
                style={{
                  left: `${pos.xPct}%`,
                  top: `${pos.yPct}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: Z.SEATS,
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

      {/* Action bar — always at bottom, above everything */}
      {isHumanTurn && humanPlayer && humanPlayer.status === 'active' && (
        <div
          className="px-3 pb-2 pt-1 shrink-0 relative"
          style={{
            zIndex: Z.ACTIONS,
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
            background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.7))',
          }}
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

      {/* YOUR TURN badge */}
      {isHumanTurn && humanPlayer && humanPlayer.status === 'active' && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)', zIndex: Z.ACTIONS }}>
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

      {/* Winner overlay */}
      {state.phase === 'hand_complete' && !isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={false} onNextHand={onNextHand} onQuit={onQuit} />
      )}
      {isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={true} stats={gameStats} onNextHand={onNextHand} onQuit={onQuit} />
      )}
    </TableStage>
  );
}
