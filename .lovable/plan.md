

# Fix: Community Tables Deleted When Last Player Leaves

## Problem
In `supabase/functions/poker-leave-table/index.ts` (lines 387-408), when `remainingAfterLeave === 0`, the function cascade-deletes the table and all its data. This happens for ALL table types, including community/persistent tables that should remain open permanently.

## Solution
Add a check for `is_persistent` before deleting. If the table is persistent (community), skip the deletion and just reset the table status to `"waiting"` instead.

## Technical Detail

**File:** `supabase/functions/poker-leave-table/index.ts`

**Lines 387-408** -- wrap the deletion block in a conditional:

Before:
```typescript
if (remainingAfterLeave === 0) {
  // broadcast close then cascade-delete
  ...
}
```

After:
```typescript
if (remainingAfterLeave === 0) {
  // Fetch table to check if persistent
  const { data: tableInfo } = await admin
    .from("poker_tables")
    .select("is_persistent")
    .eq("id", table_id)
    .single();

  if (tableInfo?.is_persistent) {
    // Community table: reset to waiting, do NOT delete
    await admin.from("poker_tables").update({ status: "waiting" }).eq("id", table_id);
  } else {
    // Non-persistent: broadcast close and cascade-delete (existing logic)
    await channel.send({ ... table_closed ... });
    // ... delete hands, seats, table ...
  }
}
```

This is the only change needed. The community table stays in the database and remains visible in the lobby for new players to join.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/poker-leave-table/index.ts` | Skip deletion for persistent/community tables when last player leaves |

