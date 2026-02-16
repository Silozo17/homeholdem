

# Fix: Remove Table Border + Keep Top-Center for Dealer Only

## Two specific bugs to fix

### Bug 1: Table has visible rectangular border

The table wrapper `div` (line 208-215 in PokerTablePro.tsx) is a rectangle with `aspect-ratio: 16/9`. The table PNG is an oval with transparency. The `object-contain` sizing means the oval sits inside the rectangle, and the rectangular boundary is visible against the leather background.

**Fix in `PokerTablePro.tsx`**: Remove any visible boundary on the table wrapper. Ensure the wrapper itself has no background, border, or outline. The wrapper is purely a positioning context -- it should be invisible. Add `overflow: visible` so seats near edges aren't clipped.

### Bug 2: Blake sits at 270 degrees (top-center), colliding with dealer

The angle map for 4 players is `[90, 180, 0, 270]`. Seat index 3 gets 270 degrees which is the exact top-center where the dealer character sits. The code comment says 270 is reserved for the dealer, but several angle arrays still include 270.

**Fix in `seatLayout.ts`**: Remove 270 degrees from ALL angle arrays. Spread seats around the ellipse while leaving a gap at top-center (roughly 250-290 degrees) for the dealer. For example:

- 2 players: `[90, 270]` changes to `[90, 315]` (top-right instead of top-center)
- 3 players: stays `[90, 200, 340]` (already avoids 270)
- 4 players: `[90, 180, 0, 270]` changes to `[90, 180, 340, 20]` (spread across sides and top-left/right)
- 5 players: stays `[90, 155, 210, 330, 25]` (already avoids 270)
- 6 players: stays `[90, 145, 200, 250, 310, 35]` (250 is borderline -- shift to 240)
- 7 players: `[90, 140, 185, 225, 270, 315, 30]` changes to `[90, 140, 185, 225, 250, 315, 30]`
- 8 players: `[90, 135, 175, 215, 255, 295, 335, 30]` (255/295 are fine, they avoid exact 270)
- 9 players: `[90, 130, 160, 200, 240, 270, 300, 340, 20]` changes to `[90, 130, 160, 200, 235, 250, 305, 340, 20]`

Same treatment for landscape angles.

## Files to change

1. **`src/lib/poker/ui/seatLayout.ts`** -- Remove 270 degrees from all angle arrays, redistribute nearby seats
2. **`src/components/poker/PokerTablePro.tsx`** -- Ensure table wrapper div has no visible background/border and uses `overflow: visible`

## What stays the same

- TableFelt.tsx is already correct (visual-only mode returns just the img tag with no background div)
- DealerCharacter.tsx stays at `top: 2%` inside the table wrapper
- All other game logic, sounds, animations unchanged

