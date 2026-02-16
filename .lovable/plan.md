

# Premium Sound Effects, Haptic Feedback, Timer Warning & Wake Lock Fix

## 1. Premium Coin/Money Sound for Pot Win

**Problem**: The current `win` sound is a basic arpeggio with no coin/money feel.

**Fix**: Replace the `win` sound in `usePokerSounds.ts` with a layered coin cascade effect:
- 8-10 rapid metallic "clink" tones at high frequencies (3000-5000 Hz) staggered over ~1s to simulate coins pouring
- Each clink randomized slightly in pitch and timing for realism
- A satisfying low "thud" bass layer underneath (80-120 Hz)
- Finish with a shimmer sweep
- Keep the victory arpeggio but blend it with the coin cascade

## 2. Upgrade All Action Sounds to Premium Quality

**File**: `src/hooks/usePokerSounds.ts`

Rework each sound event:

- **shuffle**: Add a "bridge" whoosh between riffle bursts + subtle card flutter harmonics
- **deal**: Layer a sharper "snap" with a brief card-slide noise and a subtle table impact
- **flip**: Add a dramatic "whomp" bass hit under the reveal for community cards
- **chipClink**: Add ceramic resonance harmonics with a longer tail and subtle room reverb via delay feedback
- **chipStack**: Make cascading clicks more dramatic with 6 chips and increasing pitch
- **check**: Firmer double-knock with wood-like resonance (lower Q bandpass)
- **raise**: More aggressive ascending power chord with chip slide + impact
- **allIn**: Add dramatic heartbeat pulses (2x low thumps) before the bass drop + crowd gasp noise
- **fold**: Deeper swoosh with a "card toss" snap at the end
- **yourTurn**: Brighter two-tone chime with harmonic overtones
- **timerWarning**: Urgent triple-beep pattern that escalates in pitch

## 3. Haptic Feedback on Your Turn

**File**: `src/components/poker/OnlinePokerTable.tsx`

When `isMyTurn` becomes true, trigger `navigator.vibrate()` with a pattern: `[100, 50, 100]` (two short pulses). This is supported on Android PWAs and Chrome. iOS Safari doesn't support it but the call silently fails, so no harm.

Add haptic to action buttons too — a single short vibration (50ms) on each button press in `handleAction`.

## 4. "5 Seconds Left" Warning Popup

**Files**: `src/components/poker/TurnTimer.tsx`, `src/components/poker/PlayerSeat.tsx`, `src/components/poker/OnlinePokerTable.tsx`

Add a callback `onLowTime` to `TurnTimer` that fires when remaining time hits 5 seconds. In `OnlinePokerTable.tsx`, track a `lowTimeWarning` state. When triggered for the hero player:

- Show a floating pill "5 SEC LEFT!" that fades in above the betting controls, pulses red for 2 seconds, then fades out
- Play the `timerWarning` sound
- Trigger a longer haptic vibration pattern `[200, 100, 200]`

The pill uses CSS animation: fade-in for 300ms, hold for 2s with red pulse, fade-out for 300ms.

## 5. Fix Wake Lock for PWA

**Problem**: The visibility change handler in `useWakeLock.ts` checks `wakeLockRef.current !== null`, but when the screen goes off, the OS automatically releases the wake lock and the `release` event fires, setting `wakeLockRef.current` to... well it doesn't set it to null, but the lock object is now "released". When the user returns, `wakeLockRef.current` is still the old released lock object (not null), so the check passes. However, `requestWakeLock()` creates a NEW lock but doesn't clear the old ref properly. Actually the deeper issue: the `release` event handler only updates state but doesn't null out the ref. So on visibility change, `wakeLockRef.current !== null` is true, but it should re-acquire regardless.

**Fix**:
1. In the `release` event listener, also set `wakeLockRef.current = null` so the ref accurately reflects the state
2. Change the visibility handler to re-acquire wake lock whenever the page becomes visible AND we're in "should be locked" mode. Add a `shouldBeActive` ref that's set to `true` on `requestWakeLock()` and `false` on `releaseWakeLock()`. The visibility handler checks `shouldBeActive.current` instead of `wakeLockRef.current !== null`
3. Add a periodic re-acquire check (every 30s) as a safety net for edge cases where the lock silently drops

## Summary

| # | Change | Files |
|---|--------|-------|
| 1 | Premium coin cascade win sound | `usePokerSounds.ts` |
| 2 | Upgraded all action sounds | `usePokerSounds.ts` |
| 3 | Haptic feedback on your turn + actions | `OnlinePokerTable.tsx` |
| 4 | "5 SEC LEFT" fade-in warning popup | `TurnTimer.tsx`, `OnlinePokerTable.tsx`, `index.css` |
| 5 | Fix wake lock for PWA | `useWakeLock.ts` |

