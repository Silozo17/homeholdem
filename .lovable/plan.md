

# Fix Deal Animation Sync and Button Timing

## Problem Summary

Three timing issues cause the buttons to appear before cards are visible and the deal animation to feel out of sync:

1. **Action buttons appear too early** -- they show as soon as deal sprites finish flying, but the card reveal animation (the flip from face-down to face-up) takes an additional 0.45s after that. Players see Fold/Check/Raise before they can even see their cards.

2. **Deal sprite order doesn't match card reveal order** -- the flying card-back sprites use clockwise-from-dealer order, but the actual card reveal in each PlayerSeat uses plain screen order. So the sprite lands on a player at one time but their card flips at a completely different time.

3. **Sprites fly too fast** -- at 0.12s stagger, the first card lands at 0.45s. The server data for your cards may not have arrived yet, causing the first card to stay face-down while the second card reveals correctly.

## Fixes

### Fix 1: Slow down deal sprite stagger (0.12s to 0.15s)

**File:** `src/components/poker/OnlinePokerTable.tsx`, line 1186

Change the sprite stagger from `0.12` to `0.15`. This:
- Gives the deal animation a more natural, deliberate pace
- Ensures myCards data arrives before the first card reveal
- Makes the visual dealing feel more like a real dealer

Also update lines 652-654 (`dealDurationMs` and `visualMs`) to use `0.15` to match.

### Fix 2: Match PlayerSeat deal order to sprite clockwise order

**File:** `src/components/poker/OnlinePokerTable.tsx`, lines 1253-1259

Currently `seatDealOrder` is computed as `activeScreenPositions.indexOf(screenPos)` (screen order). Change it to use a pre-computed `clockwiseOrder` array (the same one the dealing sprites use). This ensures the card reveal timing in PlayerSeat perfectly matches when the dealing sprite arrives.

Compute `clockwiseOrder` once (memoized) and pass the correct index to each PlayerSeat.

### Fix 3: Update PlayerSeat stagger to match (0.12 to 0.15)

**File:** `src/components/poker/PlayerSeat.tsx`, line ~97

Change `* 0.12` to `* 0.15` in the `dealDelay` calculation so the card reveal timing uses the same stagger as the sprites.

### Fix 4: Gate action buttons on card reveal completion

**File:** `src/components/poker/OnlinePokerTable.tsx`, line 847

Add `!dealing` to the `showActions` condition. Currently it only checks `dealAnimDone`, but `dealAnimDone` fires when sprites finish -- not when card reveals finish. Adding `!dealing` ensures we wait for the full visual sequence (sprites + reveals) to complete before showing buttons.

Updated condition:
```
const showActions = isMyTurn && dealAnimDone && !dealing && !actionPending && mySeat && mySeat.status !== 'folded' && myCards !== null;
```

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` (line 652-654) | Update dealDurationMs/visualMs to use 0.15 stagger |
| `src/components/poker/OnlinePokerTable.tsx` (line 847) | Add `!dealing` to showActions gate |
| `src/components/poker/OnlinePokerTable.tsx` (lines 1186) | Change sprite stagger from 0.12 to 0.15 |
| `src/components/poker/OnlinePokerTable.tsx` (lines 1253-1259) | Use clockwise deal order for seatDealOrder prop |
| `src/components/poker/PlayerSeat.tsx` (line ~97) | Change card reveal stagger from 0.12 to 0.15 |

## What Does NOT Change

- No layout, navigation, spacing, or style changes
- No BottomNav changes
- No database or edge function changes
- No refactoring or renaming
- BettingControls component unchanged
- Game logic, pot calculations unchanged
