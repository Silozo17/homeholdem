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
import { DebugOverlay } from './DebugOverlay';
import { getSeatPositions, getDefaultEllipse } from '@/lib/poker/ui/seatLayout';
import { usePokerSounds } from '@/hooks/usePokerSounds';
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

const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

export function PokerTablePro({
  state, isHumanTurn, amountToCall, canCheck, maxBet, onAction, onNextHand, onQuit,
}: PokerTableProProps) {
  const humanPlayer = state.players.find(p => p.id === 'human');
  const isShowdown = state.phase === 'hand_complete' || state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';
  const [showAllinFlash, setShowAllinFlash] = useState(false);
  const { play, enabled: soundEnabled, toggle: toggleSound } = usePokerSounds();
  const isLandscape = useIsLandscape();

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

  // Ellipse-anchored seat positions
  const ellipse = getDefaultEllipse(isLandscape);
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

  const showActions = isHumanTurn && humanPlayer && humanPlayer.status === 'active';

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateRows: showActions
          ? '40px 52px 1fr auto'
          : '40px 52px 1fr',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ====== BG LAYERS (behind everything) ====== */}
      <img
        src={leatherBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
        style={{ zIndex: Z.BG }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: Z.BG,
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.25), rgba(0,0,0,0.75))',
        }}
      />

      {/* All-in flash */}
      {showAllinFlash && (
        <div
          className="absolute inset-0 pointer-events-none allin-flash"
          style={{
            zIndex: Z.ALLIN_FLASH,
            background: 'radial-gradient(ellipse at 50% 50%, hsl(43 74% 49% / 0.15), transparent 60%)',
          }}
        />
      )}

      {/* ====== ROW 1: HEADER BAR ====== */}
      <div
        className="relative flex items-center justify-between px-3"
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

      {/* ====== ROW 2: DEALER HUD ====== */}
      <div
        className="relative flex items-center justify-center"
        style={{
          zIndex: Z.DEALER,
          transform: 'translateY(6px)', // slight overlap onto table rail
        }}
      >
        <DealerCharacter expression={dealerExpression} />
      </div>

      {/* ====== ROW 3: TABLE SCENE ====== */}
      <div
        className="relative flex items-center justify-center overflow-visible"
        style={{ zIndex: Z.TABLE, padding: isLandscape ? '4px 12px 0' : '0 8px' }}
      >
        {/* Table wrapper — all table-relative elements positioned inside this */}
        <div
          className="relative overflow-visible"
          style={{
            aspectRatio: '16 / 9',
            height: isLandscape ? 'min(72vh, 520px)' : 'min(62vh, 460px)',
            width: 'auto',
            maxWidth: isLandscape ? 'min(92vw, 1000px)' : 'min(98vw, 650px)',
          }}
        >
          {/* Table image (visual only) */}
          <TableFelt />

          {/* Subtle spotlight on felt */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 50% 40% at 50% 48%, hsl(43 74% 49% / 0.04) 0%, transparent 60%)',
              zIndex: Z.TRIM_GLOW,
            }}
          />

          {/* Debug overlay */}
          {isDebug && <DebugOverlay ellipse={ellipse} seatPositions={positions} />}

          {/* Pot display */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: '32%', zIndex: Z.CARDS }}
          >
            <PotDisplay pot={state.pot} />
          </div>

          {/* Community cards */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex gap-1.5 items-center"
            style={{ top: '45%', zIndex: Z.CARDS }}
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
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: '58%', zIndex: Z.EFFECTS }}>
              <span
                className="text-xl font-black uppercase tracking-wider animate-hand-name-reveal"
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

          {/* Phase indicator */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '60%', zIndex: Z.CARDS }}>
            <span className={cn(
              'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
              (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') && 'animate-phase-flash',
            )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
              {state.phase === 'preflop' ? 'Pre-Flop' : state.phase === 'hand_complete' ? 'Showdown' : state.phase}
            </span>
          </div>

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

          {/* ====== SEATS (positioned on ellipse rail) ====== */}
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
                  !isShowdown && !isActive && state.phase !== 'dealing' && state.phase !== 'idle' ? 'opacity-60' : 'opacity-100',
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
        </div>
      </div>

      {/* YOUR TURN badge (floats above action bar) */}
      {showActions && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)', zIndex: Z.ACTIONS }}>
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

      {/* ====== ROW 4: ACTION BAR (conditionally rendered) ====== */}
      {showActions && (
        <div
          className="relative px-3 pt-1"
          style={{
            zIndex: Z.ACTIONS,
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)',
            background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.7))',
          }}
        >
          <BettingControls
            canCheck={canCheck}
            amountToCall={amountToCall}
            minRaise={state.minRaise}
            maxBet={maxBet}
            playerChips={humanPlayer!.chips}
            bigBlind={state.bigBlind}
            pot={state.pot}
            onAction={handleAction}
          />
        </div>
      )}

      {/* ====== OVERLAYS ====== */}
      {state.phase === 'hand_complete' && !isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={false} onNextHand={onNextHand} onQuit={onQuit} />
      )}
      {isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={true} stats={gameStats} onNextHand={onNextHand} onQuit={onQuit} />
      )}
    </div>
  );
}
