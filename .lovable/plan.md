

# Comprehensive Seat Consistency Audit and Fix

## Issues Found

After a thorough review of the entire online multiplayer seating codebase (client hooks, UI component, and all relevant edge functions), here are all the bugs and inconsistencies that cause ghost seats, misplaced seats, and desync between players:

---

### Bug 1: `poker-check-timeouts` auto-kick creates ghost seats (CRITICAL)

**File:** `supabase/functions/poker-check-timeouts/index.ts` (line 420-424)

When a player is auto-kicked for 2+ consecutive timeouts, the code does:
```typescript
await admin.from("poker_seats")
  .update({ player_id: null, stack: 0, status: "active", consecutive_timeouts: 0 })
  .eq("id", seat.id);
```

This **nullifies `player_id` but keeps the seat row**, creating a ghost seat -- an empty row in the database that has no player but occupies a seat number. The client's seat visibility RLS query and lobby counts will see this ghost row.

**Fix:** Change to `DELETE` instead of `UPDATE`, matching the pattern used in heartbeat kicks (line 524) and force-removes (line 555).

---

### Bug 2: `poker-check-timeouts` auto-kick broadcasts wrong payload field

**File:** `supabase/functions/poker-check-timeouts/index.ts` (line 429-433)

The auto-kick for consecutive timeouts broadcasts:
```typescript
payload: { action: "kicked", seat: seat.seat_number, player_id: seat.player_id }
```

But the client handler (line 324 in `useOnlinePokerTable.ts`) expects `kicked_player_id`:
```typescript
if (payload.action === 'kicked' && payload.kicked_player_id === userId)
```

The `poker-moderate-table` function correctly sends `kicked_player_id`, but `poker-check-timeouts` sends `player_id`. This means auto-kicked players never get the `kickedForInactivity` flag and remain stuck visually.

**Fix:** Add `kicked_player_id: seat.player_id` to the broadcast payload.

---

### Bug 3: Client `seat_change` handler doesn't handle `force_removed` and `disconnected` action types for self-detection

**File:** `src/hooks/useOnlinePokerTable.ts` (line 311-327)

The handler correctly processes `leave`, `kicked`, and `disconnected` for seat removal visuals, but:

1. When `action === 'disconnected'`, it clears the seat visually (sets `player_id: null`), but if the player IS the disconnected one (e.g. they reconnected), they see themselves removed even though the server only marked them as `disconnected` (not deleted).

2. When `action === 'force_removed'`, it's not handled at all -- falls through to `refreshState()` which works but is slower and may cause a flash.

**Fix:** Add `force_removed` to the existing seat-clearing condition. For `disconnected`, update the seat status to `disconnected` instead of clearing the player entirely (since the server only marks it, doesn't delete mid-hand).

---

### Bug 4: `leaveSeat` has no early-out guard for spectators

**File:** `src/hooks/useOnlinePokerTable.ts` (line 540-547)

`leaveSeat` checks `mySeatNumber === null` but this is derived from `tableState` which can be stale. If the server already removed the seat but the local state hasn't refreshed, the edge function call goes through and returns "Not seated" (200 OK with `{ message: "Not seated", stack: 0 }`), but the client doesn't know and still calls `refreshState()`. This is harmless but causes unnecessary network chatter. More importantly, the `kickedForInactivity` handler (line 328-336) calls `leaveSeat()` which may fail if the seat is already gone.

**Fix:** Add a try-catch around the `leaveSeat` call in the kickedForInactivity handler (already done), and ensure the leaveSeat callback gracefully handles the "Not seated" response.

---

### Bug 5: `seat_change` handler for `disconnected` wrongly clears the seat visually

**File:** `src/hooks/useOnlinePokerTable.ts` (line 311-327)

When a stale heartbeat triggers a `disconnected` broadcast, the client handler treats it the same as `leave` or `kicked` -- it nullifies the seat visually. But on the server, the seat still has a `player_id` (just marked `disconnected`). Other clients then see an empty seat, but if the disconnected player reconnects and sends a heartbeat, their seat is still there server-side, causing a desync: the visual shows an empty seat but the server has a player there.

**Fix:** For `disconnected` action, update the seat's status to `disconnected` instead of clearing `player_id`. This way other players still see the player (with a disconnected indicator) until force-removal actually deletes the seat.

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/poker-check-timeouts/index.ts` | (1) Change auto-kick from `UPDATE player_id=null` to `DELETE`; (2) Add `kicked_player_id` to auto-kick broadcast payload |
| `src/hooks/useOnlinePokerTable.ts` | (1) Add `force_removed` to seat-clearing conditions; (2) Handle `disconnected` by updating status instead of clearing seat; (3) Add `kicked_player_id` check for auto-kick broadcasts |

## What Does NOT Change

- No UI/style/layout/navigation changes
- No changes to `poker-join-table`, `poker-leave-table`, `poker-moderate-table`, or `poker-table-state`
- No changes to `OnlinePokerTable.tsx`
- No changes to the bottom navigation
- No database schema changes

