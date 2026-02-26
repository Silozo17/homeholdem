
# Fix: Busted Player Can't Sit Down After Clicking "Play Again"

## Root Cause

A race condition between the game-over timers and the "Play Again" button.

When a player busts out (stack = 0):

1. `gameOver` is set to `true`
2. An effect starts two timers: `leaveSeat(false)` at 2.5s, `saveXpAndStats` at 3.5s
3. The player sees the game-over overlay immediately

If the player clicks **"Play Again" before the 2.5s timer fires**:

4. `handlePlayAgain` sets `gameOver = false`
5. The effect's cleanup function runs, **cancelling both timers**
6. `leaveSeat(false)` **never executes** -- the seat record (with stack=0) remains in the database
7. `refreshState()` fetches the server state, which still includes the player's seat
8. `mySeatNumber` is set back to the old seat number, so `isSeated = true`
9. Empty seats render with `canJoin = !isSeated` which is `false`
10. The player cannot click any seat

If the player then tries to leave via the Leave button, it calls `leaveTable()` which checks `if (mySeatNumber === null) return` -- this works since `mySeatNumber` is set. But the player didn't know to do this; they expected "Play Again" to work.

## Fix (1 file, 1 change)

### `src/hooks/usePokerGameOver.ts` -- `handlePlayAgain` (line 240)

Before resetting state, **explicitly call `leaveSeat(false)`** to ensure the seat is always removed from the database. This makes the function idempotent -- if the timer already fired, `leaveSeat` will be a no-op (since `mySeatNumber` would already be `null`). If the timer hasn't fired yet, this ensures the seat is deleted before the player tries to rejoin.

```typescript
const handlePlayAgain = useCallback(async () => {
  // Ensure seat is removed from DB before allowing rejoin
  // (the game-over timer may not have fired yet if clicked quickly)
  try { await leaveSeat(false); } catch {}

  setXpOverlay(null);
  setGameOver(false);
  gameOverPendingRef.current = false;
  xpSavedRef.current = false;
  // ... rest unchanged
```

Also need to ensure XP is saved even if the timer was cancelled. Add a guard to save XP if it hasn't been saved yet:

```typescript
const handlePlayAgain = useCallback(async () => {
  // Save XP if it hasn't been saved yet (timer may have been cancelled)
  if (!xpSavedRef.current) {
    const mySeatInfo = tableState?.seats.find(s => s.player_id === user?.id);
    const isWinner = (mySeatInfo?.stack ?? 0) > 0;
    try { await saveXpAndStats(isWinner); } catch {}
  }

  // Ensure seat is removed before rejoin
  try { await leaveSeat(false); } catch {}

  setXpOverlay(null);
  setGameOver(false);
  // ... rest unchanged
```

The function signature changes from sync to async, but since `handlePlayAgain` is used as a button click handler, this is safe.

## What This Fixes

- Player can click "Play Again" at any time after the game-over screen appears
- The seat is always removed from the database before attempting to rejoin
- XP is always saved, even on fast clicks
- No changes to bottom navigation, styles, layout, or spacing

## Files Changed (1 total)

1. `src/hooks/usePokerGameOver.ts`
