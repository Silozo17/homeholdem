import { useRef, useCallback, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface QueueItem {
  message: string;
  addedAt: number;
}

/**
 * Voice announcements for multiplayer poker via ElevenLabs TTS.
 * Features: audio queue, LRU cache (20 entries), 3s dedup.
 */
export function usePokerVoiceAnnouncements() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const queueRef = useRef<QueueItem[]>([]);
  const playingRef = useRef(false);
  const cacheRef = useRef(new Map<string, string>()); // message -> data URI
  const cacheOrderRef = useRef<string[]>([]); // LRU order
  const announcedThisHandRef = useRef(new Set<string>());
  const MAX_CACHE = 20;
  const STALE_MS = 8000;

  const addToCache = useCallback((key: string, value: string) => {
    const cache = cacheRef.current;
    const order = cacheOrderRef.current;
    if (cache.has(key)) {
      // Move to end (most recent)
      const idx = order.indexOf(key);
      if (idx > -1) order.splice(idx, 1);
      order.push(key);
      return;
    }
    // Evict if full
    while (cache.size >= MAX_CACHE && order.length > 0) {
      const oldest = order.shift()!;
      cache.delete(oldest);
    }
    cache.set(key, value);
    order.push(key);
  }, []);

  const fetchAudio = useCallback(async (message: string): Promise<string | null> => {
    // Check cache first
    const cached = cacheRef.current.get(message);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tournament-announce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ announcement: message }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.audioContent) return null;
      const dataUri = `data:audio/mpeg;base64,${data.audioContent}`;
      addToCache(message, dataUri);
      return dataUri;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }, [addToCache]);

  const processQueue = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current.shift()!;
        // Skip stale items
        if (Date.now() - item.addedAt > STALE_MS) continue;

        const audioUri = await fetchAudio(item.message);
        if (audioUri) {
          try {
            const audio = new Audio(audioUri);
            await new Promise<void>((resolve) => {
              audio.onended = () => resolve();
              audio.onerror = () => resolve();
              audio.play().catch((err) => { console.warn('[voice] play blocked:', err?.name, err?.message); resolve(); });
            });
          } catch { /* ignore playback errors */ }
        }
      }
    } finally {
      playingRef.current = false;
      // Re-check: items may have been added during playback
      if (queueRef.current.length > 0) {
        processQueue();
      }
    }
  }, [fetchAudio]);

  const enqueue = useCallback((message: string) => {
    if (!voiceEnabled) return;
    // Never repeat same message within a hand
    if (announcedThisHandRef.current.has(message)) return;
    // Also skip if already in queue
    if (queueRef.current.some(q => q.message === message)) return;
    announcedThisHandRef.current.add(message);
    queueRef.current.push({ message, addedAt: Date.now() });
    processQueue();
  }, [voiceEnabled, processQueue]);

  // Pre-built announcement functions
  const announceBlindUp = useCallback((small: number, big: number) => {
    enqueue(`Blinds are now ${small} and ${big}`);
  }, [enqueue]);

  const announceWinner = useCallback((name: string, amount: number, handName?: string) => {
    const desc = handName ? ` with ${handName}` : '';
    enqueue(`${name} wins ${amount} chips${desc}`);
  }, [enqueue]);

  const announceCountdown = useCallback(() => {
    enqueue("Time is running out!");
  }, [enqueue]);

  const announceGameOver = useCallback((winnerName: string, isHero: boolean) => {
    enqueue(isHero ? "Congratulations! You are the champion!" : `Game over! ${winnerName} takes it all!`);
  }, [enqueue]);

  const announceCustom = useCallback((message: string) => {
    enqueue(message);
  }, [enqueue]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    announcedThisHandRef.current.clear();
  }, []);

  const resetHandDedup = useCallback(() => {
    announcedThisHandRef.current.clear();
  }, []);

  const toggleVoice = useCallback(() => setVoiceEnabled(v => !v), []);

  // Pre-cache common static phrases on first call
  const precachedRef = useRef(false);
  const precache = useCallback(() => {
    if (precachedRef.current) return;
    precachedRef.current = true;
    const phrases = [
      "Shuffling up and dealing",
      "Time is running out!",
      "All in! We have an all in!",
      "We're heads up!",
      "Big pot building!",
      "Welcome to the table",
    ];
    // Fire and forget - cache in background
    phrases.forEach(p => fetchAudio(p));
  }, [fetchAudio]);

  return {
    announceBlindUp,
    announceWinner,
    announceCountdown,
    announceGameOver,
    announceCustom,
    clearQueue,
    resetHandDedup,
    voiceEnabled,
    toggleVoice,
    precache,
  };
}
