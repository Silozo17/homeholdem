

# Show XP Overlay After Every Multiplayer Match

## Problem
The "Match Complete" XP overlay (`XPLevelUpOverlay`) only appears when the player levels up. The condition on line 648 of `OnlinePokerTable.tsx` checks `calcLevel(endXp) > calcLevel(sXp)` and skips the overlay entirely if no level-up occurred.

## Fix
Remove the level-up gate so the overlay always shows when XP was gained (`totalGained > 0`).

## Technical Details

**File: `src/components/poker/OnlinePokerTable.tsx` (line 647-652)**

Change:
```typescript
const calcLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
if (calcLevel(endXp) > calcLevel(sXp)) {
  setXpOverlay({ startXp: sXp, endXp, xpGained: totalGained });
  return 'show_overlay';
}
return 'no_overlay';
```

To:
```typescript
if (totalGained > 0) {
  const sXp = startXpRef.current ?? 0;
  setXpOverlay({ startXp: sXp, endXp, xpGained: totalGained });
  return 'show_overlay';
}
return 'no_overlay';
```

This is a 1-line logic change. The `XPLevelUpOverlay` component already handles both cases correctly -- it animates the XP bar fill and only shows the level-up flash effect when a level boundary is crossed.

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Remove level-up gate; show overlay whenever XP is gained |

## Not Changed
- XPLevelUpOverlay component (already handles no-level-up case)
- Everything else unchanged

