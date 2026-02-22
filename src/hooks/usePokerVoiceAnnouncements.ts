import { useRef, useCallback, useState } from 'react';

/** Module-level cache: survives re-renders, cleared on page refresh. */
const VOICE_CACHE = new Map<string, string>();
const MAX_CACHE = 30;

/**
 * Simplified voice announcements for multiplayer poker via ElevenLabs TTS.
 * Single speak() entry point with one-slot pending queue for critical announcements.
 */
export function usePokerVoiceAnnouncements() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const enabledRef = useRef(true);
  const isPlayingRef = useRef(false);
  const precachedRef = useRef(false);
  const pendingRef = useRef<string | null>(null);

  // Keep ref in sync with state
  const setEnabled = useCallback((val: boolean) => {
    enabledRef.current = val;
    setVoiceEnabled(val);
  }, []);

  const speak = useCallback(async (message: string) => {
    if (!enabledRef.current || !message) return;

    if (isPlayingRef.current) {
      // Store as pending — will play when current audio ends
      pendingRef.current = message;
      return;
    }

    try {
      isPlayingRef.current = true;
      pendingRef.current = null;

      let audioUri = VOICE_CACHE.get(message);

      if (!audioUri) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tournament-announce`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ announcement: message }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);
          if (!response.ok) throw new Error('Voice fetch failed');

          const data = await response.json();
          if (!data.audioContent) throw new Error('No audio content');

          audioUri = `data:audio/mpeg;base64,${data.audioContent}`;

          if (VOICE_CACHE.size >= MAX_CACHE) {
            const firstKey = VOICE_CACHE.keys().next().value;
            if (firstKey) VOICE_CACHE.delete(firstKey);
          }
          VOICE_CACHE.set(message, audioUri);
        } catch {
          clearTimeout(timeoutId);
          isPlayingRef.current = false;
          return;
        }
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
      // Play pending message if one arrived while we were playing
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        speak(next);
      }
    }
  }, []);

  // --- Named announcement functions ---

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

  // No-ops — kept for API compatibility
  const clearQueue = useCallback(() => {}, []);
  const resetHandDedup = useCallback(() => {}, []);

  const toggleVoice = useCallback(() => {
    setEnabled(!enabledRef.current);
  }, [setEnabled]);

  const precache = useCallback(() => {
    if (precachedRef.current) return;
    precachedRef.current = true;
    const phrases = [
      'Shuffling up and dealing',
      'Time is running out!',
      'Big pot building!',
      "We're heads up!",
    ];
    phrases.forEach(p => {
      if (!VOICE_CACHE.has(p)) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tournament-announce`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
