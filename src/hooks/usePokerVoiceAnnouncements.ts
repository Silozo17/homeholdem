import { useRef, useCallback, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Module-level cache: survives re-renders, cleared on page refresh. */
const VOICE_CACHE = new Map<string, string>();
const MAX_CACHE = 30;

/**
 * Simplified voice announcements for multiplayer poker via ElevenLabs TTS.
 * Single speak() entry point — no queue, no dedup set, no stale threshold.
 */
export function usePokerVoiceAnnouncements() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const isPlayingRef = useRef(false);
  const precachedRef = useRef(false);

  const speak = useCallback(async (message: string) => {
    if (!message) return;
    // If already playing, silently drop — no queuing
    if (isPlayingRef.current) return;

    try {
      isPlayingRef.current = true;

      // Check cache first
      let audioUri = VOICE_CACHE.get(message);

      if (!audioUri) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

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

        clearTimeout(timeout);
        if (!res.ok) throw new Error('Voice fetch failed');

        const data = await res.json();
        if (!data.audioContent) throw new Error('No audio content');

        audioUri = `data:audio/mpeg;base64,${data.audioContent}`;

        // Evict oldest if full
        if (VOICE_CACHE.size >= MAX_CACHE) {
          const firstKey = VOICE_CACHE.keys().next().value;
          if (firstKey) VOICE_CACHE.delete(firstKey);
        }
        VOICE_CACHE.set(message, audioUri);
      }

      const audio = new Audio(audioUri);
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch (err) {
      console.warn('[voice] speak failed:', err);
    } finally {
      isPlayingRef.current = false;
    }
  }, []);

  // --- Named announcement functions (same signatures as before) ---

  const announceBlindUp = useCallback((small: number, big: number) => {
    speak(`Blinds are now ${small} and ${big}`);
  }, [speak]);

  const announceWinner = useCallback((name: string, amount: number, handName?: string) => {
    const desc = handName ? ` with ${handName}` : '';
    speak(`${name} wins ${amount} chips${desc}`);
  }, [speak]);

  const announceCountdown = useCallback(() => {
    speak('Time is running out!');
  }, [speak]);

  const announceGameOver = useCallback((winnerName: string, isHero: boolean) => {
    speak(isHero ? 'Congratulations! You are the champion!' : `Game over! ${winnerName} takes it all!`);
  }, [speak]);

  const announceCustom = useCallback((message: string) => {
    speak(message);
  }, [speak]);

  // No-ops — kept for API compatibility with OnlinePokerTable.tsx
  const clearQueue = useCallback(() => {}, []);
  const resetHandDedup = useCallback(() => {}, []);

  const toggleVoice = useCallback(() => setVoiceEnabled(v => !v), []);

  const precache = useCallback(() => {
    if (precachedRef.current) return;
    precachedRef.current = true;
    const phrases = [
      'Shuffling up and dealing',
      'Time is running out!',
      'Big pot building!',
      "We're heads up!",
    ];
    // Fire and forget — populate cache in background
    phrases.forEach(p => {
      if (!VOICE_CACHE.has(p)) {
        fetch(`${SUPABASE_URL}/functions/v1/tournament-announce`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ announcement: p }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d?.audioContent) {
              if (VOICE_CACHE.size >= MAX_CACHE) {
                const firstKey = VOICE_CACHE.keys().next().value;
                if (firstKey) VOICE_CACHE.delete(firstKey);
              }
              VOICE_CACHE.set(p, `data:audio/mpeg;base64,${d.audioContent}`);
            }
          })
          .catch(() => {});
      }
    });
  }, []);

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
