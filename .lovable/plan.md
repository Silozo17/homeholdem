

# Fix: Move Ellis (8th player) to Bottom-Right

## Problem
In the 9-player landscape layout, Ellis (seat index 5) is positioned at 250 degrees (upper-left area), bunched up near Drew (230 degrees). The user wants Ellis placed at the bottom-right of the table, opposite Alex (who is at bottom-left, 130 degrees).

## Change

**File: `src/lib/poker/ui/seatLayout.ts` (line 43)**

Update the 9-player landscape angle array. Change seat index 5 from `250` to `50` (bottom-right position):

```
// Before
9: [90, 130, 160, 195, 230, 250, 310, 340, 20],

// After
9: [90, 130, 160, 195, 230, 50, 310, 340, 20],
```

This moves Ellis from the upper-left cluster to the bottom-right of the table, creating a symmetric layout with Alex on the bottom-left.

No other files or logic will be changed.

