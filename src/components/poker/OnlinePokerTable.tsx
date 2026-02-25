import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { PreActionButtons } from './PreActionButtons';
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
import { AchievementContext, ACHIEVEMENT_XP } from '@/lib/poker/achievements';

import pokerBg from '@/assets/poker-background.webp';
import { GameStateDebugPanel } from './GameStateDebugPanel';
import { PlayerProfileDrawer } from './PlayerProfileDrawer';

// Extracted hooks
import { usePokerPreActions } from '@/hooks/usePokerPreActions';
import { usePokerAnimations } from '@/hooks/usePokerAnimations';
import { usePokerAudio } from '@/hooks/usePokerAudio';
import { usePokerGameOver } from '@/hooks/usePokerGameOver';

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
  displayStack?: number,
): PokerPlayer {
  const holeCards = isHero && heroCards ? heroCards : (revealedCards ?? []);
  return {
    id: seat.player_id!,
    name: isHero ? 'You' : seat.display_name,
    chips: displayStack ?? seat.stack,
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    tableState, myCards, loading, error, mySeatNumber, isMyTurn,
    amountToCall, canCheck, joinTable, leaveSeat, leaveTable, startHand, sendAction, revealedCards,
    actionPending, lastActions, handWinners, chatBubbles, sendChat, autoStartAttempted, handHasEverStarted,
    spectatorCount, connectionStatus, lastKnownPhase, lastKnownStack, refreshState, resetForNewGame, onBlindsUp, onlinePlayerIds,
    kickedForInactivity, gameOverPendingRef, preResultStacksRef,
  } = useOnlinePokerTable(tableId);

  // ── UI-only state ──
  const [joining, setJoining] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const voiceChat = useVoiceChat(tableId);
  const { newAchievement, clearNew, checkAndAward } = useAchievements();
  const { lastHand, handHistory, startNewHand, recordAction, finalizeHand, exportCSV } = useHandHistory(tableId);
  const [replayOpen, setReplayOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showLeaveSeatConfirm, setShowLeaveSeatConfirm] = useState(false);
  const [criticalTimeActive, setCriticalTimeActive] = useState(false);
  const [criticalCountdown, setCriticalCountdown] = useState(5);
  const isLandscape = useIsLandscape();
  useLockLandscape();

  // ── Shared refs (passed to multiple hooks) ──
  const processedActionsRef = useRef(new Set<string>());
  const chatCountRef = useRef(0);
  const handStartMaxStackRef = useRef(0);
  const prevSnapshotHandIdRef = useRef<string | null>(null);

  // ── Compose extracted hooks ──
  const audio = usePokerAudio({
    tableState, handWinners, userId: user?.id, lastActions,
    handStartMaxStackRef, processedActionsRef,
  });

  const animations = usePokerAnimations({
    tableState, handWinners, mySeatNumber, preResultStacksRef, processedActionsRef,
  });

  const gameOverHook = usePokerGameOver({
    user, tableState, handWinners, lastKnownStack,
    gameOverPendingRef, leaveSeat, leaveTable, onLeave,
    resetForNewGame, refreshState, announceGameOver: audio.announceGameOver,
    mySeatNumber, chatCountRef, resetAnimations: animations.resetAnimations,
  });

  // handleAction ref for pre-actions (avoids stale closure)
  const handleActionRef = useRef<(action: { type: string; amount?: number }) => Promise<void>>(async () => {});

  const preActions = usePokerPreActions({
    isMyTurn, amountToCall, canCheck, tableState,
    handleActionRef,
    haptic: audio.haptic,
    play: audio.play,
    setCriticalTimeActive,
  });

  // ── Wake lock ──
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  useEffect(() => {
    requestWakeLock();
    return () => { releaseWakeLock(); };
  }, [requestWakeLock, releaseWakeLock]);

  // Auto-connect voice chat when seated — one-shot per seat assignment
  const voiceChatAttemptedRef = useRef(false);
  useEffect(() => {
    if (mySeatNumber !== null && !voiceChatAttemptedRef.current) {
      voiceChatAttemptedRef.current = true;
      voiceChat.connect();
    }
    if (mySeatNumber === null) {
      voiceChatAttemptedRef.current = false;
    }
  }, [mySeatNumber]);

  // One-time achievement XP backfill
  const achievementXpSyncedRef = useRef(false);
  useEffect(() => {
    if (!user || achievementXpSyncedRef.current) return;
    achievementXpSyncedRef.current = true;
    try {
      const raw = localStorage.getItem('poker-achievements');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const unlocked: string[] = parsed.unlocked || [];
      if (unlocked.length === 0) return;

      supabase.from('xp_events')
        .select('reason')
        .eq('user_id', user.id)
        .like('reason', 'achievement:%')
        .then(({ data, error }) => {
          if (error) { console.error('MP XP backfill query error', error); return; }
          const existing = new Set((data ?? []).map(r => r.reason));
          const missing = unlocked.filter(id =>
            ACHIEVEMENT_XP[id] > 0 && !existing.has(`achievement:${id}`)
          );
          if (missing.length === 0) return;
          supabase.from('xp_events').insert(
            missing.map(id => ({
              user_id: user.id,
              xp_amount: ACHIEVEMENT_XP[id],
              reason: `achievement:${id}`,
            }))
          ).then(({ error: insertErr }) => {
            if (insertErr) console.error('MP XP backfill insert error', insertErr);
            else console.log('MP: backfilled XP for', missing.length, 'achievements');
          });
        });
    } catch {}
  }, [user?.id]);

  // "Are you still playing?" popup state
  const [showStillPlayingPopup, setShowStillPlayingPopup] = useState(false);
  const [stillPlayingCountdown, setStillPlayingCountdown] = useState(30);
  const stillPlayingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the 30s countdown when popup is shown
  useEffect(() => {
    if (!showStillPlayingPopup) {
      if (stillPlayingIntervalRef.current) clearInterval(stillPlayingIntervalRef.current);
      stillPlayingIntervalRef.current = null;
      return;
    }
    setStillPlayingCountdown(30);
    stillPlayingIntervalRef.current = setInterval(() => {
      setStillPlayingCountdown(prev => {
        if (prev <= 1) {
          clearInterval(stillPlayingIntervalRef.current!);
          stillPlayingIntervalRef.current = null;
          setShowStillPlayingPopup(false);
          leaveSeat().then(() => {
            toast({ title: '⚠️ Removed from seat', description: 'You were removed for inactivity. You are now spectating.' });
          }).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (stillPlayingIntervalRef.current) clearInterval(stillPlayingIntervalRef.current);
    };
  }, [showStillPlayingPopup, leaveSeat]);

  const handleStillHere = useCallback(() => {
    setShowStillPlayingPopup(false);
  }, []);

  // Listen for blinds_up broadcast and show toast + voice
  useEffect(() => {
    onBlindsUp((payload: any) => {
      toast({
        title: '🔺 Blinds Up!',
        description: `Now ${payload.new_small}/${payload.new_big}`,
      });
      audio.announceBlindUp(payload.new_small, payload.new_big);
    });
  }, [onBlindsUp, audio.announceBlindUp]);

  // Handle server-side inactivity kick
  useEffect(() => {
    if (kickedForInactivity) {
      toast({
        title: '⚠️ Removed for inactivity',
        description: 'You were removed from your seat. You can rejoin or leave.',
        variant: 'destructive',
      });
      leaveSeat().catch(() => {});
    }
  }, [kickedForInactivity, leaveSeat]);

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

  // Hand history: snapshot players on new hand + capture max stack
  useEffect(() => {
    const hand = tableState?.current_hand;
    if (!hand) return;
    const currentHandId = hand.hand_id;
    if (currentHandId && currentHandId !== prevSnapshotHandIdRef.current && hand.phase === 'preflop') {
      gameOverHook.handsPlayedRef.current++;
      const players: HandPlayerSnapshot[] = (tableState?.seats ?? [])
        .filter(s => s.player_id)
        .map(s => ({ name: s.display_name, seatIndex: s.seat, startStack: s.stack, playerId: s.player_id! }));
      startNewHand(currentHandId, hand.hand_number, players);
      prevSnapshotHandIdRef.current = currentHandId;
      const seatedStacks = (tableState?.seats ?? []).filter(s => s.player_id).map(s => s.stack);
      handStartMaxStackRef.current = seatedStacks.length > 0 ? Math.max(...seatedStacks) : 0;
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

    finalizeHand({
      communityCards,
      winners: handWinners,
      pots: hand?.pots ?? [],
      myCards: myCards,
      revealedCards,
    });

    // Update game-over stats via hook
    gameOverHook.recordHandResult(handWinners, user.id);

    const mySeat = tableState.seats.find(s => s.player_id === user.id);
    const allStacks = tableState.seats.filter(s => s.player_id).map(s => s.stack);
    const avgStack = allStacks.length > 0 ? allStacks.reduce((a, b) => a + b, 0) / allStacks.length : 0;
    const heroStack = mySeat?.stack ?? 0;
    const isChipLeader = allStacks.length > 0 && heroStack >= Math.max(...allStacks);
    const playerCount = allStacks.length;
    const heroWon = handWinners.some(w => w.player_id === user.id);
    const winnerHand = handWinners.find(w => w.player_id === user.id);
    const potWon = winnerHand?.amount ?? 0;
    const wasDesperate = heroStack > 0 && (heroStack - potWon) < avgStack * 0.1 && heroWon;
    const wasAllIn = mySeat?.status === 'all-in';
    const isBB = hand?.bb_seat === mySeat?.seat;

    const ctx: AchievementContext = {
      heroWon,
      winStreak: gameOverHook.winStreakRef.current,
      handName: winnerHand?.hand_name ?? null,
      potWon,
      bigBlind: tableState.table.big_blind,
      heroStack,
      startingStack: gameOverHook.startingStackRef.current || heroStack,
      averageStack: avgStack,
      allInWin: heroWon && !!wasAllIn,
      playerCount,
      isChipLeader,
      handsPlayed: gameOverHook.handsPlayedRef.current,
      chatMessagesSent: chatCountRef.current,
      wonFromBB: heroWon && !!isBB,
      isHeadsUp: playerCount === 2,
      lastPlayerStanding: playerCount === 1 && !!mySeat,
      wasDesperate,
    };

    const newAchs = checkAndAward(ctx);
    if (newAchs.length > 0) {
      audio.play('achievement');
      const achXpEvents: Array<{ user_id: string; xp_amount: number; reason: string }> = [];
      for (const ach of newAchs) {
        const bonus = ACHIEVEMENT_XP[ach.id];
        if (bonus && bonus > 0) {
          achXpEvents.push({ user_id: user.id, xp_amount: bonus, reason: `achievement:${ach.id}` });
        }
      }
      if (achXpEvents.length > 0) {
        supabase.from('xp_events').insert(achXpEvents).then(({ error: achErr }) => {
          if (achErr) console.error('[XP] achievement xp insert failed:', achErr);
        });
      }
    }
  }, [handWinners]);

  // Table closed detection
  useEffect(() => {
    if (!tableState && !loading && !error && !gameOverHook.gameOver) {
      toast({ title: 'Table closed', description: 'This table has been closed.' });
      onLeave();
    }
  }, [error, tableState, loading, onLeave, gameOverHook.gameOver]);

  // Critical countdown timer
  useEffect(() => {
    if (!criticalTimeActive) {
      setCriticalCountdown(5);
      return;
    }
    const deadline = tableState?.current_hand?.action_deadline;
    if (!deadline) return;
    const deadlineMs = new Date(deadline).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setCriticalCountdown(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [criticalTimeActive, tableState?.current_hand?.action_deadline]);

  const handleReconnect = useCallback(() => { refreshState(); }, [refreshState]);

  // handleAction must be defined before early returns (Rules of Hooks)
  const handleAction = useCallback(async (action: { type: string; amount?: number }) => {
    const hapticMap: Record<string, any> = { check: 'check', call: 'call', raise: 'raise', 'all-in': 'allIn', fold: 'fold' };
    if (hapticMap[action.type]) audio.haptic(hapticMap[action.type]);
    if (action.type === 'check') audio.play('check');
    else if (action.type === 'call') audio.play('chipClink');
    else if (action.type === 'raise') audio.play('chipStack');
    else if (action.type === 'all-in') audio.play('allIn');
    else if (action.type === 'fold') audio.play('fold');
    const actionType = action.type === 'all-in' ? 'all_in' : action.type;
    try {
      await sendAction(actionType, action.amount);
    } catch (err: any) {
      if (err?.message?.includes('action_superseded')) return;
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    }
  }, [audio, sendAction]);

  // Keep handleActionRef in sync for pre-actions
  handleActionRef.current = handleAction;

  // Wrap audio callbacks that need parent state (must be before early returns)
  const handleThirtySecondsCallback = audio.handleThirtySeconds;
  const handleCriticalTimeCallback = useCallback(() => {
    audio.handleCriticalTime(setCriticalTimeActive);
  }, [audio.handleCriticalTime, setCriticalTimeActive]);

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
    Array.from({ length: 12 }, (_, i) => ({
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
    if (joining) return;
    setJoining(true);
    try {
      await joinTable(seatNum, table.max_buy_in);
      toast({ title: 'Seated!' });
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Already seated')) {
        await refreshState();
        toast({ title: 'Seated!' });
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      const result = await gameOverHook.saveXpAndStats(false);
      voiceChat.disconnect();
      if (result === 'show_overlay') {
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

  // handleTimeout uses handleAction which is now defined above the early returns

  const handleTimeout = () => {
    if (actionPending) return;
    handleAction({ type: 'fold' });
    setShowStillPlayingPopup(true);
  };


  const showActions = isMyTurn && !actionPending && mySeat && mySeat.status !== 'folded' && (myCards !== null || !!hand);

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
          <p className="text-lg font-bold text-foreground">{t('poker_table.rotate_device')}</p>
          <p className="text-sm text-muted-foreground text-center max-w-[240px]">
            {t('poker_table.rotate_description')}
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
          {/* Audio menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
              >
                {(audio.soundEnabled || audio.voiceEnabled) ? <Volume2 className="h-3.5 w-3.5 text-foreground/80" /> : <VolumeX className="h-3.5 w-3.5 text-foreground/40" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px] bg-popover border border-border z-[9999]">
              <DropdownMenuItem onClick={audio.toggleSound}>
                {audio.soundEnabled ? <Volume2 className="h-3.5 w-3.5 mr-2" /> : <VolumeX className="h-3.5 w-3.5 mr-2" />}
                {t('poker_table.sound_effects')} {audio.soundEnabled ? t('poker_table.on') : t('poker_table.off')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={audio.toggleVoice}>
                {audio.voiceEnabled ? <Volume2 className="h-3.5 w-3.5 mr-2" /> : <VolumeX className="h-3.5 w-3.5 mr-2" />}
                {t('poker_table.voice_announcements')} {audio.voiceEnabled ? t('poker_table.on') : t('poker_table.off')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

          {/* QuickChat */}
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
                {handHistory.length > 0 && (
                  <DropdownMenuItem onClick={() => setReplayOpen(true)}>
                    <History className="h-3.5 w-3.5 mr-2" /> {t('poker_table.hand_history')}
                  </DropdownMenuItem>
                )}
                {table.invite_code && (
                  <DropdownMenuItem onClick={copyInviteCode}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> {codeCopied ? t('common.copied') : t('poker_table.copy_code')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-2" /> {t('poker_table.invite_players')}
                </DropdownMenuItem>
                {voiceChat.connected && (
                  <>
                    <DropdownMenuItem onClick={voiceChat.toggleMic}>
                      {voiceChat.micMuted ? <MicOff className="h-3.5 w-3.5 mr-2" /> : <Mic className="h-3.5 w-3.5 mr-2" />}
                      {voiceChat.micMuted ? t('poker_table.unmute_mic') : t('poker_table.mute_mic')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={voiceChat.toggleDeafen}>
                      {voiceChat.deafened ? <HeadphoneOff className="h-3.5 w-3.5 mr-2" /> : <Headphones className="h-3.5 w-3.5 mr-2" />}
                      {voiceChat.deafened ? t('poker_table.undeafen') : t('poker_table.mute_all')}
                    </DropdownMenuItem>
                  </>
                )}
                {isCreator && canModerate && activeSeats.filter(s => s.player_id !== user?.id).map(s => (
                  <DropdownMenuItem key={s.player_id} onClick={() => setKickTarget({ id: s.player_id!, name: s.display_name })}>
                    <UserX className="h-3.5 w-3.5 mr-2" /> {t('poker_table.kick')} {s.display_name}
                  </DropdownMenuItem>
                ))}
                {isCreator && canModerate && (
                  <DropdownMenuItem onClick={() => setCloseConfirm(true)} className="text-destructive">
                    <XCircle className="h-3.5 w-3.5 mr-2" /> {t('poker_table.close_table')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {handHistory.length > 0 && (
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
                    <UserX className="h-3.5 w-3.5 mr-2" /> {t('poker_table.kick')} {s.display_name}
                      </DropdownMenuItem>
                    ))}
                    {canModerate && (
                      <DropdownMenuItem onClick={() => setCloseConfirm(true)} className="text-destructive">
                        <XCircle className="h-3.5 w-3.5 mr-2" /> {t('poker_table.close_table')}
                      </DropdownMenuItem>
                    )}
                    {!canModerate && hand && (
                      <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                        {t('poker_table.wait_hand_end')}
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
            <DealerCharacter expression={audio.dealerExpression} />
          </div>

          {totalPot > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5" style={{ top: '28%', zIndex: Z.CARDS }}>
              <PotDisplay pot={totalPot} />
              <PotOddsDisplay pot={totalPot} amountToCall={amountToCall} visible={isMyTurn && amountToCall > 0} />
            </div>
          )}

          {/* 5-slot community card layout */}
          <div className="absolute left-1/2 flex gap-1.5 items-center" style={{ top: '50%', transform: 'translate(-50%, -50%)', zIndex: Z.CARDS }}>
            {[0, 1, 2, 3, 4].map(slotIdx => {
              const card = animations.visibleCommunityCards[slotIdx];
              const isNewInPhase = (() => {
                if (!animations.communityCardPhaseKey) return false;
                const phase = animations.communityCardPhaseKey.split('-')[0];
                if (phase === 'flop' && slotIdx < 3) return true;
                if (phase === 'turn' && slotIdx === 3) return true;
                if (phase === 'river' && slotIdx === 4) return true;
                return false;
              })();
              const staggerIdx = (() => {
                const phase = animations.communityCardPhaseKey?.split('-')[0];
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

          {(!hand || animations.visibleCommunityCards.length === 0) && (
            <div className="absolute left-1/2 -translate-x-1/2 text-[10px] text-foreground/20 italic font-medium" style={{ top: 'calc(50% + 28px)', zIndex: Z.LOGO, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {activeSeats.length >= 2 ? t('poker_table.starting_soon') : t('poker_table.waiting_for_players')}
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
              <Play className="h-3 w-3 inline mr-1" /> {t('poker_table.deal_hand')}
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

          {handWinners.length > 0 && !gameOverHook.xpOverlay && (
            <WinnerOverlay
              winners={handWinners.map(w => ({ name: w.player_id === user?.id ? 'You' : w.display_name, hand: { name: w.hand_name || 'Winner', rank: 0, score: 0, bestCards: [] }, chips: w.amount }))}
              isGameOver={false} onNextHand={() => {}} onQuit={() => {}}
            />
          )}

          {audio.showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: Z.EFFECTS + 10 }}>
              {confettiPositions.map((c, i) => (
                <div key={i} className="absolute animate-confetti-drift"
                  style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.w}px`, height: `${c.h}px`, background: ['hsl(43 74% 49%)', 'hsl(0 70% 50%)', 'hsl(210 80% 55%)', 'hsl(142 70% 45%)', 'hsl(280 60% 55%)'][i % 5], borderRadius: c.round ? '50%' : '2px', animationDelay: `${i * 0.08}s`, animationDuration: `${c.dur}s` }}
                />
              ))}
            </div>
          )}

          {animations.chipAnimations.map((chip, i) => (
            <ChipAnimation key={chip.id} fromX={50} fromY={20} toX={chip.toX} toY={chip.toY} duration={900} delay={i * 80} />
          ))}

          {animations.dealing && (() => {
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
                  <EmptySeatDisplay seatNumber={actualSeatNumber} canJoin={!isSeated && !joining} onJoin={() => handleJoinSeat(actualSeatNumber)} />
                </SeatAnchor>
              );
            }

            const opponentRevealed = !isMe ? revealedCards.find(rc => rc.player_id === seatData!.player_id)?.cards ?? null : null;
            const playerLastAction = seatData!.player_id ? lastActions[seatData!.player_id] : undefined;
            const player = toPokerPlayer(seatData!, !!isDealer, isMe ? myCards : null, isMe, opponentRevealed, playerLastAction, animations.displayStacks[seatData!.seat]);
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
                  seatKey={pos.seatKey}
                  isSB={tableState?.current_hand?.sb_seat === seatData!.seat}
                  isBB={tableState?.current_hand?.bb_seat === seatData!.seat}
                  actionDeadline={isCurrentActor ? tableState?.current_hand?.action_deadline : null}
                  onTimeout={isMe && isCurrentActor ? handleTimeout : undefined}
                  onThirtySeconds={isMe && isCurrentActor ? handleThirtySecondsCallback : undefined}
                  onCriticalTime={isMe && isCurrentActor ? handleCriticalTimeCallback : undefined}
                  isDisconnected={!isMe && !!seatData!.player_id && !onlinePlayerIds.has(seatData!.player_id)}
                  isSpeaking={!!seatData!.player_id && !!voiceChat.speakingMap[seatData!.player_id]}
                  onClick={!isMe && seatData!.player_id ? () => setSelectedPlayer(seatData!.player_id!) : undefined}
                  
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
            {t('poker_table.your_turn')}
          </span>
        </div>
      )}

      {/* Critical time red pulsing border overlay */}
      {criticalTimeActive && (
        <div className="absolute inset-0 pointer-events-none rounded-lg" style={{ zIndex: Z.ACTIONS + 2, animation: 'pulse-red 0.6s ease-in-out infinite alternate', border: '3px solid hsl(0 70% 50% / 0.7)' }} />
      )}

      {/* Critical countdown display */}
      {criticalTimeActive && (
        <div className="absolute pointer-events-none" style={{ top: '28%', left: '50%', transform: 'translateX(-50%)', zIndex: Z.ACTIONS + 3 }}>
          <span className="text-[14px] px-5 py-2 rounded-full font-black"
            style={{ background: 'linear-gradient(135deg, hsl(0 70% 50% / 0.85), hsl(0 70% 35% / 0.7))', color: 'hsl(0 0% 100%)', border: '1px solid hsl(0 70% 50% / 0.6)', textShadow: '0 0 12px hsl(0 70% 50% / 0.9)', animation: 'pulse-red-text 0.5s ease-in-out infinite alternate' }}>
            {`00:${String(criticalCountdown).padStart(2, '0')} left`}
          </span>
        </div>
      )}

      {/* ACTION CONTROLS */}
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

      {/* Pre-action buttons */}
      {!showActions && isSeated && hand && mySeat && mySeat.status !== 'folded' && (
        <div className="absolute" style={{ zIndex: Z.ACTIONS, top: 'calc(env(safe-area-inset-top, 0px) + 48px)', right: 'calc(env(safe-area-inset-right, 0px) + 10px)' }}>
          <PreActionButtons canPreCheck={canCheck} amountToCall={amountToCall} onQueue={preActions.setPreAction} queued={preActions.preAction} />
        </div>
      )}

      {/* XP Level-Up Overlay */}
      {gameOverHook.xpOverlay && (
        <XPLevelUpOverlay
          startXp={gameOverHook.xpOverlay.startXp}
          endXp={gameOverHook.xpOverlay.endXp}
          xpGained={gameOverHook.xpOverlay.xpGained}
          stats={{
            handsPlayed: gameOverHook.handsPlayedRef.current,
            handsWon: gameOverHook.handsWonRef.current,
            bestHandName: gameOverHook.bestHandNameRef.current,
            biggestPot: gameOverHook.biggestPotRef.current,
            duration: Math.floor((Date.now() - gameOverHook.gameStartTimeRef.current) / 1000),
          }}
          onPlayAgain={gameOverHook.handlePlayAgain}
          onClose={gameOverHook.handleCloseOverlay}
        />
      )}

      {isSpectator && !gameOverHook.xpOverlay && (
        <>
          <div className="absolute left-0 right-0 text-center pointer-events-none"
            style={{ zIndex: Z.ACTIONS, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 85px)' }}>
            <p className="text-xs font-bold" style={{ color: 'hsl(43 74% 60%)', textShadow: '0 0 8px hsl(43 74% 49% / 0.4)' }}>
              {t('poker_table.tap_seat_to_join')}
            </p>
          </div>
          <button onClick={onLeave}
            className="absolute flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ zIndex: Z.ACTIONS, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', left: 'calc(env(safe-area-inset-left, 0px) + 12px)', background: 'linear-gradient(180deg, hsl(0 0% 15%), hsl(0 0% 10%))', color: 'hsl(0 0% 60%)', border: '1px solid hsl(0 0% 20%)' }}>
            <DoorOpen className="h-3.5 w-3.5" /> {t('common.leave')}
          </button>
        </>
      )}

      {/* "Are you still playing?" popup */}
      <AlertDialog open={showStillPlayingPopup} onOpenChange={(open) => { if (!open) handleStillHere(); }}>
        <AlertDialogContent className="z-[80] max-w-sm text-center">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{t('poker_table.still_playing')}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t('poker_table.will_be_removed')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center py-4">
            <div className="w-20 h-20 rounded-full border-4 border-destructive flex items-center justify-center">
              <span className="text-3xl font-black text-destructive">{stillPlayingCountdown}</span>
            </div>
          </div>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleStillHere} className="w-full text-base py-3">
              {t('poker_table.im_still_here')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kick confirmation dialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('poker_table.kick')} {kickTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>{t('poker_table.kick_description', { name: kickTarget?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => kickTarget && handleKickPlayer(kickTarget.id)} className="bg-destructive text-destructive-foreground">{t('poker_table.kick_player')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close table confirmation */}
      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('poker_table.close_table_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('poker_table.close_table_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseTable} className="bg-destructive text-destructive-foreground">{t('poker_table.close_table')}</AlertDialogAction>
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
      <HandReplay open={replayOpen} onOpenChange={setReplayOpen} handHistory={handHistory} isLandscape={isLandscape} />

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

      {/* Player Profile Drawer */}
      <PlayerProfileDrawer
        playerId={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        isCreator={isCreator}
        canKick={canModerate}
        onKick={(id) => {
          const seat = activeSeats.find(s => s.player_id === id);
          if (seat) setKickTarget({ id, name: seat.display_name });
        }}
      />

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
