import { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { Card } from '@/lib/poker/types';
import { OnlineTableState } from '@/lib/poker/online-types';
import { HandWinner } from '@/hooks/useOnlinePokerTable';
import { getSeatPositions } from '@/lib/poker/ui/seatLayout';

interface UsePokerAnimationsParams {
  tableState: OnlineTableState | null;
  handWinners: HandWinner[];
  mySeatNumber: number | null;
  preResultStacksRef: MutableRefObject<Record<number, number> | null>;
  processedActionsRef: MutableRefObject<Set<string>>;
}

interface UsePokerAnimationsReturn {
  dealAnimDone: boolean;
  dealing: boolean;
  visibleCommunityCards: Card[];
  chipAnimations: Array<{ id: number; toX: number; toY: number }>;
  communityCardPhaseKey: string | null;
  displayStacks: Record<number, number>;
  resetAnimations: () => void;
}

export function usePokerAnimations({
  tableState, handWinners, mySeatNumber, preResultStacksRef, processedActionsRef,
}: UsePokerAnimationsParams): UsePokerAnimationsReturn {
  const [dealAnimDone, setDealAnimDone] = useState(true);
  const [dealing, setDealing] = useState(false);
  const [visibleCommunityCards, setVisibleCommunityCards] = useState<Card[]>([]);
  const [chipAnimations, setChipAnimations] = useState<Array<{ id: number; toX: number; toY: number }>>([]);
  const [communityCardPhaseKey, setCommunityCardPhaseKey] = useState<string | null>(null);
  const [displayStacks, setDisplayStacks] = useState<Record<number, number>>({});

  const stagedRunoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevCommunityCountRef = useRef(0);
  const prevAnimHandIdRef = useRef<string | null>(null);
  const chipAnimIdRef = useRef(0);
  const prevPhaseRef = useRef<string | null>(null);

  const currentPhase = tableState?.current_hand?.phase ?? null;

  // Phase key tracking for community card deal animations
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

  // Freeze stacks at pre-result snapshot until winner overlay appears
  useEffect(() => {
    if (handWinners.length === 0 && preResultStacksRef.current) {
      setDisplayStacks(preResultStacksRef.current);
      return;
    }
    preResultStacksRef.current = null;
    const realStacks: Record<number, number> = {};
    for (const s of (tableState?.seats ?? [])) {
      if (s.player_id) realStacks[s.seat] = s.stack;
    }
    setDisplayStacks(realStacks);
  }, [tableState?.seats, handWinners.length]);

  // Staged community card reveal for all-in runouts
  useEffect(() => {
    const communityCards = tableState?.current_hand?.community_cards ?? [];
    const prevCount = prevCommunityCountRef.current;
    const newCount = communityCards.length;

    if (newCount === 0 && handWinners.length > 0) return;

    if (newCount > prevCount && (newCount - prevCount) > 1) {
      stagedRunoutRef.current.forEach(t => clearTimeout(t));
      stagedRunoutRef.current = [];
      setVisibleCommunityCards(communityCards.slice(0, Math.min(3, newCount)));
      if (newCount > 3) {
        const t1 = setTimeout(() => setVisibleCommunityCards(communityCards.slice(0, 4)), 2000);
        stagedRunoutRef.current.push(t1);
      }
      if (newCount > 4) {
        const t2 = setTimeout(() => setVisibleCommunityCards(communityCards.slice(0, 5)), 4000);
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
  }, [tableState?.current_hand?.community_cards, handWinners]);

  // Cleanup runout timers on unmount
  useEffect(() => {
    return () => { stagedRunoutRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  // Deal animation on new hand
  useEffect(() => {
    const currentHandId = tableState?.current_hand?.hand_id ?? null;
    if (currentHandId && currentHandId !== prevAnimHandIdRef.current && tableState?.current_hand?.phase === 'preflop') {
      setDealing(true);
      setDealAnimDone(false);
      processedActionsRef.current.clear();
      const activePlayers = (tableState?.seats ?? []).filter(s => s.player_id && s.status !== 'eliminated').length;
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

  const resetAnimations = useCallback(() => {
    setVisibleCommunityCards([]);
    prevCommunityCountRef.current = 0;
    stagedRunoutRef.current.forEach(t => clearTimeout(t));
    stagedRunoutRef.current = [];
  }, []);

  return {
    dealAnimDone,
    dealing,
    visibleCommunityCards,
    chipAnimations,
    communityCardPhaseKey,
    displayStacks,
    resetAnimations,
  };
}
