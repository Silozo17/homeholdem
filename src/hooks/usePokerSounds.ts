import { useCallback, useRef, useEffect, useState } from 'react';

const STORAGE_KEY = 'poker-sounds-enabled';

function getAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  rampDown = true,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  if (rampDown) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(ctx: AudioContext, duration: number, volume: number, filterFreq?: number) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);
    source.connect(filter).connect(gain).connect(ctx.destination);
  } else {
    source.connect(gain).connect(ctx.destination);
  }
  source.start(ctx.currentTime);
}

export type PokerSoundEvent =
  | 'shuffle'
  | 'deal'
  | 'flip'
  | 'chipClink'
  | 'chipStack'
  | 'check'
  | 'raise'
  | 'allIn'
  | 'win'
  | 'yourTurn'
  | 'timerWarning';

export function usePokerSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const masterVolume = useRef(0.5);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {}
  }, [enabled]);

  const ensureContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = getAudioContext();
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((event: PokerSoundEvent) => {
    if (!enabled) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const v = masterVolume.current;

    switch (event) {
      case 'shuffle':
        playNoise(ctx, 0.4, 0.3 * v, 2000);
        break;

      case 'deal':
        playTone(ctx, 1200, 0.12, 0.4 * v, 'sine');
        break;

      case 'flip':
        playNoise(ctx, 0.15, 0.35 * v, 4000);
        break;

      case 'chipClink':
        playTone(ctx, 3000, 0.15, 0.35 * v, 'sine');
        setTimeout(() => {
          if (ctx.state !== 'closed') playTone(ctx, 4500, 0.1, 0.25 * v, 'sine');
        }, 50);
        break;

      case 'chipStack':
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (ctx.state !== 'closed') playTone(ctx, 3000 + i * 500, 0.12, (0.35 - i * 0.05) * v, 'sine');
          }, i * 80);
        }
        break;

      case 'check':
        playTone(ctx, 200, 0.12, 0.3 * v, 'sine');
        break;

      case 'raise':
        playTone(ctx, 400, 0.15, 0.3 * v, 'sine');
        setTimeout(() => {
          if (ctx.state !== 'closed') playTone(ctx, 600, 0.15, 0.25 * v, 'sine');
        }, 80);
        setTimeout(() => {
          if (ctx.state !== 'closed') playTone(ctx, 800, 0.15, 0.2 * v, 'sine');
        }, 160);
        break;

      case 'allIn':
        // Low rumble
        playTone(ctx, 70, 1.2, 0.25 * v, 'sawtooth');
        playTone(ctx, 60, 1.5, 0.2 * v, 'sine');
        break;

      case 'win': {
        // C-E-G major chord stinger
        const freqs = [523, 659, 784];
        freqs.forEach((f, i) => {
          setTimeout(() => {
            if (ctx.state !== 'closed') playTone(ctx, f, 0.5, 0.3 * v, 'sine');
          }, i * 80);
        });
        break;
      }

      case 'yourTurn':
        playTone(ctx, 880, 0.25, 0.3 * v, 'sine');
        break;

      case 'timerWarning':
        playTone(ctx, 600, 0.08, 0.3 * v, 'square');
        break;
    }
  }, [enabled, ensureContext]);

  const toggle = useCallback(() => setEnabled(prev => !prev), []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close();
      }
    };
  }, []);

  return { play, enabled, toggle };
}
