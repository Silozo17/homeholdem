
# Plan: Backfill Historical Prize Pool Data from Payout Structures

## Problem

All pre-2026 events were imported from a spreadsheet and have:
- Winner payouts stored in `payout_structures` table (1st and 2nd place amounts)
- No `game_transactions` records (buy-ins, rebuys) since these weren't tracked in the spreadsheet
- No `prize_pool_override` set

The current logic in `GameHistory.tsx` tries to calculate prize pool from transactions (which returns £0) and only uses `prize_pool_override` if explicitly set.

## Data Summary

| Event | Date | 1st Place | 2nd Place | Total Pool |
|-------|------|-----------|-----------|------------|
| Grudzien 2025 | Dec 6, 2025 | £230 | £180 | £410 |
| Listopad 2025 | Nov 1, 2025 | £1090 | £100 | £1190 |
| Pazdziernik 2025 | Oct 4, 2025 | £250 | £160 | £410 |
| Wrzesien 2025 | Sep 6, 2025 | £300 | £165 | £465 |
| Sierpien 2025 | Aug 2, 2025 | £160 | £40 | £200 |
| Lipiec 2025 | Jul 5, 2025 | £300 | £210 | £510 |
| ... and all 2024 events |

## Solution

### One-Time Database Update

Run a SQL update to set `prize_pool_override` for all historical sessions to the sum of their payout amounts:

```sql
UPDATE game_sessions gs
SET prize_pool_override = (
  SELECT COALESCE(SUM(ps.amount), 0)
  FROM payout_structures ps
  WHERE ps.game_session_id = gs.id
)
WHERE gs.id IN (
  SELECT gs2.id
  FROM game_sessions gs2
  JOIN events e ON gs2.event_id = e.id
  WHERE e.final_date < '2026-01-01'
    AND gs2.status = 'completed'
);
```

This single update will:
1. Find all game sessions linked to events before Jan 2026
2. Calculate the sum of payouts from `payout_structures` for each session
3. Set that as the `prize_pool_override` value

### Why This Works

The existing `GameHistory.tsx` code already prioritizes `prize_pool_override`:

```typescript
// Line 101-102 in GameHistory.tsx
const prizePool = sessionDetails?.prize_pool_override ?? calculatedPool;
```

Once we set `prize_pool_override`, the Game History will display the correct amounts.

## Code Changes Required

**None** - The display logic is already correct. We only need the database update.

## Expected Results After Fix

All historical events will show accurate prize pools:
- Grudzien 2025: £410 (was showing £0)
- Listopad 2025: £1190 (was showing £0)
- Pazdziernik 2025: £410 (was showing £0)
- ... and so on for all 23 historical events

## Alternative Approach (Not Recommended)

We could modify `GameHistory.tsx` to also query `payout_structures` as a fallback when both `prize_pool_override` and `game_transactions` are empty. However, this adds complexity and is unnecessary since we can simply backfill the correct values.

## Implementation Steps

1. Execute the SQL update to backfill `prize_pool_override` for all pre-2026 events
2. Verify the Game History now shows correct prize pools
3. No code changes needed - existing logic handles `prize_pool_override` correctly
