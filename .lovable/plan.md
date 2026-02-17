

# Fix: Mid-Hand Join Disruption + Green Screen (Final Resolution)

## The Two Root Causes (with proof)

### Problem 1: Why Admin gets included mid-hand and cards refresh

There are **two paths** that cause the disruption, and we've only fixed one:

**Path A (FIXED):** The `seat_change` broadcast handler. This was fixed to do local-only updates during active hands.

**Path B (STILL BROKEN):** The `game_state` broadcast from `poker-action` replaces the ENTIRE seat array on every action.

Here is what happens step by step:
1. Julia and Amir are mid-hand (3 community cards on table)
2. Admin clicks a seat -- `poker-join-table` inserts Admin as `sitting_out` in `poker_seats` table
3. Julia or Amir takes an action, `poker-action` runs
4. `poker-action/index.ts` line 594 builds `seatStates` from ALL `poker_seats` rows for the table -- **this now includes Admin's sitting_out row**
5. Line 616-628 builds the broadcast `seats` array from ALL seatStates
6. Line 627: `has_cards: holeCardPlayerIds.has(s.player_id) && s.status !== "folded"` -- Admin has no hole cards, so `has_cards` is correctly `false`. **This part was fixed.**
7. **BUT:** The client at `useOnlinePokerTable.ts` line 243 does: `seats: seats.length > 0 ? seats : prev.seats` -- this **replaces the entire local seat array** with the broadcast seats. The new array has a different length (Admin is now included), which changes `seatsKey` at `OnlinePokerTable.tsx` line 709, which forces ALL `PlayerSeat` components to unmount and remount -- **causing the card refresh visual glitch**.

The fix for `has_cards` was correct but insufficient. The visual disruption comes from the **seat array changing length**, not from incorrect card flags.

### Problem 2: Why the screen goes green

There is no Error Boundary component in the project (confirmed: search for `PokerErrorBoundary` returns 0 results, search for `ErrorBoundary` returns 0 results). When React encounters any render error -- such as accessing `.map()` on undefined `pots` during a state transition -- the entire component tree crashes. The only visible elements are the background image and the green `TableFelt` which are rendered at lower z-indices.

## Solution: 3 Changes

### Change 1: Stop `game_state` broadcasts from changing seat array membership mid-hand

**File:** `src/hooks/useOnlinePokerTable.ts`, line 243

Instead of replacing the entire seat array from the broadcast, **merge only known seats' changing data** (stack, current_bet, status, last_action, has_cards) while preserving the seat array structure. Never add or remove seats from a `game_state` broadcast -- only `seat_change` can do that.

This is the only fix that will permanently solve the mid-hand join card refresh, because it stops the seat array length from changing on every action broadcast.

```typescript
// Line 243 — BEFORE:
return { ...prev, current_hand: broadcastHand, seats: seats.length > 0 ? seats : prev.seats };

// AFTER:
// Merge seat DATA without changing seat array membership
const mergedSeats = prev.seats.map(existingSeat => {
  const updated = seats.find(s => s.seat === existingSeat.seat);
  if (updated) {
    return { ...existingSeat, ...updated };
  }
  return existingSeat;
});
return { ...prev, current_hand: broadcastHand, seats: mergedSeats };
```

This means:
- If Admin joins mid-hand and appears in the broadcast, they are IGNORED because they are not in the local seat array yet (they were added via `seat_change` as `sitting_out` with `has_cards: false`)
- Existing seats get their stack/bet/status updated normally
- The seat array length never changes from a `game_state` broadcast
- Only `seat_change` events and `refreshState()` can add/remove seats

### Change 2: Create Error Boundary to prevent green screen

**New file:** `src/components/poker/PokerErrorBoundary.tsx`

A React class component that catches render errors and shows a recovery UI ("Something went wrong -- Tap to reconnect") instead of crashing to the green felt.

**File:** `src/components/poker/OnlinePokerTable.tsx`

Wrap the entire return JSX in the error boundary.

### Change 3: Add null guards for crash-prone render paths

**File:** `src/components/poker/OnlinePokerTable.tsx`

Add defensive `|| []` guards to `hand?.pots` and `hand?.community_cards` where they are iterated in JSX, preventing the crashes that trigger the green screen.

## What Does NOT Change

- No layout, style, navigation, spacing, or BottomNav changes
- No database schema changes
- No edge function changes (the server-side fixes from the previous round are correct and stay)
- No changes to game logic, pot calculations, or deal animations
- No file renames or refactoring

## Technical Summary

| File | Change | Risk |
|------|--------|------|
| `src/hooks/useOnlinePokerTable.ts` line 243 | Merge seat data instead of replacing array | Low -- only affects how broadcast seats are applied |
| `src/components/poker/PokerErrorBoundary.tsx` (new) | Error boundary with recovery UI | Low -- additive wrapper |
| `src/components/poker/OnlinePokerTable.tsx` | Wrap in error boundary + null guards on `pots`/`community_cards` | Low -- defensive only |

## Why This Actually Fixes It

Previous fixes targeted `has_cards` flags and the `seat_change` handler. Those were correct but missed the core issue: **every `game_state` broadcast replaces the seat array**. When a new player joins, the next action broadcast includes them, the array length changes, React unmounts/remounts all seats, and cards visually refresh.

By merging seat data instead of replacing the array, the seat membership stays stable throughout a hand. New players only appear via the `seat_change` handler (which correctly marks them as `sitting_out`). The next `refreshState()` (after hand completes) will pick up the full correct state.

