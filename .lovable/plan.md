

# Fix: Multiplayer Poker Actions Not Working & No Turn Order

## Problems Found

There are two bugs preventing actions from working and causing all players to see buttons simultaneously:

### Bug 1: `current_actor_seat` missing from broadcast

The server broadcasts `current_actor_id` but does NOT include `current_actor_seat`. The client hook tries to read `payload.current_actor_seat` which is always `undefined`, so after any broadcast update, the hand's `current_actor_seat` becomes `null`. This breaks:
- `isMyTurn` detection (falls back to `current_actor_id` but that path has issues)
- `isCurrentActor` check in the UI (compares against `hand.current_actor_seat`)
- The spotlight ring around the active player disappears
- Without proper turn detection, `showActions` may not display for the right player

### Bug 2: `current_actor_seat` missing from broadcast payload on server

In `poker-action/index.ts`, the broadcast `publicState` object (line 581-610) includes `current_actor_id` but omits `current_actor_seat`. It needs to include `current_actor_seat: nextActorSeat`.

### Bug 3: Folded status lost on reconnect

The `poker-table-state` endpoint returns seat status directly from the DB. But the action handler resets folded seats back to `"active"` in the DB (line 538). So on reconnect/refresh mid-hand, a folded player appears as "active" with action buttons visible. The status should be derived from the actions log.

## Fix Plan

### File 1: `supabase/functions/poker-action/index.ts`

Add `current_actor_seat` to the broadcast payload:

```typescript
// Line ~581: Add to publicState object
current_actor_seat: nextActorSeat,  // ADD THIS LINE
current_actor_id: nextActorSeat !== null ? ...
```

### File 2: `supabase/functions/poker-table-state/index.ts`

Derive folded/all-in status from actions log so reconnecting players see correct state:

- Query `poker_actions` for the current hand
- For each seat, check if any action is `fold` -- if so, mark status as `"folded"`
- Check if any player went all-in by looking at their stack (0) and action history
- Include `current_bet` (per-round bet) and `last_action` in the seat info

### File 3: `src/hooks/useOnlinePokerTable.ts`

No changes needed -- the hook already reads both `current_actor_seat` and `current_actor_id` from broadcasts. Once the server sends `current_actor_seat`, everything will work.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/poker-action/index.ts` | Add `current_actor_seat: nextActorSeat` to broadcast payload |
| `supabase/functions/poker-table-state/index.ts` | Derive seat status from actions log; include `current_bet` and `last_action` per seat |

After these fixes:
- Only the player whose turn it is will see fold/call/raise buttons
- The active player spotlight will correctly highlight the current actor
- Reconnecting mid-hand will show correct folded/active states
- Turn order will be properly enforced (server already validates, this fixes the client display)

