
# Fix: Infinite Recursion in poker_tables RLS Policy

## Root Cause

The lobby query returns **HTTP 500** with error: `infinite recursion detected in policy for relation "poker_tables"`.

This happens because:
- The `poker_tables` SELECT policy checks `poker_seats` (to see if user is seated for private/friends tables)
- The `poker_seats` SELECT policy checks `poker_tables` (to see if the table is public/club)
- Postgres detects the circular dependency and throws an error

This means **no tables are ever visible** in the lobby.

## Solution

Create a `SECURITY DEFINER` helper function that bypasses RLS to check if a user has a seat at a table. Then rewrite the `poker_tables` SELECT policy to call that function instead of directly querying `poker_seats`.

This breaks the cycle because the function runs with elevated privileges and skips the `poker_seats` RLS check.

## Technical Detail

### 1. Database migration

Create a new function:
```sql
CREATE OR REPLACE FUNCTION public.is_seated_at_table(_user_id uuid, _table_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM poker_seats
    WHERE table_id = _table_id AND player_id = _user_id
  )
$$;
```

Then drop and recreate the `poker_tables` SELECT policy using this function instead of a subquery on `poker_seats`:

```sql
DROP POLICY IF EXISTS "Users can view relevant tables" ON poker_tables;

CREATE POLICY "Users can view relevant tables" ON poker_tables
  FOR SELECT USING (
    table_type IN ('public', 'community')
    OR created_by = auth.uid()
    OR (table_type = 'friends' AND is_seated_at_table(auth.uid(), id))
    OR (table_type = 'private' AND is_seated_at_table(auth.uid(), id))
    OR (table_type = 'club' AND club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
  );
```

### No frontend changes needed

The lobby code is correct. Once the RLS policy stops causing infinite recursion, the community tables (and all other tables) will appear.

## Files Changed

| File | Change |
|------|--------|
| Database migration (SQL) | Add `is_seated_at_table` function, recreate `poker_tables` SELECT policy |
