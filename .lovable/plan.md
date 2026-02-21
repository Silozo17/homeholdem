

# Fix: Losing Players Never See Game-Over Screen

## Root Cause

There is a critical race condition between the **showdown cleanup timer** and the **game-over detection effect**:

1. `hand_result` broadcast arrives -- `handWinners` is set to the winner list, seat stacks are updated (loser has 0 chips)
2. Game-over detection effect fires (depends on `handWinners` and `tableState`), sees `stack <= 0` and `handWinners.length > 0`, starts a **4-second timer** to set `gameOver = true`
3. The showdown cleanup timer fires after **3.5 seconds** and clears `handWinners` back to `[]`
4. Clearing `handWinners` re-runs the game-over effect (it's a dependency), which triggers the cleanup function that **cancels the 4-second timer**
5. The loser never sees the game-over screen

Additionally, when `gameOver` fires, `leaveSeat()` is called (line 813), but by that time the server may have already deleted the busted player's seat row, causing the leave call to fail silently.

## Fix

### Change 1: Stop the showdown timer from clearing `handWinners` when game is over

**File: `src/hooks/useOnlinePokerTable.ts`**

In the showdown cleanup timer (the `setTimeout` at line 427-437), check if the player has busted (stack = 0) before clearing `handWinners`. If the player busted, skip the clear so the game-over detection effect can complete its timer.

Add a ref to track "game over is pending" so the showdown timer knows not to clear winners.

### Change 2: Guard the game-over detection effect with `gameOver` check and snapshot winners into a ref

**File: `src/components/poker/OnlinePokerTable.tsx`**

The game-over effect at line 665 is missing a `gameOver` guard. Add `if (gameOver) return;` at the top to prevent re-triggering. Also, snapshot `handWinners` into `gameOverWinners` immediately (not after the delay) so they survive the showdown cleanup.

### Change 3: Make the loser detection more resilient

Instead of relying on `handWinners` still being populated after 4 seconds, set `gameOver` and `gameOverWinners` synchronously when bust is detected, then use the delay only for the announcement timing.

---

## Technical Details

### File: `src/hooks/useOnlinePokerTable.ts`

Add a `gameOverPendingRef` that is set to `true` when the component signals game over is imminent. In the showdown cleanup timer, skip clearing `handWinners` if this ref is true:

```typescript
// New ref
const gameOverPendingRef = useRef(false);

// In showdown timer (line 427-437), before clearing:
showdownTimerRef.current = setTimeout(() => {
  if (!gameOverPendingRef.current) {
    setHandWinners([]);
  }
  setTableState(prev => prev ? { ...prev, current_hand: null } : prev);
  setMyCards(null);
  setRevealedCards([]);
  showdownTimerRef.current = null;
  setAutoStartAttempted(false);
}, showdownDelay);
```

Also do the same for the fallback cleanup at line 288-295.

Expose `gameOverPendingRef` so the component can set it.

### File: `src/components/poker/OnlinePokerTable.tsx`

In the game-over detection effect (line 665-695):

1. Add `if (gameOver) return;` at the top
2. When loser is detected, immediately snapshot winners and set gameOver flag, using the timeout only for the announcement delay:

```typescript
useEffect(() => {
  if (gameOver || !tableState || !user) return;
  const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
  if (!mySeatInfo || handWinners.length === 0) return;

  const heroWonSomething = handWinners.some(w => w.player_id === user.id);

  // LOSER: stack is 0 and didn't win
  if (mySeatInfo.stack <= 0 && !heroWonSomething) {
    // Signal hook to preserve handWinners
    gameOverPendingRef.current = true;
    const snapshotWinners = [...handWinners];
    const winner = snapshotWinners[0];
    announceGameOver(winner?.display_name || 'Unknown', false);
    const timer = setTimeout(() => {
      setGameOver(true);
      setGameOverWinners(snapshotWinners);
    }, 4000);
    return () => clearTimeout(timer);
  }

  // WINNER: last player with chips
  const activePlayers = tableState.seats.filter(s => s.player_id && s.stack > 0);
  if (activePlayers.length === 1 && activePlayers[0].player_id === user.id && mySeatInfo.stack > 0) {
    gameOverPendingRef.current = true;
    const snapshotWinners = [...handWinners];
    const timer = setTimeout(() => {
      announceGameOver('You', true);
      setGameOver(true);
      setGameOverWinners(snapshotWinners);
    }, 5000);
    return () => clearTimeout(timer);
  }
}, [tableState, user, handWinners, gameOver]);
```

Same snapshot approach for the fallback effect at line 697-712.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Add `gameOverPendingRef`; skip clearing `handWinners` in showdown timer when game-over is pending; expose ref |
| `src/components/poker/OnlinePokerTable.tsx` | Add `gameOver` guard to detection effect; snapshot winners immediately; set `gameOverPendingRef` when bust detected |

## What Does NOT Change

- No edge function changes
- No UI/style/layout/navigation changes
- No changes to the bottom navigation
- No database schema changes
- Winner detection logic unchanged (only loser path fixed)

