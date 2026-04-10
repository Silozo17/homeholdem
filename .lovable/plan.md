

# Fix: Kick Broadcast Not Reaching Clients (Stale Seat State)

## Root Cause

`poker-moderate-table` still uses `admin.channel(...).send()` for kick and close broadcasts. This was the same unreliable pattern fixed in the other 5 poker edge functions last round, but **moderate-table was missed**. The broadcast silently drops, so:

1. You kick player → seat deleted in DB ✓
2. Broadcast to update other clients' UI → **silently fails** ✗
3. UI still shows kicked player in seat → you can't click that seat to sit
4. You pick a different seat → may conflict with actual DB state

## Fix (1 file)

### `supabase/functions/poker-moderate-table/index.ts`

1. Add the `broadcastToTable()` helper function (same as other poker functions)
2. Replace all `channel.send()` calls with `broadcastToTable()` calls for:
   - Kick event (seat_change with action "kicked")
   - Close event (seat_change with action "table_closed")
   - Closing scheduled event (seat_change with action "table_closing")
   - Cancel close event (seat_change with action "table_closing_cancelled")
3. Remove the `admin.channel(...)` usage entirely

This is the exact same pattern already applied to `poker-action`, `poker-start-hand`, `poker-check-timeouts`, `poker-join-table`, and `poker-leave-table`.

## Impact
- Kick broadcasts will reliably reach all connected clients
- Kicked player's seat will immediately clear from all UIs
- No changes to UI code, game logic, or other files

