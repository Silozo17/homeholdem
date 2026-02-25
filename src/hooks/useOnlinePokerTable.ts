import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/lib/poker/types';
import { callEdge } from '@/lib/poker/callEdge';
import {
  OnlineTableState,
  OnlineHandInfo,
  OnlineSeatInfo,
} from '@/lib/poker/online-types';

export interface RevealedCard {
  player_id: string;
  cards: Card[];
}

export interface HandWinner {
  player_id: string;
  display_name: string;
  amount: number;
  hand_name: string;
}

export interface ChatBubble {
  player_id: string;
  text: string;
  id: string;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface UseOnlinePokerTableReturn extends Record<string, any> {
  tableState: OnlineTableState | null;
  gameOverPendingRef: React.MutableRefObject<boolean>;
  myCards: Card[] | null;
  loading: boolean;
  error: string | null;
  mySeatNumber: number | null;
  isMyTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  revealedCards: RevealedCard[];
  actionPending: boolean;
  lastActions: Record<string, string>;
  handWinners: HandWinner[];
  chatBubbles: ChatBubble[];
  spectatorCount: number;
  connectionStatus: ConnectionStatus;
  lastKnownPhase: string | null;
  lastKnownStack: number | null;
  onlinePlayerIds: Set<string>;
  // Actions
  joinTable: (seatNumber: number, buyIn: number) => Promise<void>;
  leaveSeat: (preserveStack?: boolean) => Promise<void>;
  leaveTable: () => Promise<void>;
  startHand: () => Promise<void>;
  sendAction: (action: string, amount?: number) => Promise<void>;
  pingTimeout: () => Promise<void>;
  refreshState: () => Promise<void>;
  resetForNewGame: () => void;
  sendChat: (text: string) => void;
  autoStartAttempted: boolean;
  handHasEverStarted: boolean;
  onBlindsUp: (callback: (payload: any) => void) => void;
}

export function useOnlinePokerTable(tableId: string): UseOnlinePokerTableReturn {
  const { user } = useAuth();
  const [tableState, setTableState] = useState<OnlineTableState | null>(null);
  const [myCards, setMyCards] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedCards, setRevealedCards] = useState<RevealedCard[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [lastActions, setLastActions] = useState<Record<string, string>>({});
  const [handWinners, setHandWinners] = useState<HandWinner[]>([]);
  const [chatBubbles, setChatBubbles] = useState<ChatBubble[]>([]);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [lastKnownPhase, setLastKnownPhase] = useState<string | null>(null);
  const [lastKnownStack, setLastKnownStack] = useState<number | null>(null);
  const channelRef = useRef<any>(null);
  const tableStateRef = useRef<OnlineTableState | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  const actionPendingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHandIdRef = useRef<string | null>(null);
  const chatIdCounter = useRef(0);
  const chatBubbleTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  
  const [handHasEverStarted, setHandHasEverStarted] = useState(false);
  const startHandRef = useRef<() => Promise<void>>(null as any);
  const blindsUpCallbackRef = useRef<((payload: any) => void) | null>(null);
  const prevCommunityAtResultRef = useRef(0);
  const lastAppliedVersionRef = useRef(0);
  const lastActedVersionRef = useRef<number | null>(null);
  const pendingWinnersRef = useRef<{ winners: HandWinner[]; winnerDelay: number; targetCardCount: number } | null>(null);
  const runoutCompleteTimeRef = useRef<number>(0);
  const winnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preResultStacksRef = useRef<Record<number, number> | null>(null);

  const userId = user?.id;
  const lastBroadcastRef = useRef<number>(Date.now());
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<Set<string>>(new Set());
  const timeoutPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [kickedForInactivity, setKickedForInactivity] = useState(false);
  const gameOverPendingRef = useRef(false);
  const hasSubscribedOnceRef = useRef(false);

  // Keep ref in sync for use inside broadcast callbacks + track last known phase/stack
  useEffect(() => {
    tableStateRef.current = tableState;
    if (tableState?.current_hand) {
      setLastKnownPhase(tableState.current_hand.phase);
    }
    if (userId) {
      const mySeatInfo = tableState?.seats.find(s => s.player_id === userId);
      if (mySeatInfo) setLastKnownStack(mySeatInfo.stack);
    }
  }, [tableState, userId]);

  // Derive computed state
  const mySeatNumber = tableState?.seats.find(s => s.player_id === userId)?.seat ?? null;
  const hand = tableState?.current_hand;
  const currentActorId = hand?.current_actor_id ??
    tableState?.seats.find(s => s.seat === hand?.current_actor_seat)?.player_id ?? null;
  const rawIsMyTurn = !!userId && currentActorId === userId && !!hand && hand.phase !== 'complete' && hand.phase !== 'showdown';
  const isMyTurn = rawIsMyTurn && !actionPending && (lastActedVersionRef.current === null || (hand?.state_version ?? 0) > lastActedVersionRef.current);

  const mySeat = tableState?.seats.find(s => s.player_id === userId);
  const myCurrentBet = mySeat?.current_bet ?? 0;
  const currentBet = hand?.current_bet ?? 0;
  const amountToCall = Math.max(0, currentBet - myCurrentBet);
  const canCheck = amountToCall === 0;

  // Clear lastActions when hand_id changes
  useEffect(() => {
    const currentHandId = hand?.hand_id ?? null;
    if (currentHandId !== prevHandIdRef.current) {
      if (currentHandId && currentHandId !== prevHandIdRef.current) {
        setLastActions({});
        lastActedVersionRef.current = null;
      }
      prevHandIdRef.current = currentHandId;
      prevCommunityAtResultRef.current = 0;
      pendingWinnersRef.current = null;
      runoutCompleteTimeRef.current = 0;
    }
  }, [hand?.hand_id]);

  // Helper to schedule a chat bubble removal with cleanup tracking
  const scheduleBubbleRemoval = useCallback((id: string) => {
    const timer = setTimeout(() => {
      setChatBubbles(prev => prev.filter(b => b.id !== id));
      chatBubbleTimers.current.delete(timer);
    }, 5000);
    chatBubbleTimers.current.add(timer);
  }, []);

  const lastRefreshRef = useRef<number>(0);

  // Fetch full state from HTTP endpoint (debounced: skip if called within 2s)
  const refreshState = useCallback(async () => {
    if (!tableId) return;
    const now = Date.now();
    if (now - lastRefreshRef.current < 2000) return;
    lastRefreshRef.current = now;
    try {
      const data = await callEdge('poker-table-state', { table_id: tableId }, 'GET');
      setTableState(data);
      setMyCards(data.my_cards || null);
      setError(null);
      setConnectionStatus('connected');
      lastAppliedVersionRef.current = data.current_hand?.state_version ?? 0;
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  // Initial load
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Subscribe to realtime broadcasts
  useEffect(() => {
    if (!tableId) return;

    // M4: Clean up stale channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`poker:table:${tableId}`)
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        // Track last broadcast for stale hand detection
        lastBroadcastRef.current = Date.now();
        // Mark connected on any successful broadcast
        setConnectionStatus('connected');

        // M2: Ignore out-of-order broadcasts by state_version
        const incomingVersion = payload.state_version ?? 0;
        const currentHandId = tableStateRef.current?.current_hand?.hand_id ?? null;
        const incomingHandId = payload.hand_id ?? null;
        if (incomingHandId && incomingHandId === currentHandId && incomingVersion <= lastAppliedVersionRef.current) {
          return; // Skip stale broadcast
        }
        if (incomingHandId !== currentHandId) {
          lastAppliedVersionRef.current = 0;
        }
        lastAppliedVersionRef.current = incomingVersion;

        // Clear actionPending on any game_state broadcast
        setActionPending(false);
        if (actionPendingFallbackRef.current) {
          clearTimeout(actionPendingFallbackRef.current);
          actionPendingFallbackRef.current = null;
        }

        // Accumulate last actions from seats
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

        // Track community card count for staged card animation
        const newCommunityCount = (payload.community_cards || []).length;

        // Fix 2: Set runout completion timestamp when multi-card arrival detected
        const prevCount = prevCommunityAtResultRef.current ?? 0;
        if (newCommunityCount > prevCount && (newCommunityCount - prevCount) > 1) {
          const runoutMs = newCommunityCount >= 5 && prevCount <= 3 ? 4000 : 2000;
          runoutCompleteTimeRef.current = Date.now() + runoutMs;
        } else if (newCommunityCount <= prevCount || newCommunityCount === 0) {
          runoutCompleteTimeRef.current = 0;
        }
        prevCommunityAtResultRef.current = newCommunityCount;

        // Fix 3: Check if pending winners can now fire (cards have arrived via game_state)
        const pending = pendingWinnersRef.current;
        if (pending && newCommunityCount >= pending.targetCardCount) {
          pendingWinnersRef.current = null;
          const msUntilRunoutDone = Math.max(0, runoutCompleteTimeRef.current - Date.now());
          const delay = Math.max(pending.winnerDelay, msUntilRunoutDone + 500);
          if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
          winnerTimerRef.current = setTimeout(() => setHandWinners(pending.winners), delay);
        }

        // Merge broadcast state into local state
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
          // Merge seat DATA without changing seat array membership mid-hand
          // New seats only arrive via seat_change or refreshState
          const mergedSeats = prev.seats.map(existingSeat => {
            const updated = seats.find(s => s.seat === existingSeat.seat);
            return updated ? { ...existingSeat, ...updated } : existingSeat;
          });
          // Self-healing: add any seats from broadcast that are missing locally
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

        // Fix 6: Removed competing phase=complete timer. hand_result's 12s timer is the single source of truth.
      })
      .on('broadcast', { event: 'seat_change' }, ({ payload }) => {
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
        // Handle disconnected: update status only (seat still exists server-side)
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
        // Handle leave, kicked, force_removed: clear seat visually
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
          // If this player was kicked for inactivity, flag it
          if (payload.action === 'kicked' && (payload.kicked_player_id === userId || payload.player_id === userId)) {
            setKickedForInactivity(true);
          }
          return;
        }
        if (payload?.action === 'join') {
          // Apply join locally for instant feedback (both during hand and idle)
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
          if (handActive) return; // Skip refreshState during active hand
          // Background refresh for authoritative data
          refreshState();
          return;
        }
        // Unknown seat_change event — ignore (specific handlers above cover all known types)
      })
      .on('broadcast', { event: 'hand_result' }, ({ payload }) => {
        // FIX RT-1: Deduplicate hand_result by hand_id to prevent double winner display
        const resultHandId = payload.hand_id;
        if (resultHandId && resultHandId === prevHandIdRef.current && handWinners.length > 0) {
          console.log('[hand_result] Skipping duplicate for hand', resultHandId);
          return;
        }

        const revealed: RevealedCard[] = payload.revealed_cards || [];
        setRevealedCards(revealed);

        // Use seats from hand_result payload (authoritative) for display names
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

        // Fix 4: Rewritten hand_result winner logic
        const resultCommunity = (payload.community_cards || []).length;
        const currentCommunity = prevCommunityAtResultRef.current ?? 0;
        const cardDiff = resultCommunity - currentCommunity;

        let winnerDelay: number;
        if (cardDiff > 1) {
          winnerDelay = resultCommunity >= 5 && currentCommunity <= 3 ? 4500 : 2500;
        } else {
          winnerDelay = 500;
        }

        // ALWAYS store in pendingWinnersRef first
        pendingWinnersRef.current = { winners, winnerDelay, targetCardCount: resultCommunity };

        // Then immediately check if game_state already delivered these cards
        const alreadyDelivered = (prevCommunityAtResultRef.current ?? 0) >= resultCommunity;
        if (alreadyDelivered) {
          pendingWinnersRef.current = null;
          const msUntilRunoutDone = Math.max(0, runoutCompleteTimeRef.current - Date.now());
          const delay = Math.max(winnerDelay, msUntilRunoutDone + 500);
          if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
          winnerTimerRef.current = setTimeout(() => setHandWinners(winners), delay);
        }

        // Snapshot current stacks before result updates them
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

        // Set showdown cleanup — dynamic delay based on winnerDelay + buffer for overlay display
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
          runoutCompleteTimeRef.current = 0; // Fix 5: Clear on hand reset
          showdownTimerRef.current = null;
          setAutoStartAttempted(false);
        }, showdownDelay);
      })
      .on('broadcast', { event: 'hand_complete' }, ({ payload }) => {
        // Merged game_state + hand_result in one atomic broadcast — no race condition
        lastBroadcastRef.current = Date.now();
        setConnectionStatus('connected');

        const incomingVersion = payload.state_version ?? 0;
        lastAppliedVersionRef.current = incomingVersion;

        setActionPending(false);
        if (actionPendingFallbackRef.current) {
          clearTimeout(actionPendingFallbackRef.current);
          actionPendingFallbackRef.current = null;
        }

        // Accumulate last actions
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

        // Community cards from the complete payload
        const newCommunityCount = (payload.community_cards || []).length;
        const prevCount = prevCommunityAtResultRef.current ?? 0;

        // Set runout timestamp for staged card animation
        if (newCommunityCount > prevCount && (newCommunityCount - prevCount) > 1) {
          const runoutMs = newCommunityCount >= 5 && prevCount <= 3 ? 4000 : 2000;
          runoutCompleteTimeRef.current = Date.now() + runoutMs;
        }
        prevCommunityAtResultRef.current = newCommunityCount;

        // Snapshot current stacks before result updates them
        const currentSeatsHC = tableStateRef.current?.seats ?? [];
        const snapshotHC: Record<number, number> = {};
        for (const s of currentSeatsHC) {
          if (s.player_id) snapshotHC[s.seat] = s.stack;
        }
        preResultStacksRef.current = snapshotHC;

        // Merge state
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

        // Process hand_result portion — revealed cards + winners
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

        // Calculate winner delay from this single self-contained payload
        const msUntilRunoutDone = Math.max(0, runoutCompleteTimeRef.current - Date.now());
        const baseDelay = newCommunityCount < 5 || (newCommunityCount - prevCount) > 1 ? 4500 : 500;
        const winnerDelay = Math.max(baseDelay, msUntilRunoutDone + 500);

        if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
        winnerTimerRef.current = setTimeout(() => setHandWinners(winners), winnerDelay);

        // Showdown cleanup -- dynamic delay
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
      })
      .on('broadcast', { event: 'chat_emoji' }, ({ payload }) => {
        if (payload.player_id === userId) return;
        const id = `chat-${chatIdCounter.current++}`;
        const bubble: ChatBubble = { player_id: payload.player_id, text: payload.text, id };
        setChatBubbles(prev => [...prev, bubble]);
        scheduleBubbleRemoval(id);
      })
      .on('broadcast', { event: 'blinds_up' }, ({ payload }) => {
        // Blinds increased — update table state locally and notify
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
        // Expose via a callback or we'll let the component handle the toast
        blindsUpCallbackRef.current?.(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        let spectators = 0;
        const playerIds = new Set<string>();
        for (const key of Object.keys(presenceState)) {
          for (const p of presenceState[key] as any[]) {
            if (p.role === 'spectator') spectators++;
            if (p.user_id) playerIds.add(p.user_id);
          }
        }
        setSpectatorCount(spectators);
        setOnlinePlayerIds(playerIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          if (hasSubscribedOnceRef.current) {
            // Reconnect — refetch full state including hole cards
            refreshState();
          }
          hasSubscribedOnceRef.current = true;
          if (userId) {
            const isCurrentlySeated = tableStateRef.current?.seats.some(s => s.player_id === userId) ?? false;
            await channel.track({ user_id: userId, role: isCurrentlySeated ? 'player' : 'spectator' });
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      hasSubscribedOnceRef.current = false;
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
      if (winnerTimerRef.current) clearTimeout(winnerTimerRef.current);
      // Clean up all chat bubble timers
      chatBubbleTimers.current.forEach(t => clearTimeout(t));
      chatBubbleTimers.current.clear();
    };
  }, [tableId, refreshState, scheduleBubbleRemoval]);

  // ── Heartbeat: send every 30s while seated ──
  useEffect(() => {
    if (!tableId || mySeatNumber === null) return;
    // Send one immediately on mount / seat change
    callEdge('poker-heartbeat', { table_id: tableId }).catch(() => {});
    const interval = setInterval(() => {
      callEdge('poker-heartbeat', { table_id: tableId }).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [tableId, mySeatNumber]);

  // Fetch my cards when a new hand starts
  useEffect(() => {
    if (!hand?.hand_id || !userId || mySeatNumber === null) return;
    // Delay setting myCards by 50ms so cards arrive before first reveal animation
    const timer = setTimeout(async () => {
      try {
        const data = await callEdge('poker-my-cards', { hand_id: hand.hand_id }, 'GET');
        setMyCards(data.hole_cards || null);
      } catch {
        // not in hand
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [hand?.hand_id, userId, mySeatNumber]);

  // Timeout auto-ping
  useEffect(() => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (!hand?.action_deadline || !userId || isMyTurn || !mySeatNumber) return;

    const deadline = new Date(hand.action_deadline).getTime();
    const delay = deadline - Date.now() + 6000;
    if (delay <= 0) return;

    timeoutTimerRef.current = setTimeout(() => {
      pingTimeout().catch(() => {});
    }, delay);

    return () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [hand?.action_deadline, isMyTurn, userId, mySeatNumber]);

  // Actions
  const joinTable = useCallback(async (seatNumber: number, buyIn: number) => {
    await callEdge('poker-join-table', { table_id: tableId, seat_number: seatNumber, buy_in_amount: buyIn });
    await refreshState();
    if (channelRef.current && userId) {
      await channelRef.current.track({ user_id: userId, role: 'player' });
    }
  }, [tableId, refreshState]);

  const leaveSeat = useCallback(async (preserveStack = true) => {
    if (mySeatNumber === null) return;
    await callEdge('poker-leave-table', { table_id: tableId, preserve_stack: preserveStack });
    // Update local state directly — server broadcasts seat_change to all other clients
    setTableState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        seats: prev.seats.map(s =>
          s.seat === mySeatNumber
            ? { ...s, player_id: null, display_name: '', stack: 0, status: 'empty' }
            : s
        ),
      };
    });
    if (channelRef.current && userId) {
      await channelRef.current.track({ user_id: userId, role: 'spectator' });
    }
  }, [tableId, mySeatNumber, userId]);

  const leaveTable = useCallback(async () => {
    if (mySeatNumber === null) return;
    await callEdge('poker-leave-table', { table_id: tableId, preserve_stack: false });
    setTableState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        seats: prev.seats.map(s =>
          s.seat === mySeatNumber
            ? { ...s, player_id: null, display_name: '', stack: 0, status: 'empty' }
            : s
        ),
      };
    });
    if (channelRef.current && userId) {
      await channelRef.current.track({ user_id: userId, role: 'spectator' });
    }
  }, [tableId, mySeatNumber, userId]);

  const startHand = useCallback(async () => {
    const data = await callEdge('poker-start-hand', { table_id: tableId });
    if (data.state) {
      setTableState(prev => prev ? {
        ...prev,
        current_hand: {
          hand_id: data.hand_id,
          hand_number: data.state.hand_number,
          phase: data.state.phase,
          community_cards: data.state.community_cards || [],
          pots: data.state.pots || [],
          current_actor_seat: data.state.current_actor_seat ?? null,
          current_bet: data.state.current_bet ?? 0,
          min_raise: data.state.min_raise ?? prev.table.big_blind,
          action_deadline: data.state.action_deadline,
          dealer_seat: data.state.dealer_seat,
          sb_seat: data.state.sb_seat,
          bb_seat: data.state.bb_seat,
          state_version: data.state.state_version ?? 0,
          blinds: data.state.blinds,
          current_actor_id: data.state.current_actor_id,
        },
        seats: data.state.seats || prev.seats,
      } : prev);
    }
  }, [tableId]);

  // Keep startHandRef always pointing to the latest startHand
  useEffect(() => { startHandRef.current = startHand; }, [startHand]);

  const sendAction = useCallback(async (action: string, amount?: number) => {
    if (!hand || actionPending) return;
    lastActedVersionRef.current = hand.state_version ?? 0;
    setActionPending(true);
    if (actionPendingFallbackRef.current) clearTimeout(actionPendingFallbackRef.current);
    actionPendingFallbackRef.current = setTimeout(() => {
      setActionPending(false);
      actionPendingFallbackRef.current = null;
    }, 1500);
    try {
      await callEdge('poker-action', {
        table_id: tableId,
        hand_id: hand.hand_id,
        action,
        amount: amount ?? 0,
      });
    } catch (err) {
      setActionPending(false);
      if (actionPendingFallbackRef.current) {
        clearTimeout(actionPendingFallbackRef.current);
        actionPendingFallbackRef.current = null;
      }
      throw err;
    }
  }, [tableId, hand, actionPending]);

  const pingTimeout = useCallback(async () => {
    if (!hand) return;
    try {
      await callEdge('poker-timeout-ping', {
        table_id: tableId,
        hand_id: hand.hand_id,
      });
    } catch {
      // Expected when hand completes between pings — safe to ignore
    }
  }, [tableId, hand]);

  // Auto-deal
  const seatedCount = tableState?.seats.filter(s => s.player_id && s.status !== 'eliminated' && s.stack > 0).length ?? 0;
  const hasActiveHand = !!tableState?.current_hand;

  // Leader election: only lowest-seated player triggers auto-deal
  const isAutoStartLeader = (() => {
    if (!tableState?.seats || mySeatNumber === null) return false;
    const occupiedSeats = tableState.seats
      .filter(s => s.player_id && s.status !== 'eliminated')
      .map(s => s.seat)
      .sort((a, b) => a - b);
    return occupiedSeats[0] === mySeatNumber;
  })();

  useEffect(() => {
    // Only the lowest-seat player triggers auto-deal
    if (!isAutoStartLeader) return;
    if (!handHasEverStarted) return;
    if (seatedCount < 2) return;
    if (hasActiveHand) return;
    if (mySeatNumber === null) return;

    setAutoStartAttempted(false);

    const timer = setTimeout(() => {
      setAutoStartAttempted(true);
      startHandRef.current().catch((err) => {
        console.warn('[auto-start] startHand failed:', err);
        // Reset after 5s so we try again on next state change
        setTimeout(() => setAutoStartAttempted(false), 5000);
      });
    }, 3500 + Math.random() * 500);

    return () => clearTimeout(timer);
  }, [isAutoStartLeader, handHasEverStarted, seatedCount, hasActiveHand, mySeatNumber]);

  useEffect(() => {
    if (hasActiveHand) {
      setAutoStartAttempted(true);
      setHandHasEverStarted(true);
      lastBroadcastRef.current = Date.now();
    }
  }, [hasActiveHand]);

  const sendChat = useCallback((text: string) => {
    if (!channelRef.current || !userId) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_emoji',
      payload: { player_id: userId, text },
    });
    const id = `chat-${chatIdCounter.current++}`;
    const bubble: ChatBubble = { player_id: userId, text, id };
    setChatBubbles(prev => [...prev, bubble]);
    scheduleBubbleRemoval(id);
  }, [userId, scheduleBubbleRemoval]);

  // Unified timeout polling: leaders check every 8s, non-leaders do a stale recovery every 15s
  useEffect(() => {
    if (!tableId) return;

    const pollInterval = isAutoStartLeader ? 8000 : 15000;

    timeoutPollRef.current = setInterval(async () => {
      const currentState = tableStateRef.current;
      const currentHand = currentState?.current_hand;

      if (isAutoStartLeader && currentHand?.action_deadline) {
        // Leader: check if deadline passed, then call check-timeouts
        const deadline = new Date(currentHand.action_deadline).getTime();
        if (Date.now() > deadline + 3000) {
          try {
            await callEdge('poker-check-timeouts', { table_id: tableId });
          } catch {}
          refreshState();
        }
      } else if (!isAutoStartLeader && currentHand) {
        // Non-leader: stale broadcast recovery (no broadcast in 12s)
        const elapsed = Date.now() - lastBroadcastRef.current;
        if (elapsed > 12000) {
          lastBroadcastRef.current = Date.now();
          callEdge('poker-check-timeouts', { table_id: tableId }).catch(() => {});
          refreshState();
        }
      }
    }, pollInterval);

    return () => {
      if (timeoutPollRef.current) {
        clearInterval(timeoutPollRef.current);
        timeoutPollRef.current = null;
      }
    };
  }, [isAutoStartLeader, tableId, refreshState]);

  // Reset all hand-specific state for a clean new game (called by "Play Again")
  const resetForNewGame = useCallback(() => {
    setRevealedCards([]);
    setHandWinners([]);
    setMyCards(null);
    setLastActions({});
    prevCommunityAtResultRef.current = 0;
    lastAppliedVersionRef.current = 0;
    lastActedVersionRef.current = null;
    pendingWinnersRef.current = null;
    runoutCompleteTimeRef.current = 0;
    prevHandIdRef.current = null;
    preResultStacksRef.current = null;
    setAutoStartAttempted(false);
    setHandHasEverStarted(false);
    if (winnerTimerRef.current) { clearTimeout(winnerTimerRef.current); winnerTimerRef.current = null; }
    if (showdownTimerRef.current) { clearTimeout(showdownTimerRef.current); showdownTimerRef.current = null; }
  }, []);

  return {
    tableState,
    myCards,
    loading,
    error,
    mySeatNumber,
    isMyTurn,
    amountToCall,
    canCheck,
    revealedCards,
    actionPending,
    lastActions,
    handWinners,
    chatBubbles,
    spectatorCount,
    connectionStatus,
    lastKnownPhase,
    lastKnownStack,
    onlinePlayerIds,
    kickedForInactivity,
    gameOverPendingRef,
    joinTable,
    leaveSeat,
    leaveTable,
    startHand,
    sendAction,
    pingTimeout,
    refreshState,
    resetForNewGame,
    preResultStacksRef,
    sendChat,
    autoStartAttempted,
    handHasEverStarted,
    onBlindsUp: useCallback((cb: (payload: any) => void) => {
      blindsUpCallbackRef.current = cb;
    }, []),
  };
}
