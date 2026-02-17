

## Root Cause: Game Freeze After 3 Hands

### What's Actually Happening (confirmed by logs and code)

I traced through every line of code and cross-referenced with server logs. There are **3 confirmed bugs** working together:

---

### Bug 1: Fallback timers bypass the retry cap (INFINITE LOOP)

The retry cap added in the previous fix (max 3 retries) is completely defeated by two other effects that reset `autoStartAttempted` unconditionally:

```text
[Line 427-434] 4.5s fallback: resets autoStartAttempted = false (ignores retry count)
[Line 437-448] 6s safety net: resets autoStartAttempted = false (ignores retry count)
```

So the cycle is:
1. Auto-deal tries 3 times, cap reached, stops
2. 4.5 seconds later, fallback fires, resets the flag
3. Auto-deal fires again, tries 3 more times
4. 4.5 seconds later, fallback fires again...
5. Forever

The server logs confirm this: `poker-start-hand` boots every 2-3 seconds for minutes straight.

**Fix**: Both fallback effects must check `autoStartRetriesRef.current < 3` before resetting. If retries are exhausted, do NOT reset.

---

### Bug 2: Dropped broadcasts leave client permanently stuck

The `poker-action` logs show this warning repeatedly:
```
"Realtime send() is automatically falling back to REST API"
```

This means the Realtime channel is degraded. If BOTH the `game_state(complete)` and `hand_result` broadcasts are dropped, the client still thinks a hand is active. The 6s fallback in the `game_state` handler only fires if `game_state(complete)` arrives -- if it doesn't arrive at all, there's no recovery.

**Fix**: Add a "stale hand" detector. If the client has an active hand but receives no broadcast for 12 seconds, poll the server via `refreshState()`. If the server says no active hand, clear local state and allow auto-deal.

---

### Bug 3: Both players race to start the hand (doubles server load)

Both clients independently call `poker-start-hand` after showdown. One succeeds, the other gets "Hand already in progress" and starts retrying. This is wasteful and contributes to the storm.

**Fix**: Deterministic leader election -- only the player in the lowest occupied seat number triggers auto-deal. The other player waits passively (they'll receive the broadcast when the hand starts).

---

### Implementation

**File: `src/hooks/useOnlinePokerTable.ts`**

**Change 1** -- Fix fallback effects (lines 427-448):
```typescript
// 4.5s fallback: respect retry cap
useEffect(() => {
  if (!hasActiveHand && autoStartAttempted && handHasEverStarted) {
    const fallback = setTimeout(() => {
      if (autoStartRetriesRef.current < 3) {
        setAutoStartAttempted(false);
      }
    }, 4500);
    return () => clearTimeout(fallback);
  }
}, [hasActiveHand, autoStartAttempted, handHasEverStarted]);

// 6s safety net: respect retry cap
useEffect(() => {
  if (seatedCount >= 2 && !hasActiveHand && autoStartAttempted && handHasEverStarted) {
    const safetyNet = setTimeout(() => {
      if (autoStartRetriesRef.current < 3) {
        setAutoStartAttempted(false);
      }
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    }, 6000);
    return () => clearTimeout(safetyNet);
  }
}, [seatedCount, hasActiveHand, autoStartAttempted, handHasEverStarted]);
```

**Change 2** -- Add stale hand detector (new effect):
```typescript
// Stale hand recovery: if we think a hand is active but haven't
// received any broadcast in 12s, poll the server for truth
const lastBroadcastRef = useRef<number>(Date.now());

// Update timestamp on every game_state broadcast (inside the handler)
// lastBroadcastRef.current = Date.now();

useEffect(() => {
  if (!hasActiveHand) return;
  const interval = setInterval(() => {
    const elapsed = Date.now() - lastBroadcastRef.current;
    if (elapsed > 12000) {
      // Haven't heard from server in 12s, poll for truth
      refreshState().then(() => {
        lastBroadcastRef.current = Date.now();
      });
    }
  }, 5000); // check every 5s
  return () => clearInterval(interval);
}, [hasActiveHand, refreshState]);
```

Inside the `game_state` broadcast handler (line 145 area), add:
```typescript
lastBroadcastRef.current = Date.now();
```

**Change 3** -- Leader election for auto-deal (modify line 393):
```typescript
// Only the lowest-seated player triggers auto-deal
const isAutoStartLeader = (() => {
  if (!tableState?.seats || mySeatNumber === null) return false;
  const occupiedSeats = tableState.seats
    .filter(s => s.player_id && s.status !== 'eliminated')
    .map(s => s.seat)
    .sort((a, b) => a - b);
  return occupiedSeats[0] === mySeatNumber;
})();

// In the auto-deal effect condition:
if (seatedCount >= 2 && !hasActiveHand && !autoStartAttempted 
    && mySeatNumber !== null && handHasEverStarted && isAutoStartLeader) {
```

---

### Summary of Changes

| Issue | Fix | Lines |
|-------|-----|-------|
| Fallback timers bypass retry cap | Add `autoStartRetriesRef.current < 3` check | 427-448 |
| Dropped broadcasts cause permanent freeze | Add 12s stale hand polling via `refreshState()` | New effect |
| Both clients race to start hand | Only lowest-seat player auto-starts | 392-393 |

### What Does NOT Change
- No UI/visual changes
- No edge function changes  
- No database changes
- No animation changes
- Seat positions, card display, pot display all untouched

