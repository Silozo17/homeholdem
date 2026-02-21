

# Fix: Loser Not Seeing End Game Screen After All-In Loss

## Problem

When a player loses an all-in and busts out, they don't see the end-game XP screen. They remain at the table with no way to proceed. Only the winner sees the end screen.

## Root Cause

Two issues in `src/components/poker/OnlinePokerTable.tsx`:

1. **Timer gets cancelled repeatedly**: The game-over effect (line 787) has `saveXpAndStats` in its dependency array. `saveXpAndStats` is a `useCallback` that depends on `tableState`. When `leaveSeat()` fires and refreshes state, `tableState` changes, which gives `saveXpAndStats` a new reference, which re-runs the effect, which clears the previous 3.5s timer and starts a new one. If `tableState` keeps changing (opponent also leaving, realtime updates), the timer can be reset repeatedly or the callback captures stale data.

2. **Possible seat removal before detection**: If the loser's seat record is cleaned up server-side before the game-over detection effect re-runs, `mySeatInfo` becomes null and the effect bails at line 668.

## Fix

**File: `src/components/poker/OnlinePokerTable.tsx`**

### Change 1: Stabilize the game-over XP effect

Remove `saveXpAndStats` from the game-over effect's dependency array and call it via a ref, so that `tableState` changes don't reset the 3.5s timer:

```typescript
// Add a stable ref for saveXpAndStats
const saveXpAndStatsRef = useRef(saveXpAndStats);
useEffect(() => { saveXpAndStatsRef.current = saveXpAndStats; }, [saveXpAndStats]);

// Save XP on game over + leave seat
useEffect(() => {
  if (!gameOver || !user || xpSavedRef.current) return;
  const mySeatInfo = tableState?.seats.find(s => s.player_id === user.id);
  const isWinner = (mySeatInfo?.stack ?? 0) > 0;
  leaveSeat().catch(() => {});
  // Use ref so tableState changes don't clear this timer
  const timer = setTimeout(() => {
    saveXpAndStatsRef.current(isWinner);
  }, 3500);
  return () => clearTimeout(timer);
  // Intentionally exclude saveXpAndStats to prevent timer resets
}, [gameOver, user]);
```

### Change 2: Harden loser detection with fallback

Add a secondary fallback: if the player's seat shows `status === 'eliminated'` or stack is 0, and `handWinners` exist, trigger game over even if `mySeatInfo` isn't found by `player_id` (in case the seat was reassigned). Also guard against `mySeatInfo` being undefined when the seat is already removed by checking `lastKnownStack`:

After the existing game-over detection effect (line 665-695), add a fallback that uses `lastKnownStack`:

```typescript
// Fallback: loser detection when seat is already gone
useEffect(() => {
  if (gameOver || !user || !tableState) return;
  if (handWinners.length === 0) return;
  const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
  // If seat is gone AND we had 0 chips last known, we busted
  if (!mySeatInfo && lastKnownStack === 0) {
    const winner = handWinners[0];
    announceGameOver(winner?.display_name || 'Unknown', false);
    const timer = setTimeout(() => {
      setGameOver(true);
      setGameOverWinners(handWinners);
    }, 2000);
    return () => clearTimeout(timer);
  }
}, [tableState?.seats, user, gameOver, handWinners, lastKnownStack]);
```

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Add stable ref for `saveXpAndStats` to prevent timer resets; add fallback loser detection using `lastKnownStack` |

## What Does NOT Change

- No changes to WinnerOverlay, XPLevelUpOverlay, or any other component
- No z-index, style, layout, or navigation changes
- No database or edge function changes
- No changes to the bottom navigation

