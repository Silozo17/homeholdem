

# Fix: Actions Failing + Lobby Not Showing Live Players

## Root Causes

### 1. `poker-action` still crashes -- duplicate `nextActiveSeat` function
The file has TWO definitions of `nextActiveSeat`:
- **Line 99**: generic version using `any[]` parameter
- **Line 644**: typed version using `SeatState[]` parameter

This causes `SyntaxError: Identifier 'nextActiveSeat' has already been declared` on every boot. Every call/fold/raise returns 500.

**Fix**: Remove the first generic version (lines 99-106). The typed version at line 644 is the one actually used by `processAction`.

### 2. Lobby doesn't show live player counts or detect leaves
The lobby subscribes to `postgres_changes` on `poker_tables` but NOT on `poker_seats`. So:
- When a player joins or leaves, the seat count doesn't update
- Tables show stale player counts until manual refresh

**Fix**: Add a second Realtime subscription on `poker_seats` that triggers `fetchTables()` on any insert/delete.

## Changes

### File 1: `supabase/functions/poker-action/index.ts`
- Delete lines 99-106 (the first `nextActiveSeat` function)
- Keep the typed version at line 644

### File 2: `src/components/poker/OnlinePokerLobby.tsx`
- Add `poker_seats` to the existing Realtime channel so the lobby auto-refreshes when players join or leave

```typescript
// Update the existing channel subscription (line ~107-113)
const channel = supabase
  .channel('poker-tables-lobby')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_tables' }, () => {
    fetchTables();
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_seats' }, () => {
    fetchTables();
  })
  .subscribe();
```

## Summary

| File | Change |
|------|--------|
| `poker-action/index.ts` | Remove duplicate `nextActiveSeat` (lines 99-106) so the function boots |
| `OnlinePokerLobby.tsx` | Subscribe to `poker_seats` changes for live player count updates |

