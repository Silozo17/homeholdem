

## Fix: Game Freezing After a Few Hands

### Root Cause Analysis

Three interrelated bugs cause the freeze:

**Bug 1: Missing `hand_result` fallback (PRIMARY FREEZE CAUSE)**

When a hand completes, the server sends TWO broadcasts in sequence:
1. `game_state` with `phase: "complete"` 
2. `hand_result` with winners, revealed cards, etc.

If `hand_result` is dropped by Realtime (network hiccup, timing issue), the client gets stuck:
- `current_hand` has `phase: "complete"` but is never set to `null`
- `hasActiveHand` stays `true` forever
- Auto-deal never fires because it requires `!hasActiveHand`
- The game appears permanently frozen -- no new hand, no winner display, nothing

There is NO fallback for this scenario anywhere in the code.

**Bug 2: Auto-deal retry storm (visible in logs)**

When `startHand` fails (e.g., "Hand already in progress" from both clients racing, or "Need at least 2 players with chips" after a bust-out):
1. The catch block sets `autoStartAttempted = false`
2. This immediately re-triggers the auto-deal effect
3. After 2s + jitter, it calls `startHand` again
4. It fails again, resets, retries...
5. The 6-second "safety net" resets `autoStartAttempted` to `false`, which *continues* the loop instead of stopping it

The logs show ~30 boots in 50 seconds, confirming this infinite retry loop. This hammers the server and wastes resources.

**Bug 3: Dead `checkKicked` effect (minor)**

Lines 126-132 contain a no-op effect that runs every render for no reason (already identified in the previous plan but not yet removed).

---

### Fixes

**Fix 1: Add `complete` phase fallback timer**

In the `game_state` broadcast handler, when `phase === 'complete'` is received, start a 5-second fallback timer. If `hand_result` never arrives within that window, force the same cleanup (clear hand, clear winners, reset auto-start). This guarantees the game always recovers even if a broadcast is dropped.

**File**: `src/hooks/useOnlinePokerTable.ts`

In the `game_state` handler (around line 144), after updating state, add:
```typescript
if (payload.phase === 'complete') {
  // Fallback: if hand_result never arrives, force cleanup
  if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
  showdownTimerRef.current = setTimeout(() => {
    setTableState(prev => prev ? { ...prev, current_hand: null } : prev);
    setMyCards(null);
    setRevealedCards([]);
    setHandWinners([]);
    showdownTimerRef.current = null;
    setAutoStartAttempted(false);
  }, 6000); // 6s fallback -- hand_result handler will cancel and replace with 3.5s timer
}
```

The `hand_result` handler already clears `showdownTimerRef` and starts a 3.5s timer, so this 6s fallback only fires if `hand_result` was missed.

**Fix 2: Cap auto-deal retries**

Add a retry counter ref. If `startHand` fails 3 times in a row, stop retrying and require manual start. Reset the counter when a hand successfully starts.

**File**: `src/hooks/useOnlinePokerTable.ts`

Add: `const autoStartRetriesRef = useRef(0);`

In the auto-deal effect catch:
```typescript
startHandRef.current().catch(() => {
  autoStartTimerRef.current = null;
  autoStartRetriesRef.current += 1;
  if (autoStartRetriesRef.current < 3) {
    setAutoStartAttempted(false); // allow retry
  }
  // else: stay attempted=true, stop retrying
});
```

Reset on successful hand start:
```typescript
useEffect(() => {
  if (hasActiveHand) {
    setAutoStartAttempted(true);
    setHandHasEverStarted(true);
    autoStartRetriesRef.current = 0; // reset retries on success
  }
}, [hasActiveHand]);
```

**Fix 3: Remove dead `checkKicked` effect**

Remove lines 126-132 in `OnlinePokerTable.tsx` (the no-op `checkKicked` effect).

---

### Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useOnlinePokerTable.ts` | Add `complete` phase fallback timer in `game_state` handler; cap auto-deal retries to 3; add retry counter ref |
| `src/components/poker/OnlinePokerTable.tsx` | Remove dead `checkKicked` effect (lines 126-132) |

### What Does NOT Change
- No visual/UI changes
- No animation changes
- No edge function changes
- No database changes
- No seat positioning changes

