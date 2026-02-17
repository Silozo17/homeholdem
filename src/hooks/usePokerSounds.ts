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

function playNoise(ctx: AudioContext, duration: number, volume: number, filterFreq?: number, startTime = 0, filterQ = 1.5) {
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
    filter.Q.setValueAtTime(filterQ, t);
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
  | 'fold'
  | 'achievement';

export type HapticEvent =
  | 'fold'
  | 'call'
  | 'check'
  | 'raise'
  | 'allIn'
  | 'win'
  | 'cardReveal'
  | 'deal';

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
      case 'shuffle': {
        // Triple riffle with bridge whoosh
        playNoise(ctx, 0.14, 0.35 * v, 3000, 0, 2);
        playNoise(ctx, 0.12, 0.30 * v, 3500, 0.10, 2.5);
        playNoise(ctx, 0.15, 0.28 * v, 2500, 0.20, 2);
        // Bridge whoosh between riffles
        playNoise(ctx, 0.25, 0.18 * v, 1200, 0.12, 0.8);
        // Card flutter harmonics
        playTone(ctx, 4500, 0.08, 0.06 * v, 'sine', true, 0.05);
        playTone(ctx, 5200, 0.06, 0.04 * v, 'sine', true, 0.15);
        playTone(ctx, 4800, 0.07, 0.05 * v, 'sine', true, 0.25);
        // Low thud for table impact
        playTone(ctx, 80, 0.35, 0.18 * v, 'sine', true, 0);
        break;
      }

      case 'deal': {
        // Sharp snap
        playNoise(ctx, 0.04, 0.45 * v, 6000, 0, 3);
        // Card slide noise
        playNoise(ctx, 0.08, 0.2 * v, 2000, 0.02, 1);
        // High click
        playTone(ctx, 2200, 0.06, 0.28 * v, 'sine', true, 0.015);
        // Subtle table impact
        playTone(ctx, 120, 0.1, 0.12 * v, 'sine', true, 0.04);
        break;
      }

      case 'flip': {
        // Dramatic bass whomp
        playTone(ctx, 60, 0.4, 0.22 * v, 'sine', true, 0);
        // Reveal whoosh
        playNoise(ctx, 0.25, 0.32 * v, 1500, 0, 1.2);
        // Click layers
        playTone(ctx, 1800, 0.1, 0.22 * v, 'sine', true, 0.06);
        playTone(ctx, 2400, 0.08, 0.18 * v, 'sine', true, 0.10);
        // Shimmer
        playTone(ctx, 3600, 0.15, 0.08 * v, 'sine', true, 0.12);
        break;
      }

      case 'chipClink': {
        // Ceramic clink with resonance
        const baseFreq = 2800 + Math.random() * 400;
        playTone(ctx, baseFreq, 0.18, 0.32 * v, 'sine');
        playTone(ctx, baseFreq * 1.5, 0.15, 0.22 * v, 'sine', true, 0.02);
        playTone(ctx, baseFreq * 2, 0.12, 0.15 * v, 'sine', true, 0.04);
        playTone(ctx, baseFreq * 0.7, 0.2, 0.12 * v, 'triangle', true, 0.01);
        // Room reverb via delayed echo
        playTone(ctx, baseFreq, 0.1, 0.06 * v, 'sine', true, 0.12);
        playTone(ctx, baseFreq * 1.5, 0.08, 0.04 * v, 'sine', true, 0.15);
        break;
      }

      case 'chipStack': {
        // 6 cascading ceramic clicks with increasing pitch
        for (let i = 0; i < 6; i++) {
          const freq = 2400 + i * 350 + Math.random() * 200;
          playTone(ctx, freq, 0.12, (0.32 - i * 0.03) * v, 'sine', true, i * 0.055);
          playNoise(ctx, 0.04, (0.18 - i * 0.02) * v, 4000 + i * 600, i * 0.055, 2);
          // Resonance tail
          playTone(ctx, freq * 0.5, 0.08, 0.05 * v, 'triangle', true, i * 0.055 + 0.03);
        }
        break;
      }

      case 'check': {
        // Firm double-knock with wood resonance
        playNoise(ctx, 0.05, 0.35 * v, 600, 0, 0.8);
        playTone(ctx, 160, 0.12, 0.28 * v, 'sine');
        playTone(ctx, 240, 0.08, 0.12 * v, 'triangle', true, 0);
        // Second knock
        playNoise(ctx, 0.05, 0.30 * v, 700, 0.09, 0.8);
        playTone(ctx, 180, 0.1, 0.24 * v, 'sine', true, 0.09);
        playTone(ctx, 260, 0.06, 0.1 * v, 'triangle', true, 0.09);
        break;
      }

      case 'raise': {
        // Aggressive ascending power chord
        playTone(ctx, 300, 0.25, 0.28 * v, 'sawtooth');
        playTone(ctx, 450, 0.22, 0.24 * v, 'sawtooth', true, 0.05);
        playTone(ctx, 600, 0.2, 0.22 * v, 'sawtooth', true, 0.1);
        playTone(ctx, 800, 0.3, 0.2 * v, 'sine', true, 0.15);
        // Chip slide + impact
        playNoise(ctx, 0.18, 0.15 * v, 3000, 0.12, 1.5);
        playTone(ctx, 100, 0.1, 0.15 * v, 'sine', true, 0.2);
        break;
      }

      case 'allIn': {
        // Heartbeat pulses (2x low thumps)
        playTone(ctx, 50, 0.3, 0.3 * v, 'sine', true, 0);
        playTone(ctx, 45, 0.25, 0.25 * v, 'sine', true, 0.35);
        // Bass drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = ctx.currentTime + 0.7;
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 1.8);
        gain.gain.setValueAtTime(0.38 * v, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.8);
        // Rising tension sweep
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(200, t);
        osc2.frequency.exponentialRampToValueAtTime(900, t + 0.9);
        gain2.gain.setValueAtTime(0.14 * v, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc2.connect(gain2).connect(ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.9);
        // Impact noise
        playNoise(ctx, 0.35, 0.28 * v, 180, 0.7, 0.5);
        // Crowd gasp noise (filtered white noise)
        playNoise(ctx, 0.6, 0.1 * v, 800, 0.8, 0.4);
        break;
      }

      case 'win': {
        // Coin cascade: 10 rapid metallic clinks
        for (let i = 0; i < 10; i++) {
          const freq = 3000 + Math.random() * 2000;
          const delay = i * 0.09 + Math.random() * 0.04;
          const vol = (0.25 - i * 0.015) * v;
          playTone(ctx, freq, 0.15, vol, 'sine', true, delay);
          // Metallic harmonic
          playTone(ctx, freq * 1.5, 0.08, vol * 0.4, 'sine', true, delay + 0.02);
        }
        // Low thud bass layer
        playTone(ctx, 90, 0.5, 0.2 * v, 'sine', true, 0);
        playTone(ctx, 110, 0.4, 0.15 * v, 'sine', true, 0.3);
        // Victory arpeggio blended in
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
          playTone(ctx, f, 0.5, 0.18 * v, 'sine', true, 0.5 + i * 0.1);
          playTone(ctx, f * 2, 0.3, 0.06 * v, 'sine', true, 0.5 + i * 0.1 + 0.05);
        });
        // Sustained shimmer
        playTone(ctx, 523, 1.0, 0.1 * v, 'sine', true, 0.9);
        playTone(ctx, 659, 1.0, 0.08 * v, 'sine', true, 0.9);
        playTone(ctx, 784, 1.0, 0.07 * v, 'sine', true, 0.9);
        // Shimmer sweep
        playNoise(ctx, 0.8, 0.12 * v, 6000, 0.6, 1);
        break;
      }

      case 'yourTurn': {
        // Bright two-tone chime with overtones
        playTone(ctx, 880, 0.25, 0.28 * v, 'sine');
        playTone(ctx, 1760, 0.15, 0.08 * v, 'sine', true, 0); // Harmonic
        playTone(ctx, 660, 0.35, 0.22 * v, 'sine', true, 0.12);
        playTone(ctx, 1320, 0.2, 0.07 * v, 'sine', true, 0.12); // Harmonic
        break;
      }

      case 'timerWarning': {
        // Urgent triple-beep escalating in pitch
        playTone(ctx, 600, 0.1, 0.32 * v, 'square');
        playTone(ctx, 750, 0.1, 0.34 * v, 'square', true, 0.15);
        playTone(ctx, 900, 0.12, 0.36 * v, 'square', true, 0.30);
        break;
      }

      case 'fold': {
        // Deep swoosh with card toss snap
        playNoise(ctx, 0.25, 0.24 * v, 1800, 0, 1);
        // Descending tone
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(500, ctx.currentTime);
        osc3.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        gain3.gain.setValueAtTime(0.14 * v, ctx.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc3.connect(gain3).connect(ctx.destination);
        osc3.start(ctx.currentTime);
        osc3.stop(ctx.currentTime + 0.25);
        // Card toss snap at the end
        playNoise(ctx, 0.03, 0.3 * v, 5000, 0.18, 3);
        playTone(ctx, 1800, 0.04, 0.15 * v, 'sine', true, 0.19);
        break;
      }

      case 'achievement': {
        // Ascending major chord C-E-G-C with sparkle shimmer
        const achNotes = [523.25, 659.25, 783.99, 1046.5];
        achNotes.forEach((f, i) => {
          playTone(ctx, f, 0.6, 0.22 * v, 'sine', true, i * 0.12);
          playTone(ctx, f * 2, 0.3, 0.08 * v, 'sine', true, i * 0.12 + 0.05);
        });
        // Sparkle shimmer
        playNoise(ctx, 0.5, 0.1 * v, 8000, 0.3, 1.5);
        playTone(ctx, 1046.5, 0.8, 0.12 * v, 'sine', true, 0.48);
        break;
      }
    }
  }, [enabled, ensureContext]);

  const haptic = useCallback((event: HapticEvent) => {
    if (!enabled || !('vibrate' in navigator)) return;
    const patterns: Record<HapticEvent, number | number[]> = {
      fold: 30,
      call: 40,
      check: [20, 20],
      raise: [40, 30, 60],
      allIn: [100, 50, 100, 50, 200],
      win: [50, 30, 50, 30, 50, 30, 100],
      cardReveal: 25,
      deal: [15, 40, 15],
    };
    navigator.vibrate(patterns[event]);
  }, [enabled]);

  const toggle = useCallback(() => setEnabled(prev => !prev), []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close();
      }
    };
  }, []);

  return { play, enabled, toggle, haptic };
}
