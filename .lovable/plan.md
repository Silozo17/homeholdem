

## Production Hardening: Code Cleanup, Deduplication, and Stability

### Analysis Summary

After a thorough audit of the poker game codebase, I identified **duplicated code**, **resource-straining patterns**, **potential freeze vectors**, and **cleanup opportunities**. All changes preserve existing behavior -- no features are removed or altered.

---

### 1. Deduplicate `callEdge` Helper (4 copies -> 1 shared utility)

The `callEdge` function for calling backend functions is copy-pasted in 4 separate files, each slightly different:
- `src/hooks/useOnlinePokerTable.ts` (supports GET + POST)
- `src/components/poker/OnlinePokerTable.tsx` (POST only)
- `src/components/poker/OnlinePokerLobby.tsx` (POST only)
- `src/components/poker/TournamentLobby.tsx` (POST only)

**Fix**: Extract into a single `src/lib/poker/callEdge.ts` utility and import everywhere. The version in `useOnlinePokerTable.ts` is the most complete (supports GET). All 4 files will import from the shared module.

---

### 2. Deduplicate `useIsLandscape` and `useLockLandscape` Hooks (2 copies -> 1)

Both `PokerTablePro.tsx` and `OnlinePokerTable.tsx` define identical copies of:
- `useIsLandscape()` -- orientation detection hook
- `useLockLandscape()` -- fullscreen + orientation lock hook

**Fix**: Extract into `src/hooks/useOrientation.ts` and import in both table components. The `useLockLandscape` hook also has a subtle bug: it uses `const lockedRef = { current: false }` (plain object) instead of `useRef(false)`, meaning the cleanup function may not read the updated value. Will fix this during extraction.

---

### 3. Fix `useLockLandscape` Bug (plain object instead of `useRef`)

Both copies use:
```typescript
const lockedRef = { current: false }; // BAD: recreated every render
```
This means `lockedRef.current` is never `true` in the cleanup function, so `screen.orientation.unlock()` is never called. 

**Fix**: Use `useRef(false)` instead.

---

### 4. Remove Dead Code in `OnlinePokerTable.tsx`

Lines 182-188 contain a `checkKicked` effect that does nothing:
```typescript
useEffect(() => {
  if (!tableState || !user) return;
  const checkKicked = () => {
    if (mySeatNumber !== null) return;
  };
  checkKicked();
}, [tableState, user, mySeatNumber]);
```
This effect runs, defines an empty function, calls it, and discards the result. 

**Fix**: Remove entirely.

---

### 5. Eliminate Render-Time Computation in Seat Loop

In `OnlinePokerTable.tsx` (lines 788-792), the `seatDealOrder` is computed inside a render-time IIFE that loops through all seats for **every seat rendered**. This is O(n^2) per render.

**Fix**: Compute `activeScreenPositions` once before the `.map()` and pass the precomputed index.

---

### 6. Stabilize `Math.random()` in Render (Particle/Confetti Elements)

Both table components generate `Math.random()` values during render for particle positions (showdown particles, confetti). This causes layout jitter on every re-render since positions change randomly each time React renders.

**Fix**: Use `useMemo` with a stable seed to pre-compute particle positions once per showdown event.

---

### 7. Memoize Expensive Derived Values

In `OnlinePokerTable.tsx`, these values are recomputed every render:
- `rotatedSeats` array
- `positions` array (calls `getSeatPositions`)
- `totalPot` sum

**Fix**: Wrap in `useMemo` with proper dependencies.

---

### 8. TurnTimer Interval Optimization

`TurnTimer.tsx` runs `setInterval` at 50ms (20fps) for the circular progress animation. On mobile, this causes unnecessary re-renders. CSS transitions are already handling the visual smoothness.

**Fix**: Reduce interval to 200ms (5fps) -- the CSS `transition: stroke-dashoffset 0.05s linear` already interpolates visually. This reduces timer-related re-renders by 75%.

---

### 9. Prevent Memory Leak in Chat Bubbles

`useOnlinePokerTable.ts` creates a `setTimeout` for each chat bubble (6s auto-remove) but never cleans it up on unmount. If the component unmounts mid-bubble, the timeout fires on an unmounted component.

**Fix**: Track chat bubble timeouts in a ref and clear them on cleanup.

---

### 10. Guard Against Stale Closures in Auto-Deal

The auto-deal `useEffect` (lines 398-417) depends on `startHand` which is a `useCallback` depending on `tableId`. If `tableId` changes mid-timer (unlikely but possible), the stale closure fires with the wrong table. 

**Fix**: Use a ref for `startHand` to always call the latest version.

---

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/poker/callEdge.ts` | **NEW** -- shared edge function caller |
| `src/hooks/useOrientation.ts` | **NEW** -- shared `useIsLandscape` + `useLockLandscape` |
| `src/hooks/useOnlinePokerTable.ts` | Import shared `callEdge`, fix chat bubble cleanup, ref-based startHand |
| `src/components/poker/OnlinePokerTable.tsx` | Import shared utils, remove dead code, memoize computations, fix particles |
| `src/components/poker/PokerTablePro.tsx` | Import shared hooks, memoize particles |
| `src/components/poker/OnlinePokerLobby.tsx` | Import shared `callEdge` |
| `src/components/poker/TournamentLobby.tsx` | Import shared `callEdge` |
| `src/components/poker/TurnTimer.tsx` | Reduce interval frequency |

### What This Does NOT Change
- No visual changes to any screen
- No changes to game logic or edge functions
- No changes to seat positions, card animations, or dealer placement
- No changes to authentication, routing, or database queries

