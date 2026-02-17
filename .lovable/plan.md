

# Fix: Prevent Mid-Game Player Inclusion (Critical Bug)

## Root Cause

In `poker-join-table/index.ts` (line 142-151), when a player joins and no hand is currently active, they get `status: "active"` immediately. Then when `poker-start-hand` fires (auto-triggered ~1.2s later by the leader client), it queries all seats with `status: "active"` and deals cards to ALL of them -- including players who literally just sat down a fraction of a second ago.

The 3-second guard (lines 228-237 in `poker-start-hand`) was designed to prevent this, but it ONLY transitions `sitting_out` players to `active`. Players who were inserted as `active` from the start bypass this guard entirely.

This is the exact scenario the user reported: Matt R and Kadokyourdad joined between hands, got `active` status instantly, and were dealt into the next hand.

## Fix (2 changes, both server-side)

### Change 1: Always insert as `sitting_out` in `poker-join-table`

**File:** `supabase/functions/poker-join-table/index.ts`, lines 142-151

Remove the active hand check entirely. Always insert new players as `sitting_out`, regardless of whether a hand is in progress. The `poker-start-hand` function is responsible for activating players at the right time.

```
// BEFORE (line 151):
const initialStatus = activeHand ? "sitting_out" : "active";

// AFTER:
const initialStatus = "sitting_out";
```

This also means we can delete the `activeHand` query (lines 142-149) since it's no longer needed.

### Change 2: Always respect the 3-second cooldown in `poker-start-hand`

**File:** `supabase/functions/poker-start-hand/index.ts`, lines 240-246

Add a `joined_at` filter to the active seats query so that even if a player somehow has `active` status, they won't be included if they joined less than 3 seconds ago. This is a defence-in-depth measure.

```sql
-- Current query (line 240-246):
SELECT * FROM poker_seats
WHERE table_id = ? AND status = 'active' AND player_id IS NOT NULL
ORDER BY seat_number

-- Updated query adds:
AND joined_at < (now - 3 seconds)
```

The sitting_out activation query (lines 228-237) already has this guard -- we just need to add it to the active seats fetch too.

## Impact on First Game Start

When 2 players first sit down at an empty table, both will be `sitting_out`. The `poker-start-hand` activation logic (line 228-237) will transition them to `active` after 3 seconds. The auto-start timer fires at ~1.2s, which is before the 3s cutoff -- so the first auto-start attempt will find fewer than 2 active players and return "Need at least 2 players". The retry logic (up to 3 retries with fallbacks at 3.5s and 6s) will catch this on the second attempt. The manual "Start Game" button will also work after 3 seconds.

This is a minor UX trade-off (3-second wait for the very first hand) but eliminates the critical bug entirely.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/poker-join-table/index.ts` | Always insert as `sitting_out`; remove activeHand query |
| `supabase/functions/poker-start-hand/index.ts` | Add `joined_at < 3s ago` filter to active seats query |

## What Does NOT Change

- No client code changes
- No layout, navigation, or UI changes
- No database schema changes
- No other edge functions modified
- Game logic, pot calculations, deal animations all unchanged

