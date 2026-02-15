import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/lib/poker/types';
import {
  OnlineTableState,
  OnlineHandInfo,
  OnlineSeatInfo,
} from '@/lib/poker/online-types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callEdge(fn: string, body: any, method = 'POST') {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = method === 'GET' && body
    ? `${SUPABASE_URL}/functions/v1/${fn}?${new URLSearchParams(body).toString()}`
    : `${SUPABASE_URL}/functions/v1/${fn}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Edge function error');
  return data;
}

interface UseOnlinePokerTableReturn {
  tableState: OnlineTableState | null;
  myCards: Card[] | null;
  loading: boolean;
  error: string | null;
  mySeatNumber: number | null;
  isMyTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  // Actions
  joinTable: (seatNumber: number, buyIn: number) => Promise<void>;
  leaveTable: () => Promise<void>;
  startHand: () => Promise<void>;
  sendAction: (action: string, amount?: number) => Promise<void>;
  pingTimeout: () => Promise<void>;
  refreshState: () => Promise<void>;
}

export function useOnlinePokerTable(tableId: string): UseOnlinePokerTableReturn {
  const { user } = useAuth();
  const [tableState, setTableState] = useState<OnlineTableState | null>(null);
  const [myCards, setMyCards] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = user?.id;

  // Derive computed state
  const mySeatNumber = tableState?.seats.find(s => s.player_id === userId)?.seat ?? null;
  const hand = tableState?.current_hand;
  const currentActorId = hand?.current_actor_id ??
    tableState?.seats.find(s => s.seat === hand?.current_actor_seat)?.player_id ?? null;
  const isMyTurn = !!userId && currentActorId === userId && !!hand && hand.phase !== 'complete' && hand.phase !== 'showdown';

  const mySeat = tableState?.seats.find(s => s.player_id === userId);
  const myCurrentBet = mySeat?.current_bet ?? 0;
  const currentBet = hand?.current_bet ?? 0;
  const amountToCall = Math.max(0, currentBet - myCurrentBet);
  const canCheck = amountToCall === 0;

  // Fetch full state from HTTP endpoint
  const refreshState = useCallback(async () => {
    if (!tableId) return;
    try {
      const data = await callEdge('poker-table-state', { table_id: tableId }, 'GET');
      setTableState(data);
      setMyCards(data.my_cards || null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
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

    const channel = supabase.channel(`poker:table:${tableId}`)
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
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
          const seats: OnlineSeatInfo[] = payload.seats || prev.seats;
          return { ...prev, current_hand: broadcastHand, seats };
        });
      })
      .on('broadcast', { event: 'seat_change' }, () => {
        // Refetch full state on seat changes
        refreshState();
      })
      .on('broadcast', { event: 'hand_complete' }, ({ payload }) => {
        // Hand finished — update state and clear cards
        setTableState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            current_hand: null,
            seats: payload.seats || prev.seats,
          };
        });
        setMyCards(null);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tableId, refreshState]);

  // Fetch my cards when a new hand starts
  useEffect(() => {
    if (!hand?.hand_id || !userId || mySeatNumber === null) return;
    (async () => {
      try {
        const data = await callEdge('poker-my-cards', { hand_id: hand.hand_id }, 'GET');
        setMyCards(data.hole_cards || null);
      } catch {
        // not in hand
      }
    })();
  }, [hand?.hand_id, userId, mySeatNumber]);

  // Timeout auto-ping: if it's not my turn and the deadline passes, trigger timeout
  useEffect(() => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (!hand?.action_deadline || !userId || isMyTurn || !mySeatNumber) return;

    const deadline = new Date(hand.action_deadline).getTime();
    const delay = deadline - Date.now() + 2000; // 2s grace
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
    await callEdge('poker-leave-table', { table_id: tableId });
    await refreshState();
  }, [tableId, refreshState]);

  const startHand = useCallback(async () => {
    const data = await callEdge('poker-start-hand', { table_id: tableId });
    // Hole cards come via separate fetch triggered by hand_id change
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

  const sendAction = useCallback(async (action: string, amount?: number) => {
    if (!hand) return;
    await callEdge('poker-action', {
      table_id: tableId,
      hand_id: hand.hand_id,
      action,
      amount: amount ?? 0,
    });
  }, [tableId, hand]);

  const pingTimeout = useCallback(async () => {
    if (!hand) return;
    await callEdge('poker-timeout-ping', {
      table_id: tableId,
      hand_id: hand.hand_id,
    });
  }, [tableId, hand]);

  return {
    tableState,
    myCards,
    loading,
    error,
    mySeatNumber,
    isMyTurn,
    amountToCall,
    canCheck,
    joinTable,
    leaveTable,
    startHand,
    sendAction,
    pingTimeout,
    refreshState,
  };
}
