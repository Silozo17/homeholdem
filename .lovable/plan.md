

# Fix: Intermittent Missing Action Buttons + Chip Leak Explanation

## Issue 1: Buttons Sometimes Not Appearing (BUG FIX)

### Root Cause

The `dealAnimDone` timer is killed by seat broadcasts. Here is what happens:

1. A new hand starts. The effect at line 596 sets `dealAnimDone = false` and starts a timer (e.g. 4.3 seconds) to set it back to `true`.
2. During those 4.3 seconds, a broadcast arrives (another player acts, or any seat update occurs).
3. Because `tableState?.seats` is in the effect's dependency array (line 614), React re-runs the effect.
4. React calls the **previous cleanup function** first, which runs `clearTimeout(dealTimer)` -- killing the timer.
5. The new effect run sees `currentHandId === prevAnimHandIdRef.current` (same hand), so it skips the `if` block and does NOT set a new timer.
6. `dealAnimDone` stays `false` forever for that hand.
7. `showActions` (line 788) requires `dealAnimDone`, so the action buttons never appear.

This is a classic React useEffect cleanup race condition. It happens "sometimes" because it depends on whether a broadcast arrives before the deal animation timer fires.

### Fix

**File:** `src/components/poker/OnlinePokerTable.tsx`, line 614

Remove `tableState?.seats` from the effect dependency array. The seats data is only used to calculate `activePlayers` count for the timer duration, which only matters on the initial run (when `hand_id` changes). Subsequent seat changes should not re-trigger this effect.

**Before:**
```tsx
}, [tableState?.current_hand?.hand_id, tableState?.current_hand?.phase, tableState?.seats]);
```

**After:**
```tsx
}, [tableState?.current_hand?.hand_id, tableState?.current_hand?.phase]);
```

This is a single dependency removal. No other code changes.

---

## Issue 2: Chip Leak (ALREADY FIXED)

### Explanation

The chip imbalance you saw on the previous table was caused by the bug we fixed in the last session: players joining mid-hand as `active` instead of `sitting_out`. When a player joined mid-flop with `active` status, they got included in the action rotation without having hole cards. They could bet chips into the pot, but at showdown their side pot was skipped (no cards to evaluate). This corrupted the chip accounting.

The fix we deployed (poker-join-table setting `sitting_out` for mid-hand joins + poker-start-hand promoting them for next hand) prevents this from happening on any new tables.

Your current table "Wieczorny Pokerek" shows correct chip totals (total chips = starting chips minus current hand's blinds). No chip leak present.

---

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Buttons missing | `dealAnimDone` timer killed by seat broadcast re-render | Remove `tableState?.seats` from effect deps (1 line) |
| Chip leak | Mid-hand join as active (old bug) | Already fixed in previous session |

## What Does NOT Change

- No style, layout, navigation, or spacing changes
- No changes to BottomNav or any other component
- No refactoring or renaming
- Only one dependency array in `OnlinePokerTable.tsx` is modified
- No server-side changes

