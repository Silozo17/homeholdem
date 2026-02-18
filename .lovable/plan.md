

# Fix: Lobby Can't See Player Count for Community Tables

## Problem
The `poker_seats` SELECT RLS policy only allows viewing seats at tables with `table_type = 'public'`. Community tables have `table_type = 'community'`, so the lobby's seat count query is blocked by RLS and always returns 0 players for those tables.

## Solution
Update the `poker_seats` SELECT policy to also allow viewing seats at `community` tables.

## Technical Detail

**Database migration only -- no frontend changes.**

Drop and recreate the `poker_seats` SELECT policy to include `'community'` alongside `'public'`:

```sql
DROP POLICY IF EXISTS "View seats at accessible tables" ON poker_seats;

CREATE POLICY "View seats at accessible tables" ON poker_seats
  FOR SELECT USING (
    player_id = auth.uid()
    OR (EXISTS (
      SELECT 1 FROM poker_tables t
      WHERE t.id = poker_seats.table_id
      AND (
        t.table_type IN ('public', 'community')
        OR t.created_by = auth.uid()
        OR (t.club_id IS NOT NULL AND is_club_member(auth.uid(), t.club_id))
      )
    ))
  );
```

The only difference is changing `t.table_type = 'public'` to `t.table_type IN ('public', 'community')`.

## Files Changed

| File | Change |
|------|--------|
| Database migration (SQL) | Update `poker_seats` SELECT policy to include `community` table type |

