

# Fix Mobile Landscape Table Size and Seat Positions

## Problem

From the screenshots, two major issues:

1. **Table is too large** -- the table wrapper uses `min(96vw, 1100px)` and `maxHeight: 85vh`, which fills nearly the entire screen. This leaves no room for seat info stacks (cards, names, chips) around the edges -- they clip off-screen on the left (B, C), right (F, G), and bottom (Y, A, E).

2. **Seat positions don't account for the action bar** -- when the Fold/Call/Raise buttons appear, they cover the bottom ~15% of the screen, hiding the human player's cards and info entirely.

## Solution

### 1. Shrink the table wrapper in landscape mode

In `src/components/poker/PokerTablePro.tsx`, reduce the table wrapper dimensions:

- Width: `min(96vw, 1100px)` --> `min(78vw, 900px)`
- maxHeight: `85vh` --> `70vh`

This creates ~11% breathing room on each side and ~15% at top/bottom for seat info stacks to render without clipping.

### 2. Adjust landscape seat coordinates

Since the table wrapper is now smaller relative to the viewport, seats positioned as % of the wrapper will automatically scale. However, positions still need tuning to sit precisely on the rail of the now-smaller table. The key changes in `src/lib/poker/ui/seatLayout.ts`:

| Seat | Current | New | Rationale |
|------|---------|-----|-----------|
| Y | (50, 86) | (50, 92) | Push further down -- more room above for table, but still within wrapper |
| A | (24, 70) | (22, 78) | Lower and slightly left to sit on bottom-left rail |
| B | (16, 50) | (10, 50) | Pull further left to rail edge |
| C | (20, 22) | (14, 24) | Pull further left and slightly down |
| D | (33, 8) | (32, 6) | Slightly up to clear dealer |
| E | (76, 70) | (78, 78) | Mirror of A |
| F | (84, 50) | (90, 50) | Mirror of B |
| G | (80, 22) | (86, 24) | Mirror of C |
| H | (67, 8) | (68, 6) | Mirror of D |

These coordinates place circles on the rail when the wrapper is 78vw wide. Since the wrapper now has overflow:visible, info stacks extending outside the wrapper into the viewport breathing room will be fully visible.

### 3. Handle left/right seat info stacks clipping

For seats B and F (far left/right), the info stack extending outward can still clip the viewport edge. Add a `tableSide` concept alongside `tableHalf`:

In `PlayerSeat.tsx`:
- Seats with `xPct < 25` (B, C): position info stack to the **right** of the avatar instead of above/below
- Seats with `xPct > 75` (F, G): position info stack to the **left** of the avatar
- All other seats: keep current above/below behavior

This prevents horizontal overflow on edge seats.

### 4. Leave room for the action bar

The action bar covers the bottom ~60px of the screen. The "YOUR TURN" badge and human player's info must not overlap with it. The fix:
- Move the "YOUR TURN" badge higher (bottom offset from 82px to 100px)
- The human seat (Y at 92% of a 70vh wrapper) should naturally clear the action bar since the wrapper itself doesn't extend to the screen bottom

## Files to Modify

1. **`src/components/poker/PokerTablePro.tsx`**
   - Shrink table wrapper: width to `min(78vw, 900px)`, maxHeight to `70vh`
   - Raise "YOUR TURN" badge offset
   - Pass `xPct` to PlayerSeat so it can determine left/right side

2. **`src/lib/poker/ui/seatLayout.ts`**
   - Update all 9 SEATS_LANDSCAPE coordinates to the new values

3. **`src/components/poker/PlayerSeat.tsx`**
   - Accept new `sidePosition` prop (`'left' | 'right' | 'center'`)
   - For `left` seats: info stack positioned to the right of the avatar (using `left: 100%`)
   - For `right` seats: info stack positioned to the left (using `right: 100%`)
   - For `center` seats: keep current above/below behavior based on `tableHalf`

