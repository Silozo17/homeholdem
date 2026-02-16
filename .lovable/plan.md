

# Fix: Auto-Deal Stops After First Hand

## Root Cause

The auto-deal `useEffect` has a React cleanup race condition. Setting `setAutoStartAttempted(true)` as state causes an immediate re-render, which triggers the effect's cleanup function (`clearTimeout(timer)`) before the 2-second timer ever fires. The `startHand()` call is cancelled every time.

## Fix

Move `setAutoStartAttempted(true)` **inside** the timeout callback so no re-render happens before `startHand()` fires. Use a ref (`autoStartAttemptedRef`) for the guard to prevent double-firing without causing re-renders.

### File: `src/hooks/useOnlinePokerTable.ts`

Replace the auto-deal effect (lines 397-408):

```typescript
// BEFORE (broken):
useEffect(() => {
  if (seatedCount >= 2 && !hasActiveHand && !autoStartAttempted && mySeatNumber !== null && handHasEverStarted) {
    setAutoStartAttempted(true);  // <-- causes re-render, cleanup kills timer
    const jitter = Math.random() * 1000;
    const timer = setTimeout(() => {
      startHand().catch(() => {
        setAutoStartAttempted(false);
      });
    }, 2000 + jitter);
    return () => clearTimeout(timer);
  }
}, [seatedCount, hasActiveHand, mySeatNumber, startHand, autoStartAttempted, handHasEverStarted]);
```

```typescript
// AFTER (fixed):
useEffect(() => {
  if (seatedCount >= 2 && !hasActiveHand && !autoStartAttempted && mySeatNumber !== null && handHasEverStarted) {
    const jitter = Math.random() * 1000;
    const timer = setTimeout(() => {
      setAutoStartAttempted(true);  // <-- moved inside timeout, no early re-render
      startHand().catch(() => {
        setAutoStartAttempted(false);
      });
    }, 2000 + jitter);
    return () => clearTimeout(timer);
  }
}, [seatedCount, hasActiveHand, mySeatNumber, startHand, autoStartAttempted, handHasEverStarted]);
```

Also add a ref-based guard to prevent double-firing if the effect re-runs before the timeout:

```typescript
// Add ref near other refs:
const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Updated effect:
useEffect(() => {
  if (seatedCount >= 2 && !hasActiveHand && !autoStartAttempted && mySeatNumber !== null && handHasEverStarted) {
    if (autoStartTimerRef.current) return; // Already waiting
    const jitter = Math.random() * 1000;
    autoStartTimerRef.current = setTimeout(() => {
      autoStartTimerRef.current = null;
      setAutoStartAttempted(true);
      startHand().catch(() => {
        setAutoStartAttempted(false);
      });
    }, 2000 + jitter);
    return () => {
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }
}, [seatedCount, hasActiveHand, mySeatNumber, startHand, autoStartAttempted, handHasEverStarted]);
```

## Summary

| Change | File |
|--------|------|
| Move `setAutoStartAttempted(true)` inside timeout + add ref guard | `src/hooks/useOnlinePokerTable.ts` |

One file, one fix. The `startHand()` call will no longer be cancelled by React's cleanup cycle.
