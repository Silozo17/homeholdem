

# Auto-Delete Tables When Everyone Leaves or Game Ends

## Current Behavior

When all players leave a table, `poker-leave-table` sets `status = 'closed'` but the table row remains in the database forever. The lobby filters them out with `.neq('status', 'closed')`, but they accumulate as dead rows.

## Proposed Fix

Replace `UPDATE status = 'closed'` with actual `DELETE` in two places, and cascade-clean related data (seats, hands, actions, hole cards).

### 1. `supabase/functions/poker-leave-table/index.ts`

When `remainingAfterLeave === 0`:
- Delete all `poker_seats` for the table (safety cleanup)
- Delete all `poker_hole_cards` linked to hands on that table
- Delete all `poker_actions` linked to hands on that table
- Delete all `poker_hands` for the table
- Delete the `poker_tables` row itself
- Still broadcast `table_closed` before deleting

### 2. `supabase/functions/poker-moderate-table/index.ts`

When the owner uses the "delete table" moderation action:
- Same cascade delete logic as above instead of just setting `status = 'closed'`

### 3. Database consideration

Check if foreign keys have `ON DELETE CASCADE` configured. If they do, deleting the `poker_tables` row will automatically clean up child rows. If not, we delete children first manually in the edge function.

## Technical Details

### Cascade delete helper (shared logic in both edge functions)

```typescript
async function deleteTableCascade(admin: any, table_id: string) {
  // Get all hand IDs for this table
  const { data: hands } = await admin
    .from("poker_hands")
    .select("id")
    .eq("table_id", table_id);
  
  const handIds = (hands || []).map((h: any) => h.id);
  
  if (handIds.length > 0) {
    await admin.from("poker_hole_cards").delete().in("hand_id", handIds);
    await admin.from("poker_actions").delete().in("hand_id", handIds);
    await admin.from("poker_hands").delete().eq("table_id", table_id);
  }
  
  await admin.from("poker_seats").delete().eq("table_id", table_id);
  await admin.from("poker_tables").delete().eq("id", table_id);
}
```

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/poker-leave-table/index.ts` | Replace `UPDATE closed` with cascade delete when 0 players remain |
| `supabase/functions/poker-moderate-table/index.ts` | Replace `UPDATE closed` with cascade delete for table deletion action |

Two edge function edits. No frontend changes needed since the lobby already filters by `.neq('status', 'closed')` and handles `table_closed` broadcasts.

