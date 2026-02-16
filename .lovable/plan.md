

# Fix Player Leave Sync, Timer Duration & Visibility

Three issues to address:

---

## 1. Player Leave Not Reflected Live + Lobby Stale Count + Cannot Delete Table

**Root cause**: When a player leaves (no active hand), `poker-leave-table` deletes the seat and broadcasts `seat_change`. The client's `seat_change` handler calls `refreshState()`, which fetches the full table state. However, there are two problems:

- **The leaving player's client** calls `leaveTable()` then immediately calls `onLeave()` (line 308), navigating away before the broadcast reaches other clients. This part works for the leaver but the **remaining player** may not see the update if `refreshState` fails silently or the broadcast doesn't trigger properly.
- **Lobby stale count**: The lobby counts seats by querying `poker_seats` rows. If the leaving player's seat was deleted but the lobby's Realtime subscription on `poker_seats` didn't fire (e.g., RLS filtering), the count stays stale. The lobby already subscribes to `postgres_changes` on `poker_seats` -- this should work, but only if RLS allows the querying user to see the row deletion.
- **Cannot delete table**: The `poker-moderate-table` "close" action checks for an active hand (`completed_at IS NULL`). If a hand was abandoned (player left mid-hand and the hand was never formally completed), the stale hand row blocks deletion.

**Fixes**:

### File: `supabase/functions/poker-leave-table/index.ts`
- After deleting the seat, check how many seats remain. If 0 or 1 remain, broadcast a notification so the remaining player knows the table is empty.
- If 0 seats remain, auto-close the table (set status to 'closed') so the lobby cleans up.
- When leaving mid-hand with only 1 other player remaining, auto-complete the hand (mark `completed_at`) so the remaining player can delete the table.

### File: `src/hooks/useOnlinePokerTable.ts`
- In the `seat_change` handler, if the payload includes `action: 'table_closed'`, auto-navigate the user away.
- If the payload includes a remaining player count of 1, show a toast: "All other players have left."

### File: `src/components/poker/OnlinePokerTable.tsx`
- Listen for the "table empty" notification from the hook and show a toast + option to leave.

---

## 2. Revert Timer to 30 Seconds

The timer was changed to 15s in the last update. Revert all three locations:

### File: `src/components/poker/TurnTimer.tsx`
- Line 17: Change default `duration` from `15` back to `30`.

### File: `supabase/functions/poker-start-hand/index.ts`
- Line 355: Change `15_000` back to `30_000`.

### File: `supabase/functions/poker-action/index.ts`
- Line 517: Change `15_000` back to `30_000`.

---

## 3. Make Timer Ring More Prominent / Visible

The current timer is a thin 2.5px SVG ring that's hard to see during gameplay. Make it much more prominent:

### File: `src/components/poker/TurnTimer.tsx`
- Increase default `strokeWidth` from `2.5` to `4`.
- Increase default `size` from `36` to match the avatar size passed from PlayerSeat (already `56`/`80` on line 115 of PlayerSeat -- so the size is correct, but the stroke is too thin).
- Add a pulsing glow effect when below 30% remaining (not just 20%).
- Make the background ring more visible: increase opacity from `0.1` to `0.25`.
- Add a subtle pulsing animation to the ring when time is low (below 10s remaining) using a CSS class or inline animation.

### File: `src/components/poker/PlayerSeat.tsx`
- Line 115: Pass `strokeWidth={4}` to `TurnTimer` so the ring is clearly visible around the avatar.

---

## Summary

| # | Fix | Files | 
|---|-----|-------|
| 1 | Player leave reflected live + lobby sync + table deletion | `poker-leave-table/index.ts`, `useOnlinePokerTable.ts`, `OnlinePokerTable.tsx` |
| 2 | Timer back to 30s | `TurnTimer.tsx`, `poker-start-hand/index.ts`, `poker-action/index.ts` |
| 3 | Timer ring more visible | `TurnTimer.tsx`, `PlayerSeat.tsx` |

