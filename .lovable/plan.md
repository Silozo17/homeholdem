

# Fix: Mid-Hand Join — Admin Gets a Turn Despite Not Having Cards

## Root Cause (exact proof)

The bug is in `supabase/functions/poker-action/index.ts`, lines 249 and 551-556.

**Step-by-step chain:**

1. Admin joins seat 1 as `sitting_out` in the `poker_seats` DB table
2. Julia checks -- `poker-action` runs, reads all seats including Admin
3. Line 249: Admin's `sitting_out` status is mapped to `"folded"` in the in-memory `seatStates` array
4. Line 554: When building `dbSeatUpdates`, `"folded"` is mapped back to `"active"` for the DB write (this is by design for actual folded players -- fold is hand-level, not stored on seat)
5. `commit_poker_state` writes Admin's DB seat status as `active` (was `sitting_out`, now `active`)
6. On Amir's next action, `poker-action` reads Admin from DB as `active` (no longer `sitting_out`)
7. Line 249: Since Admin is now `active` in DB (not `sitting_out`), they stay `active` in seatStates
8. Admin has no fold action in `poker_actions` table, so nothing flips them to `folded`
9. Line 533: `nextActiveSeat()` skips `folded`, `all-in`, `sitting_out`, `disconnected` -- but Admin is `active`, so Admin becomes the next actor
10. Admin gets a turn despite having no cards

**The core bug**: `dbSeatUpdates` at line 551-556 treats ALL folded seats the same -- it doesn't distinguish between "actually folded during the hand" and "sitting_out mapped to folded". Both get written back to DB as `active`, which corrupts `sitting_out` players into `active` participants.

## Fix (minimal, 1 file)

**File:** `supabase/functions/poker-action/index.ts`

**Change:** When building `dbSeatUpdates`, preserve the ORIGINAL DB status for players who were `sitting_out` or `disconnected`. Only reset `folded`/`all-in` for players who actually participated in the hand (i.e., have hole cards).

```typescript
// Lines 551-556 — BEFORE:
const dbSeatUpdates = seatStates.map(s => ({
  seat_id: s.seat_id,
  stack: s.stack,
  status: s.status === "all-in" ? "active" : s.status === "folded" ? "active" : s.status,
  consecutive_timeouts: s.consecutive_timeouts,
}));

// AFTER — preserve sitting_out/disconnected original status:
const dbSeatUpdates = seatStates.map(s => {
  // Players who were sitting_out/disconnected must keep that status
  // They were mapped to "folded" in seatStates (line 249) but their DB status must not change
  const originalSeat = seats.find((dbSeat: any) => dbSeat.id === s.seat_id);
  const wasNonParticipant = originalSeat?.status === "sitting_out" || originalSeat?.status === "disconnected";
  
  let dbStatus: string;
  if (wasNonParticipant) {
    dbStatus = originalSeat.status; // Keep sitting_out or disconnected
  } else if (s.status === "all-in" || s.status === "folded") {
    dbStatus = "active"; // Reset hand-level status for actual participants
  } else {
    dbStatus = s.status;
  }
  
  return {
    seat_id: s.seat_id,
    stack: s.stack,
    status: dbStatus,
    consecutive_timeouts: s.consecutive_timeouts,
  };
});
```

The same fix must be applied to `supabase/functions/poker-check-timeouts/index.ts` which has the identical pattern for building seat updates.

## What Does NOT Change

- No client-side changes
- No layout, style, navigation, or BottomNav changes
- No database schema changes
- No changes to game logic, pot calculations, or deal animations
- No file renames or refactoring

## Why This Fixes It

After the fix, when Julia checks:
- Admin (sitting_out in DB) is still mapped to "folded" in seatStates for action processing (correct -- skipped for next actor)
- But `dbSeatUpdates` preserves `sitting_out` for Admin's DB row
- On Amir's next action, Admin is still read as `sitting_out` from DB
- Line 249 maps Admin to "folded" again
- `nextActiveSeat` skips Admin (status is "folded" which is in the exclude list)
- Admin never gets a turn

Admin will only become `active` when `poker-start-hand` explicitly activates them for the next hand.
