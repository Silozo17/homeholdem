import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { GameState } from '@/lib/poker/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { PlayerSeat } from './PlayerSeat';
import { SeatAnchor } from './SeatAnchor';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { WinnerOverlay } from './WinnerOverlay';
import { TableFelt } from './TableFelt';
import { DealerCharacter } from './DealerCharacter';
import { DebugOverlay } from './DebugOverlay';
import { getSeatPositions, getDefaultEllipse, CARDS_PLACEMENT } from '@/lib/poker/ui/seatLayout';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Z } from './z';
import { getBotPersona } from '@/lib/poker/bot-personas';
import { useWakeLock } from '@/hooks/useWakeLock';
import pokerBg from '@/assets/poker-background.webp';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface PokerTableProProps {
  state: GameState;
  isHumanTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  maxBet: number;
  onAction: (action: any) => void;
  onNextHand: () => void;
  onQuit: () => void;
  tutorialAllowedAction?: string | null;
  forceShowControls?: boolean;
}

import { useIsLandscape, useLockLandscape } from '@/hooks/useOrientation';
const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

function BlindTimerCountdown({ lastBlindIncrease, blindTimer, currentSmall, currentBig }: { lastBlindIncrease: number; blindTimer: number; currentSmall: number; currentBig: number }) {
  const [remaining, setRemaining] = useState('');
  const [isLow, setIsLow] = useState(false);
  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - lastBlindIncrease;
      const total = blindTimer * 60000;
      const left = Math.max(0, total - elapsed);
      const mins = Math.floor(left / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      setIsLow(left > 0 && left < 60000);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastBlindIncrease, blindTimer]);

  const nextSmall = currentSmall * 2;
  const nextBig = currentBig * 2;

  return (
    <span className={cn(
      'text-xs font-bold',
      isLow ? 'text-amber-400 animate-pulse' : 'text-amber-500/80'
    )}>
      ⏱ {remaining} → {nextSmall}/{nextBig}
    </span>
  );
}

export function PokerTablePro({
  state, isHumanTurn, amountToCall, canCheck, maxBet, onAction, onNextHand, onQuit,
  tutorialAllowedAction, forceShowControls,
}: PokerTableProProps) {
  const { user } = useAuth();
  const humanPlayer = state.players.find(p => p.id === 'human');
  const isShowdown = state.phase === 'hand_complete' || state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';
  const [showAllinFlash, setShowAllinFlash] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const { play, enabled: soundEnabled, toggle: toggleSound } = usePokerSounds();
  const isLandscape = useIsLandscape();
  useLockLandscape();

  // Keep screen awake during game
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  useEffect(() => {
    requestWakeLock();
    return () => { releaseWakeLock(); };
  }, [requestWakeLock, releaseWakeLock]);
  const [humanAvatarUrl, setHumanAvatarUrl] = useState<string | null>(null);

  // Fetch human player's profile avatar
  useEffect(() => {
    if (!user?.id) return;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setHumanAvatarUrl(data.avatar_url); });
  }, [user?.id]);

  // Intercept browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      setShowQuitConfirm(true);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [prevPhase, setPrevPhase] = useState(state.phase);
  const [prevHandNumber, setPrevHandNumber] = useState(state.handNumber);
  const [dealerExpression, setDealerExpression] = useState<'neutral' | 'smile' | 'surprise'>('neutral');
  const [showHandName, setShowHandName] = useState<string | null>(null);

  // Blinds-up toast notification
  useEffect(() => {
    if (state.blindsIncreased) {
      toast({
        title: '🔺 Blinds Up!',
        description: `Now ${state.smallBlind}/${state.bigBlind}`,
      });
    }
  }, [state.blindsIncreased, state.handNumber]);

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
    if (action.type === 'fold') play('fold');
    else if (action.type === 'check') play('check');
    else if (action.type === 'call') play('chipClink');
    else if (action.type === 'raise') play('chipStack');
    else if (action.type === 'all-in') play('allIn');
    onAction(action);
  }, [onAction, play]);

  const ellipse = getDefaultEllipse(isLandscape);
  const positions = useMemo(() => getSeatPositions(state.players.length, isLandscape), [state.players.length, isLandscape]);
  const currentPlayerIdx = state.currentPlayerIndex;
  const isMobileLandscape = isLandscape && typeof window !== 'undefined' && window.innerWidth < 900;

  // Stable particle positions (avoid jitter from Math.random() in render)
  const particlePositions = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      left: 20 + ((i * 37 + 13) % 60),
      top: 30 + ((i * 23 + 7) % 30),
    })), []
  );

  const winners = useMemo(() => {
    if (state.phase !== 'hand_complete' && state.phase !== 'game_over') return [];
    if (state.lastHandWinners && state.lastHandWinners.length > 0) {
      return state.lastHandWinners.map(w => ({
        name: w.name,
        hand: { rank: 0, name: w.handName, score: 0, bestCards: [] as any[] },
        chips: state.players.find(p => p.id === w.playerId)?.chips || 0,
      }));
    }
    // Fallback for game_over when lastHandWinners may be empty
    if (isGameOver) {
      return state.players
        .filter(p => p.chips > 0)
        .map(p => ({
          name: p.name,
          hand: { rank: 0, name: 'N/A', score: 0, bestCards: [] as any[] },
          chips: p.chips,
        }));
    }
    return [];
  }, [state.phase, state.lastHandWinners, state.players, isGameOver]);

  const gameStats = useMemo(() => ({
    handsPlayed: state.handsPlayed,
    handsWon: state.handsWon,
    bestHandName: state.bestHandName,
    biggestPot: state.biggestPot,
    duration: Date.now() - state.startTime,
  }), [state.handsPlayed, state.handsWon, state.bestHandName, state.biggestPot, state.startTime]);

  // Gate betting controls behind deal animation completion
  const [dealAnimDone, setDealAnimDone] = useState(true);
  useEffect(() => {
    if (state.phase !== 'preflop' && state.phase !== 'flop' && state.phase !== 'turn' && state.phase !== 'river') return;
    // When a new hand starts (handNumber changes), wait for deal animation
    const activePlayers = state.players.filter(p => p.status !== 'eliminated').length;
    const lastCardDelay = (1 * activePlayers + (activePlayers - 1)) * 0.35 + 0.8;
    setDealAnimDone(false);
    const t = setTimeout(() => setDealAnimDone(true), lastCardDelay * 1000);
    return () => clearTimeout(t);
  }, [state.handNumber]);

  const showActions = (isHumanTurn && humanPlayer && humanPlayer.status === 'active' && dealAnimDone) || forceShowControls;

  return (
    <div className="fixed inset-0 overflow-hidden z-[60]">
      {/* Portrait block overlay */}
      {!isLandscape && !isGameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm" style={{ zIndex: 9999 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-pulse">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
          <p className="text-lg font-bold text-foreground">Rotate Your Device</p>
          <p className="text-sm text-muted-foreground text-center max-w-[240px]">
            The poker table works best in landscape mode. Please rotate your phone.
          </p>
        </div>
      )}

      {/* ====== BG LAYERS ====== */}
      <img
        src={pokerBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
        style={{ zIndex: Z.BG }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: Z.BG,
          background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.2), rgba(0,0,0,0.8))',
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

      {/* ====== HEADER BAR — safe-area aware ====== */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-3"
        style={{
          zIndex: Z.HEADER,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          paddingLeft: isLandscape ? 'calc(env(safe-area-inset-left, 0px) + 8px)' : undefined,
          paddingRight: isLandscape ? 'calc(env(safe-area-inset-right, 0px) + 8px)' : undefined,
          height: 'auto',
          paddingBottom: '6px',
          background: 'linear-gradient(180deg, hsl(0 0% 0% / 0.6), transparent)',
        }}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQuitConfirm(true)} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
            <ArrowLeft className="h-3.5 w-3.5 text-foreground/80" />
          </button>
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
          {state.blindTimer > 0 && (
            <BlindTimerCountdown
              lastBlindIncrease={state.lastBlindIncrease}
              blindTimer={state.blindTimer}
              currentSmall={state.smallBlind}
              currentBig={state.bigBlind}
            />
          )}
        </div>

        <div />

        <button onClick={toggleSound} className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-foreground/80" /> : <VolumeX className="h-3.5 w-3.5 text-foreground/40" />}
        </button>
      </div>

      {/* ====== TABLE SCENE ====== */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: Z.TABLE }}
      >
        {/* Table wrapper — ALL game elements positioned inside this */}
        <div
          className="relative"
          style={{
            aspectRatio: '16 / 9',
            width: isLandscape ? 'min(79vw, 990px)' : 'min(86vw, 990px)',
            maxHeight: isLandscape ? '82vh' : '80vh',
            overflow: 'visible',
          }}
        >
          {/* Table image */}
          <TableFelt />

          {/* Dealer character — top center of table */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: isLandscape ? '-14%' : '-22%', width: '11%', zIndex: Z.DEALER }}>
            <DealerCharacter expression={dealerExpression} />
          </div>

          {/* Debug overlay */}
          {isDebug && <DebugOverlay ellipse={ellipse} seatPositions={positions} />}

          {/* Pot display — under dealer */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: '20%', zIndex: Z.CARDS }}
          >
            <PotDisplay pot={state.pot} />
          </div>

          {/* Community cards - 5-slot layout */}
          <div
            className="absolute left-1/2 flex gap-1.5 items-center"
            style={{ top: '50%', transform: 'translate(-50%, -50%)', zIndex: Z.CARDS }}
          >
            {[0, 1, 2, 3, 4].map(slotIdx => {
              const card = state.communityCards[slotIdx];
              return (
                <div key={slotIdx} className="w-[44px] h-[62px] rounded-lg border border-white/15 flex items-center justify-center"
                  style={{ background: card ? 'transparent' : 'hsl(160 30% 8% / 0.3)' }}>
                  {card && (
                    <CardDisplay
                      card={card}
                      size="xl"
                      dealDelay={slotIdx < 3 ? slotIdx * 0.18 : 0.1}
                      isWinner={false}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Hand name at showdown */}
          {showHandName && (
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: '66%', zIndex: Z.EFFECTS }}>
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
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '68%', zIndex: Z.CARDS }}>
            <span className={cn(
              'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
              (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') && 'animate-phase-flash',
            )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
              {state.phase === 'preflop' ? 'Pre-Flop' : state.phase === 'hand_complete' ? 'Showdown' : state.phase}
            </span>
          </div>

          {/* Showdown particles (stable positions) */}
          {state.phase === 'hand_complete' && !isGameOver && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.EFFECTS }}>
              {particlePositions.map((p, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full animate-particle-float"
                  style={{
                    left: `${p.left}%`,
                    top: `${p.top}%`,
                    background: 'radial-gradient(circle, hsl(43 74% 60%), hsl(43 74% 49% / 0))',
                    animationDelay: `${i * 0.2}s`,
                    boxShadow: '0 0 4px hsl(43 74% 49% / 0.6)',
                  }}
                />
              ))}
            </div>
          )}

          {/* ====== SEATS — hard-mapped placement ====== */}
          {state.players.map((player, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const isHuman = player.id === 'human';
            const showCards = isHuman || (isShowdown && (player.status === 'active' || player.status === 'all-in'));
            const isActive = currentPlayerIdx === i && !isShowdown;

            // Calculate dealing order: clockwise from dealer
            const activeIndices = state.players.map((p, idx) => p.status !== 'eliminated' ? idx : -1).filter(idx => idx !== -1);
            const dealerPosInActive = activeIndices.indexOf(state.dealerIndex);
            const myPosInActive = activeIndices.indexOf(i);
            const seatDealOrder = myPosInActive >= 0 && dealerPosInActive >= 0
              ? (myPosInActive - dealerPosInActive - 1 + activeIndices.length) % activeIndices.length
              : i;

            return (
              <SeatAnchor
                key={player.id}
                xPct={pos.xPct}
                yPct={pos.yPct}
                zIndex={isHuman ? Z.SEATS + 1 : Z.SEATS}
              >
                <PlayerSeat
                  player={player}
                  isCurrentPlayer={isActive}
                  showCards={showCards}
                  isHuman={isHuman}
                  isShowdown={isShowdown}
                  cardsPlacement={CARDS_PLACEMENT[pos.seatKey]}
                  compact={isMobileLandscape}
                  avatarUrl={isHuman ? humanAvatarUrl : (player.isBot ? getBotPersona(player.seatIndex - 1).avatarUrl : undefined)}
                  level={player.isBot ? getBotPersona(player.seatIndex - 1).level : undefined}
                  countryCode={player.isBot ? getBotPersona(player.seatIndex - 1).countryCode : undefined}
                  seatDealOrder={seatDealOrder}
                  totalActivePlayers={activeIndices.length}
                  onTimeout={isHuman && isActive ? () => handleAction({ type: 'fold' }) : undefined}
                />
              </SeatAnchor>
            );
          })}
        </div>
      </div>

      {/* YOUR TURN badge */}
      {showActions && (
        <div className="absolute pointer-events-none" style={{
          bottom: isLandscape ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)' : 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
          left: isLandscape ? '50%' : '50%',
          transform: 'translateX(-50%)',
          zIndex: Z.ACTIONS,
        }}>
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

      {/* ====== ACTION CONTROLS ====== */}
      {showActions && (
        isLandscape ? (
          /* Landscape: right-side vertical panel */
          <div
            className="absolute"
            style={{
              zIndex: Z.ACTIONS,
              right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
          >
            <BettingControls
              landscape
              canCheck={canCheck}
              amountToCall={amountToCall}
              minRaise={state.minRaise}
              maxBet={maxBet}
              playerChips={humanPlayer!.chips}
              bigBlind={state.bigBlind}
              pot={state.pot}
              onAction={handleAction}
              tutorialAllowedAction={tutorialAllowedAction}
            />
          </div>
        ) : (
          /* Portrait: full-width bottom bar */
          <div
            className="absolute bottom-0 left-0 right-0 px-3 pt-1"
            style={{
              zIndex: Z.ACTIONS,
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)',
              background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.8))',
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
              tutorialAllowedAction={tutorialAllowedAction}
            />
          </div>
        )
      )}

      {/* ====== OVERLAYS ====== */}
      {state.phase === 'hand_complete' && !isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={false} onNextHand={onNextHand} onQuit={onQuit} />
      )}
      {isGameOver && winners.length > 0 && (
        <WinnerOverlay winners={winners} isGameOver={true} stats={gameStats} onNextHand={onQuit} onQuit={onQuit} />
      )}

      {/* Quit Confirmation Dialog */}
      <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit? This will end the game.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onQuit} className="bg-red-600 hover:bg-red-700">
              Exit Game
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
