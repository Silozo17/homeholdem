

# Fix: Cards Re-Reveal When Players Join/Leave

## Root Cause

In `PlayerSeat.tsx` (line 86-102), the card reveal animation effect depends on `totalActivePlayers` and `seatDealOrder`:

```typescript
useEffect(() => {
  // ... resets revealedIndices to empty Set, then re-schedules reveal timers
  setRevealedIndices(new Set());
  // ...
}, [cardKey, isHuman, totalActivePlayers, seatDealOrder, disableDealAnim]);
```

When a player joins or leaves:
- `totalActivePlayers` (passed as `activeSeats.length`) changes
- `seatDealOrder` (derived from `clockwiseOrder`) shifts

This triggers the effect, which wipes `revealedIndices` back to empty and re-runs the timed reveal animation -- making all players see their cards flip face-down and re-reveal.

## Fix

**File:** `src/components/poker/PlayerSeat.tsx`

Remove `totalActivePlayers` and `seatDealOrder` from the effect dependency array. These values only matter for calculating the initial deal delay timing -- they should NOT cause a re-reveal once cards are already shown.

To still use the correct timing values when the effect first runs (on `cardKey` change), capture them via refs so the effect reads the latest values without depending on them.

### Changes

1. Add two refs to hold the latest values:
```typescript
const totalActiveRef = useRef(totalActivePlayers);
totalActiveRef.current = totalActivePlayers;
const seatDealOrderRef = useRef(seatDealOrder);
seatDealOrderRef.current = seatDealOrder;
```

2. Update the effect to read from refs and remove the two props from the dependency array:
```typescript
useEffect(() => {
  if (!isHuman || player.holeCards.length === 0) {
    setRevealedIndices(new Set());
    return;
  }
  if (disableDealAnim) {
    setRevealedIndices(new Set(player.holeCards.map((_, i) => i)));
    return;
  }
  setRevealedIndices(new Set());
  const timers: ReturnType<typeof setTimeout>[] = [];
  player.holeCards.forEach((_, i) => {
    const dealDelay = (i * totalActiveRef.current + seatDealOrderRef.current) * 0.15 + 0.05;
    const revealMs = (dealDelay + 0.45) * 1000;
    timers.push(setTimeout(() => {
      setRevealedIndices(prev => new Set(prev).add(i));
    }, revealMs));
  });
  return () => timers.forEach(clearTimeout);
}, [cardKey, isHuman, disableDealAnim]);
```

The dependency array becomes `[cardKey, isHuman, disableDealAnim]` -- only values that genuinely indicate "new cards" or "new player identity."

## Summary

| File | Change |
|------|--------|
| `src/components/poker/PlayerSeat.tsx` | Use refs for `totalActivePlayers` and `seatDealOrder`; remove them from reveal effect deps |

## What Does NOT Change

- No layout, style, navigation, spacing, or BottomNav changes
- No database or edge function changes
- No file renames or refactoring
- The deal animation timing still uses the correct values (via refs)
- Only the re-trigger condition changes: cards will only re-animate when `cardKey` changes (i.e., new cards are dealt)

