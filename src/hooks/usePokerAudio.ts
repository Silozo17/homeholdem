import { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { usePokerVoiceAnnouncements } from '@/hooks/usePokerVoiceAnnouncements';
import { OnlineTableState } from '@/lib/poker/online-types';
import { HandWinner } from '@/hooks/useOnlinePokerTable';

interface UsePokerAudioParams {
  tableState: OnlineTableState | null;
  handWinners: HandWinner[];
  userId: string | undefined;
  lastActions: Record<string, string>;
  handStartMaxStackRef: MutableRefObject<number>;
  processedActionsRef: MutableRefObject<Set<string>>;
}

interface UsePokerAudioReturn {
  play: (sound: string) => void;
  haptic: (type: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  announceCountdown: () => void;
  announceCustom: (msg: string) => void;
  announceGameOver: (name: string, isWinner: boolean) => void;
  announceBlindUp: (small: number, big: number) => void;
  clearQueue: () => void;
  resetHandDedup: () => void;
  showConfetti: boolean;
  dealerExpression: 'neutral' | 'smile' | 'surprise';
  handleThirtySeconds: () => void;
  handleCriticalTime: (setCriticalTimeActive: (v: boolean) => void) => void;
}

export function usePokerAudio({
  tableState, handWinners, userId, lastActions,
  handStartMaxStackRef, processedActionsRef,
}: UsePokerAudioParams): UsePokerAudioReturn {
  const { play, enabled: soundEnabled, toggle: toggleSound, haptic } = usePokerSounds();
  const { announceBlindUp, announceWinner, announceCountdown, announceGameOver, announceCustom, clearQueue, resetHandDedup, voiceEnabled, toggleVoice, precache } = usePokerVoiceAnnouncements();

  const [showConfetti, setShowConfetti] = useState(false);
  const [dealerExpression, setDealerExpression] = useState<'neutral' | 'smile' | 'surprise'>('neutral');
  const [prevPhase, setPrevPhase] = useState<string | null>(null);

  const firstHandRef = useRef(true);
  const bigPotAnnouncedRef = useRef(false);
  const prevActiveCountRef = useRef<number>(0);

  const currentPhase = tableState?.current_hand?.phase ?? null;

  // Sound + haptic triggers on phase changes
  useEffect(() => {
    if (currentPhase && currentPhase !== prevPhase) {
      if (currentPhase === 'preflop' && !prevPhase) {
        play('shuffle'); haptic('deal');
        if (firstHandRef.current) { announceCustom("Shuffling up and dealing"); firstHandRef.current = false; }
        bigPotAnnouncedRef.current = false;
      }
      if (currentPhase === 'flop' || currentPhase === 'turn' || currentPhase === 'river') { play('flip'); haptic('cardReveal'); }
      if (currentPhase === 'showdown' || currentPhase === 'complete') {
        setDealerExpression('smile');
        setTimeout(() => setDealerExpression('neutral'), 2500);
      }
      setPrevPhase(currentPhase);
    }
    if (!currentPhase) setPrevPhase(null);
  }, [currentPhase, prevPhase, play, haptic]);

  // Voice announce hand winners
  useEffect(() => {
    if (handWinners.length === 0 || !userId) return;
    play('win');
    haptic('win');
    const winnersSnapshot = [...handWinners];
    const uid = userId;
    setTimeout(() => {
      for (const winner of winnersSnapshot) {
        const isHero = winner.player_id === uid;
        const name = isHero ? 'You' : winner.display_name;
        const handName = winner.hand_name && winner.hand_name !== 'Last standing' && winner.hand_name !== 'N/A'
          ? winner.hand_name : undefined;
        const message = handName ? `${name} wins with ${handName}` : `${name} wins the pot`;
        console.log('[voice] announcing winner:', message);
        announceCustom(message);
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handWinners, userId]);

  // Voice detect all-in from lastActions
  useEffect(() => {
    if (!lastActions || !userId) return;
    const handId = tableState?.current_hand?.hand_id ?? '';
    for (const [playerId, actionStr] of Object.entries(lastActions)) {
      const lower = actionStr.toLowerCase();
      if (lower === 'all_in' || lower === 'all-in' || lower === 'allin') {
        console.log('[voice] all-in check, playerId:', playerId, 'user.id:', userId, 'match:', playerId === userId);
        if (playerId === userId) continue;
        const key = `voice:allin:${playerId}:${handId}`;
        if (!processedActionsRef.current.has(key)) {
          processedActionsRef.current.add(key);
          const seat = tableState?.seats.find(s => s.player_id === playerId);
          const playerName = seat?.display_name || 'A player';
          const message = `${playerName} is all in`;
          console.log('[voice] announcing all-in:', message);
          announceCustom(message);
        }
      }
    }
  }, [lastActions, announceCustom, userId, tableState]);

  // Voice: detect heads-up
  useEffect(() => {
    if (!tableState) return;
    const activeCount = tableState.seats.filter(s => s.player_id && s.stack > 0).length;
    if (prevActiveCountRef.current > 2 && activeCount === 2) {
      announceCustom("We're heads up!");
    }
    prevActiveCountRef.current = activeCount;
  }, [tableState?.seats, announceCustom]);

  // Voice big pot detection
  useEffect(() => {
    if (!tableState || bigPotAnnouncedRef.current) return;
    const totalPotNow = tableState.current_hand?.pots?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
    const maxStack = handStartMaxStackRef.current;
    const bigPotThreshold = maxStack > 0 ? maxStack * 0.20 : Infinity;
    if (totalPotNow >= bigPotThreshold) {
      bigPotAnnouncedRef.current = true;
      announceCustom("Big pot building!");
    }
  }, [tableState?.current_hand?.pots, announceCustom]);

  // Precache common voice phrases on mount
  useEffect(() => { precache(); }, [precache]);

  // Reset per-hand voice dedup on new hand
  useEffect(() => {
    const handId = tableState?.current_hand?.hand_id;
    if (handId) resetHandDedup();
  }, [tableState?.current_hand?.hand_id, resetHandDedup]);

  // Trigger confetti on hero win
  useEffect(() => {
    if (handWinners.length === 0 || !userId) return;
    const heroWon = handWinners.some(w => w.player_id === userId);
    if (heroWon) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [handWinners, userId]);

  // 30-second warning callback
  const handleThirtySeconds = useCallback(() => {
    play('timerWarning');
    if ('vibrate' in navigator) navigator.vibrate([100]);
  }, [play]);

  // 5-second critical warning callback
  const handleCriticalTime = useCallback((setCriticalTimeActive: (v: boolean) => void) => {
    setCriticalTimeActive(true);
    play('timerWarning');
    announceCountdown();
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
  }, [play, announceCountdown]);

  return {
    play, haptic, soundEnabled, toggleSound,
    voiceEnabled, toggleVoice,
    announceCountdown, announceCustom, announceGameOver, announceBlindUp,
    clearQueue, resetHandDedup,
    showConfetti, dealerExpression,
    handleThirtySeconds, handleCriticalTime,
  };
}
