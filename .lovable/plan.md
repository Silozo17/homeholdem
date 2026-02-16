

# Fix: Game Not Starting with 3 Players + Emoji Duration to 5s

## Issue 1: Game stuck on "Starting soon..."

**Root cause**: When multiple players join, each client's auto-deal `useEffect` fires and sets `autoStartAttempted = true`. The `startHand()` call uses `.catch(() => {})` which silently swallows errors. If the call fails (race condition, server rejects duplicate starts), the flag stays `true` and no client ever retries.

**Fix in `src/hooks/useOnlinePokerTable.ts`**:
- In the auto-deal `useEffect` (line 384-391), if `startHand()` fails, reset `autoStartAttempted` back to `false` so the effect retries after a brief delay.
- Add a small random jitter (0-1s) to the 2-second delay to reduce the chance of multiple clients racing simultaneously.

```typescript
// Current (broken):
startHand().catch(() => {});

// Fixed:
startHand().catch(() => {
  setAutoStartAttempted(false); // allow retry
});
```

And add jitter to reduce collisions:
```typescript
const jitter = Math.random() * 1000;
const timer = setTimeout(() => {
  startHand().catch(() => {
    setAutoStartAttempted(false);
  });
}, 2000 + jitter);
```

## Issue 2: Emoji/message duration to 5 seconds

**Fix in `src/hooks/useOnlinePokerTable.ts`**:
- Line 259: Change `4000` to `5000` (broadcast listener timeout)
- Line 413: Change `4000` to `5000` (local sender timeout)

## Summary

| Change | Location |
|--------|----------|
| Retry auto-deal on failure + add jitter | `useOnlinePokerTable.ts` lines 384-391 |
| Emoji duration 4s to 5s | `useOnlinePokerTable.ts` lines 259, 413 |

