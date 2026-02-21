

# Fix: Kicked Inactive User Not Properly Removed for Other Players

## Problem

Two bugs related to inactivity kicks:

1. **Broadcast payload mismatch**: The `poker-moderate-table` edge function broadcasts `kicked_player_id` for the kicked player's ID, but the client handler in `useOnlinePokerTable.ts` checks `payload.player_id` (which is always `null` in the kick broadcast). This means the kicked player never receives the `kickedForInactivity` flag from server-initiated kicks.

2. **`onLeave()` navigates away entirely**: When the `kickedForInactivity` flag IS set, the handler calls `onLeave()` which navigates the user completely away from the table. The user should instead just be removed from their seat and become a spectator, with the option to re-join or leave.

## Fix

**File: `src/hooks/useOnlinePokerTable.ts`**

Fix the broadcast handler to check `payload.kicked_player_id` instead of `payload.player_id`:

```typescript
// Line 324: was checking wrong field
if (payload.action === 'kicked' && payload.kicked_player_id === userId) {
  setKickedForInactivity(true);
}
```

**File: `src/components/poker/OnlinePokerTable.tsx`**

Change the `kickedForInactivity` handler to call `leaveSeat()` (just remove from seat, stay as spectator) instead of `onLeave()` (navigate away from table):

```typescript
useEffect(() => {
  if (kickedForInactivity) {
    toast({
      title: 'Removed for inactivity',
      description: 'You were removed from your seat. You can rejoin or leave.',
      variant: 'destructive',
    });
    // Just unseat, don't navigate away
    leaveSeat().catch(() => {});
  }
}, [kickedForInactivity, leaveSeat]);
```

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Fix `payload.player_id` to `payload.kicked_player_id` in kicked broadcast handler |
| `src/components/poker/OnlinePokerTable.tsx` | Replace `onLeave()` with `leaveSeat()` in kickedForInactivity handler so user stays as spectator |

## What Does NOT Change

- No edge function changes (the broadcast payload is already correct)
- No changes to the "Still Playing?" countdown flow (already works correctly via `leaveSeat()`)
- No changes to the 90s general inactivity timer
- No z-index, style, layout, or navigation changes
- No changes to the bottom navigation

