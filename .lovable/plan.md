

# Fix: Green Screen Crash When User Folds in Lesson 7

## Root Cause

In Lesson 7 ("When to Fold"), the user folds **pre-flop** (before any community cards are dealt). The next step is `show_result`, which dispatches `SHOWDOWN` to the reducer.

Inside `SHOWDOWN`, the remaining active players (Viktor + Luna, who called/raised) are evaluated with:
```typescript
evaluateHand([...p.holeCards, ...state.communityCards])
```

But `state.communityCards` is **empty** (no flop/turn/river was ever dealt), so each player only has 2 cards. `evaluateHand` throws:
```
Error: Need at least 5 cards to evaluate
```

This unhandled error crashes the React render tree, producing the green error screen.

## Fix

**File: `src/hooks/useTutorialGame.ts`** (SHOWDOWN case, ~lines 238-273)

Add a guard: when only one player remains active (everyone else folded), skip hand evaluation entirely and just award the pot to the sole remaining player. This already exists for `remaining.length === 1`, but the issue is that when the **human** folds, there are still 2+ remaining bots who go through the `evaluateHand` path with insufficient cards.

The fix wraps the `evaluateHand` call in a check:
- If `state.communityCards.length < 3` (no flop dealt), skip evaluation and just pick the first remaining player as winner with `handName: 'N/A'`
- This handles any fold-before-flop scenario safely

```typescript
// Inside SHOWDOWN, the else branch (remaining.length > 1):
if (state.communityCards.length < 3) {
  // Pre-flop fold scenario: no community cards, can't evaluate hands
  // Award pot to the first remaining player (or split equally)
  const winner = remaining[0];
  winner.chips += pot;
  winner.lastAction = 'Winner!';
  lastHandWinners.push({
    playerId: winner.id, name: winner.name,
    handName: 'N/A', chipsWon: pot,
  });
} else {
  // existing evaluateHand logic...
}
```

## What does NOT change
- Tutorial lesson content
- CoachOverlay UI
- Bottom navigation
- Database
- Any other files

