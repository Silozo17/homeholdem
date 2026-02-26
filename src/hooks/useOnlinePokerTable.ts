import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/lib/poker/types';
import { callEdge } from '@/lib/poker/callEdge';
import { OnlineTableState } from '@/lib/poker/online-types';
import { usePokerBroadcast } from './usePokerBroadcast';
import { usePokerConnection } from './usePokerConnection';

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
  const userId = user?.id;

  // ── Parent-owned state ──
  const [tableState, setTableState] = useState<OnlineTableState | null>(null);
  const [myCards, setMyCards] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  const [handHasEverStarted, setHandHasEverStarted] = useState(false);
  const [lastKnownPhase, setLastKnownPhase] = useState<string | null>(null);
  const [lastKnownStack, setLastKnownStack] = useState<number | null>(null);

  // ── Parent-owned refs ──
  const tableStateRef = useRef<OnlineTableState | null>(null);
  const startHandRef = useRef<() => Promise<void>>(null as any);
  const blindsUpCallbackRef = useRef<((payload: any) => void) | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const gameOverPendingRef = useRef(false);
  const announceCustomRef = useRef<(msg: string) => void>(() => {});

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

  // ── Compose usePokerBroadcast ──
  const broadcast = usePokerBroadcast({
    userId,
    tableStateRef,
    setTableState,
    setMyCards,
    setAutoStartAttempted,
    setConnectionStatus: (v) => connectionSetterRef.current(v),
    refreshState: () => refreshStateRef.current(),
    gameOverPendingRef,
    blindsUpCallbackRef,
    announceCustomRef,
  });

  // Refs to break circular dependency: connection.setConnectionStatus and refreshState
  // are needed by broadcast, but broadcast is created before connection
  const connectionSetterRef = useRef<React.Dispatch<React.SetStateAction<ConnectionStatus>>>(() => {});
  const refreshStateRef = useRef<() => Promise<void>>(async () => {});

  // ── Fetch full state from HTTP endpoint ──
  const refreshState = useCallback(async (force = false) => {
    if (!tableId) return;
    const now = Date.now();
    if (!force && now - lastRefreshRef.current < 2000) return;
    lastRefreshRef.current = now;
    try {
      const data = await callEdge('poker-table-state', { table_id: tableId }, 'GET');
      setTableState(data);
      setMyCards(data.my_cards || null);
      if (data.current_hand) {
        setHandHasEverStarted(true);
      }
      setError(null);
      connectionSetterRef.current('connected');
      broadcast.lastAppliedVersionRef.current = data.current_hand?.state_version ?? 0;
    } catch (err: any) {
      setError(err.message);
      connectionSetterRef.current('disconnected');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  // Keep refreshStateRef in sync
  useEffect(() => { refreshStateRef.current = refreshState; }, [refreshState]);

  // ── Compose usePokerConnection ──
  const connection = usePokerConnection({
    tableId,
    userId,
    tableStateRef,
    refreshState,
    broadcastHandlers: broadcast.buildBroadcastHandlers(),
  });

  // Wire connectionSetterRef to connection's setter
  useEffect(() => {
    connectionSetterRef.current = connection.setConnectionStatus;
  }, [connection.setConnectionStatus]);

  // isMyTurn derivation using broadcast refs
  const rawIsMyTurn = !!userId && currentActorId === userId && !!hand && hand.phase !== 'complete' && hand.phase !== 'showdown';
  const isMyTurn = rawIsMyTurn && !broadcast.actionPending && (broadcast.lastActedVersionRef.current === null || (hand?.state_version ?? 0) > broadcast.lastActedVersionRef.current);

  const mySeat = tableState?.seats.find(s => s.player_id === userId);
  const myCurrentBet = mySeat?.current_bet ?? 0;
  const currentBet = hand?.current_bet ?? 0;
  const amountToCall = Math.max(0, currentBet - myCurrentBet);
  const canCheck = amountToCall === 0;

  // Initial load
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // ── Heartbeat: send every 30s while seated ──
  useEffect(() => {
    if (!tableId || mySeatNumber === null) return;
    callEdge('poker-heartbeat', { table_id: tableId }).catch(() => {});
    const interval = setInterval(() => {
      callEdge('poker-heartbeat', { table_id: tableId }).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [tableId, mySeatNumber]);

  // Fetch my cards when a new hand starts
  useEffect(() => {
    if (!hand?.hand_id || !userId) return;
    let cancelled = false;
    const fetchCards = async (attempt = 0) => {
      try {
        const data = await callEdge('poker-my-cards', { hand_id: hand.hand_id }, 'GET');
        if (cancelled) return;
        if (data.hole_cards) {
          setMyCards(data.hole_cards);
        } else if (attempt === 0) {
          // Retry once after 500ms — cards may not be inserted yet
          setTimeout(() => { if (!cancelled) fetchCards(1); }, 500);
        }
      } catch {
        // Not in hand or hand completed
      }
    };
    fetchCards();
    return () => { cancelled = true; };
  }, [hand?.hand_id, userId]);

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

  // ── Actions ──
  const joinTable = useCallback(async (seatNumber: number, buyIn: number) => {
    const data = await callEdge('poker-join-table', { table_id: tableId, seat_number: seatNumber, buy_in_amount: buyIn });
    // Optimistic local update — don't await refreshState
    setTableState(prev => {
      if (!prev) return prev;
      const alreadyExists = prev.seats.some(s => s.seat === seatNumber && s.player_id);
      if (alreadyExists) return prev;
      return {
        ...prev,
        seats: [...prev.seats.filter(s => s.seat !== seatNumber), {
          seat: seatNumber,
          player_id: userId!,
          display_name: data?.display_name || 'You',
          avatar_url: data?.avatar_url || null,
          country_code: data?.country_code || null,
          stack: buyIn,
          status: 'sitting_out',
          has_cards: false,
          current_bet: 0,
          last_action: null,
        }],
      };
    });
    // Fire-and-forget presence track
    if (connection.channelRef.current && userId) {
      connection.channelRef.current.track({ user_id: userId, role: 'player' }).catch(() => {});
    }
  }, [tableId, userId]);

  const leaveSeat = useCallback(async (preserveStack = true) => {
    if (mySeatNumber === null) return;
    await callEdge('poker-leave-table', { table_id: tableId, preserve_stack: preserveStack });
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
    if (connection.channelRef.current && userId) {
      await connection.channelRef.current.track({ user_id: userId, role: 'spectator' });
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
    if (connection.channelRef.current && userId) {
      await connection.channelRef.current.track({ user_id: userId, role: 'spectator' });
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
    if (!hand || broadcast.actionPending) return;
    broadcast.markActionSent(hand.state_version ?? 0);
    try {
      await callEdge('poker-action', {
        table_id: tableId,
        hand_id: hand.hand_id,
        action,
        amount: amount ?? 0,
      });
    } catch (err) {
      broadcast.clearActionPending();
      throw err;
    }
  }, [tableId, hand, broadcast.actionPending, broadcast.markActionSent]);

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

  const isAutoStartLeader = (() => {
    if (!tableState?.seats || mySeatNumber === null) return false;
    const occupiedSeats = tableState.seats
      .filter(s => s.player_id && s.status !== 'eliminated')
      .map(s => s.seat)
      .sort((a, b) => a - b);
    return occupiedSeats[0] === mySeatNumber;
  })();

  useEffect(() => {
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
        setTimeout(() => setAutoStartAttempted(false), 5000);
      });
    }, 1200 + Math.random() * 800);

    return () => clearTimeout(timer);
  }, [isAutoStartLeader, handHasEverStarted, seatedCount, hasActiveHand, mySeatNumber]);

  useEffect(() => {
    if (hasActiveHand) {
      setAutoStartAttempted(true);
      setHandHasEverStarted(true);
      broadcast.lastBroadcastRef.current = Date.now();
    }
  }, [hasActiveHand]);

  const sendChat = useCallback((text: string) => {
    if (!connection.channelRef.current || !userId) return;
    connection.channelRef.current.send({
      type: 'broadcast',
      event: 'chat_emoji',
      payload: { player_id: userId, text },
    });
    const id = `chat-${broadcast.chatIdCounter.current++}`;
    const bubble: ChatBubble = { player_id: userId, text, id };
    broadcast.setChatBubbles(prev => [...prev, bubble]);
    broadcast.scheduleBubbleRemoval(id);
  }, [userId, broadcast.scheduleBubbleRemoval]);

  // Unified timeout polling
  useEffect(() => {
    if (!tableId) return;

    const pollInterval = isAutoStartLeader ? 8000 : 15000;

    timeoutPollRef.current = setInterval(async () => {
      const currentState = tableStateRef.current;
      const currentHand = currentState?.current_hand;

      if (isAutoStartLeader && currentHand?.action_deadline) {
        const deadline = new Date(currentHand.action_deadline).getTime();
        if (Date.now() > deadline + 3000) {
          try {
            await callEdge('poker-check-timeouts', { table_id: tableId });
          } catch {}
          refreshState();
        }
      } else if (!isAutoStartLeader && currentHand) {
        const elapsed = Date.now() - broadcast.lastBroadcastRef.current;
        if (elapsed > 12000) {
          broadcast.lastBroadcastRef.current = Date.now();
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

  // Reset all hand-specific state for a clean new game
  const resetForNewGame = useCallback(() => {
    broadcast.resetBroadcastState();
    setMyCards(null);
    setAutoStartAttempted(false);
    setHandHasEverStarted(false);
  }, [broadcast.resetBroadcastState]);

  return {
    tableState,
    myCards,
    loading,
    error,
    mySeatNumber,
    isMyTurn,
    amountToCall,
    canCheck,
    revealedCards: broadcast.revealedCards,
    actionPending: broadcast.actionPending,
    lastActions: broadcast.lastActions,
    handWinners: broadcast.handWinners,
    chatBubbles: broadcast.chatBubbles,
    spectatorCount: connection.spectatorCount,
    connectionStatus: connection.connectionStatus,
    lastKnownPhase,
    lastKnownStack,
    onlinePlayerIds: connection.onlinePlayerIds,
    kickedForInactivity: broadcast.kickedForInactivity,
    announceCustomRef,
    gameOverPendingRef,
    joinTable,
    leaveSeat,
    leaveTable,
    startHand,
    sendAction,
    pingTimeout,
    refreshState,
    resetForNewGame,
    preResultStacksRef: broadcast.preResultStacksRef,
    sendChat,
    autoStartAttempted,
    handHasEverStarted,
    onBlindsUp: useCallback((cb: (payload: any) => void) => {
      blindsUpCallbackRef.current = cb;
    }, []),
  };
}
