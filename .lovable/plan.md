

# Fix Betting Order, Card Centering, and Seat Adjustments

## 1. Clockwise Betting Order

**Problem**: Players are mapped to seats in order Y, A, B, C, D, E, F, G, H. Visually this jumps from top-left (D) to bottom-right (E), creating a non-clockwise betting pattern.

**Fix**: Reorder `SEAT_PICKS` in `src/lib/poker/ui/seatLayout.ts` so array indices follow a clockwise visual order around the table starting from the hero (Y at bottom center):

```text
Current:   Y → A(bot-left) → B(left) → C(upper-left) → D(top-left) → E(bot-right) → F(right) → G(upper-right) → H(top-right)
Fixed:     Y → E(bot-right) → F(right) → G(upper-right) → H(top-right) → D(top-left) → C(upper-left) → B(left) → A(bot-left)
```

This means player index 1 (first bot after hero) sits at bottom-right, index 2 at right, etc., going clockwise. Since betting follows array index order, the visual action will now move clockwise around the table.

All player count configurations (2-9) will be updated to follow the same clockwise principle.

## 2. Center Community Cards on Table

**Fix**: Add vertical centering with `transform: translate(-50%, -50%)` and adjust `top` to `44%` so cards sit in the true visual center of the felt area.

**File**: `src/components/poker/PokerTablePro.tsx` (line 305-306)

## 3. Adjust Bottom-Left and Bottom-Right Seats Only

**Current positions**:
- A (bottom-left): xPct 20
- E (bottom-right): xPct 80

**New positions** (spread wider):
- A (bottom-left): xPct 16
- E (bottom-right): xPct 84

No other seat positions will be changed.

**File**: `src/lib/poker/ui/seatLayout.ts` (lines 51 and 55 only)

## Summary of Files

| File | Changes |
|------|---------|
| `src/lib/poker/ui/seatLayout.ts` | Reorder SEAT_PICKS for clockwise betting; adjust A and E xPct values |
| `src/components/poker/PokerTablePro.tsx` | Center community cards vertically on table |

