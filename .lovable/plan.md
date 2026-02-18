

# Fix: False Game Over on Fresh Table

## Problem

The "last standing" detection effect (added in the previous fix) triggers immediately when a player creates a table and sits down alone. It sees 1 player with chips, no active hand, no handWinners -- all conditions pass, so it fires the congratulations voice and game-over screen despite no game being played.

## Fix

**File:** `src/components/poker/OnlinePokerTable.tsx`

Add a single guard at the top of the "last standing" effect: only trigger if at least 1 hand has been played (`handsPlayedRef.current > 0`). This ref already exists and is incremented each time a hand completes.

### Change (line 556)

Before:
```typescript
if (gameOver || !tableState || !user) return;
```

After:
```typescript
if (gameOver || !tableState || !user) return;
// Don't trigger on a fresh table where no hands have been played yet
if (handsPlayedRef.current === 0) return;
```

This ensures the game-over screen only appears after at least one hand has been dealt and completed, meaning opponents actually joined and then left.

## What Does NOT Change

- No layout, style, navigation, spacing, or BottomNav changes
- No database or edge function changes
- No file renames or refactoring
- The existing game-over detection for bust-outs remains intact
- The last-standing detection still works correctly when opponents leave after playing

