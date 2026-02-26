

# Fix: Stack Inconsistency on Rejoin and Play Again

## Problem

When players rejoin a table after "Leave Table" or "Play Again", some end up with stale chip stacks from a previous session instead of the table's max buy-in. Two bugs cause this:

1. **Stale cache not cleared**: When `preserve_stack` is `false` (game over / leave table), the code correctly skips *saving* to cache, but never *clears* any existing cache entry from an earlier session (e.g., a previous inactivity kick saved their stack). On rejoin, the stale cached value is restored.

2. **Broadcast sends wrong stack**: In `poker-join-table`, the broadcast sends `stack: buy_in_amount` (the raw client value) instead of `stack: startingStack` (the actual value used, which may come from cache). Other players see the wrong chip count.

## Correct Behaviour (confirmed)

| Scenario | Stack on Rejoin |
|----------|----------------|
| Leave Seat (inactivity kick / manual) | Preserved (cached) |
| Leave Table | Reset to max buy-in |
| Game Over + Play Again | Reset to max buy-in |

The client-side calls are already correct (`leaveSeat()` for inactivity, `leaveSeat(false)` for game over, `leaveTable()` for leaving). Only the server needs fixing.

## Fixes (2 files, 3 surgical changes)

### File 1: `supabase/functions/poker-leave-table/index.ts`

Add `else` clauses to both stack-cache blocks (lines 376-382 and 387-393). When `preserve_stack` is false, delete any existing cache entry for this player so stale stacks cannot persist:

```typescript
// After the existing "if (preserve_stack && seat.stack > 0)" block:
else if (!preserve_stack) {
  const { data: tblCache } = await admin.from("poker_tables").select("stack_cache").eq("id", table_id).single();
  const currentCache = (tblCache?.stack_cache as Record<string, number>) || {};
  if (currentCache[seat.player_id]) {
    delete currentCache[seat.player_id];
    await admin.from("poker_tables").update({ stack_cache: currentCache }).eq("id", table_id);
  }
}
```

This applies at two locations (active-hand branch ~L382 and no-active-hand branch ~L393).

### File 2: `supabase/functions/poker-join-table/index.ts`

Change the broadcast payload at line 206 from `stack: buy_in_amount` to `stack: startingStack` so other clients see the actual stack value used.

## What This Fixes

- After "Game Over" + "Play Again", all players start with the table's max buy-in
- After "Leave Table" + rejoin, player gets max buy-in (no stale cache)
- Inactivity kicks still preserve the player's stack for when they rejoin
- The broadcast to other clients shows the correct stack value

## No Changes To

- Client-side code, bottom navigation, styles, layout, spacing
- Any other files

