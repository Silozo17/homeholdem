import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlayerLevelData {
  level: number;
  totalXp: number;
  xpForNextLevel: number;
  progress: number; // 0-1
}

const cache = new Map<string, PlayerLevelData>();

function calcLevel(xp: number) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function xpForLevel(n: number) {
  return (n - 1) ** 2 * 100;
}

function toData(totalXp: number): PlayerLevelData {
  const level = calcLevel(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progress = nextLevelXp > currentLevelXp
    ? (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)
    : 0;
  return { level, totalXp, xpForNextLevel: nextLevelXp, progress };
}

export function usePlayerLevel(userId: string | null | undefined) {
  const [data, setData] = useState<PlayerLevelData | null>(userId && cache.has(userId) ? cache.get(userId)! : null);

  useEffect(() => {
    if (!userId) return;

    // Fetch initial
    supabase
      .from('player_xp')
      .select('total_xp, level')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data: row }) => {
        const d = toData(row?.total_xp ?? 0);
        cache.set(userId, d);
        setData(d);
      });

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`player_xp_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_xp',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        const row = payload.new as { total_xp: number } | undefined;
        if (row) {
          const d = toData(row.total_xp);
          cache.set(userId, d);
          setData(d);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return data;
}

/** Batch fetch levels for multiple user IDs (no realtime, just one-shot) */
export function usePlayerLevels(userIds: string[]) {
  const [levels, setLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    if (userIds.length === 0) return;
    const uniqueIds = [...new Set(userIds)];

    supabase
      .from('player_xp')
      .select('user_id, total_xp')
      .in('user_id', uniqueIds)
      .then(({ data: rows }) => {
        const map: Record<string, number> = {};
        for (const id of uniqueIds) {
          const row = rows?.find(r => r.user_id === id);
          map[id] = calcLevel(row?.total_xp ?? 0);
        }
        setLevels(map);
      });
  }, [userIds.join(',')]);

  return levels;
}
