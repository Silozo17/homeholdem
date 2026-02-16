
# Fix All-In Betting Round Logic

## Root Cause

There is a critical bug on **line 311** of `usePokerGame.ts`:

```
if (actionable.length <= 1 || roundComplete) {
  return advancePhase(...)
}
```

When you go all-in, your status changes to `'all-in'`. The opponent is still `'active'`, making `actionable.length === 1`. Because this condition uses `<= 1` with an **OR**, it immediately advances the phase **before the opponent gets to act** (call or fold). This causes:

1. **Cards shown prematurely** -- the phase advances through flop/turn/river into showdown without the opponent ever responding to the all-in.
2. **Money not awarded** -- the opponent never called, so their `totalBetThisHand` is lower than yours. The side pot calculator sees mismatched contributions and may not properly credit winnings.

## The Fix

### File: `src/hooks/usePokerGame.ts`

**Change 1 (line 311):** Replace `actionable.length <= 1` with `actionable.length === 0`

When `actionable.length === 0`, everyone is all-in or folded -- nobody CAN act, so auto-advance is correct. When `actionable.length === 1`, that player still needs to respond to the bet.

**Change 2 (lines 301-309):** Improve the `roundComplete` check to handle the case where the last raiser went all-in (and is no longer 'active', so `nextActivePlayerIndex` will never land on them):

```typescript
const raiserIsAllIn = lastRaiserIndex !== null 
  && players[lastRaiserIndex]?.status === 'all-in';
const allActiveActed = getActionablePlayers(players)
  .every(p => p.lastAction !== undefined);

const roundComplete = allEqualBets && (
  // Standard: we've come back to the raiser
  (lastRaiserIndex !== null 
    && players[lastRaiserIndex]?.status === 'active' 
    && nextIdx === lastRaiserIndex) ||
  // Raiser went all-in: round done when all remaining 
  // active players have acted and matched
  (raiserIsAllIn && allActiveActed) ||
  // No raiser (check-around): everyone acted
  (lastRaiserIndex === null && allActiveActed)
);
```

This ensures:
- After you go all-in, opponent gets their turn (call/fold)
- After opponent calls, `allEqualBets = true` and `allActiveActed = true` since the raiser is all-in, so the round properly advances
- After opponent folds, `foldedOut` catches it (line 293) and goes to showdown

### No other files need changes

The useEffect all-in runout check (line 551, `getActionablePlayers(state.players).length <= 1`) is correct for its purpose: once betting is resolved and 0-1 active players remain, the board auto-runs. The bug was only in the reducer skipping the opponent's turn entirely.

## Summary of Scenarios After Fix

| Scenario | Before (broken) | After (fixed) |
|----------|----------|-------|
| You all-in, opponent hasn't acted | Skips opponent, runs board | Opponent gets turn to call/fold |
| Opponent calls all-in (both all-in) | N/A (never reached) | `actionable === 0`, auto-advance, runout |
| Opponent calls with chips remaining | N/A | `allEqualBets + raiserAllIn + allActed` = advance, then useEffect runs board |
| Opponent folds | N/A | `foldedOut` triggers showdown, you win pot |
| Check-around (no raises) | Works | Still works (unchanged path) |
