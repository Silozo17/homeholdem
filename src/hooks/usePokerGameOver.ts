import { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OnlineTableState } from '@/lib/poker/online-types';
import { HandWinner } from '@/hooks/useOnlinePokerTable';
import { Card } from '@/lib/poker/types';

interface UsePokerGameOverParams {
  user: { id: string } | null;
  tableState: OnlineTableState | null;
  handWinners: HandWinner[];
  lastKnownStack: number | null;
  gameOverPendingRef: MutableRefObject<boolean>;
  leaveSeat: (preserveStack?: boolean) => Promise<void>;
  leaveTable: () => Promise<void>;
  onLeave: () => void;
  resetForNewGame: () => void;
  refreshState: () => Promise<void>;
  announceGameOver: (name: string, isWinner: boolean) => void;
  mySeatNumber: number | null;
  chatCountRef: MutableRefObject<number>;
  resetAnimations: () => void;
}

interface UsePokerGameOverReturn {
  gameOver: boolean;
  xpOverlay: { startXp: number; endXp: number; xpGained: number } | null;
  saveXpAndStats: (isWinnerOverride?: boolean) => Promise<'show_overlay' | 'no_overlay'>;
  handsPlayedRef: MutableRefObject<number>;
  handsWonRef: MutableRefObject<number>;
  bestHandNameRef: MutableRefObject<string>;
  bestHandRankRef: MutableRefObject<number>;
  biggestPotRef: MutableRefObject<number>;
  gameStartTimeRef: MutableRefObject<number>;
  winStreakRef: MutableRefObject<number>;
  startingStackRef: MutableRefObject<number>;
  handStartMaxStackRef: MutableRefObject<number>;
  handlePlayAgain: () => void;
  handleCloseOverlay: () => void;
  recordHandResult: (winners: HandWinner[], heroId: string) => void;
}

export function usePokerGameOver({
  user, tableState, handWinners, lastKnownStack,
  gameOverPendingRef, leaveSeat, leaveTable, onLeave,
  resetForNewGame, refreshState, announceGameOver,
  mySeatNumber, chatCountRef, resetAnimations,
}: UsePokerGameOverParams): UsePokerGameOverReturn {
  const [gameOver, setGameOver] = useState(false);
  const [xpOverlay, setXpOverlay] = useState<{ startXp: number; endXp: number; xpGained: number } | null>(null);

  const xpSavedRef = useRef(false);
  const handsPlayedRef = useRef(0);
  const handsWonRef = useRef(0);
  const bestHandNameRef = useRef('');
  const bestHandRankRef = useRef(-1);
  const biggestPotRef = useRef(0);
  const gameStartTimeRef = useRef(Date.now());
  const winStreakRef = useRef(0);
  const startXpRef = useRef<number | null>(null);
  const startingStackRef = useRef(0);
  const handStartMaxStackRef = useRef(0);

  // Capture starting XP on mount
  useEffect(() => {
    if (!user) return;
    supabase.from('player_xp').select('total_xp').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { startXpRef.current = data?.total_xp ?? 0; });
  }, [user]);

  // Track starting stack when first seated
  useEffect(() => {
    if (mySeatNumber !== null && startingStackRef.current === 0 && tableState) {
      const mySeat = tableState.seats.find(s => s.player_id === user?.id);
      if (mySeat) startingStackRef.current = mySeat.stack;
    }
  }, [mySeatNumber, tableState, user?.id]);

  // Record hand result stats (called by parent's handWinners effect)
  const recordHandResult = useCallback((winners: HandWinner[], heroId: string) => {
    const heroWon = winners.some(w => w.player_id === heroId);
    if (heroWon) {
      winStreakRef.current++;
      handsWonRef.current++;
    } else {
      winStreakRef.current = 0;
    }
    const totalPotThisHand = (tableState?.current_hand?.pots ?? []).reduce((s, p) => s + p.amount, 0);
    if (totalPotThisHand > biggestPotRef.current) biggestPotRef.current = totalPotThisHand;
    const winnerHand0 = winners.find(w => w.player_id === heroId);
    if (winnerHand0?.hand_name) {
      const rankOrder = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush'];
      const newRank = rankOrder.indexOf(winnerHand0.hand_name);
      if (newRank > bestHandRankRef.current) {
        bestHandRankRef.current = newRank;
        bestHandNameRef.current = winnerHand0.hand_name;
      }
    }
  }, [tableState]);

  // Game over detection
  useEffect(() => {
    if (gameOver || !tableState || !user) return;

    const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
    const activePlayers = tableState.seats.filter(s => s.player_id && s.stack > 0);
    const handPhase = tableState.current_hand?.phase;

    // CASE 1: Normal end — I lost
    if (handWinners.length > 0 && mySeatInfo && mySeatInfo.stack <= 0) {
      const heroWon = handWinners.some(w => w.player_id === user.id);
      if (!heroWon) {
        gameOverPendingRef.current = true;
        const snap = [...handWinners];
        const timer = setTimeout(() => {
          announceGameOver(snap[0]?.display_name || 'Unknown', false);
          setGameOver(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // CASE 2: Normal end — I won (last with chips)
    if (handWinners.length > 0 && mySeatInfo && mySeatInfo.stack > 0) {
      if (activePlayers.length === 1 && activePlayers[0].player_id === user.id) {
        gameOverPendingRef.current = true;
        const snap = [...handWinners];
        const timer = setTimeout(() => {
          announceGameOver('You', true);
          setGameOver(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // CASE 3: Fallback — seat removed by server
    if (handWinners.length > 0 && !mySeatInfo && lastKnownStack === 0) {
      gameOverPendingRef.current = true;
      const snap = [...handWinners];
      const timer = setTimeout(() => {
        announceGameOver(snap[0]?.display_name || 'Unknown', false);
        setGameOver(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // CASE 4: Opponent left mid-session
    if (
      handWinners.length === 0 &&
      handsPlayedRef.current > 0 &&
      mySeatInfo &&
      mySeatInfo.stack > 0 &&
      activePlayers.length === 1 &&
      activePlayers[0].player_id === user.id &&
      (!handPhase || handPhase === 'complete')
    ) {
      const timer = setTimeout(() => {
        announceGameOver('You', true);
        setGameOver(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [tableState, user, handWinners, gameOver, lastKnownStack]);

  // Save XP + stats
  const saveXpAndStats = useCallback(async (isWinnerOverride?: boolean) => {
    if (xpSavedRef.current || !user) return 'no_overlay' as const;
    if (handsPlayedRef.current === 0) return 'no_overlay' as const;
    xpSavedRef.current = true;

    const mySeatInfo = tableState?.seats.find(s => s.player_id === user.id);
    const finalChips = mySeatInfo?.stack ?? 0;
    const isWinner = isWinnerOverride ?? (finalChips > 0 &&
      (tableState?.seats.filter(s => s.player_id && s.stack > 0).length ?? 0) === 1);
    const isTournament = !!(tableState?.table as any)?.tournament_id;

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

    await new Promise(r => setTimeout(r, 500));
    const { data: newXp } = await supabase.from('player_xp')
      .select('total_xp').eq('user_id', user.id).maybeSingle();

    const endXp = newXp?.total_xp ?? 0;
    const sXp = startXpRef.current ?? 0;
    const totalGained = xpEvents.reduce((s, e) => s + e.xp_amount, 0);

    if (totalGained > 0) {
      setXpOverlay({ startXp: sXp, endXp, xpGained: totalGained });
      return 'show_overlay' as const;
    }
    return 'no_overlay' as const;
  }, [user, tableState]);

  // Stable ref so game-over timer isn't reset by tableState changes
  const saveXpAndStatsRef = useRef(saveXpAndStats);
  useEffect(() => { saveXpAndStatsRef.current = saveXpAndStats; }, [saveXpAndStats]);

  // Save XP on game over + leave seat
  useEffect(() => {
    if (!gameOver || !user || xpSavedRef.current) return;
    const mySeatInfo = tableState?.seats.find(s => s.player_id === user.id);
    const isWinner = (mySeatInfo?.stack ?? 0) > 0;
    const leaveTimer = setTimeout(() => {
      leaveSeat(false).catch(() => {});
    }, 2500);
    const xpTimer = setTimeout(() => {
      saveXpAndStatsRef.current(isWinner);
    }, 3500);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(xpTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, user]);

  const handlePlayAgain = useCallback(async () => {
    // Save XP if the timer hasn't fired yet
    if (!xpSavedRef.current) {
      const mySeatInfo = tableState?.seats.find(s => s.player_id === user?.id);
      const isWinner = (mySeatInfo?.stack ?? 0) > 0;
      try { await saveXpAndStats(isWinner); } catch {}
    }

    // Ensure seat is removed from DB before allowing rejoin
    try { await leaveSeat(false); } catch {}

    setXpOverlay(null);
    setGameOver(false);
    gameOverPendingRef.current = false;
    xpSavedRef.current = false;
    handsPlayedRef.current = 0;
    handsWonRef.current = 0;
    bestHandNameRef.current = '';
    bestHandRankRef.current = -1;
    biggestPotRef.current = 0;
    gameStartTimeRef.current = Date.now();
    winStreakRef.current = 0;
    chatCountRef.current = 0;
    startingStackRef.current = 0;
    resetForNewGame();
    resetAnimations();
    if (user) {
      supabase.from('player_xp').select('total_xp').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => { startXpRef.current = data?.total_xp ?? 0; });
    }
    refreshState();
  }, [user, leaveSeat, saveXpAndStats, tableState, resetForNewGame, resetAnimations, refreshState, gameOverPendingRef, chatCountRef]);

  const handleCloseOverlay = useCallback(() => {
    setXpOverlay(null);
    gameOverPendingRef.current = false;
    leaveTable().then(onLeave).catch(onLeave);
  }, [leaveTable, onLeave, gameOverPendingRef]);

  return {
    gameOver, xpOverlay, saveXpAndStats,
    handsPlayedRef, handsWonRef, bestHandNameRef, bestHandRankRef,
    biggestPotRef, gameStartTimeRef, winStreakRef, startingStackRef,
    handStartMaxStackRef,
    handlePlayAgain, handleCloseOverlay, recordHandResult,
  };
}
