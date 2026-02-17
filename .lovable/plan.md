
# Fix Blind Timer: Doubling Logic + Multiplayer Implementation + Notifications

## Current Problems

### Bot Game (Practice Mode)
The blind timer uses a hardcoded `BLIND_LEVELS` array (25/50, 50/100, 75/150, ...) which does NOT match the user's expectation. The correct behavior is: **blinds double from whatever the starting value is**. If you start at 50/100, after the timer elapses they become 100/200, then 200/400, etc. The current code jumps through an unrelated fixed schedule.

### Multiplayer Game
The blind timer is **completely unimplemented**. The `blind_timer_minutes` value is saved to the database but never used:
- `poker-start-hand` always uses static `table.small_blind` / `table.big_blind`
- No columns exist to track blind escalation state
- No client-side countdown is shown in `OnlinePokerTable.tsx`

---

## Solution: Doubling Blinds Logic

When the timer elapses during a hand, blinds increase from the **start of the next hand**.

```text
Example: Starting 50/100, timer = 5 minutes
  Hand 1 (0:00): 50/100
  Hand 5 (5:01): 100/200   <-- doubled
  Hand 9 (10:02): 200/400  <-- doubled again
  Hand 12 (15:03): 400/800 <-- and so on
```

---

## Changes

### 1. Database Migration -- Add blind tracking columns to `poker_tables`

```sql
ALTER TABLE public.poker_tables
  ADD COLUMN blind_level integer NOT NULL DEFAULT 0,
  ADD COLUMN original_small_blind integer,
  ADD COLUMN original_big_blind integer,
  ADD COLUMN last_blind_increase_at timestamptz NOT NULL DEFAULT now();

-- Backfill originals from current values
UPDATE public.poker_tables
SET original_small_blind = small_blind,
    original_big_blind = big_blind;
```

- `blind_level`: how many times blinds have doubled (0 = original, 1 = 2x, 2 = 4x, ...)
- `original_small_blind` / `original_big_blind`: the starting blinds (so we can always calculate: current = original * 2^level)
- `last_blind_increase_at`: timestamp of last increase (used for countdown)

### 2. Edge Function: `poker-start-hand/index.ts` -- Add blind escalation

Before posting blinds, check if blinds should increase:

```text
1. Read table.blind_timer_minutes, table.blind_level, table.last_blind_increase_at
2. If blind_timer_minutes > 0:
   a. Calculate elapsed = now - last_blind_increase_at
   b. While elapsed >= blind_timer_minutes * 60s:
      - Increment blind_level
      - Subtract one interval from elapsed
   c. If blind_level changed:
      - new_small = original_small_blind * (2 ^ blind_level)
      - new_big = original_big_blind * (2 ^ blind_level)
      - Update poker_tables: small_blind, big_blind, blind_level, last_blind_increase_at
3. Use updated blinds for posting SB/BB
4. Include blind_timer_minutes, blind_level, last_blind_increase_at in broadcast payload
5. If blinds increased, broadcast a "blinds_up" event with old and new values
```

### 3. Bot Game: `src/hooks/usePokerGame.ts` -- Replace BLIND_LEVELS with doubling

In the `DEAL_HAND` case (lines 140-155), replace the `BLIND_LEVELS` lookup with simple doubling:

```typescript
// Replace current blind escalation logic with:
if (state.blindTimer > 0 && Date.now() - state.lastBlindIncrease >= state.blindTimer * 60000) {
  blindLevel = state.blindLevel + 1;
  currentSmallBlind = state.smallBlind * 2;  // Double current blinds
  currentBigBlind = state.bigBlind * 2;
  lastBlindIncrease = Date.now();
}
```

Also update the `BlindTimerCountdown` in `PokerTablePro.tsx` to show the doubled values instead of looking up `BLIND_LEVELS`:

```typescript
// Instead of: const next = BLIND_LEVELS[blindLevel + 1];
// Use: const next = { small: currentSmall * 2, big: currentBig * 2 };
```

Pass `currentSmall` and `currentBig` as props instead of `blindLevel`.

### 4. Client: `src/components/poker/OnlinePokerTable.tsx` -- Add blind timer countdown

Add a countdown display in the header bar (next to the blinds display at line 619):
- Show time remaining until next blind increase
- Show upcoming doubled blind values
- Only visible when `blind_timer_minutes > 0`

### 5. Client: `src/lib/poker/online-types.ts` -- Update types

Add new fields to `OnlineTableInfo`:
```typescript
blind_level: number;
original_small_blind: number;
original_big_blind: number;
last_blind_increase_at: string;
```

### 6. Notifications -- Blinds increased alert

**Bot game**: Show a toast notification when blinds increase at the start of a new hand. In `usePokerGame.ts`, return a flag `blindsIncreased` from `DEAL_HAND`, and in `PokerTablePro.tsx` display a toast.

**Multiplayer**: Broadcast a `blinds_up` event from `poker-start-hand` when blinds escalate. In `OnlinePokerTable.tsx`, listen for this event and show a toast with the new blind values.

Toast format: "Blinds Up! Now 200/400"

### 7. Bot Game Display Enhancement

Make the `BlindTimerCountdown` more visible:
- Increase font from 9px to 12px
- Add a pulsing glow effect when under 60 seconds remaining
- Use gold/amber color to stand out

---

## File Summary

| File | Change |
|------|--------|
| **Database migration** | Add `blind_level`, `original_small_blind`, `original_big_blind`, `last_blind_increase_at` to `poker_tables` |
| `supabase/functions/poker-start-hand/index.ts` | Check timer, double blinds, update table, broadcast `blinds_up` event |
| `src/hooks/usePokerGame.ts` | Replace `BLIND_LEVELS` lookup with doubling logic in `DEAL_HAND` |
| `src/components/poker/PokerTablePro.tsx` | Update `BlindTimerCountdown` to show doubled values, bigger display, show toast on blind increase |
| `src/components/poker/OnlinePokerTable.tsx` | Add blind timer countdown, listen for `blinds_up` broadcast, show toast |
| `src/lib/poker/online-types.ts` | Add blind tracking fields to `OnlineTableInfo` |
