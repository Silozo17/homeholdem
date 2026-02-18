

# Fix: Turn Timer Duration Mismatch

## Problem

The server sets a **45-second** action deadline (confirmed in both `poker-start-hand/index.ts` line 445 and `poker-action/index.ts` line 539). However, the visual timer in `PlayerSeat.tsx` is hardcoded to **20 seconds** on line 48:

```typescript
const TIMER_DURATION = 20; // <-- wrong, should be 45
```

This means the ring around the active player's avatar drains in 20 seconds, but the server does not actually fold the player until 45 seconds. Players see the timer "expire" visually, then nothing happens for another 25 seconds.

Note: `TurnTimer.tsx` correctly defaults to 45s, but it is not used anywhere -- `PlayerSeat.tsx` has its own self-contained timer.

## Fix

**File:** `src/components/poker/PlayerSeat.tsx`, line 48

Change:
```typescript
const TIMER_DURATION = 20;
```
To:
```typescript
const TIMER_DURATION = 45;
```

One line change. Nothing else.

## What Changes
- `src/components/poker/PlayerSeat.tsx` -- line 48: `TIMER_DURATION` from `20` to `45`

## What Does NOT Change
- No other files
- No UI layout, styling, navigation, or spacing changes
- No server-side changes
- Bottom nav untouched

