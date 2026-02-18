

# Fix: Dealer Character Scales with Table Image

## Problem

The dealer's `top` position uses `calc(-4% - 32px)` / `calc(-4% - 62px)` — the percentage part scales with the table, but the pixel offset does **not**. On larger or smaller screens the dealer drifts away from the table edge.

## Fix

**File:** `src/components/poker/PokerTablePro.tsx`, line 347

Change the dealer's `top` from a calc with pixels to a pure percentage value, so it scales proportionally with the 16:9 table wrapper on all devices.

Current:
```typescript
style={{ top: isMobileLandscape ? 'calc(-4% - 32px)' : 'calc(-4% - 62px)', zIndex: Z.DEALER }}
```

New:
```typescript
style={{ top: isMobileLandscape ? '-14%' : '-22%', zIndex: Z.DEALER }}
```

The percentages are calculated to match the current visual position on mobile (the reference device), and will now scale proportionally on tablets, desktops, and other screen sizes.

## What Changes
- `src/components/poker/PokerTablePro.tsx` line 347 — dealer `top` value changed from `calc()` with pixels to pure percentage

## What Does NOT Change
- No seat positions, card layouts, or other element positions
- No styling, spacing, or navigation changes
- DealerCharacter component itself is untouched
- Bottom nav untouched

