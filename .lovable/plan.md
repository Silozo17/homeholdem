
# Fix: Remove Inactivity Kick for Spectators

## Problem

The 90-second inactivity timer currently runs for everyone at the table, including spectators. Spectators should never be kicked -- they are just watching.

## Fix

### File: `src/components/poker/OnlinePokerTable.tsx` (lines 241-271)

Gate the entire inactivity timer so it only runs when the user is **seated** (`mySeatNumber !== null`). When they are a spectator, the timer is skipped entirely.

Change line 241 to add a guard:

```ts
useEffect(() => {
  // Only apply inactivity kick to seated players, not spectators
  if (mySeatNumber === null) return;

  const IDLE_MS = 90_000;
  // ... rest stays the same
}, [leaveTable, onLeave, mySeatNumber]);
```

Add `mySeatNumber` to the dependency array so the timer starts when a user takes a seat and stops when they leave one.

**One file changed, ~2 lines added.** Nothing else is touched.
