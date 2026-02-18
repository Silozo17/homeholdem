
# Allow Any Seated Player to Deal Hands

## Problem
The "Deal Hand" button is only visible to the table creator (`isCreator`). On community tables where the creator may not be present, no one can start a hand.

## What's Already Working
The backend edge function (`poker-start-hand`) already allows any seated player to deal -- it checks `table.created_by !== user.id && !userSeat` (line 187), meaning if you're seated, you're authorized. The restriction is **frontend only**.

## Solution
Change the visibility condition for the "Deal Hand" button from `isCreator` to `isSeated`.

## Technical Details

**File:** `src/components/poker/OnlinePokerTable.tsx`

One line change at line 1158:
- **Before:** `{isCreator && !hand && !autoStartAttempted && !handHasEverStarted && activeSeats.length >= 2 && (`
- **After:** `{isSeated && !hand && !autoStartAttempted && !handHasEverStarted && activeSeats.length >= 2 && (`

## NOT Changed
- Bottom navigation
- Backend logic (already correct)
- Moderation controls (kick/close stay creator-only)
- Styles, layout, spacing
