import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlinePokerTable, RevealedCard, HandWinner } from '@/hooks/useOnlinePokerTable';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { VoiceChatControls } from './VoiceChatControls';
import { WinnerOverlay } from './WinnerOverlay';
import { XPLevelUpOverlay } from './XPLevelUpOverlay';
import { useAuth } from '@/contexts/AuthContext';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { PotOddsDisplay } from './PotOddsDisplay';
import { PreActionButtons, PreActionType } from './PreActionButtons';
import { BettingControls } from './BettingControls';
import { PlayerSeat } from './PlayerSeat';
import { SeatAnchor } from './SeatAnchor';
import { DealerCharacter } from './DealerCharacter';
import { TableFelt } from './TableFelt';
import hhLogo from '@/assets/poker/hh-logo.webp';
import { ConnectionOverlay } from './ConnectionOverlay';
import { ChipAnimation } from './ChipAnimation';
import { QuickChat } from './QuickChat';
import { AchievementToast } from './AchievementToast';
import { HandReplay } from './HandReplay';
import { getSeatPositions, CARDS_PLACEMENT } from '@/lib/poker/ui/seatLayout';
import { Z } from './z';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { useAchievements } from '@/hooks/useAchievements';
import { useHandHistory, HandPlayerSnapshot } from '@/hooks/useHandHistory';
import { useIsLandscape, useLockLandscape } from '@/hooks/useOrientation';
import { callEdge } from '@/lib/poker/callEdge';
import { Button } from '@/components/ui/button';
import { PokerErrorBoundary } from './PokerErrorBoundary';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DoorOpen, LogOut, Play, Users, Copy, Check, Volume2, VolumeX, Eye, UserX, XCircle, MoreVertical, UserPlus, History, Mic, MicOff, Headphones, HeadphoneOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InvitePlayersDialog } from './InvitePlayersDialog';
import { cn } from '@/lib/utils';
import { useWakeLock } from '@/hooks/useWakeLock';
import { usePlayerLevels } from '@/hooks/usePlayerLevel';
import { toast } from '@/hooks/use-toast';
import { OnlineSeatInfo } from '@/lib/poker/online-types';
import { PokerPlayer } from '@/lib/poker/types';
import { Card } from '@/lib/poker/types';
import { AchievementContext } from '@/lib/poker/achievements';
import pokerBg from '@/assets/poker-background.webp';
import { usePokerVoiceAnnouncements } from '@/hooks/usePokerVoiceAnnouncements';
import { GameStateDebugPanel } from './GameStateDebugPanel';

/** Blind timer countdown for multiplayer */
function OnlineBlindTimer({ lastIncreaseAt, timerMinutes, currentSmall, currentBig }: {
  lastIncreaseAt: string; timerMinutes: number; currentSmall: number; currentBig: number;
}) {
  const [remaining, setRemaining] = useState('');
  const [isLow, setIsLow] = useState(false);
  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - new Date(lastIncreaseAt).getTime();
      const total = timerMinutes * 60000;
      const left = Math.max(0, total - elapsed);
      const mins = Math.floor(left / 60000);
      const secs = Math.floor((left % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      setIsLow(left > 0 && left < 60000);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastIncreaseAt, timerMinutes]);

  return (
    <span className={cn(
      'text-xs font-bold',
      isLow ? 'text-amber-400 animate-pulse' : 'text-amber-500/80'
    )}>
      ⏱ {remaining} → {currentSmall * 2}/{currentBig * 2}
    </span>
  );
}

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
    amountToCall, canCheck, joinTable, leaveSeat, leaveTable, startHand, sendAction, revealedCards,
    actionPending, lastActions, handWinners, chatBubbles, sendChat, autoStartAttempted, handHasEverStarted,
    spectatorCount, connectionStatus, lastKnownPhase, lastKnownStack, refreshState, onBlindsUp, onlinePlayerIds,
    kickedForInactivity,
  } = useOnlinePokerTable(tableId);

  const [joining, setJoining] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const { play, enabled: soundEnabled, toggle: toggleSound, haptic } = usePokerSounds();
  const { announceBlindUp, announceWinner, announceCountdown, announceGameOver, announceCustom, voiceEnabled, toggleVoice, precache } = usePokerVoiceAnnouncements();
  const voiceChat = useVoiceChat(tableId);
  const { newAchievement, clearNew, checkAndAward } = useAchievements();
  const prevActiveCountRef = useRef<number>(0);
  const firstHandRef = useRef(true);
  const bigPotAnnouncedRef = useRef(false);
  const { lastHand, startNewHand, recordAction, finalizeHand, exportCSV } = useHandHistory(tableId);
  const [replayOpen, setReplayOpen] = useState(false);
  const [dealerExpression, setDealerExpression] = useState<'neutral' | 'smile' | 'surprise'>('neutral');
  const [prevPhase, setPrevPhase] = useState<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const [communityCardPhaseKey, setCommunityCardPhaseKey] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [closeConfirm, setCloseConfirm] = useState(false);
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showLeaveSeatConfirm, setShowLeaveSeatConfirm] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverWinners, setGameOverWinners] = useState<HandWinner[]>([]);
  
  const [chipAnimations, setChipAnimations] = useState<Array<{ id: number; toX: number; toY: number }>>([]);
  const [dealing, setDealing] = useState(false);
  const [lowTimeWarning, setLowTimeWarning] = useState(false);
  const [visibleCommunityCards, setVisibleCommunityCards] = useState<Card[]>([]);
  const [preAction, setPreAction] = useState<PreActionType>(null);
  const prevBetRef = useRef<number>(0);
  const stagedRunoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevCommunityCountRef = useRef(0);
  const prevAnimHandIdRef = useRef<string | null>(null);
  const processedActionsRef = useRef(new Set<string>());
  const prevIsMyTurnRef = useRef(false);
  const chipAnimIdRef = useRef(0);
  const winStreakRef = useRef(0);
  const handsPlayedRef = useRef(0);
  const handsWonRef = useRef(0);
  const bestHandNameRef = useRef('');
  const bestHandRankRef = useRef(-1);
  const biggestPotRef = useRef(0);
  const gameStartTimeRef = useRef(Date.now());
  const xpSavedRef = useRef(false);
  const startXpRef = useRef<number | null>(null);
  const [xpOverlay, setXpOverlay] = useState<{ startXp: number; endXp: number; xpGained: number } | null>(null);
  const chatCountRef = useRef(0);
  const startingStackRef = useRef(0);
  const isLandscape = useIsLandscape();
  useLockLandscape();

  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  useEffect(() => {
    requestWakeLock();
    return () => { releaseWakeLock(); };
  }, [requestWakeLock, releaseWakeLock]);

  // Auto-connect voice chat when seated
  useEffect(() => {
    if (mySeatNumber !== null && !voiceChat.connected && !voiceChat.connecting) {
      voiceChat.connect();
    }
  }, [mySeatNumber, voiceChat.connected, voiceChat.connecting]);

  // Capture starting XP on mount for level-up animation
  useEffect(() => {
    if (!user) return;
    supabase.from('player_xp').select('total_xp').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { startXpRef.current = data?.total_xp ?? 0; });
  }, [user]);

  // Fix 3: Inactivity kick — 2 min no touch → warning → auto-leave
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityWarningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inactivityWarning, setInactivityWarning] = useState(false);

  useEffect(() => {
    if (!mySeatNumber) return; // only for seated players

    const IDLE_MS = 120_000; // 2 minutes
    const WARNING_MS = 10_000; // 10 second warning before kick

    const resetInactivity = () => {
      setInactivityWarning(false);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (inactivityWarningRef.current) clearTimeout(inactivityWarningRef.current);

      inactivityTimerRef.current = setTimeout(() => {
        setInactivityWarning(true);
        toast({ title: '⚠️ Inactivity Warning', description: 'You will be removed in 10 seconds. Tap anywhere to stay.' });

        inactivityWarningRef.current = setTimeout(() => {
          // FIX CL-9: Don't auto-kick during active hand — extend instead
          const currentHand = tableState?.current_hand;
          if (currentHand && currentHand.phase !== 'complete') {
            setInactivityWarning(false);
            resetInactivity();
            return;
          }
          leaveTable().then(onLeave).catch(onLeave);
        }, WARNING_MS);
      }, IDLE_MS);
    };

    resetInactivity();

    const events = ['mousedown', 'touchstart', 'keydown', 'pointermove'];
    events.forEach(e => window.addEventListener(e, resetInactivity, { passive: true }));

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (inactivityWarningRef.current) clearTimeout(inactivityWarningRef.current);
    };
  }, [mySeatNumber, leaveTable, onLeave]);

  // Listen for blinds_up broadcast and show toast + voice
  useEffect(() => {
    onBlindsUp((payload: any) => {
      toast({
        title: '🔺 Blinds Up!',
        description: `Now ${payload.new_small}/${payload.new_big}`,
      });
      announceBlindUp(payload.new_small, payload.new_big);
    });
  }, [onBlindsUp, announceBlindUp]);

  // Handle server-side inactivity kick
  useEffect(() => {
    if (kickedForInactivity) {
      toast({
        title: '⚠️ Removed for inactivity',
        description: 'You were removed from the table due to inactivity.',
        variant: 'destructive',
      });
      onLeave();
    }
  }, [kickedForInactivity, onLeave]);

  // Track starting stack when first seated
  useEffect(() => {
    if (mySeatNumber !== null && startingStackRef.current === 0 && tableState) {
      const mySeat = tableState.seats.find(s => s.player_id === user?.id);
      if (mySeat) startingStackRef.current = mySeat.stack;
    }
  }, [mySeatNumber, tableState, user?.id]);

  // Track chat count
  const originalSendChat = sendChat;
  const trackedSendChat = useCallback((text: string) => {
    chatCountRef.current++;
    originalSendChat(text);
  }, [originalSendChat]);

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

  // Sound + haptic triggers on phase changes
  const currentPhase = tableState?.current_hand?.phase ?? null;
  useEffect(() => {
    if (currentPhase && currentPhase !== prevPhase) {
      if (currentPhase === 'preflop' && !prevPhase) {
        play('shuffle'); haptic('deal');
        // Voice: "Shuffling up and dealing" on first hand only
        if (firstHandRef.current) { announceCustom("Shuffling up and dealing"); firstHandRef.current = false; }
        bigPotAnnouncedRef.current = false;
      }
      if (currentPhase === 'flop' || currentPhase === 'turn' || currentPhase === 'river') { play('flip'); haptic('cardReveal'); }
      if (currentPhase === 'showdown' || currentPhase === 'complete') {
        play('win');
        haptic('win');
        setDealerExpression('smile');
        setTimeout(() => setDealerExpression('neutral'), 2500);
      }
      setPrevPhase(currentPhase);
    }
    if (!currentPhase) setPrevPhase(null);
  }, [currentPhase, prevPhase, play, haptic]);

  // Track phase changes for community card deal animation keys
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = currentPhase;
    if (!currentPhase || currentPhase === prev) return;
    if ((currentPhase === 'flop' && prev === 'preflop') ||
        (currentPhase === 'turn' && prev === 'flop') ||
        (currentPhase === 'river' && prev === 'turn')) {
      setCommunityCardPhaseKey(`${currentPhase}-${Date.now()}`);
    }
  }, [currentPhase]);

  // Hand history: snapshot players on new hand
  useEffect(() => {
    const hand = tableState?.current_hand;
    if (!hand) return;
    const currentHandId = hand.hand_id;
    if (currentHandId && currentHandId !== prevAnimHandIdRef.current && hand.phase === 'preflop') {
      handsPlayedRef.current++;
      const players: HandPlayerSnapshot[] = (tableState?.seats ?? [])
        .filter(s => s.player_id)
        .map(s => ({ name: s.display_name, seatIndex: s.seat, startStack: s.stack, playerId: s.player_id! }));
      startNewHand(currentHandId, hand.hand_number, players);
    }
  }, [tableState?.current_hand?.hand_id, tableState?.current_hand?.phase, tableState?.seats, startNewHand]);

  // Hand history: record actions from lastActions changes
  useEffect(() => {
    const hand = tableState?.current_hand;
    if (!hand || !lastActions) return;
    const seats = tableState?.seats ?? [];
    for (const [playerId, actionStr] of Object.entries(lastActions)) {
      const actionKey = `${playerId}:${actionStr}:${hand.hand_id}`;
      if (processedActionsRef.current.has(actionKey)) continue;
      processedActionsRef.current.add(actionKey);
      const seat = seats.find(s => s.player_id === playerId);
      if (seat) {
        recordAction({
          playerName: seat.display_name,
          action: actionStr,
          amount: seat.current_bet ?? 0,
          phase: hand.phase,
          timestamp: Date.now(),
        });
      }
    }
  }, [lastActions]);

  // Hand history + achievements: on hand result
  useEffect(() => {
    if (handWinners.length === 0 || !tableState || !user) return;
    const hand = tableState.current_hand;
    const communityCards = hand?.community_cards ?? [];

    // Finalize hand history
    finalizeHand({
      communityCards,
      winners: handWinners,
      pots: hand?.pots ?? [],
      myCards: myCards,
      revealedCards,
    });

    // Track stats for game over
    const heroWon = handWinners.some(w => w.player_id === user.id);
    if (heroWon) {
      winStreakRef.current++;
      handsWonRef.current++;
    } else {
      winStreakRef.current = 0;
    }
    const totalPotThisHand = (hand?.pots ?? []).reduce((s, p) => s + p.amount, 0);
    if (totalPotThisHand > biggestPotRef.current) biggestPotRef.current = totalPotThisHand;
    const winnerHand0 = handWinners.find(w => w.player_id === user.id);
    if (winnerHand0?.hand_name) {
      // Simple rank comparison by name — not perfect but good enough for display
      const rankOrder = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
      const newRank = rankOrder.indexOf(winnerHand0.hand_name);
      if (newRank > bestHandRankRef.current) {
        bestHandRankRef.current = newRank;
        bestHandNameRef.current = winnerHand0.hand_name;
      }
    }

    const mySeat = tableState.seats.find(s => s.player_id === user.id);
    const allStacks = tableState.seats.filter(s => s.player_id).map(s => s.stack);
    const avgStack = allStacks.length > 0 ? allStacks.reduce((a, b) => a + b, 0) / allStacks.length : 0;
    const heroStack = mySeat?.stack ?? 0;
    const isChipLeader = allStacks.length > 0 && heroStack >= Math.max(...allStacks);
    const playerCount = allStacks.length;
    const winnerHand = handWinners.find(w => w.player_id === user.id);
    const potWon = winnerHand?.amount ?? 0;
    const wasDesperate = heroStack > 0 && (heroStack - potWon) < avgStack * 0.1 && heroWon;
    const wasAllIn = mySeat?.status === 'all-in';
    const isBB = hand?.bb_seat === mySeat?.seat;

    const ctx: AchievementContext = {
      heroWon,
      winStreak: winStreakRef.current,
      handName: winnerHand?.hand_name ?? null,
      potWon,
      bigBlind: tableState.table.big_blind,
      heroStack,
      startingStack: startingStackRef.current || heroStack,
      averageStack: avgStack,
      allInWin: heroWon && !!wasAllIn,
      playerCount,
      isChipLeader,
      handsPlayed: handsPlayedRef.current,
      chatMessagesSent: chatCountRef.current,
      wonFromBB: heroWon && !!isBB,
      isHeadsUp: playerCount === 2,
      lastPlayerStanding: playerCount === 1 && !!mySeat,
      wasDesperate,
    };

    const newAchs = checkAndAward(ctx);
    if (newAchs.length > 0) {
      play('achievement');
    }
  }, [handWinners]);

  // Voice: announce hand winners
  useEffect(() => {
    if (handWinners.length === 0 || !user) return;
    for (const winner of handWinners) {
      const isHero = winner.player_id === user.id;
      const name = isHero ? 'You' : winner.display_name;
      const handName = winner.hand_name && winner.hand_name !== 'Last standing'
        ? winner.hand_name
        : undefined;
      if (handName) {
        announceCustom(`${name} win${isHero ? '' : 's'} ${winner.amount} chips with ${handName}`);
      } else {
        announceCustom(`${name} take${isHero ? '' : 's'} the pot, ${winner.amount} chips`);
      }
    }
  }, [handWinners, user, announceCustom]);

  // Voice: detect all-in from lastActions
  useEffect(() => {
    if (!lastActions) return;
    const handId = tableState?.current_hand?.hand_id ?? '';
    for (const [playerId, actionStr] of Object.entries(lastActions)) {
      const lower = actionStr.toLowerCase();
      if (lower === 'all_in' || lower === 'all-in') {
        const key = `voice:${playerId}:${lower}:${handId}`;
        if (!processedActionsRef.current.has(key)) {
          processedActionsRef.current.add(key);
          const seat = tableState?.seats.find(s => s.player_id === playerId);
          const playerName = seat?.display_name || 'A player';
          announceCustom(`All in! ${playerName} is all in!`);
          break;
        }
      }
    }
  }, [lastActions, announceCustom]);

  // Voice: detect heads-up
  useEffect(() => {
    if (!tableState) return;
    const activeCount = tableState.seats.filter(s => s.player_id && s.stack > 0).length;
    if (prevActiveCountRef.current > 2 && activeCount === 2) {
      announceCustom("We're heads up!");
    }
    prevActiveCountRef.current = activeCount;
  }, [tableState?.seats, announceCustom]);

  // Voice: big pot detection
  useEffect(() => {
    if (!tableState || bigPotAnnouncedRef.current) return;
    const pot = tableState.current_hand?.pots?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    if (pot > tableState.table.big_blind * 10) {
      bigPotAnnouncedRef.current = true;
      announceCustom("Big pot building!");
    }
  }, [tableState?.current_hand?.pots, announceCustom]);

  // Precache common voice phrases on mount
  useEffect(() => { precache(); }, [precache]);

  // Your turn: sound + haptic + pre-action execution
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      // Execute queued pre-action
      if (preAction) {
        const executePreAction = async () => {
          let actionToFire: { type: string; amount?: number } | null = null;
          if (preAction === 'check_fold') {
            actionToFire = amountToCall === 0 ? { type: 'check' } : { type: 'fold' };
          } else if (preAction === 'call_any') {
            actionToFire = amountToCall === 0 ? { type: 'check' } : { type: 'call' };
          } else if (preAction === 'check') {
            // ONLY fire if there is genuinely nothing to call
            if (amountToCall === 0) actionToFire = { type: 'check' };
            // Otherwise discard silently (do NOT call)
          }
          setPreAction(null);
          if (actionToFire) {
            haptic(actionToFire.type as any);
            await handleAction(actionToFire);
            return;
          }
        };
        executePreAction();
      } else {
        play('yourTurn');
        haptic('cardReveal');
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      }
    }
    prevIsMyTurnRef.current = isMyTurn;
    if (!isMyTurn) setLowTimeWarning(false);
  }, [isMyTurn, play, haptic, preAction, amountToCall]);

  // Clear pre-action and card peek on new hand
  useEffect(() => {
    const currentHandId = tableState?.current_hand?.hand_id ?? null;
    if (currentHandId) {
      setPreAction(null);
    }
  }, [tableState?.current_hand?.hand_id]);

  // Invalidate pre-action "check" if a bet comes in
  useEffect(() => {
    const currentBet = tableState?.current_hand?.current_bet ?? 0;
    if (preAction === 'check' && currentBet > prevBetRef.current && currentBet > 0) {
      setPreAction(null);
    }
    prevBetRef.current = currentBet;
  }, [tableState?.current_hand?.current_bet, preAction]);

  useEffect(() => {
    if (!tableState && !loading && !error && !gameOver) {
      toast({ title: 'Table closed', description: 'This table has been closed.' });
      onLeave();
    }
  }, [error, tableState, loading, onLeave, gameOver]);

  // Game over detection — loser (stack=0) OR winner (last player standing)
  useEffect(() => {
    if (!tableState || !user) return;
    const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
    if (!mySeatInfo || handWinners.length === 0) return;

    const activePlayers = tableState.seats.filter(s => s.player_id && s.stack > 0);

    // LOSER: my stack is 0 after a hand result
    if (mySeatInfo.stack <= 0) {
      const winner = handWinners[0];
      announceGameOver(winner?.display_name || 'Unknown', false);
      const timer = setTimeout(() => {
        setGameOver(true);
        setGameOverWinners(handWinners);
      }, 4000);
      return () => clearTimeout(timer);
    }

    // WINNER: I'm the last player with chips
    if (activePlayers.length === 1 && activePlayers[0].player_id === user.id) {
      announceGameOver('You', true);
      const timer = setTimeout(() => {
        setGameOver(true);
        setGameOverWinners(handWinners);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [tableState, user, handWinners]);

  // Game over: last player standing when opponent LEFT (no hand result)
  useEffect(() => {
    if (gameOver || !tableState || !user) return;
    // Don't trigger on a fresh table where no hands have been played yet
    if (handsPlayedRef.current === 0) return;
    const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
    if (!mySeatInfo || mySeatInfo.stack <= 0) return;

    const activePlayers = tableState.seats.filter(s => s.player_id && s.stack > 0);
    if (activePlayers.length !== 1 || activePlayers[0].player_id !== user.id) return;

    // Don't trigger if handWinners already handled it (avoids double-fire)
    if (handWinners.length > 0) return;

    // Only trigger if no hand is in progress
    const handPhase = tableState.current_hand?.phase;
    if (handPhase && handPhase !== 'complete') return;

    announceGameOver('You', true);
    const timer = setTimeout(() => {
      setGameOver(true);
      setGameOverWinners([{
        player_id: user.id,
        display_name: 'You',
        amount: mySeatInfo.stack,
        hand_name: 'Last Standing',
      }]);
    }, 4000);
    return () => clearTimeout(timer);
  }, [tableState?.seats, user, gameOver, handWinners]);

  // Shared XP + stats save helper (called on game over AND on leave)
  const saveXpAndStats = useCallback(async (isWinnerOverride?: boolean) => {
    if (xpSavedRef.current || !user) return;
    if (handsPlayedRef.current === 0) return; // No XP for join-and-leave
    xpSavedRef.current = true;

    const mySeatInfo = tableState?.seats.find(s => s.player_id === user.id);
    const finalChips = mySeatInfo?.stack ?? 0;
    const isWinner = isWinnerOverride ?? (finalChips > 0 &&
      (tableState?.seats.filter(s => s.player_id && s.stack > 0).length ?? 0) === 1);
    const isTournament = !!(tableState?.table as any)?.tournament_id;

    // Save play result (FIX XP-1: add error handling)
    const { error: resultErr } = await supabase.from('poker_play_results').insert({
      user_id: user.id,
      game_mode: isTournament ? 'tournament' : 'multiplayer',
      hands_played: handsPlayedRef.current,
      hands_won: handsWonRef.current,
      best_hand_name: bestHandNameRef.current || null,
      best_hand_rank: bestHandRankRef.current >= 0 ? bestHandRankRef.current : null,
      biggest_pot: biggestPotRef.current,
      starting_chips: startingStackRef.current,
      final_chips: finalChips,
      bot_count: 0,
      duration_seconds: Math.floor((Date.now() - gameStartTimeRef.current) / 1000),
    });
    if (resultErr) console.error('[XP] poker_play_results insert failed:', resultErr);

    // Award XP
    const xpEvents: Array<{ user_id: string; xp_amount: number; reason: string }> = [];
    const boost = isTournament ? 1.15 : 1;
    xpEvents.push({ user_id: user.id, xp_amount: Math.round(25 * boost), reason: 'game_complete' });
    if (isWinner) xpEvents.push({ user_id: user.id, xp_amount: Math.round(100 * boost), reason: 'game_win' });
    if (handsPlayedRef.current > 0)
      xpEvents.push({ user_id: user.id, xp_amount: Math.round(handsPlayedRef.current * boost), reason: 'hands_played' });
    if (handsWonRef.current > 0)
      xpEvents.push({ user_id: user.id, xp_amount: Math.round(handsWonRef.current * 10 * boost), reason: 'hands_won' });

    const { error: xpErr } = await supabase.from('xp_events').insert(xpEvents);
    if (xpErr) console.error('[XP] xp_events insert failed:', xpErr);

    // Fetch updated XP for level-up animation
    // Small delay to let the DB trigger process
    await new Promise(r => setTimeout(r, 500));
    const { data: newXp } = await supabase.from('player_xp')
      .select('total_xp').eq('user_id', user.id).maybeSingle();

    const endXp = newXp?.total_xp ?? 0;
    const sXp = startXpRef.current ?? 0;
    const totalGained = xpEvents.reduce((s, e) => s + e.xp_amount, 0);

    if (totalGained > 0) {
      setXpOverlay({ startXp: sXp, endXp, xpGained: totalGained });
      return 'show_overlay';
    }
    return 'no_overlay';
  }, [user, tableState]);

  // Save XP on game over
  useEffect(() => {
    if (!gameOver || !user || xpSavedRef.current) return;
    const mySeatInfo = tableState?.seats.find(s => s.player_id === user.id);
    const isWinner = (mySeatInfo?.stack ?? 0) > 0;
    saveXpAndStats(isWinner);
  }, [gameOver, user, tableState, saveXpAndStats]);

  // Staged community card reveal for all-in runouts
  useEffect(() => {
    const communityCards = tableState?.current_hand?.community_cards ?? [];
    const prevCount = prevCommunityCountRef.current;
    const newCount = communityCards.length;
    if (newCount > prevCount && (newCount - prevCount) > 1) {
      stagedRunoutRef.current.forEach(t => clearTimeout(t));
      stagedRunoutRef.current = [];
      setVisibleCommunityCards(communityCards.slice(0, Math.min(3, newCount)));
      if (newCount > 3) {
        const t1 = setTimeout(() => setVisibleCommunityCards(communityCards.slice(0, 4)), 1500);
        stagedRunoutRef.current.push(t1);
      }
      if (newCount > 4) {
        const t2 = setTimeout(() => setVisibleCommunityCards(communityCards.slice(0, 5)), 3000);
        stagedRunoutRef.current.push(t2);
      }
    } else {
      setVisibleCommunityCards(communityCards);
    }
    prevCommunityCountRef.current = newCount;
    if (newCount === 0) {
      stagedRunoutRef.current.forEach(t => clearTimeout(t));
      stagedRunoutRef.current = [];
      prevCommunityCountRef.current = 0;
    }
  }, [tableState?.current_hand?.community_cards]);

  useEffect(() => {
    return () => { stagedRunoutRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  // Deal animation on new hand + dealAnimDone gating for action buttons
  const [dealAnimDone, setDealAnimDone] = useState(true);
  useEffect(() => {
    const currentHandId = tableState?.current_hand?.hand_id ?? null;
    if (currentHandId && currentHandId !== prevAnimHandIdRef.current && tableState?.current_hand?.phase === 'preflop') {
      setDealing(true);
      setDealAnimDone(false);
      processedActionsRef.current.clear();
      const activePlayers = (tableState?.seats ?? []).filter(s => s.player_id && s.status !== 'eliminated').length;
      // Duration: 2 cards per player * 0.12s stagger + 0.45s fly + 0.3s reveal buffer
      const dealDurationMs = ((activePlayers * 2) * 0.15 + 0.45 + 0.3) * 1000;
      const dealTimer = setTimeout(() => setDealAnimDone(true), dealDurationMs);
      const visualMs = ((activePlayers * 2) * 0.15 + 0.45) * 1000 + 200;
      const visualTimer = setTimeout(() => setDealing(false), visualMs);
      prevAnimHandIdRef.current = currentHandId;
      return () => { clearTimeout(dealTimer); clearTimeout(visualTimer); };
    }
    if (!currentHandId) {
      prevAnimHandIdRef.current = null;
      setDealAnimDone(true);
    }
  }, [tableState?.current_hand?.hand_id, tableState?.current_hand?.phase]);

  // Chip animation: pot flies to winner
  useEffect(() => {
    if (handWinners.length === 0 || !tableState) return;
    const winner = handWinners[0];
    const heroSeatNum = mySeatNumber ?? 0;
    const maxSeatsCount = tableState.table.max_seats;
    const isLand = window.innerWidth > window.innerHeight;
    const positionsArr = getSeatPositions(maxSeatsCount, isLand);
    const winnerSeat = tableState.seats.find(s => s.player_id === winner.player_id);
    if (!winnerSeat) return;
    const screenIdx = ((winnerSeat.seat - heroSeatNum) + maxSeatsCount) % maxSeatsCount;
    const winnerPos = positionsArr[screenIdx];
    if (!winnerPos) return;
    const newChips = Array.from({ length: 6 }, (_, i) => ({
      id: chipAnimIdRef.current++,
      toX: winnerPos.xPct,
      toY: winnerPos.yPct,
    }));
    setChipAnimations(newChips);
    const timer = setTimeout(() => setChipAnimations([]), 1200);
    return () => clearTimeout(timer);
  }, [handWinners, tableState, mySeatNumber]);

  // Low time callback
  const handleLowTime = useCallback(() => {
    if (isMyTurn) {
      setLowTimeWarning(true);
      play('timerWarning');
      announceCountdown();
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      setTimeout(() => setLowTimeWarning(false), 2500);
    }
  }, [isMyTurn, play, announceCountdown]);

  const handleReconnect = useCallback(() => { refreshState(); }, [refreshState]);

  // ── Memoized derived values ──
  const table = tableState?.table;
  const seats = tableState?.seats ?? [];
  const hand = tableState?.current_hand ?? null;
  const maxSeats = table?.max_seats ?? 9;
  const heroSeat = mySeatNumber ?? 0;

  const seatsKey = seats.map(s => `${s.seat}|${s.player_id}|${s.status}|${s.stack}|${s.current_bet}`).join(';');
  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const rotatedSeats = useMemo<(OnlineSeatInfo | null)[]>(() => Array.from(
    { length: maxSeats },
    (_, i) => {
      const actualSeat = (heroSeat + i) % maxSeats;
      return seatsRef.current.find(s => s.seat === actualSeat) || null;
    }
  ), [seatsKey, maxSeats, heroSeat]);

  const activeScreenPositions = useMemo(() => {
    const pos: number[] = [];
    rotatedSeats.forEach((sd, sp) => { if (sd?.player_id) pos.push(sp); });
    return pos;
  }, [rotatedSeats]);

  const clockwiseOrder = useMemo(() => {
    if (!hand) return activeScreenPositions;
    const dealerScreenPos = ((hand.dealer_seat - heroSeat) + maxSeats) % maxSeats;
    const dealerIdx = activeScreenPositions.indexOf(dealerScreenPos);
    return dealerIdx >= 0
      ? [...activeScreenPositions.slice(dealerIdx + 1), ...activeScreenPositions.slice(0, dealerIdx + 1)]
      : activeScreenPositions;
  }, [activeScreenPositions, hand?.dealer_seat, heroSeat, maxSeats]);

  const playerUserIds = useMemo(() => seats.filter(s => s.player_id).map(s => s.player_id!), [seats]);
  const playerLevels = usePlayerLevels(playerUserIds);

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
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 900 && window.innerWidth < 1200;
  const isLargeDesktop = typeof window !== 'undefined' && window.innerWidth >= 1920;

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
    try {
      // Save XP before leaving
      const result = await saveXpAndStats(false);
      voiceChat.disconnect();
      if (result === 'show_overlay') {
        // Overlay will call leaveTable + onLeave via its Continue button
        return;
      }
      await leaveTable();
      onLeave();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleLeaveSeat = async () => {
    try {
      await leaveSeat();
      toast({ title: 'You are now spectating' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyInviteCode = () => {
    if (table.invite_code) {
      navigator.clipboard.writeText(table.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAction = async (action: { type: string; amount?: number }) => {
    // Haptic feedback per action type
    const hapticMap: Record<string, any> = { check: 'check', call: 'call', raise: 'raise', 'all-in': 'allIn', fold: 'fold' };
    if (hapticMap[action.type]) haptic(hapticMap[action.type]);
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

  const showActions = isMyTurn && dealAnimDone && !dealing && !actionPending && mySeat && mySeat.status !== 'folded' && myCards !== null;

  return (
    <PokerErrorBoundary onReconnect={handleReconnect} onLeave={onLeave}>
    <div className="fixed inset-0 overflow-hidden z-[60]">
      {/* Portrait block overlay */}
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

      {/* BG LAYERS */}
      <img src={pokerBg} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} style={{ zIndex: Z.BG }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: Z.BG, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.2), rgba(0,0,0,0.8))' }} />

      {/* Achievement toast */}
      {newAchievement && <AchievementToast achievement={newAchievement} onDismiss={clearNew} />}

      {/* HEADER BAR */}
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
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowQuitConfirm(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
            title="Leave Table"
          >
            <DoorOpen className="h-3.5 w-3.5 text-foreground/80" />
          </button>
          {isSeated && (
            <button onClick={() => setShowLeaveSeatConfirm(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
              title="Leave Seat"
            >
              <LogOut className="h-3.5 w-3.5 text-foreground/80" />
            </button>
          )}
          <span className="text-[10px] font-bold text-foreground/80 truncate max-w-[120px]">{table.name}</span>
          <span className="text-[10px] text-foreground/60 font-medium">{table.small_blind}/{table.big_blind}</span>
          {table.blind_timer_minutes > 0 && table.last_blind_increase_at && (
            <OnlineBlindTimer
              lastIncreaseAt={table.last_blind_increase_at}
              timerMinutes={table.blind_timer_minutes}
              currentSmall={table.small_blind}
              currentBig={table.big_blind}
            />
          )}
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
          {/* Sound toggle — always visible */}
          <button onClick={toggleSound}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-foreground/80" /> : <VolumeX className="h-3.5 w-3.5 text-foreground/40" />}
          </button>

          {/* Voice Chat Controls */}
          <VoiceChatControls
            connected={voiceChat.connected}
            connecting={voiceChat.connecting}
            micMuted={voiceChat.micMuted}
            deafened={voiceChat.deafened}
            onConnect={voiceChat.connect}
            onDisconnect={voiceChat.disconnect}
            onToggleMic={voiceChat.toggleMic}
            onToggleDeafen={voiceChat.toggleDeafen}
          />

          {/* QuickChat — always visible in header */}
          <QuickChat onSend={trackedSendChat} />

          {/* In mobile landscape, collapse non-essential buttons into three-dot menu */}
          {isMobileLandscape ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
                  <MoreVertical className="h-3.5 w-3.5 text-foreground/80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[70]">
                {lastHand && (
                  <DropdownMenuItem onClick={() => setReplayOpen(true)}>
                    <History className="h-3.5 w-3.5 mr-2" /> Hand History
                  </DropdownMenuItem>
                )}
                {table.invite_code && (
                  <DropdownMenuItem onClick={copyInviteCode}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> {codeCopied ? 'Copied!' : 'Copy Code'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-2" /> Invite Players
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleVoice}>
                  {voiceEnabled ? <Mic className="h-3.5 w-3.5 mr-2" /> : <MicOff className="h-3.5 w-3.5 mr-2" />}
                  {voiceEnabled ? 'Voice On' : 'Voice Off'}
                </DropdownMenuItem>
                {voiceChat.connected && (
                  <>
                    <DropdownMenuItem onClick={voiceChat.toggleMic}>
                      {voiceChat.micMuted ? <MicOff className="h-3.5 w-3.5 mr-2" /> : <Mic className="h-3.5 w-3.5 mr-2" />}
                      {voiceChat.micMuted ? 'Unmute Mic' : 'Mute Mic'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={voiceChat.toggleDeafen}>
                      {voiceChat.deafened ? <HeadphoneOff className="h-3.5 w-3.5 mr-2" /> : <Headphones className="h-3.5 w-3.5 mr-2" />}
                      {voiceChat.deafened ? 'Undeafen' : 'Mute All'}
                    </DropdownMenuItem>
                  </>
                )}
                {isCreator && canModerate && activeSeats.filter(s => s.player_id !== user?.id).map(s => (
                  <DropdownMenuItem key={s.player_id} onClick={() => setKickTarget({ id: s.player_id!, name: s.display_name })}>
                    <UserX className="h-3.5 w-3.5 mr-2" /> Kick {s.display_name}
                  </DropdownMenuItem>
                ))}
                {isCreator && canModerate && (
                  <DropdownMenuItem onClick={() => setCloseConfirm(true)} className="text-destructive">
                    <XCircle className="h-3.5 w-3.5 mr-2" /> Close Table
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {lastHand && (
                <button onClick={() => setReplayOpen(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
                >
                  <History className="h-3.5 w-3.5 text-foreground/80" />
                </button>
              )}
              {table.invite_code && (
                <button onClick={copyInviteCode}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
                >
                  {codeCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-foreground/80" />}
                </button>
              )}
              <button onClick={() => setInviteOpen(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
              >
                <UserPlus className="h-3.5 w-3.5 text-foreground/80" />
              </button>
              <button onClick={toggleVoice}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
                title={voiceEnabled ? 'Voice announcements on' : 'Voice announcements off'}
              >
                {voiceEnabled ? <Mic className="h-3.5 w-3.5 text-foreground/80" /> : <MicOff className="h-3.5 w-3.5 text-foreground/40" />}
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
            </>
          )}
          <div className="flex items-center gap-0.5 text-[10px] text-foreground/50">
            <Users className="h-3 w-3" />
            <span>{activeSeats.length}/{table.max_seats}</span>
          </div>
          {spectatorCount > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/40 text-foreground/50 font-bold">
              <Eye className="h-2.5 w-2.5" /> {spectatorCount}
            </span>
          )}
        </div>
      </div>

      {/* TABLE SCENE */}
      {(() => {
        const panelW = isMobileLandscape && typeof window !== 'undefined' && window.innerWidth < 900 ? 160 : 200;
        return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: Z.TABLE }}>
        <div className="w-full h-full flex items-center justify-center">
        <div
          className="relative"
          style={{
            aspectRatio: '16 / 9',
            width: isLandscape ? 'min(79vw, 990px)' : 'min(86vw, 990px)',
            maxWidth: '990px',
            maxHeight: isLandscape ? '82vh' : '80vh',
            overflow: 'visible',
            containerType: 'size',
          }}
        >
          <TableFelt />
          <img
            src={hhLogo}
            alt=""
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-auto pointer-events-none select-none"
            style={{ zIndex: Z.LOGO, opacity: 0.75 }}
            draggable={false}
          />

          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: isMobileLandscape ? 'calc(-4% - 32px)' : isTablet ? 'calc(-4% + 8px)' : isLargeDesktop ? 'calc(-4% - 31px)' : 'calc(-4% - 27px)', width: 'min(9vw, 140px)', zIndex: Z.DEALER }}>
            <DealerCharacter expression={dealerExpression} />
          </div>

          {totalPot > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ top: '20%', zIndex: Z.CARDS }}>
              <PotDisplay pot={totalPot} />
              <PotOddsDisplay pot={totalPot} amountToCall={amountToCall} visible={isMyTurn && amountToCall > 0} />
            </div>
          )}

          {/* 5-slot community card layout */}
          <div className="absolute left-1/2 flex gap-1.5 items-center" style={{ top: '50%', transform: 'translate(-50%, -50%)', zIndex: Z.CARDS }}>
            {[0, 1, 2, 3, 4].map(slotIdx => {
              const card = visibleCommunityCards[slotIdx];
              // Determine if this card was just dealt (new in current phase)
              const isNewInPhase = (() => {
                if (!communityCardPhaseKey) return false;
                const phase = communityCardPhaseKey.split('-')[0];
                if (phase === 'flop' && slotIdx < 3) return true;
                if (phase === 'turn' && slotIdx === 3) return true;
                if (phase === 'river' && slotIdx === 4) return true;
                return false;
              })();
              const staggerIdx = (() => {
                const phase = communityCardPhaseKey?.split('-')[0];
                if (phase === 'flop') return slotIdx;
                return 0;
              })();
              return (
                <div key={slotIdx} className="w-[44px] h-[62px] rounded-lg border border-white/15 flex items-center justify-center"
                  style={{ background: card ? 'transparent' : 'hsl(160 30% 8% / 0.3)' }}>
                  {card && (
                    <CardDisplay
                      card={card}
                      size="xl"
                      dealDelay={0}
                      dealFromDealer={isNewInPhase ? staggerIdx * 0.2 : undefined}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {(!hand || visibleCommunityCards.length === 0) && (
            <div className="absolute left-1/2 -translate-x-1/2 text-[10px] text-foreground/20 italic font-medium" style={{ top: 'calc(50% + 28px)', zIndex: Z.LOGO, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {activeSeats.length >= 2 ? 'Starting soon...' : 'Waiting for players...'}
            </div>
          )}

          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '68%', zIndex: Z.CARDS }}>
            {hand ? (
              <span className={cn(
                'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
                (hand.phase === 'flop' || hand.phase === 'turn' || hand.phase === 'river') && 'animate-phase-flash',
              )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
                {hand.phase === 'preflop' ? 'Pre-Flop' : hand.phase === 'complete' ? 'Showdown' : hand.phase}
              </span>
            ) : null}
          </div>

          {isSeated && !hand && !autoStartAttempted && !handHasEverStarted && activeSeats.length >= 2 && (
            <button
              onClick={() => startHand()}
              className="absolute px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all animate-pulse"
              style={{ zIndex: Z.ACTIONS, bottom: '28%', left: '50%', transform: 'translateX(-50%)' }}
            >
              <Play className="h-3 w-3 inline mr-1" /> Deal Hand
            </button>
          )}

          {isShowdown && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.EFFECTS }}>
              {particlePositions.map((p, i) => (
                <div key={i} className="absolute w-1.5 h-1.5 rounded-full animate-particle-float"
                  style={{ left: `${p.left}%`, top: `${p.top}%`, background: 'radial-gradient(circle, hsl(43 74% 60%), hsl(43 74% 49% / 0))', animationDelay: `${i * 0.2}s`, boxShadow: '0 0 4px hsl(43 74% 49% / 0.6)' }}
                />
              ))}
            </div>
          )}

          {handWinners.length > 0 && !gameOver && (
            <WinnerOverlay
              winners={handWinners.map(w => ({ name: w.player_id === user?.id ? 'You' : w.display_name, hand: { name: w.hand_name || 'Winner', rank: 0, score: 0, bestCards: [] }, chips: w.amount }))}
              isGameOver={false} onNextHand={() => {}} onQuit={() => {}}
            />
          )}

          {gameOver && (
            <WinnerOverlay
              winners={gameOverWinners.map(w => ({ name: w.player_id === user?.id ? 'You' : w.display_name, hand: { name: w.hand_name || 'Winner', rank: 0, score: 0, bestCards: [] }, chips: w.amount }))}
              isGameOver={true}
              stats={{
                handsPlayed: handsPlayedRef.current,
                handsWon: handsWonRef.current,
                bestHandName: bestHandNameRef.current,
                biggestPot: biggestPotRef.current,
                duration: Math.floor((Date.now() - gameStartTimeRef.current) / 1000),
              }}
              onNextHand={() => { leaveTable().then(onLeave).catch(onLeave); }} onQuit={() => { leaveTable().then(onLeave).catch(onLeave); }}
            />
          )}

          {/* XP Level-Up Overlay */}
          {xpOverlay && (
            <XPLevelUpOverlay
              startXp={xpOverlay.startXp}
              endXp={xpOverlay.endXp}
              xpGained={xpOverlay.xpGained}
              onContinue={() => {
                setXpOverlay(null);
                leaveTable().then(onLeave).catch(onLeave);
              }}
            />
          )}

          {((handWinners.length > 0 && handWinners.some(w => w.player_id === user?.id)) || (gameOver && gameOverWinners.some(w => w.player_id === user?.id))) && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.EFFECTS + 10 }}>
              {confettiPositions.map((c, i) => (
                <div key={i} className="absolute animate-confetti-drift"
                  style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.w}px`, height: `${c.h}px`, background: ['hsl(43 74% 49%)', 'hsl(0 70% 50%)', 'hsl(210 80% 55%)', 'hsl(142 70% 45%)', 'hsl(280 60% 55%)'][i % 5], borderRadius: c.round ? '50%' : '2px', animationDelay: `${i * 0.08}s`, animationDuration: `${c.dur}s` }}
                />
              ))}
            </div>
          )}

          {chipAnimations.map((chip, i) => (
            <ChipAnimation key={chip.id} fromX={50} fromY={20} toX={chip.toX} toY={chip.toY} duration={900} delay={i * 80} />
          ))}

          {dealing && (() => {
            const posArr = positions;
            const activeSeatCount = clockwiseOrder.length;


            return rotatedSeats.map((seatData, screenPos) => {
              if (!seatData?.player_id) return null;
              const pos = posArr[screenPos];
              if (!pos) return null;
              const seatOrder = clockwiseOrder.indexOf(screenPos);
              if (seatOrder < 0) return null;
              return [0, 1].map(cardIdx => {
                const delay = (cardIdx * activeSeatCount + seatOrder) * 0.15;
                return (
                  <div key={`deal-${screenPos}-${cardIdx}`} className="absolute pointer-events-none"
                    style={{ left: '50%', top: '2%', zIndex: Z.EFFECTS, animation: `deal-card-fly 0.45s ease-out ${delay}s both`, ['--deal-dx' as any]: `${pos.xPct - 50}cqw`, ['--deal-dy' as any]: `${pos.yPct - 2}cqh` }}>
                    <div className="w-6 h-9 rounded card-back-premium border border-white/10" />
                  </div>
                );
              });
            });
          })()}

          {/* communityDealSprites removed — actual cards animate via dealFromDealer */}

          {chatBubbles.map(bubble => {
            const seatInfo = tableState.seats.find(s => s.player_id === bubble.player_id);
            if (!seatInfo) return null;
            const heroSeatNum = mySeatNumber ?? 0;
            const screenIdx = ((seatInfo.seat - heroSeatNum) + maxSeats) % maxSeats;
            const pos = positions[screenIdx];
            if (!pos) return null;
            const isSingleEmoji = /^\p{Emoji}$/u.test(bubble.text);
            return (
              <div key={bubble.id} className="absolute pointer-events-none"
                style={{ left: `${pos.xPct}%`, top: `${pos.yPct - 12}%`, transform: `translateX(${pos.xPct < 30 ? '-10%' : pos.xPct > 70 ? '-90%' : '-50%'})`, zIndex: Z.EFFECTS + 5 }}>
                <div className={isSingleEmoji ? 'animate-emote-pop' : 'animate-float-up'}>
                  {isSingleEmoji ? (
                    <span className="text-2xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{bubble.text}</span>
                  ) : (
                    <span className="text-sm px-2 py-1 rounded-lg font-bold"
                      style={{ background: 'hsl(0 0% 0% / 0.7)', color: 'hsl(45 30% 95%)', border: '1px solid hsl(43 74% 49% / 0.3)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      {bubble.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* SEATS */}
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
                  <EmptySeatDisplay seatNumber={actualSeatNumber} canJoin={!isSeated} onJoin={() => handleJoinSeat(actualSeatNumber)} />
                </SeatAnchor>
              );
            }

            const opponentRevealed = !isMe ? revealedCards.find(rc => rc.player_id === seatData!.player_id)?.cards ?? null : null;
            const playerLastAction = seatData!.player_id ? lastActions[seatData!.player_id] : undefined;
            const player = toPokerPlayer(seatData!, !!isDealer, isMe ? myCards : null, isMe, opponentRevealed, playerLastAction);
            const showCards = isMe || (isShowdown && (seatData!.status === 'active' || seatData!.status === 'all-in'));

            return (
              <SeatAnchor key={seatData!.player_id} xPct={pos.xPct} yPct={pos.yPct} zIndex={isMe ? Z.SEATS + 1 : Z.SEATS}>
                <PlayerSeat
                  player={player} isCurrentPlayer={!!isCurrentActor && !isFolded} showCards={showCards}
                  isHuman={!!isMe} isShowdown={!!isShowdown} cardsPlacement={CARDS_PLACEMENT[pos.seatKey]}
                  compact={isMobileLandscape} avatarUrl={seatData!.avatar_url}
                  seatDealOrder={Math.max(0, clockwiseOrder.indexOf(screenPos))} totalActivePlayers={activeSeats.length}
                  disableDealAnim={activeScreenPositions.indexOf(screenPos) < 0}
                  level={seatData!.player_id ? playerLevels[seatData!.player_id] : undefined}
                  countryCode={seatData!.country_code}
                  onTimeout={isMe && isCurrentActor ? () => handleAction({ type: 'fold' }) : undefined}
                  onLowTime={isMe && isCurrentActor ? handleLowTime : undefined}
                  isDisconnected={!isMe && !!seatData!.player_id && !onlinePlayerIds.has(seatData!.player_id)}
                  isSpeaking={!!seatData!.player_id && !!voiceChat.speakingMap[seatData!.player_id]}
                />
              </SeatAnchor>
            );
          })}
        </div>

        {/* Betting panel — absolute overlay in mobile landscape */}
        {isMobileLandscape && showActions && mySeat && (
          <div className="absolute right-0"
            style={{ width: `${panelW}px`, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', paddingRight: 'max(env(safe-area-inset-right, 0px), 13px)', zIndex: Z.ACTIONS }}
          >
            <BettingControls landscape panelWidth={panelW} canCheck={canCheck} amountToCall={amountToCall} minRaise={hand?.min_raise ?? table.big_blind} maxBet={hand?.current_bet ?? 0} playerChips={mySeat.stack} bigBlind={table.big_blind} pot={totalPot} onAction={handleAction} />
          </div>
        )}
        </div>
      </div>
        );
      })()}

      {/* YOUR TURN badge */}
      {showActions && (
        <div className="absolute pointer-events-none" style={{ bottom: isMobileLandscape ? 'calc(18% + 65px)' : isLandscape ? 'calc(18% + 100px)' : 'calc(22% + 65px)', left: '50%', transform: 'translateX(-50%)', zIndex: Z.ACTIONS }}>
          <span className="text-[10px] px-3 py-1 rounded-full font-black animate-turn-pulse"
            style={{ background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.3), hsl(43 74% 49% / 0.15))', color: 'hsl(43 74% 60%)', border: '1px solid hsl(43 74% 49% / 0.4)', textShadow: '0 0 8px hsl(43 74% 49% / 0.5)' }}>
            YOUR TURN
          </span>
        </div>
      )}

      {/* 5 SEC LEFT warning */}
      {lowTimeWarning && (
        <div className="absolute pointer-events-none animate-low-time-pill" style={{ top: '28%', left: '50%', transform: 'translateX(-50%)', zIndex: Z.ACTIONS + 1 }}>
          <span className="text-[11px] px-4 py-1.5 rounded-full font-black"
            style={{ background: 'linear-gradient(135deg, hsl(0 70% 50% / 0.8), hsl(0 70% 40% / 0.6))', color: 'hsl(0 0% 100%)', border: '1px solid hsl(0 70% 50% / 0.6)', textShadow: '0 0 8px hsl(0 70% 50% / 0.8)', animation: 'low-time-pulse 0.5s ease-in-out infinite' }}>
            5 SEC LEFT!
          </span>
        </div>
      )}

      {/* ACTION CONTROLS — only render non-grid landscape/portrait here */}
      {showActions && mySeat && !(isMobileLandscape) && (
        isLandscape ? (
          <div className="absolute" style={{ zIndex: Z.ACTIONS, right: 'calc(env(safe-area-inset-right, 0px) + 15px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
            <BettingControls landscape canCheck={canCheck} amountToCall={amountToCall} minRaise={hand?.min_raise ?? table.big_blind} maxBet={hand?.current_bet ?? 0} playerChips={mySeat.stack} bigBlind={table.big_blind} pot={totalPot} onAction={handleAction} />
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 px-3 pt-1" style={{ zIndex: Z.ACTIONS, paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 10px)', background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.8))' }}>
            <BettingControls canCheck={canCheck} amountToCall={amountToCall} minRaise={hand?.min_raise ?? table.big_blind} maxBet={hand?.current_bet ?? 0} playerChips={mySeat.stack} bigBlind={table.big_blind} pot={totalPot} onAction={handleAction} />
          </div>
        )
      )}

      {/* Pre-action buttons — top-right, stacked vertically */}
      {!showActions && isSeated && hand && mySeat && mySeat.status !== 'folded' && (
        <div className="absolute" style={{ zIndex: Z.ACTIONS, top: 'calc(env(safe-area-inset-top, 0px) + 48px)', right: 'calc(env(safe-area-inset-right, 0px) + 10px)' }}>
          <PreActionButtons canPreCheck={canCheck} amountToCall={amountToCall} onQueue={setPreAction} queued={preAction} />
        </div>
      )}

      {/* Spectator overlay */}
      {isSpectator && (
        <>
          <div className="absolute left-0 right-0 text-center pointer-events-none"
            style={{ zIndex: Z.ACTIONS, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 85px)' }}>
            <p className="text-xs font-bold" style={{ color: 'hsl(43 74% 60%)', textShadow: '0 0 8px hsl(43 74% 49% / 0.4)' }}>
              Tap a glowing seat to join
            </p>
          </div>
          <button onClick={onLeave}
            className="absolute flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ zIndex: Z.ACTIONS, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', left: 'calc(env(safe-area-inset-left, 0px) + 12px)', background: 'linear-gradient(180deg, hsl(0 0% 15%), hsl(0 0% 10%))', color: 'hsl(0 0% 60%)', border: '1px solid hsl(0 0% 20%)' }}>
            <DoorOpen className="h-3.5 w-3.5" /> Leave
          </button>
        </>
      )}

      {/* Kick confirmation dialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Kick {kickTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will remove {kickTarget?.name} from the table. They can rejoin later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => kickTarget && handleKickPlayer(kickTarget.id)} className="bg-destructive text-destructive-foreground">Kick Player</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close table confirmation */}
      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Close Table?</AlertDialogTitle>
            <AlertDialogDescription>This will remove all players and permanently close the table.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseTable} className="bg-destructive text-destructive-foreground">Close Table</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connection lost overlay */}
      <ConnectionOverlay
        status={connectionStatus}
        onReconnect={handleReconnect}
        handInProgress={!!hand}
        lastPhase={lastKnownPhase}
        myStack={lastKnownStack}
      />

      {/* Invite players dialog */}
      <InvitePlayersDialog open={inviteOpen} onOpenChange={setInviteOpen} tableId={tableId} tableName={table.name} clubId={table.club_id} />

      {/* Hand Replay sheet */}
      <HandReplay open={replayOpen} onOpenChange={setReplayOpen} hand={lastHand} isLandscape={isLandscape} onExportCSV={exportCSV} />

      {/* Quit confirmation dialog */}
      <AlertDialog open={showQuitConfirm} onOpenChange={setShowQuitConfirm}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Table?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to leave? You will forfeit your seat.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={isSeated ? handleLeave : onLeave} className="bg-red-600 hover:bg-red-700">Leave Table</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Seat confirmation dialog */}
      <AlertDialog open={showLeaveSeatConfirm} onOpenChange={setShowLeaveSeatConfirm}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Seat?</AlertDialogTitle>
            <AlertDialogDescription>You will become a spectator. You can rejoin an empty seat later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveSeat}>Leave Seat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {tableState?.table?.name === 'Testing' && (
        <GameStateDebugPanel
          tableState={tableState}
          myCards={myCards}
          mySeatNumber={mySeatNumber}
          isMyTurn={isMyTurn}
          amountToCall={amountToCall}
          canCheck={canCheck}
          actionPending={actionPending}
          connectionStatus={connectionStatus}
        />
      )}
    </div>
    </PokerErrorBoundary>
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
