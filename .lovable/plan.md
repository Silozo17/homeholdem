

# Fix: Ghost Seat Counts + Presence Role Sync

## Problem 1: Lobby shows wrong player count (ghost seats)

The no-active-hand disconnect branch in `poker-check-timeouts` currently nulls `player_id` but leaves the row. The lobby query counts all seats with `status IN ('active', 'sitting_out')` including these ghost rows.

**Two fixes:**

### 1a. `supabase/functions/poker-check-timeouts/index.ts` (lines 519-525)
Change the no-active-hand branch from updating to deleting:
```typescript
// Before:
await admin.from("poker_seats")
  .update({ player_id: null, stack: 0, status: "active", consecutive_timeouts: 0 })
  .eq("id", seat.id);

// After:
await admin.from("poker_seats")
  .delete()
  .eq("id", seat.id);
```

### 1b. `src/components/poker/OnlinePokerLobby.tsx` (line 90)
Add a filter to exclude any lingering ghost rows:
```typescript
// Before:
.in('status', ['active', 'sitting_out']);

// After:
.in('status', ['active', 'sitting_out'])
.not('player_id', 'is', null);
```

### 1c. One-time data cleanup
Delete existing ghost seat rows via SQL so the lobby immediately shows correct counts.

---

## Problem 2: Spectator/player presence not updating after join/leave

Presence role is only set once on channel subscribe. When a user takes a seat or leaves, their role stays stale.

### `src/hooks/useOnlinePokerTable.ts`

**After `joinTable` (line 511):** Re-track as player
```typescript
const joinTable = useCallback(async (seatNumber: number, buyIn: number) => {
  await callEdge('poker-join-table', { ... });
  await refreshState();
  // Update presence role to player
  if (channelRef.current) {
    await channelRef.current.track({ user_id: userId, role: 'player' });
  }
}, [...]);
```

**After `leaveSeat` (line 516):** Re-track as spectator
```typescript
const leaveSeat = useCallback(async () => {
  if (mySeatNumber === null) return;
  await callEdge('poker-leave-table', { ... });
  await refreshState();
  // Update presence role to spectator
  if (channelRef.current) {
    await channelRef.current.track({ user_id: userId, role: 'spectator' });
  }
}, [...]);
```

---

## Summary

| File | Change |
|------|--------|
| `supabase/functions/poker-check-timeouts/index.ts` | Delete seat row on no-hand disconnect instead of nulling player_id |
| `src/components/poker/OnlinePokerLobby.tsx` | Filter out null player_id seats from count query |
| `src/hooks/useOnlinePokerTable.ts` | Re-track presence role after join/leave seat |
| Database | One-time cleanup of ghost rows where player_id IS NULL |

## What Is NOT Changed
- Table header UI, icons, labels, eye icon -- all untouched
- Bottom navigation, seat layout, betting controls
- No new tables or schema changes
