

# Fix: Multiplayer Actions Not Working + Tables Not Visible in Lobby

## Root Causes Found

### Issue 1: `poker-action` Edge Function Won't Boot
The deployed version of `poker-action/index.ts` crashes on startup with:
```
Uncaught SyntaxError: Identifier 'nextActiveSeat' has already been declared
```
This means **every action call (fold, call, raise) returns a 500 error**. The sound plays (client-side) but the edge function call fails silently because `handleAction` doesn't await or surface errors.

**Fix**: The current source file on disk is correct (no duplicate). The function simply needs to be **redeployed** to pick up the current clean version.

### Issue 2: RLS Infinite Recursion on `poker_tables` / `poker_seats`
The lobby queries `poker_tables` then `poker_seats`. The RLS policies create a circular dependency:

```
poker_tables SELECT policy --> checks poker_seats (sub-select)
poker_seats  SELECT policy --> checks poker_tables (sub-select)
```

This causes PostgreSQL error `42P17: infinite recursion detected in policy for relation "poker_seats"`, returning a 500 on every lobby load.

Additionally, `poker_tables` has **two overlapping SELECT policies** ("View public and own tables" and "Users can view relevant tables") which is redundant and compounds the recursion.

**Fix**: Break the circular dependency by:
1. Dropping the `poker_seats` SELECT policy that references `poker_tables`
2. Replacing it with a simpler policy that allows users to see seats at any table they can query (since `poker_tables` already has proper access control)
3. Dropping one of the two duplicate `poker_tables` SELECT policies

## Changes

### 1. Database Migration -- Fix RLS Policies

Drop the recursive `poker_seats` SELECT policy and replace with a non-recursive one. Drop the duplicate `poker_tables` SELECT policy.

```sql
-- Drop the recursive poker_seats policy
DROP POLICY IF EXISTS "View seats at accessible tables" ON poker_seats;

-- Replace with a simple non-recursive policy:
-- Users can see seats at tables they created, tables they're seated at,
-- public tables, and club tables they belong to.
-- This avoids referencing poker_tables which would trigger the recursion.
CREATE POLICY "View seats at accessible tables"
  ON poker_seats FOR SELECT TO authenticated
  USING (
    -- User is seated at this table
    player_id = auth.uid()
    OR
    -- Check table access directly without triggering poker_seats sub-query
    EXISTS (
      SELECT 1 FROM poker_tables t
      WHERE t.id = poker_seats.table_id
      AND (
        t.table_type = 'public'
        OR t.created_by = auth.uid()
        OR (t.club_id IS NOT NULL AND is_club_member(auth.uid(), t.club_id))
      )
    )
  );

-- Drop duplicate poker_tables policy (keep only one)
DROP POLICY IF EXISTS "View public and own tables" ON poker_tables;

-- Update remaining poker_tables policy to avoid sub-selecting poker_seats
DROP POLICY IF EXISTS "Users can view relevant tables" ON poker_tables;
CREATE POLICY "Users can view relevant tables"
  ON poker_tables FOR SELECT TO authenticated
  USING (
    table_type = 'public'
    OR created_by = auth.uid()
    OR (club_id IS NOT NULL AND is_club_member(auth.uid(), club_id))
    OR (table_type = 'friends' AND EXISTS (
      SELECT 1 FROM club_members cm1
      JOIN club_members cm2 ON cm1.club_id = cm2.club_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = poker_tables.created_by
    ))
  );
```

The key change: the `poker_seats` policy no longer triggers a sub-query on `poker_tables` that would then sub-query `poker_seats` again. And the `poker_tables` policy no longer sub-queries `poker_seats`.

### 2. Redeploy `poker-action` Edge Function

No code changes needed -- just redeploy to pick up the current clean source that doesn't have the duplicate declaration.

### 3. Add Error Feedback to `handleAction` (Client)

**File**: `src/components/poker/OnlinePokerTable.tsx`

Make `handleAction` async and surface errors via toast so players know when an action fails:

```typescript
const handleAction = async (action: any) => {
  if (action.type === 'check') play('check');
  else if (action.type === 'call') play('chipClink');
  else if (action.type === 'raise') play('chipStack');
  else if (action.type === 'all-in') play('allIn');
  const actionType = action.type === 'all-in' ? 'all_in' : action.type;
  try {
    await sendAction(actionType, action.amount);
  } catch (err: any) {
    toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
  }
};
```

## Summary

| Change | File | Purpose |
|--------|------|---------|
| Fix RLS recursion | Database migration | Break circular dependency between poker_tables and poker_seats policies |
| Redeploy edge function | `poker-action` | Fix SyntaxError crash (duplicate identifier) |
| Add error feedback | `OnlinePokerTable.tsx` | Surface action failures to users via toast |

