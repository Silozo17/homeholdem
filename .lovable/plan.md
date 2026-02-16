

# Poker Game Integrity Audit and Fixes

## Investigation Summary

After a deep code review of the entire poker engine (hand evaluator, deck, shuffling, bot AI, showdown logic, side pots, and winner display), the game logic is fundamentally fair and correct. The hand evaluator has 26 unit tests and handles all hand types properly.

**Why you saw "Pair" when you thought you didn't have one:** In Texas Hold'em, your best hand is built from all 7 cards (your 2 hole cards + 5 community cards). If the board itself contained a pair (e.g., two 9s on the table), then your best hand would be "One Pair" even if your own two cards didn't form a pair. This is correct poker -- everyone shares those community cards.

## Bugs Found

### Bug 1: Winner display re-evaluates hands separately from game logic
The `PokerTablePro` component independently re-evaluates hands in its `winners` memo, which can show a different hand name than the one the game engine actually used to determine the winner. This is cosmetic but confusing -- for example, if a player won because everyone folded, the overlay might still try to show their hand evaluation.

### Bug 2: Fragile winner detection via `lastAction`
Winners are identified by checking if `player.lastAction` contains an exclamation mark (`!`). This is brittle: during `game_over`, lastActions may have been cleared by previous state transitions, causing the overlay to miss or misidentify winners.

## Proposed Fix

Store the actual winner data (player ID, hand name, chips won) directly in the game state during the SHOWDOWN reducer, instead of relying on `lastAction` strings and re-evaluation in the UI component.

### Changes

**File: `src/lib/poker/types.ts`**
- Add a new field to `GameState`: `lastHandWinners: Array<{ playerId: string; handName: string; chipsWon: number }>` (default: empty array)

**File: `src/hooks/usePokerGame.ts`**
- In the `SHOWDOWN` reducer case, populate `lastHandWinners` with the actual winner data (player name, evaluated hand name, chips awarded) as calculated by the side-pot distribution
- Clear `lastHandWinners` in `DEAL_HAND`

**File: `src/components/poker/PokerTablePro.tsx`**
- Replace the `winners` useMemo that re-evaluates hands with a simple lookup from `state.lastHandWinners`
- Map `lastHandWinners` to the format expected by `WinnerOverlay` (name, hand object, chips)

### What stays the same
- Hand evaluator (correct, well-tested)
- Deck and shuffle (crypto-secure Fisher-Yates)
- Bot AI (personality-driven, uses same evaluator)
- Side pot calculator (correct algorithm)
- Blind posting and betting round logic

## Technical Details

**types.ts -- new state field:**
```typescript
// Add to GameState interface:
lastHandWinners: Array<{
  playerId: string;
  name: string;
  handName: string;
  chipsWon: number;
}>;
```

**usePokerGame.ts -- SHOWDOWN case changes:**
- After distributing side pots, build `lastHandWinners` array from actual winners
- Store it in returned state alongside existing fields

**PokerTablePro.tsx -- simplified winner display:**
- Remove the `evaluateHand` re-evaluation from the `winners` useMemo
- Instead, map `state.lastHandWinners` to the overlay format:
  ```typescript
  const winners = useMemo(() => {
    if (state.phase !== 'hand_complete' && state.phase !== 'game_over') return [];
    return state.lastHandWinners.map(w => ({
      name: w.name,
      hand: { rank: 0, name: w.handName, score: 0, bestCards: [] },
      chips: state.players.find(p => p.id === w.playerId)?.chips || 0,
    }));
  }, [state.phase, state.lastHandWinners, state.players]);
  ```

This ensures the hand name shown in the winner banner always matches exactly what the game engine used to decide the winner -- no second evaluation, no string-matching hacks.

