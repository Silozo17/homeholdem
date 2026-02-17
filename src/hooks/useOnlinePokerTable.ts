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

interface UseOnlinePokerTableReturn {
  tableState: OnlineTableState | null;
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
  leaveTable: () => Promise<void>;
  startHand: () => Promise<void>;
  sendAction: (action: string, amount?: number) => Promise<void>;
  pingTimeout: () => Promise<void>;
  refreshState: () => Promise<void>;
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
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [handHasEverStarted, setHandHasEverStarted] = useState(false);
  const startHandRef = useRef<() => Promise<void>>(null as any);
  const autoStartRetriesRef = useRef(0);
  const blindsUpCallbackRef = useRef<((payload: any) => void) | null>(null);
  const prevCommunityAtResultRef = useRef(0);
  const lastAppliedVersionRef = useRef(0);

  const userId = user?.id;
  const lastBroadcastRef = useRef<number>(Date.now());
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<Set<string>>(new Set());
  const timeoutPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const isMyTurn = rawIsMyTurn && !actionPending;

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
      }
      prevHandIdRef.current = currentHandId;
      prevCommunityAtResultRef.current = 0;
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

  // Fetch full state from HTTP endpoint
  const refreshState = useCallback(async () => {
    if (!tableId) return;
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

        // Track community card count for runout detection
        prevCommunityAtResultRef.current = (payload.community_cards || []).length;

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
          return { ...prev, current_hand: broadcastHand, seats: seats.length > 0 ? seats : prev.seats };
        });

        // Fallback: if hand_result never arrives after complete, force cleanup after 6s
        if (payload.phase === 'complete') {
          if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
          showdownTimerRef.current = setTimeout(() => {
            setTableState(prev => prev ? { ...prev, current_hand: null } : prev);
            setMyCards(null);
            setRevealedCards([]);
            setHandWinners([]);
            showdownTimerRef.current = null;
            setAutoStartAttempted(false);
          }, 6000);
        }
      })
      .on('broadcast', { event: 'seat_change' }, ({ payload }) => {
        if (payload?.action === 'table_closed') {
          setTableState(null);
          return;
        }
        if (payload?.action === 'leave' && payload?.seat != null) {
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
        }
        refreshState();
      })
      .on('broadcast', { event: 'hand_result' }, ({ payload }) => {
        const revealed: RevealedCard[] = payload.revealed_cards || [];
        setRevealedCards(revealed);

        const currentSeats = tableStateRef.current?.seats || [];
        const winners: HandWinner[] = (payload.winners || []).map((w: any) => {
          const seatData = currentSeats.find((s) => s.player_id === w.player_id);
          return {
            player_id: w.player_id,
            display_name: seatData?.display_name || 'Unknown',
            amount: w.amount || 0,
            hand_name: w.hand_name || '',
          };
        });

        // Detect all-in runout: only delay if community cards jumped from <5 to 5
        const incomingCommunityCount = (payload.community_cards || []).length;
        const wasRunout = prevCommunityAtResultRef.current < 5 && incomingCommunityCount === 5;
        const winnerDelay = wasRunout ? 4000 : 0;

        if (winnerDelay > 0) {
          setTimeout(() => setHandWinners(winners), winnerDelay);
        } else {
          setHandWinners(winners);
        }

        setTableState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            current_hand: prev.current_hand ? { ...prev.current_hand, phase: 'complete' } : null,
            seats: payload.seats || prev.seats,
          };
        });

        if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);

        // Use longer delay when all community cards arrived at once (all-in runout)
        const communityCount = (payload.community_cards || []).length;
        const showdownDelay = communityCount >= 5 ? 6000 : 3500;

        showdownTimerRef.current = setTimeout(() => {
          setTableState(prev => {
            if (!prev) return prev;
            return { ...prev, current_hand: null };
          });
          setMyCards(null);
          setRevealedCards([]);
          setHandWinners([]);
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
      if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
      // Clean up all chat bubble timers
      chatBubbleTimers.current.forEach(t => clearTimeout(t));
      chatBubbleTimers.current.clear();
    };
  }, [tableId, refreshState, scheduleBubbleRemoval]);

  // Fetch my cards when a new hand starts
  useEffect(() => {
    if (!hand?.hand_id || !userId || mySeatNumber === null) return;
    // Delay setting myCards by 200ms so cards arrive before first reveal animation (~500ms)
    const timer = setTimeout(async () => {
      try {
        const data = await callEdge('poker-my-cards', { hand_id: hand.hand_id }, 'GET');
        setMyCards(data.hole_cards || null);
      } catch {
        // not in hand
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [hand?.hand_id, userId, mySeatNumber]);

  // Timeout auto-ping
  useEffect(() => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (!hand?.action_deadline || !userId || isMyTurn || !mySeatNumber) return;

    const deadline = new Date(hand.action_deadline).getTime();
    const delay = deadline - Date.now() + 2000;
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
  }, [tableId, refreshState]);

  const leaveTable = useCallback(async () => {
    if (mySeatNumber === null) return;
    await callEdge('poker-leave-table', { table_id: tableId });
    await refreshState();
  }, [tableId, refreshState, mySeatNumber]);

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
    await callEdge('poker-timeout-ping', {
      table_id: tableId,
      hand_id: hand.hand_id,
    });
  }, [tableId, hand]);

  // Auto-deal
  const seatedCount = tableState?.seats.filter(s => s.player_id && s.status !== 'eliminated').length ?? 0;
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
    if (seatedCount >= 2 && !hasActiveHand && !autoStartAttempted && mySeatNumber !== null && handHasEverStarted && isAutoStartLeader) {
      if (autoStartTimerRef.current) return;
      const jitter = Math.random() * 1000;
      autoStartTimerRef.current = setTimeout(() => {
        autoStartTimerRef.current = null;
        setAutoStartAttempted(true);
        // Use ref to always call the latest version of startHand
        startHandRef.current().catch(() => {
          autoStartTimerRef.current = null;
          autoStartRetriesRef.current += 1;
          if (autoStartRetriesRef.current < 3) {
            setAutoStartAttempted(false);
          }
          // else: stay attempted=true, stop retrying
        });
      }, 1200 + jitter);
      return () => {
        if (autoStartTimerRef.current) {
          clearTimeout(autoStartTimerRef.current);
          autoStartTimerRef.current = null;
        }
      };
    }
  }, [seatedCount, hasActiveHand, mySeatNumber, autoStartAttempted, handHasEverStarted, isAutoStartLeader]);

  useEffect(() => {
    if (hasActiveHand) {
      setAutoStartAttempted(true);
      setHandHasEverStarted(true);
      autoStartRetriesRef.current = 0;
      lastBroadcastRef.current = Date.now();
    }
  }, [hasActiveHand]);

  // Fallback reset: wait longer than showdown timer (3.5s) + buffer, respect retry cap
  useEffect(() => {
    if (!hasActiveHand && autoStartAttempted && handHasEverStarted) {
      const fallback = setTimeout(() => {
        if (autoStartRetriesRef.current < 3) {
          setAutoStartAttempted(false);
        }
      }, 4500);
      return () => clearTimeout(fallback);
    }
  }, [hasActiveHand, autoStartAttempted, handHasEverStarted]);

  // Safety net: force reset if stuck for more than 6 seconds, respect retry cap
  useEffect(() => {
    if (seatedCount >= 2 && !hasActiveHand && autoStartAttempted && handHasEverStarted) {
      const safetyNet = setTimeout(() => {
        if (autoStartRetriesRef.current < 3) {
          setAutoStartAttempted(false);
        }
        if (autoStartTimerRef.current) {
          clearTimeout(autoStartTimerRef.current);
          autoStartTimerRef.current = null;
        }
      }, 6000);
      return () => clearTimeout(safetyNet);
    }
  }, [seatedCount, hasActiveHand, autoStartAttempted, handHasEverStarted]);

  // Stale hand recovery: if hand is active but no broadcast in 12s, poll server
  useEffect(() => {
    if (!hasActiveHand) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastBroadcastRef.current;
      if (elapsed > 12000) {
        lastBroadcastRef.current = Date.now();
        refreshState();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [hasActiveHand, refreshState]);

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

  // Fix 1: Periodic server-side timeout polling (leader-only, every 8s)
  useEffect(() => {
    if (!isAutoStartLeader || !tableId) return;
    timeoutPollRef.current = setInterval(async () => {
      const currentState = tableStateRef.current;
      const currentHand = currentState?.current_hand;
      if (!currentHand?.action_deadline) return;
      const deadline = new Date(currentHand.action_deadline).getTime();
      if (Date.now() > deadline + 3000) {
        try {
          await callEdge('poker-check-timeouts', { table_id: tableId });
          refreshState();
        } catch {}
      }
    }, 8000);
    return () => {
      if (timeoutPollRef.current) {
        clearInterval(timeoutPollRef.current);
        timeoutPollRef.current = null;
      }
    };
  }, [isAutoStartLeader, tableId, refreshState]);

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
    joinTable,
    leaveTable,
    startHand,
    sendAction,
    pingTimeout,
    refreshState,
    sendChat,
    autoStartAttempted,
    handHasEverStarted,
    onBlindsUp: useCallback((cb: (payload: any) => void) => {
      blindsUpCallbackRef.current = cb;
    }, []),
  };
}
