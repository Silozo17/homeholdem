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
  startTime = 0,
) {
  const t = ctx.currentTime + startTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  if (rampDown) gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function playNoise(ctx: AudioContext, duration: number, volume: number, filterFreq?: number, startTime = 0) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + startTime;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.Q.setValueAtTime(1.5, t);
    source.connect(filter).connect(gain).connect(ctx.destination);
  } else {
    source.connect(gain).connect(ctx.destination);
  }
  source.start(t);
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
  | 'timerWarning'
  | 'fold';

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
        // Layered riffle: 3 rapid noise bursts
        playNoise(ctx, 0.12, 0.35 * v, 3000, 0);
        playNoise(ctx, 0.12, 0.30 * v, 3500, 0.08);
        playNoise(ctx, 0.15, 0.25 * v, 2500, 0.16);
        // Subtle low thud
        playTone(ctx, 80, 0.3, 0.15 * v, 'sine', true, 0);
        break;

      case 'deal':
        // Quick snap: noise burst + high click
        playNoise(ctx, 0.06, 0.4 * v, 5000);
        playTone(ctx, 2000, 0.08, 0.25 * v, 'sine', true, 0.02);
        break;

      case 'flip':
        // Whoosh + reveal click
        playNoise(ctx, 0.2, 0.3 * v, 1500);
        playTone(ctx, 1800, 0.1, 0.2 * v, 'sine', true, 0.08);
        playTone(ctx, 2400, 0.08, 0.15 * v, 'sine', true, 0.12);
        break;

      case 'chipClink':
        // Metallic harmonics with randomization
        const baseFreq = 2800 + Math.random() * 400;
        playTone(ctx, baseFreq, 0.12, 0.3 * v, 'sine');
        playTone(ctx, baseFreq * 1.5, 0.1, 0.2 * v, 'sine', true, 0.03);
        playTone(ctx, baseFreq * 2, 0.08, 0.15 * v, 'sine', true, 0.06);
        playTone(ctx, baseFreq * 0.7, 0.15, 0.1 * v, 'triangle', true, 0.02);
        break;

      case 'chipStack':
        // Cascading ceramic clicks
        for (let i = 0; i < 4; i++) {
          const freq = 2500 + i * 400 + Math.random() * 200;
          playTone(ctx, freq, 0.1, (0.3 - i * 0.04) * v, 'sine', true, i * 0.06);
          playNoise(ctx, 0.05, (0.15 - i * 0.02) * v, 4000 + i * 500, i * 0.06);
        }
        break;

      case 'check':
        // Double-tap knock
        playNoise(ctx, 0.06, 0.3 * v, 800);
        playTone(ctx, 180, 0.08, 0.25 * v, 'sine');
        playNoise(ctx, 0.06, 0.25 * v, 900, 0.1);
        playTone(ctx, 200, 0.08, 0.2 * v, 'sine', true, 0.1);
        break;

      case 'raise':
        // Confident ascending chord + chip slide
        playTone(ctx, 350, 0.2, 0.25 * v, 'sine');
        playTone(ctx, 520, 0.2, 0.22 * v, 'sine', true, 0.06);
        playTone(ctx, 700, 0.25, 0.2 * v, 'sine', true, 0.12);
        // Chip slide noise
        playNoise(ctx, 0.15, 0.12 * v, 3000, 0.15);
        break;

      case 'allIn': {
        // Sub-bass drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.35 * v, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
        // Rising tension sweep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(200, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.8);
        gain2.gain.setValueAtTime(0.12 * v, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.8);
        // Impact noise
        playNoise(ctx, 0.3, 0.25 * v, 200, 0);
        break;
      }

      case 'win': {
        // Full victory fanfare: arpeggio + shimmer
        const notes = [523, 659, 784, 1047]; // C5-E5-G5-C6
        notes.forEach((f, i) => {
          playTone(ctx, f, 0.6, 0.25 * v, 'sine', true, i * 0.1);
          // Harmonic shimmer
          playTone(ctx, f * 2, 0.4, 0.08 * v, 'sine', true, i * 0.1 + 0.05);
        });
        // Sustained chord
        playTone(ctx, 523, 1.2, 0.15 * v, 'sine', true, 0.4);
        playTone(ctx, 659, 1.2, 0.12 * v, 'sine', true, 0.4);
        playTone(ctx, 784, 1.2, 0.1 * v, 'sine', true, 0.4);
        // Shimmer sweep noise
        playNoise(ctx, 0.8, 0.1 * v, 6000, 0.3);
        break;
      }

      case 'yourTurn':
        // Gentle ding-dong
        playTone(ctx, 880, 0.2, 0.25 * v, 'sine');
        playTone(ctx, 660, 0.3, 0.2 * v, 'sine', true, 0.15);
        break;

      case 'timerWarning':
        playTone(ctx, 600, 0.08, 0.3 * v, 'square');
        break;

      case 'fold':
        // Soft swoosh - filtered descending noise
        playNoise(ctx, 0.2, 0.2 * v, 2000);
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(400, ctx.currentTime);
        osc3.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain3.gain.setValueAtTime(0.1 * v, ctx.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc3.connect(gain3).connect(ctx.destination);
        osc3.start(ctx.currentTime);
        osc3.stop(ctx.currentTime + 0.2);
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
