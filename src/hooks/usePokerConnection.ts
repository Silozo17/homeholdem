import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OnlineTableState } from '@/lib/poker/online-types';
import type { ConnectionStatus } from './useOnlinePokerTable';
import type { BroadcastHandlerConfig } from './usePokerBroadcast';

interface UsePokerConnectionParams {
  tableId: string;
  userId: string | undefined;
  tableStateRef: React.MutableRefObject<OnlineTableState | null>;
  refreshState: () => Promise<void>;
  broadcastHandlers: BroadcastHandlerConfig[];
}

export function usePokerConnection({
  tableId,
  userId,
  tableStateRef,
  refreshState,
  broadcastHandlers,
}: UsePokerConnectionParams) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [onlinePlayerIds, setOnlinePlayerIds] = useState<Set<string>>(new Set());

  const channelRef = useRef<any>(null);
  const hasSubscribedOnceRef = useRef(false);

  // Keep broadcastHandlers in a ref so the effect doesn't re-run when they change
  const handlersRef = useRef(broadcastHandlers);
  handlersRef.current = broadcastHandlers;

  useEffect(() => {
    if (!tableId) return;

    // Clean up stale channel before creating new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    let chain = supabase.channel(`poker:table:${tableId}`);

    // Attach all broadcast handlers from usePokerBroadcast
    for (const handler of handlersRef.current) {
      chain = chain.on('broadcast', { event: handler.event }, handler.callback);
    }

    // Attach presence handler (owned by this hook)
    const channel = chain
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
    };
  }, [tableId, refreshState]);

  return {
    connectionStatus,
    setConnectionStatus,
    spectatorCount,
    onlinePlayerIds,
    channelRef,
  };
}
