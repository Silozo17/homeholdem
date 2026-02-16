
# Fix Player Seat Positions to Match Table Rail

## Problem
The current seat coordinates (e.g., B at x=4%, F at x=96%, D/H at y=0%) place players far outside the visible table rail. The table image uses `object-contain` inside a 16:9 wrapper, so it doesn't fill the full wrapper -- meaning coordinates at the extreme edges (0-4% and 96-100%) land in the dark leather background, not on the table rail.

## Solution: New Coordinates Matched to Table Rail

Only 1 file needs to change: `src/lib/poker/ui/seatLayout.ts`

Replace all seat coordinates with values that hug the actual table rail oval. All positions are perfectly mirrored left-right around x=50%:

**Landscape positions (% of wrapper):**
```text
        D(35,5)     [Dealer]    E(65,5)
    C(18,18)                        F(82,18)
  B(10,44)                            G(90,44)
    A(24,76)                        H(76,76)
                  Y(50,88)
```

| Seat | Current         | New          | What changed                     |
|------|----------------|--------------|----------------------------------|
| Y    | (50, 98)       | (50, 88)     | Pulled up from below table       |
| A    | (20, 82)       | (24, 76)     | Moved right + up onto rail curve |
| B    | (4, 48)        | (10, 44)     | Pulled in from far-left edge     |
| C    | (12, 16)       | (18, 18)     | Pulled in from edge              |
| D    | (32, 0)        | (35, 5)      | Pulled down from above table     |
| E    | (80, 82)       | (76, 76)     | Mirror of A                      |
| F    | (96, 48)       | (90, 44)     | Pulled in from far-right edge    |
| G    | (88, 16)       | (82, 18)     | Mirror of C                      |
| H    | (68, 0)        | (65, 5)      | Mirror of D                      |

**Symmetry verification** -- every pair sums to 100% on x-axis:
- A(24) + H(76) = 100
- B(10) + G(90) = 100
- C(18) + F(82) = 100
- D(35) + E(65) = 100

Portrait positions will follow the same proportional adjustment, pulled inward.

## Technical Details
- File: `src/lib/poker/ui/seatLayout.ts`
- Update `SEATS_LANDSCAPE` and `SEATS_PORTRAIT` coordinate maps
- No other files change -- the `getSeatPositions` function and `SEAT_PICKS` mapping remain the same
