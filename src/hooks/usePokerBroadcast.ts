import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OnlineTableState,
  OnlineHandInfo,
  OnlineSeatInfo,
} from '@/lib/poker/online-types';
import { Card } from '@/lib/poker/types';
import type { RevealedCard, HandWinner, ChatBubble, ConnectionStatus } from './useOnlinePokerTable';

interface UsePokerBroadcastParams {
  userId: string | undefined;
  tableStateRef: React.MutableRefObject<OnlineTableState | null>;
  setTableState: React.Dispatch<React.SetStateAction<OnlineTableState | null>>;
  setMyCards: React.Dispatch<React.SetStateAction<Card[] | null>>;
  setAutoStartAttempted: React.Dispatch<React.SetStateAction<boolean>>;
  setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatus>>;
  refreshState: () => Promise<void>;
  gameOverPendingRef: React.MutableRefObject<boolean>;
  blindsUpCallbackRef: React.MutableRefObject<((payload: any) => void) | null>;
  announceCustomRef: React.MutableRefObject<(msg: string) => void>;
}

export interface BroadcastHandlerConfig {
  event: string;
  callback: (args: { payload: any }) => void;
}

export function usePokerBroadcast({
  userId,
  tableStateRef,
  setTableState,
  setMyCards,
  setAutoStartAttempted,
  setConnectionStatus,
  refreshState,
  gameOverPendingRef,
  blindsUpCallbackRef,
  announceCustomRef,
}: UsePokerBroadcastParams) {
  // ── State ──
  const [revealedCards, setRevealedCards] = useState<RevealedCard[]>([]);
  const [handWinners, setHandWinners] = useState<HandWinner[]>([]);
  const [lastActions, setLastActions] = useState<Record<string, string>>({});
  const [chatBubbles, setChatBubbles] = useState<ChatBubble[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [kickedForInactivity, setKickedForInactivity] = useState(false);

  // ── Refs ──
  const showdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionPendingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatIdCounter = useRef(0);
  const chatBubbleTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const prevCommunityAtResultRef = useRef(0);
  const lastAppliedVersionRef = useRef(0);
  const lastActedVersionRef = useRef<number | null>(null);
  const pendingWinnersRef = useRef<{ winners: HandWinner[]; winnerDelay: number; targetCardCount: number } | null>(null);
  const runoutCompleteTimeRef = useRef<number>(0);
  const preResultStacksRef = useRef<Record<number, number> | null>(null);
  const lastBroadcastRef = useRef<number>(Date.now());
  const prevHandIdRef = useRef<string | null>(null);

  // Mirror handWinners state into a ref so broadcast handler never closes over state
  const handWinnersRef = useRef<HandWinner[]>([]);
  useEffect(() => {
    handWinnersRef.current = handWinners;
  }, [handWinners]);

  // Also keep userId in a ref for stable handler access
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // ── Hand ID change effect ──
  const handId = tableStateRef.current?.current_hand?.hand_id ?? null;
  const handIdForEffect = useRef<string | null>(null);
  useEffect(() => {
    const currentHandId = handId;
    if (currentHandId !== handIdForEffect.current) {
      if (currentHandId && currentHandId !== handIdForEffect.current) {
        setLastActions({});
        lastActedVersionRef.current = null;
      }
      handIdForEffect.current = currentHandId;
      prevCommunityAtResultRef.current = 0;
      pendingWinnersRef.current = null;
      runoutCompleteTimeRef.current = 0;
    }
  }, [handId]);

  // ── Schedule bubble removal ──
  const scheduleBubbleRemoval = useCallback((id: string) => {
    const timer = setTimeout(() => {
      setChatBubbles(prev => prev.filter(b => b.id !== id));
      chatBubbleTimers.current.delete(timer);
    }, 5000);
    chatBubbleTimers.current.add(timer);
  }, []);

  // ── Build broadcast handlers (stable — reads only refs) ──
  const buildBroadcastHandlers = useCallback((): BroadcastHandlerConfig[] => {
    return [
      {
        event: 'game_state',
        callback: ({ payload }: { payload: any }) => {
          lastBroadcastRef.current = Date.now();
          setConnectionStatus('connected');

          const incomingVersion = payload.state_version ?? 0;
          const currentHandId = tableStateRef.current?.current_hand?.hand_id ?? null;
          const incomingHandId = payload.hand_id ?? null;
          if (incomingHandId && incomingHandId === currentHandId && incomingVersion <= lastAppliedVersionRef.current) {
            return;
          }
          if (incomingHandId !== currentHandId) {
            lastAppliedVersionRef.current = 0;
          }
          lastAppliedVersionRef.current = incomingVersion;

          setActionPending(false);
          if (actionPendingFallbackRef.current) {
            clearTimeout(actionPendingFallbackRef.current);
            actionPendingFallbackRef.current = null;
          }

          const seats: OnlineSeatInfo[] = payload.seats || [];
          setLastActions(prev => {
            const next = { ...prev };
            for (const s of seats) {
              if (s.player_id && s.last_action) {
                const raw = s.last_action;
                next[s.player_id] = raw.charAt(0).toUpperCase() + raw.slice(1);
              }
            }
            return next;
          });

          const newCommunityCount = (payload.community_cards || []).length;
          const prevCount = prevCommunityAtResultRef.current ?? 0;
          if (newCommunityCount > prevCount && (newCommunityCount - prevCount) > 1) {
            const runoutMs = newCommunityCount >= 5 && prevCount <= 3 ? 4000 : 2000;
            runoutCompleteTimeRef.current = Date.now() + runoutMs;
          } else if (newCommunityCount <= prevCount || newCommunityCount === 0) {
            runoutCompleteTimeRef.current = 0;
          }
          prevCommunityAtResultRef.current = newCommunityCount;

          const pending = pendingWinnersRef.current;
          if (pending && newCommunityCount >= pending.targetCardCount) {
            pendingWinnersRef.current = null;
            const msUntilRunoutDone = Math.max(0, runoutCompleteTimeRef.current - Date.now());
            const delay = Math.max(pending.winnerDelay, msUntilRunoutDone + 500);
            if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
            winnerTimerRef.current = setTimeout(() => setHandWinners(pending.winners), delay);
          }

          setTableState(prev => {
            if (!prev) return prev;
            const broadcastHand: OnlineHandInfo = {
              hand_id: payload.hand_id,
              hand_number: payload.hand_number,
              phase: payload.phase,
              community_cards: payload.community_cards || [],
              pots: payload.pots || [],
              current_actor_seat: payload.current_actor_seat ?? null,
              current_bet: payload.current_bet ?? 0,
              min_raise: payload.min_raise ?? prev.table.big_blind,
              action_deadline: payload.action_deadline ?? null,
              dealer_seat: payload.dealer_seat,
              sb_seat: payload.sb_seat,
              bb_seat: payload.bb_seat,
              state_version: payload.state_version ?? 0,
              blinds: payload.blinds || { small: prev.table.small_blind, big: prev.table.big_blind, ante: prev.table.ante },
              current_actor_id: payload.current_actor_id ?? null,
            };
            const mergedSeats = prev.seats.map(existingSeat => {
              const updated = seats.find(s => s.seat === existingSeat.seat);
              return updated ? { ...existingSeat, ...updated } : existingSeat;
            });
            const existingSeatNumbers = new Set(prev.seats.map(s => s.seat));
            const newSeats = seats
              .filter(s => !existingSeatNumbers.has(s.seat) && s.player_id)
              .map(s => ({
                seat: s.seat,
                player_id: s.player_id,
                display_name: s.display_name || 'Player',
                avatar_url: s.avatar_url || null,
                country_code: s.country_code || null,
                stack: s.stack ?? 0,
                status: s.status || 'sitting_out',
                has_cards: s.has_cards || false,
                current_bet: s.current_bet ?? 0,
                last_action: s.last_action ?? null,
              }));
            const allSeats = [...mergedSeats, ...newSeats];
            return { ...prev, current_hand: broadcastHand, seats: allSeats };
          });
        },
      },
      {
        event: 'seat_change',
        callback: ({ payload }: { payload: any }) => {
          if (payload?.action === 'table_closed') {
            setTableState(null);
            return;
          }
          if (payload?.action === 'table_closing' && payload?.closing_at) {
            setTableState(prev => prev ? { ...prev, table: { ...prev.table, closing_at: payload.closing_at } } : prev);
            return;
          }
          if (payload?.action === 'table_closing_cancelled') {
            setTableState(prev => prev ? { ...prev, table: { ...prev.table, closing_at: null } } : prev);
            return;
          }
          if (payload?.action === 'disconnected' && payload?.seat != null) {
            setTableState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                seats: prev.seats.map(s =>
                  s.seat === payload.seat
                    ? { ...s, status: 'disconnected' }
                    : s
                ),
              };
            });
            return;
          }
          if ((payload?.action === 'leave' || payload?.action === 'kicked' || payload?.action === 'force_removed') && payload?.seat != null) {
            setTableState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                seats: prev.seats.map(s =>
                  s.seat === payload.seat
                    ? { ...s, player_id: null, display_name: '', avatar_url: null, stack: 0, status: 'empty', has_cards: false, current_bet: 0, last_action: null }
                    : s
                ),
              };
            });
            if (payload.action === 'kicked' && (payload.kicked_player_id === userIdRef.current || payload.player_id === userIdRef.current)) {
              setKickedForInactivity(true);
            }
            if (payload.display_name && payload.player_id !== userIdRef.current) {
              announceCustomRef.current(`${payload.display_name} has left the table`);
            }
            return;
          }
          if (payload?.action === 'join') {
            setTableState(prev => {
              if (!prev) return prev;
              const alreadyExists = prev.seats.some(s => s.seat === payload.seat);
              if (alreadyExists) return prev;
              return {
                ...prev,
                seats: [...prev.seats, {
                  seat: payload.seat,
                  player_id: payload.player_id,
                  display_name: payload.display_name || 'Player',
                  avatar_url: payload.avatar_url || null,
                  country_code: payload.country_code || null,
                  stack: payload.stack || 0,
                  status: 'sitting_out',
                  has_cards: false,
                  current_bet: 0,
                  last_action: null,
                }],
              };
            });
            const currentState = tableStateRef.current;
            const handActive = !!currentState?.current_hand;
            if (payload.display_name && payload.player_id !== userIdRef.current) {
              announceCustomRef.current(`${payload.display_name} has joined the table`);
            }
            if (handActive) return;
            refreshState();
            return;
          }
        },
      },
      {
        event: 'hand_result',
        callback: ({ payload }: { payload: any }) => {
          // FIX RT-1: Deduplicate hand_result by hand_id — uses ref, not state
          const resultHandId = payload.hand_id;
          if (resultHandId && resultHandId === prevHandIdRef.current && handWinnersRef.current.length > 0) {
            console.log('[hand_result] Skipping duplicate for hand', resultHandId);
            return;
          }

          const revealed: RevealedCard[] = payload.revealed_cards || [];
          setRevealedCards(revealed);

          const payloadSeats: any[] = payload.seats || [];
          const fallbackSeats = tableStateRef.current?.seats || [];
          const winners: HandWinner[] = (payload.winners || []).map((w: any) => {
            const seatData = payloadSeats.find((s: any) => s.player_id === w.player_id)
              || fallbackSeats.find((s) => s.player_id === w.player_id);
            return {
              player_id: w.player_id,
              display_name: seatData?.display_name || 'Unknown',
              amount: w.amount || 0,
              hand_name: w.hand_name || '',
            };
          });

          const resultCommunity = (payload.community_cards || []).length;
          const currentCommunity = prevCommunityAtResultRef.current ?? 0;
          const cardDiff = resultCommunity - currentCommunity;

          let winnerDelay: number;
          if (cardDiff > 1) {
            winnerDelay = resultCommunity >= 5 && currentCommunity <= 3 ? 4500 : 2500;
          } else {
            winnerDelay = 500;
          }

          pendingWinnersRef.current = { winners, winnerDelay, targetCardCount: resultCommunity };

          const alreadyDelivered = (prevCommunityAtResultRef.current ?? 0) >= resultCommunity;
          if (alreadyDelivered) {
            pendingWinnersRef.current = null;
            const msUntilRunoutDone = Math.max(0, runoutCompleteTimeRef.current - Date.now());
            const delay = Math.max(winnerDelay, msUntilRunoutDone + 500);
            if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
            winnerTimerRef.current = setTimeout(() => setHandWinners(winners), delay);
          }

          const currentSeatsHR = tableStateRef.current?.seats ?? [];
          const snapshotHR: Record<number, number> = {};
          for (const s of currentSeatsHR) {
            if (s.player_id) snapshotHR[s.seat] = s.stack;
          }
          preResultStacksRef.current = snapshotHR;

          setTableState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              current_hand: prev.current_hand ? { ...prev.current_hand, phase: 'complete' } : null,
              seats: prev.seats.map(existingSeat => {
                const updated = payloadSeats.find((s: any) => s.seat === existingSeat.seat);
                return updated ? { ...existingSeat, ...updated } : existingSeat;
              }),
            };
          });

          if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
          const showdownDelay = winnerDelay + 4000;

          showdownTimerRef.current = setTimeout(() => {
            if (!gameOverPendingRef.current) {
              setHandWinners([]);
              pendingWinnersRef.current = null;
              setTableState(prev => prev ? { ...prev, current_hand: null } : prev);
              setMyCards(null);
              setRevealedCards([]);
            }
            runoutCompleteTimeRef.current = 0;
            showdownTimerRef.current = null;
            setAutoStartAttempted(false);
          }, showdownDelay);
        },
      },
      {
        event: 'hand_complete',
        callback: ({ payload }: { payload: any }) => {
          lastBroadcastRef.current = Date.now();
          setConnectionStatus('connected');

          const incomingVersion = payload.state_version ?? 0;
          lastAppliedVersionRef.current = incomingVersion;

          setActionPending(false);
          if (actionPendingFallbackRef.current) {
            clearTimeout(actionPendingFallbackRef.current);
            actionPendingFallbackRef.current = null;
          }

          const seats: OnlineSeatInfo[] = payload.seats || [];
          setLastActions(prev => {
            const next = { ...prev };
            for (const s of seats) {
              if (s.player_id && s.last_action) {
                next[s.player_id] = s.last_action.charAt(0).toUpperCase() + s.last_action.slice(1);
              }
            }
            return next;
          });

          const newCommunityCount = (payload.community_cards || []).length;
          const prevCount = prevCommunityAtResultRef.current ?? 0;

          if (newCommunityCount > prevCount && (newCommunityCount - prevCount) > 1) {
            const runoutMs = newCommunityCount >= 5 && prevCount <= 3 ? 4000 : 2000;
            runoutCompleteTimeRef.current = Date.now() + runoutMs;
          }
          prevCommunityAtResultRef.current = newCommunityCount;

          const currentSeatsHC = tableStateRef.current?.seats ?? [];
          const snapshotHC: Record<number, number> = {};
          for (const s of currentSeatsHC) {
            if (s.player_id) snapshotHC[s.seat] = s.stack;
          }
          preResultStacksRef.current = snapshotHC;

          setTableState(prev => {
            if (!prev) return prev;
            const mergedSeats = prev.seats.map(existingSeat => {
              const updated = seats.find(s => s.seat === existingSeat.seat);
              return updated ? { ...existingSeat, ...updated } : existingSeat;
            });
            const existingSeatNumbers = new Set(prev.seats.map(s => s.seat));
            const newSeats = seats
              .filter(s => !existingSeatNumbers.has(s.seat) && s.player_id)
              .map(s => ({
                seat: s.seat,
                player_id: s.player_id,
                display_name: s.display_name || 'Player',
                avatar_url: s.avatar_url || null,
                country_code: s.country_code || null,
                stack: s.stack ?? 0,
                status: s.status || 'sitting_out',
                has_cards: s.has_cards || false,
                current_bet: s.current_bet ?? 0,
                last_action: s.last_action ?? null,
              }));
            return {
              ...prev,
              current_hand: {
                hand_id: payload.hand_id,
                hand_number: payload.hand_number,
                phase: payload.phase,
                community_cards: payload.community_cards || [],
                pots: payload.pots || [],
                current_actor_seat: null,
                current_bet: 0,
                min_raise: payload.min_raise ?? prev.table.big_blind,
                action_deadline: null,
                dealer_seat: payload.dealer_seat,
                sb_seat: payload.sb_seat,
                bb_seat: payload.bb_seat,
                state_version: incomingVersion,
                blinds: payload.blinds || { small: prev.table.small_blind, big: prev.table.big_blind, ante: prev.table.ante },
                current_actor_id: null,
              },
              seats: [...mergedSeats, ...newSeats],
            };
          });

          const revealed: RevealedCard[] = payload.revealed_cards || [];
          setRevealedCards(revealed);

          const payloadSeats: any[] = payload.seats || [];
          const winners: HandWinner[] = (payload.winners || []).map((w: any) => {
            const seatData = payloadSeats.find((s: any) => s.player_id === w.player_id);
            return {
              player_id: w.player_id,
              display_name: seatData?.display_name || 'Unknown',
              amount: w.amount || 0,
              hand_name: w.hand_name || '',
            };
          });

          const msUntilRunoutDone = Math.max(0, runoutCompleteTimeRef.current - Date.now());
          const baseDelay = newCommunityCount < 5 || (newCommunityCount - prevCount) > 1 ? 4500 : 500;
          const winnerDelay = Math.max(baseDelay, msUntilRunoutDone + 500);

          if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
          winnerTimerRef.current = setTimeout(() => setHandWinners(winners), winnerDelay);

          // Prevent duplicate hand_result from re-triggering winner overlay for this hand
          prevHandIdRef.current = payload.hand_id;

          if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
          const showdownDelay = winnerDelay + 4000;
          showdownTimerRef.current = setTimeout(() => {
            if (!gameOverPendingRef.current) {
              setHandWinners([]);
              pendingWinnersRef.current = null;
              setTableState(prev => prev ? { ...prev, current_hand: null } : prev);
              setMyCards(null);
              setRevealedCards([]);
            }
            runoutCompleteTimeRef.current = 0;
            showdownTimerRef.current = null;
            setAutoStartAttempted(false);
          }, showdownDelay);
        },
      },
      {
        event: 'chat_emoji',
        callback: ({ payload }: { payload: any }) => {
          if (payload.player_id === userIdRef.current) return;
          const id = `chat-${chatIdCounter.current++}`;
          const bubble: ChatBubble = { player_id: payload.player_id, text: payload.text, id };
          setChatBubbles(prev => [...prev, bubble]);
          scheduleBubbleRemoval(id);
        },
      },
      {
        event: 'blinds_up',
        callback: ({ payload }: { payload: any }) => {
          setTableState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              table: {
                ...prev.table,
                small_blind: payload.new_small,
                big_blind: payload.new_big,
                blind_level: payload.blind_level,
                last_blind_increase_at: new Date().toISOString(),
              },
            };
          });
          blindsUpCallbackRef.current?.(payload);
        },
      },
    ];
  // All reads are via refs — no reactive dependencies needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── resetBroadcastState ──
  const resetBroadcastState = useCallback(() => {
    setRevealedCards([]);
    setHandWinners([]);
    setLastActions({});
    prevCommunityAtResultRef.current = 0;
    lastAppliedVersionRef.current = 0;
    lastActedVersionRef.current = null;
    pendingWinnersRef.current = null;
    runoutCompleteTimeRef.current = 0;
    prevHandIdRef.current = null;
    preResultStacksRef.current = null;
    if (winnerTimerRef.current) { clearTimeout(winnerTimerRef.current); winnerTimerRef.current = null; }
    if (showdownTimerRef.current) { clearTimeout(showdownTimerRef.current); showdownTimerRef.current = null; }
  }, []);

  // ── markActionSent ──
  const markActionSent = useCallback((version: number) => {
    lastActedVersionRef.current = version;
    setActionPending(true);
    if (actionPendingFallbackRef.current) clearTimeout(actionPendingFallbackRef.current);
    actionPendingFallbackRef.current = setTimeout(() => {
      setActionPending(false);
      actionPendingFallbackRef.current = null;
    }, 1500);
  }, []);

  // ── clearActionPending ──
  const clearActionPending = useCallback(() => {
    if (actionPendingFallbackRef.current) {
      clearTimeout(actionPendingFallbackRef.current);
      actionPendingFallbackRef.current = null;
    }
    setActionPending(false);
    lastActedVersionRef.current = null;
  }, []);

  return {
    // State
    revealedCards,
    handWinners,
    lastActions,
    chatBubbles,
    actionPending,
    kickedForInactivity,
    // Refs exposed to parent
    preResultStacksRef,
    lastBroadcastRef,
    lastAppliedVersionRef,
    lastActedVersionRef,
    actionPendingFallbackRef,
    chatIdCounter,
    showdownTimerRef,
    winnerTimerRef,
    chatBubbleTimers,
    // Functions
    buildBroadcastHandlers,
    resetBroadcastState,
    markActionSent,
    clearActionPending,
    scheduleBubbleRemoval,
    setChatBubbles,
  };
}
