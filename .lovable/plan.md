

# Fix: Action Buttons Appearing and Staying Visible Before Cards

## Problem

`dealAnimDone` is initialized as `true` (line 595). When a new hand broadcast arrives with `isMyTurn = true`, the React effect that resets `dealAnimDone` to `false` runs AFTER the render. So for that render cycle (and potentially longer if the effect condition doesn't match), `showActions` evaluates to `true` and the buttons appear and persist.

## Fix

**File:** `src/components/poker/OnlinePokerTable.tsx`, line 788

Add `&& myCards !== null` to the `showActions` condition. Since `myCards` is only set after an async fetch (with an 800ms delay), this naturally prevents action buttons from appearing until the player's hole cards are actually available and visible.

Current:
```tsx
const showActions = isMyTurn && dealAnimDone && !actionPending && mySeat && mySeat.status !== 'folded';
```

Updated:
```tsx
const showActions = isMyTurn && dealAnimDone && !actionPending && mySeat && mySeat.status !== 'folded' && myCards !== null;
```

## What Does NOT Change

- No style, layout, spacing, or navigation changes
- No changes to BottomNav, PlayerSeat, CardDisplay, or any other component
- No refactoring or renaming
- Only one line in `OnlinePokerTable.tsx` is modified

## Why This Fixes It

`myCards` starts as `null` and is only populated after the hole cards are fetched from the server (800ms+ delay). By requiring `myCards !== null`, the action buttons cannot appear until the player's cards are actually loaded and rendered on screen. This is a single-condition addition -- the smallest possible change.

