import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOnlinePokerTable, RevealedCard, HandWinner } from '@/hooks/useOnlinePokerTable';
import { WinnerOverlay } from './WinnerOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { PlayerSeat } from './PlayerSeat';
import { SeatAnchor } from './SeatAnchor';
import { DealerCharacter } from './DealerCharacter';
import { TableFelt } from './TableFelt';
import { ConnectionOverlay } from './ConnectionOverlay';
import { ChipAnimation } from './ChipAnimation';
import { QuickChat } from './QuickChat';
import { getSeatPositions, CARDS_PLACEMENT } from '@/lib/poker/ui/seatLayout';
import { Z } from './z';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { useIsLandscape, useLockLandscape } from '@/hooks/useOrientation';
import { callEdge } from '@/lib/poker/callEdge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Play, LogOut, Users, Copy, Check, Volume2, VolumeX, Eye, UserX, XCircle, MoreVertical, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InvitePlayersDialog } from './InvitePlayersDialog';
import { cn } from '@/lib/utils';
import { useWakeLock } from '@/hooks/useWakeLock';
import { toast } from '@/hooks/use-toast';
import { OnlineSeatInfo } from '@/lib/poker/online-types';
import { PokerPlayer } from '@/lib/poker/types';
import { Card } from '@/lib/poker/types';
import pokerBg from '@/assets/poker-background.webp';

interface OnlinePokerTableProps {
  tableId: string;
  onLeave: () => void;
}

/** Adapter: map OnlineSeatInfo → PokerPlayer for PlayerSeat */
function toPokerPlayer(
  seat: OnlineSeatInfo,
  isDealer: boolean,
  heroCards?: Card[] | null,
  isHero?: boolean,
  revealedCards?: Card[] | null,
  lastActionOverride?: string,
): PokerPlayer {
  const holeCards = isHero && heroCards ? heroCards : (revealedCards ?? []);
  return {
    id: seat.player_id!,
    name: isHero ? 'You' : seat.display_name,
    chips: seat.stack,
    status: seat.status === 'folded' ? 'folded' : seat.status === 'all-in' ? 'all-in' : 'active',
    holeCards,
    currentBet: seat.current_bet ?? 0,
    totalBetThisHand: 0,
    lastAction: lastActionOverride ?? seat.last_action ?? undefined,
    isDealer,
    isBot: false,
    seatIndex: seat.seat,
  };
}

export function OnlinePokerTable({ tableId, onLeave }: OnlinePokerTableProps) {
  const { user } = useAuth();
  const {
    tableState, myCards, loading, error, mySeatNumber, isMyTurn,
    amountToCall, canCheck, joinTable, leaveTable, startHand, sendAction, revealedCards,
    actionPending, lastActions, handWinners, chatBubbles, sendChat, autoStartAttempted, handHasEverStarted,
  } = useOnlinePokerTable(tableId);

  const [joining, setJoining] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const { play, enabled: soundEnabled, toggle: toggleSound } = usePokerSounds();
  const [dealerExpression, setDealerExpression] = useState<'neutral' | 'smile' | 'surprise'>('neutral');
  const [prevPhase, setPrevPhase] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [chipAnimations, setChipAnimations] = useState<Array<{ id: number; toX: number; toY: number }>>([]);
  const [dealing, setDealing] = useState(false);
  const [lowTimeWarning, setLowTimeWarning] = useState(false);
  const prevHandIdRef = useRef<string | null>(null);
  const prevIsMyTurnRef = useRef(false);
  const chipAnimIdRef = useRef(0);
  const isLandscape = useIsLandscape();
  useLockLandscape();

  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  useEffect(() => {
    requestWakeLock();
    return () => { releaseWakeLock(); };
  }, [requestWakeLock, releaseWakeLock]);

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

  // Sound triggers on phase changes
  const currentPhase = tableState?.current_hand?.phase ?? null;
  useEffect(() => {
    if (currentPhase && currentPhase !== prevPhase) {
      if (currentPhase === 'preflop' && !prevPhase) play('shuffle');
      if (currentPhase === 'flop' || currentPhase === 'turn' || currentPhase === 'river') play('flip');
      if (currentPhase === 'showdown' || currentPhase === 'complete') {
        play('win');
        setDealerExpression('smile');
        setTimeout(() => setDealerExpression('neutral'), 2500);
      }
      setPrevPhase(currentPhase);
    }
    if (!currentPhase) setPrevPhase(null);
  }, [currentPhase, prevPhase, play]);

  useEffect(() => {
    if (!tableState || !user) return;
    const checkKicked = () => {
      if (mySeatNumber !== null) return;
    };
    checkKicked();
  }, [tableState, user, mySeatNumber]);

  // Your turn: sound + haptic
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      play('yourTurn');
      if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    }
    prevIsMyTurnRef.current = isMyTurn;
    if (!isMyTurn) setLowTimeWarning(false);
  }, [isMyTurn, play]);

  useEffect(() => {
    if (error && (error.includes('fetch') || error.includes('network') || error.includes('Failed'))) {
      setIsDisconnected(true);
    } else if (tableState) {
      setIsDisconnected(false);
    }
    // Handle table_closed: tableState set to null by hook
    if (!tableState && !loading && !error) {
      toast({ title: 'Table closed', description: 'This table has been closed.' });
      onLeave();
    }
  }, [error, tableState, loading, onLeave]);

  // Game over detection: human stack hits 0
  useEffect(() => {
    if (!tableState || !user) return;
    const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
    if (mySeatInfo && mySeatInfo.stack <= 0 && handWinners.length > 0) {
      setGameOver(true);
    }
  }, [tableState, user, handWinners]);

  // Deal animation on new hand
  useEffect(() => {
    const currentHandId = tableState?.current_hand?.hand_id ?? null;
    if (currentHandId && currentHandId !== prevHandIdRef.current && tableState?.current_hand?.phase === 'preflop') {
      setDealing(true);
      const timer = setTimeout(() => setDealing(false), 4500);
      prevHandIdRef.current = currentHandId;
      return () => clearTimeout(timer);
    }
    if (!currentHandId) prevHandIdRef.current = null;
  }, [tableState?.current_hand?.hand_id, tableState?.current_hand?.phase]);

  // Chip animation: pot flies to winner
  useEffect(() => {
    if (handWinners.length === 0 || !tableState) return;
    const winner = handWinners[0];
    const heroSeatNum = mySeatNumber ?? 0;
    const maxSeatsCount = tableState.table.max_seats;
    const isLand = window.innerWidth > window.innerHeight;
    const positionsArr = getSeatPositions(maxSeatsCount, isLand);
    // Find winner's screen position
    const winnerSeat = tableState.seats.find(s => s.player_id === winner.player_id);
    if (!winnerSeat) return;
    const screenIdx = ((winnerSeat.seat - heroSeatNum) + maxSeatsCount) % maxSeatsCount;
    const winnerPos = positionsArr[screenIdx];
    if (!winnerPos) return;
    // Spawn 4 chip animations from pot (50, 20) to winner seat
    const newChips = Array.from({ length: 6 }, (_, i) => ({
      id: chipAnimIdRef.current++,
      toX: winnerPos.xPct,
      toY: winnerPos.yPct,
    }));
    setChipAnimations(newChips);
    const timer = setTimeout(() => setChipAnimations([]), 1200);
    return () => clearTimeout(timer);
  }, [handWinners, tableState, mySeatNumber]);

  // Low time callback for hero
  const handleLowTime = useCallback(() => {
    if (isMyTurn) {
      setLowTimeWarning(true);
      play('timerWarning');
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      setTimeout(() => setLowTimeWarning(false), 2500);
    }
  }, [isMyTurn, play]);

  const handleReconnect = useCallback(() => { window.location.reload(); }, []);

  // ── Memoized derived values (must be before early returns) ──
  const table = tableState?.table;
  const seats = tableState?.seats ?? [];
  const hand = tableState?.current_hand ?? null;
  const maxSeats = table?.max_seats ?? 9;
  const heroSeat = mySeatNumber ?? 0;

  const rotatedSeats = useMemo<(OnlineSeatInfo | null)[]>(() => Array.from(
    { length: maxSeats },
    (_, i) => {
      const actualSeat = (heroSeat + i) % maxSeats;
      return seats.find(s => s.seat === actualSeat) || null;
    }
  ), [maxSeats, heroSeat, seats]);

  const activeScreenPositions = useMemo(() => {
    const pos: number[] = [];
    rotatedSeats.forEach((sd, sp) => { if (sd?.player_id) pos.push(sp); });
    return pos;
  }, [rotatedSeats]);

  const positions = useMemo(() => getSeatPositions(maxSeats, isLandscape), [maxSeats, isLandscape]);
  const totalPot = useMemo(() => hand?.pots?.reduce((sum, p) => sum + p.amount, 0) ?? 0, [hand?.pots]);
  const isShowdown = hand?.phase === 'showdown' || hand?.phase === 'complete' || revealedCards.length > 0;

  const particlePositions = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      left: 20 + ((i * 37 + 13) % 60),
      top: 30 + ((i * 23 + 7) % 30),
    })), []
  );
  const confettiPositions = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      left: 10 + ((i * 31 + 11) % 80),
      top: 10 + ((i * 17 + 5) % 30),
      w: 6 + (i % 7),
      h: 6 + ((i * 3) % 7),
      round: i % 2 === 0,
      dur: 1.5 + (i % 5) * 0.2,
    })), []
  );

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading table...</div>
      </div>
    );
  }

  if (error || !tableState || !table) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive">{error || 'Table not found'}</p>
        <Button variant="outline" onClick={onLeave}>Go Back</Button>
      </div>
    );
  }

  const isSeated = mySeatNumber !== null;
  const isSpectator = !isSeated;
  const isCreator = user?.id === table.created_by;
  const activeSeats = seats.filter(s => s.player_id);
  const mySeat = seats.find(s => s.player_id === user?.id);
  const canModerate = isCreator && !hand;
  const isMobileLandscape = isLandscape && typeof window !== 'undefined' && window.innerWidth < 900;

  const handleKickPlayer = async (playerId: string) => {
    try {
      await callEdge('poker-moderate-table', { table_id: tableId, action: 'kick', target_player_id: playerId });
      toast({ title: 'Player removed' });
      setKickTarget(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCloseTable = async () => {
    try {
      await callEdge('poker-moderate-table', { table_id: tableId, action: 'close' });
      toast({ title: 'Table closed' });
      setCloseConfirm(false);
      onLeave();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleJoinSeat = async (seatNum: number) => {
    setJoining(true);
    try {
      await joinTable(seatNum, table.max_buy_in);
      toast({ title: 'Seated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try { await leaveTable(); onLeave(); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const copyInviteCode = () => {
    if (table.invite_code) {
      navigator.clipboard.writeText(table.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAction = async (action: any) => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    if (action.type === 'check') play('check');
    else if (action.type === 'call') play('chipClink');
    else if (action.type === 'raise') play('chipStack');
    else if (action.type === 'all-in') play('allIn');
    else if (action.type === 'fold') play('fold');
    const actionType = action.type === 'all-in' ? 'all_in' : action.type;
    try {
      await sendAction(actionType, action.amount);
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    }
  };

  const showActions = isMyTurn && !actionPending && mySeat && mySeat.status !== 'folded';

  return (
    <div className="fixed inset-0 overflow-hidden z-[60]">
      {/* Portrait block overlay — same as PokerTablePro */}
      {!isLandscape && (
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

      {/* ====== BG LAYERS — same as PokerTablePro ====== */}
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

      {/* ====== HEADER BAR — safe-area aware, same style as PokerTablePro ====== */}
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
          <button onClick={() => setShowQuitConfirm(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-foreground/80" />
          </button>
          <span className="text-[10px] font-bold text-foreground/80 truncate max-w-[120px]">{table.name}</span>
          <span className="text-[10px] text-foreground/60 font-medium">{table.small_blind}/{table.big_blind}</span>
          {hand && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 60% 40%))',
                color: 'hsl(160 30% 8%)',
                boxShadow: '0 1px 4px rgba(200,160,40,0.3)',
              }}
            >
              #{hand.hand_number}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {table.invite_code && (
            <button onClick={copyInviteCode}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
            >
              {codeCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-foreground/80" />}
            </button>
          )}
          <QuickChat onSend={sendChat} />
          <button onClick={() => setInviteOpen(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
          >
            <UserPlus className="h-3.5 w-3.5 text-foreground/80" />
          </button>
          <button onClick={toggleSound}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-foreground/80" /> : <VolumeX className="h-3.5 w-3.5 text-foreground/40" />}
          </button>
          {isSpectator && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground font-bold">
              <Eye className="h-2.5 w-2.5" /> Watching
            </span>
          )}
          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
                  <MoreVertical className="h-3.5 w-3.5 text-foreground/80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[70]">
                {canModerate && activeSeats.filter(s => s.player_id !== user?.id).map(s => (
                  <DropdownMenuItem key={s.player_id} onClick={() => setKickTarget({ id: s.player_id!, name: s.display_name })}>
                    <UserX className="h-3.5 w-3.5 mr-2" /> Kick {s.display_name}
                  </DropdownMenuItem>
                ))}
                {canModerate && (
                  <DropdownMenuItem onClick={() => setCloseConfirm(true)} className="text-destructive">
                    <XCircle className="h-3.5 w-3.5 mr-2" /> Close Table
                  </DropdownMenuItem>
                )}
                {!canModerate && hand && (
                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                    Wait for hand to end
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className="flex items-center gap-0.5 text-[10px] text-foreground/50">
            <Users className="h-3 w-3" />
            <span>{activeSeats.length}/{table.max_seats}</span>
          </div>
        </div>
      </div>

      {/* ====== TABLE SCENE — identical to PokerTablePro ====== */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: Z.TABLE }}
      >
        <div
          className="relative"
          style={{
            aspectRatio: '16 / 9',
            width: isLandscape ? 'min(79vw, 990px)' : 'min(86vw, 990px)',
            maxHeight: isLandscape ? '82vh' : '80vh',
            overflow: 'visible',
            containerType: 'size',
          }}
        >
          {/* Table image — visual only */}
          <TableFelt />

          {/* Dealer character — top center */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: isMobileLandscape ? 'calc(-4% - 32px)' : 'calc(-4% - 62px)', zIndex: Z.DEALER }}>
            <DealerCharacter expression={dealerExpression} />
          </div>

          {/* Pot display */}
          {totalPot > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '20%', zIndex: Z.CARDS }}>
              <PotDisplay pot={totalPot} />
            </div>
          )}

          {/* Community cards */}
          <div
            className="absolute left-1/2 flex gap-1.5 items-center"
            style={{ top: '48%', transform: 'translate(-50%, -50%)', zIndex: Z.CARDS }}
          >
            {(hand?.community_cards || []).map((card, i) => {
              const isFlop = i < 3;
              const dealDelay = isFlop ? i * 0.18 : 0.1;
              return (
                <CardDisplay key={`${card.suit}-${card.rank}-${i}`} card={card} size="xl" dealDelay={dealDelay} />
              );
            })}
            {(!hand || (hand.community_cards || []).length === 0) && (
              <div className="text-[10px] text-foreground/20 italic font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {activeSeats.length >= 2 ? 'Starting soon...' : 'Waiting for players...'}
              </div>
            )}
          </div>

          {/* Phase indicator */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '68%', zIndex: Z.CARDS }}>
            {hand ? (
              <span className={cn(
                'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
                (hand.phase === 'flop' || hand.phase === 'turn' || hand.phase === 'river') && 'animate-phase-flash',
              )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
                {hand.phase === 'preflop' ? 'Pre-Flop' : hand.phase === 'complete' ? 'Showdown' : hand.phase}
              </span>
            ) : (
              <span className="text-[9px] text-foreground/20 italic font-medium"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {activeSeats.length >= 2 ? 'Starting soon...' : 'Waiting for players...'}
              </span>
            )}
          </div>

          {/* Manual deal fallback for table creator */}
          {isCreator && !hand && !autoStartAttempted && !handHasEverStarted && activeSeats.length >= 2 && (
            <button
              onClick={() => startHand()}
              className="absolute px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all animate-pulse"
              style={{ zIndex: Z.ACTIONS, bottom: '28%', left: '50%', transform: 'translateX(-50%)' }}
            >
              <Play className="h-3 w-3 inline mr-1" />
              Deal Hand
            </button>
          )}

          {/* Showdown particles (stable positions) */}
          {isShowdown && (
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

          {/* Winner banner during showdown pause */}
          {handWinners.length > 0 && !gameOver && (
            <WinnerOverlay
              winners={handWinners.map(w => ({
                name: w.player_id === user?.id ? 'You' : w.display_name,
                hand: { name: w.hand_name || 'Winner', rank: 0, score: 0, bestCards: [] },
                chips: w.amount,
              }))}
              isGameOver={false}
              onNextHand={() => {}}
              onQuit={() => {}}
            />
          )}

          {/* Game Over overlay */}
          {gameOver && (
            <WinnerOverlay
              winners={handWinners.map(w => ({
                name: w.player_id === user?.id ? 'You' : w.display_name,
                hand: { name: w.hand_name || 'Winner', rank: 0, score: 0, bestCards: [] },
                chips: w.amount,
              }))}
              isGameOver={true}
              onNextHand={() => {}}
              onQuit={() => { leaveTable().then(onLeave).catch(onLeave); }}
            />
          )}

          {/* Confetti when human wins (stable positions) */}
          {handWinners.length > 0 && handWinners.some(w => w.player_id === user?.id) && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.EFFECTS + 10 }}>
              {confettiPositions.map((c, i) => (
                <div
                  key={i}
                  className="absolute animate-confetti-drift"
                  style={{
                    left: `${c.left}%`,
                    top: `${c.top}%`,
                    width: `${c.w}px`,
                    height: `${c.h}px`,
                    background: ['hsl(43 74% 49%)', 'hsl(0 70% 50%)', 'hsl(210 80% 55%)', 'hsl(142 70% 45%)', 'hsl(280 60% 55%)'][i % 5],
                    borderRadius: c.round ? '50%' : '2px',
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: `${c.dur}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Chip animations: pot flies to winner */}
          {chipAnimations.map((chip, i) => (
            <ChipAnimation
              key={chip.id}
              fromX={50}
              fromY={20}
              toX={chip.toX}
              toY={chip.toY}
              duration={900}
              delay={i * 80}
            />
          ))}

          {/* Deal animation: cards fly from dealer to seats */}
          {dealing && (() => {
            const posArr = positions;
            // Build ordered list of active screen positions for round-robin dealing
            const activeScreenPositions: number[] = [];
            rotatedSeats.forEach((seatData, screenPos) => {
              if (seatData?.player_id) activeScreenPositions.push(screenPos);
            });
            const activeSeatCount = activeScreenPositions.length;
            return rotatedSeats.map((seatData, screenPos) => {
              if (!seatData?.player_id) return null;
              const pos = posArr[screenPos];
              if (!pos) return null;
              const seatOrder = activeScreenPositions.indexOf(screenPos);
              return [0, 1].map(cardIdx => {
                // Round-robin: first card to each player in order, then second card
                const delay = (cardIdx * activeSeatCount + seatOrder) * 0.35;
                return (
                  <div
                    key={`deal-${screenPos}-${cardIdx}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: '50%',
                      top: '2%',
                      zIndex: Z.EFFECTS,
                      animation: `deal-card-fly 0.7s ease-out ${delay}s both`,
                      ['--deal-dx' as any]: `${pos.xPct - 50}vw`,
                      ['--deal-dy' as any]: `${pos.yPct - 2}vh`,
                    }}
                  >
                    <div className="w-6 h-9 rounded card-back-premium border border-white/10" />
                  </div>
                );
              });
            });
          })()}

          {/* Chat bubbles near player seats */}
          {chatBubbles.map(bubble => {
            const seatInfo = tableState.seats.find(s => s.player_id === bubble.player_id);
            if (!seatInfo) return null;
            const heroSeatNum = mySeatNumber ?? 0;
            const screenIdx = ((seatInfo.seat - heroSeatNum) + maxSeats) % maxSeats;
            const pos = positions[screenIdx];
            if (!pos) return null;
            return (
              <div
                key={bubble.id}
                className="absolute animate-float-up pointer-events-none"
                style={{
                  left: `${pos.xPct}%`,
                  top: `${pos.yPct - 12}%`,
                  transform: 'translateX(-50%)',
                  zIndex: Z.EFFECTS + 5,
                }}
              >
                <span className="text-sm px-2 py-1 rounded-lg font-bold"
                  style={{
                    background: 'hsl(0 0% 0% / 0.7)',
                    color: 'hsl(45 30% 95%)',
                    border: '1px solid hsl(43 74% 49% / 0.3)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  {bubble.text}
                </span>
              </div>
            );
          })}
          {/* ====== SEATS — using SeatAnchor + PlayerSeat, same as PokerTablePro ====== */}
          {rotatedSeats.map((seatData, screenPos) => {
            const actualSeatNumber = (heroSeat + screenPos) % maxSeats;
            const pos = positions[screenPos];
            if (!pos) return null;

            const isEmpty = !seatData?.player_id;
            const isMe = seatData?.player_id === user?.id;
            const isDealer = hand?.dealer_seat === actualSeatNumber;
            const isCurrentActor = hand?.current_actor_seat === actualSeatNumber;
            const isFolded = seatData?.status === 'folded';

            if (isEmpty) {
              return (
                <SeatAnchor key={`empty-${actualSeatNumber}`} xPct={pos.xPct} yPct={pos.yPct} zIndex={Z.SEATS}>
                  <EmptySeatDisplay
                    seatNumber={actualSeatNumber}
                    canJoin={!isSeated}
                    onJoin={() => handleJoinSeat(actualSeatNumber)}
                  />
                </SeatAnchor>
              );
            }

            // Build PokerPlayer from OnlineSeatInfo, with revealed cards for opponents at showdown
            const opponentRevealed = !isMe
              ? revealedCards.find(rc => rc.player_id === seatData!.player_id)?.cards ?? null
              : null;
            const playerLastAction = seatData!.player_id ? lastActions[seatData!.player_id] : undefined;
            const player = toPokerPlayer(
              seatData!,
              !!isDealer,
              isMe ? myCards : null,
              isMe,
              opponentRevealed,
              playerLastAction,
            );


            const showCards = isMe || (isShowdown && (seatData!.status === 'active' || seatData!.status === 'all-in'));

            return (
              <SeatAnchor
                key={seatData!.player_id}
                xPct={pos.xPct}
                yPct={pos.yPct}
                zIndex={isMe ? Z.SEATS + 1 : Z.SEATS}
              >
                <PlayerSeat
                  player={player}
                  isCurrentPlayer={!!isCurrentActor && !isFolded}
                  showCards={showCards}
                  isHuman={!!isMe}
                  isShowdown={!!isShowdown}
                  cardsPlacement={CARDS_PLACEMENT[pos.seatKey]}
                  compact={isMobileLandscape}
                  avatarUrl={seatData!.avatar_url}
                  seatDealOrder={activeScreenPositions.indexOf(screenPos)}
                  totalActivePlayers={activeSeats.length}
                  onTimeout={isMe && isCurrentActor ? () => handleAction({ type: 'fold' }) : undefined}
                  onLowTime={isMe && isCurrentActor ? handleLowTime : undefined}
                />
              </SeatAnchor>
            );
          })}
        </div>
      </div>

      {/* YOUR TURN badge — positioned above hero cards */}
      {showActions && (
        <div className="absolute pointer-events-none" style={{
          bottom: isLandscape ? '18%' : '22%',
          left: '50%',
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

      {/* 5 SEC LEFT warning pill */}
      {lowTimeWarning && (
        <div className="absolute pointer-events-none animate-low-time-pill" style={{
          bottom: isLandscape ? '22%' : '26%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: Z.ACTIONS + 1,
        }}>
          <span className="text-[11px] px-4 py-1.5 rounded-full font-black"
            style={{
              background: 'linear-gradient(135deg, hsl(0 70% 50% / 0.8), hsl(0 70% 40% / 0.6))',
              color: 'hsl(0 0% 100%)',
              border: '1px solid hsl(0 70% 50% / 0.6)',
              textShadow: '0 0 8px hsl(0 70% 50% / 0.8)',
              animation: 'low-time-pulse 0.5s ease-in-out infinite',
            }}
          >
            5 SEC LEFT!
          </span>
        </div>
      )}

      {/* ====== ACTION CONTROLS — same layout as PokerTablePro ====== */}
      {showActions && mySeat && (
        isLandscape ? (
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
              minRaise={hand?.min_raise ?? table.big_blind}
              maxBet={hand?.current_bet ?? 0}
              playerChips={mySeat.stack}
              bigBlind={table.big_blind}
              pot={totalPot}
              onAction={handleAction}
            />
          </div>
        ) : (
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
              minRaise={hand?.min_raise ?? table.big_blind}
              maxBet={hand?.current_bet ?? 0}
              playerChips={mySeat.stack}
              bigBlind={table.big_blind}
              pot={totalPot}
              onAction={handleAction}
            />
          </div>
        )
      )}

      {/* Spectator overlay */}
      {isSpectator && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
          style={{
            zIndex: Z.ACTIONS,
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.8))',
          }}
        >
          <p className="text-xs text-center font-bold mb-2" style={{ color: 'hsl(43 74% 60%)', textShadow: '0 0 8px hsl(43 74% 49% / 0.4)' }}>
            Tap a glowing seat to join
          </p>
          <button
            onClick={onLeave}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95 max-w-xs mx-auto"
            style={{
              background: 'linear-gradient(180deg, hsl(0 0% 15%), hsl(0 0% 10%))',
              color: 'hsl(0 0% 60%)',
              border: '1px solid hsl(0 0% 20%)',
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Leave
          </button>
        </div>
      )}

      {/* Kick confirmation dialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Kick {kickTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {kickTarget?.name} from the table. They can rejoin later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => kickTarget && handleKickPlayer(kickTarget.id)} className="bg-destructive text-destructive-foreground">
              Kick Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close table confirmation */}
      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Close Table?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all players and permanently close the table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseTable} className="bg-destructive text-destructive-foreground">
              Close Table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connection lost overlay */}
      <ConnectionOverlay isDisconnected={isDisconnected} onReconnect={handleReconnect} />

      {/* Invite players dialog */}
      <InvitePlayersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tableId={tableId}
        tableName={table.name}
        clubId={table.club_id}
      />

      {/* Quit confirmation dialog */}
      <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Table?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave? You will forfeit your seat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={isSeated ? handleLeave : onLeave}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave Table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-component: Empty seat ──────────────────────────────────────
function EmptySeatDisplay({ seatNumber, canJoin, onJoin }: { seatNumber: number; canJoin: boolean; onJoin: () => void }) {
  return (
    <button
      onClick={canJoin ? onJoin : undefined}
      disabled={!canJoin}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg min-w-[52px] min-h-[52px] transition-all',
        canJoin ? 'hover:bg-white/5 cursor-pointer' : 'opacity-20',
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold',
        canJoin && 'animate-seat-pulse-glow',
      )}
        style={{
          background: 'linear-gradient(135deg, hsl(160 20% 15%), hsl(160 25% 10%))',
          border: canJoin ? '2px solid hsl(43 74% 49% / 0.5)' : '1px dashed hsl(0 0% 20%)',
          color: canJoin ? 'hsl(43 74% 60%)' : 'hsl(0 0% 30%)',
        }}
      >
        {seatNumber + 1}
      </div>
      {canJoin && (
        <span className="text-[7px] font-bold uppercase tracking-wider"
          style={{ color: 'hsl(43 74% 60%)', textShadow: '0 0 6px hsl(43 74% 49% / 0.4)' }}
        >
          Open
        </span>
      )}
    </button>
  );
}
