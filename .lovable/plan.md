
# Fix Online Poker: Frozen Screen, Wake Lock, Notifications, and Table Visibility

## Issue 1: 3-Dots Menu Freezes Screen

**Root cause:** Same z-index bug as the invite dialog. The `DropdownMenuContent` in `dropdown-menu.tsx` renders via a Radix portal at `z-50`. The poker table container is `z-[60]`. When the dropdown opens, its invisible overlay captures all clicks at `z-50` (behind the table), while the actual menu content is also hidden behind the table. The user sees nothing but can no longer click anything because the overlay is intercepting events.

**Fix:** In `OnlinePokerTable.tsx`, pass `className="z-[70]"` to the `DropdownMenuContent` component so both the menu and its portal render above the `z-[60]` table.

**File:** `src/components/poker/OnlinePokerTable.tsx` (line 277)

---

## Issue 2: Screen Sleeps During Game

**Root cause:** The `useWakeLock` hook exists and is used in `TVDisplay.tsx`, but neither `OnlinePokerTable` nor `PokerTablePro` call it. There is no wake lock active during online multiplayer games or single-player poker.

**Fix:** Import and activate `useWakeLock` in both `OnlinePokerTable.tsx` and `PokerTablePro.tsx`. Request the wake lock on mount, release on unmount.

**Files:** `src/components/poker/OnlinePokerTable.tsx`, `src/components/poker/PokerTablePro.tsx`

---

## Issue 3: Invited Users Don't Get Notifications

**Root cause:** The `notifyPokerInvite` function sends correctly, but the edge function (`send-push-notification`) filters users by `notification_type = 'rsvp_updates'`, checking for a column `push_rsvp_updates` in `user_preferences`. If the invited user:
- Has no row in `push_subscriptions` (never granted push permission), OR
- Has no row in `user_preferences` but the preference filter logic has a subtle issue

The edge function logs show it booted but logged zero actual sends -- meaning either no subscriptions were found for the target user, or the preference filter excluded them.

The deeper issue: the notification type `'rsvp_updates'` is semantically wrong for poker invites. It should be a distinct type, but since we can't add a new column easily, the more practical fix is to either:
1. Send poker invites without a `notificationType` filter (so all users with subscriptions get them), or
2. Add a proper notification type

The simplest fix: Remove the `notificationType` from `notifyPokerInvite` so it bypasses preference filtering. Poker invites are direct, personal invitations and should always be delivered.

**File:** `src/lib/push-notifications.ts` (the `notifyPokerInvite` function)

---

## Issue 4: Other Users Can't See Created Tables

**Root cause:** The RLS policy is actually correct now -- it includes friends visibility via shared clubs. The real issue is that the lobby doesn't auto-refresh. When you create a table, the other user's lobby is stale. They need to manually pull to refresh.

**Fix:** Add a Supabase Realtime subscription to the `poker_tables` table in the lobby component, so when a new table is created (INSERT) or status changes, the lobby auto-refreshes.

**File:** `src/components/poker/OnlinePokerLobby.tsx`

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Add `className="z-[70]"` to DropdownMenuContent; import and activate `useWakeLock` |
| `src/components/poker/PokerTablePro.tsx` | Import and activate `useWakeLock` |
| `src/lib/push-notifications.ts` | Remove `notificationType` from `notifyPokerInvite` so invites bypass preference filtering |
| `src/components/poker/OnlinePokerLobby.tsx` | Add realtime subscription to `poker_tables` for auto-refresh when tables are created/updated |

## Technical Details

### Wake Lock Integration
```typescript
// In OnlinePokerTable.tsx and PokerTablePro.tsx
import { useWakeLock } from '@/hooks/useWakeLock';

// Inside the component:
const { requestWakeLock, releaseWakeLock } = useWakeLock();
useEffect(() => {
  requestWakeLock();
  return () => { releaseWakeLock(); };
}, []);
```

### Realtime Lobby Refresh
```typescript
// In OnlinePokerLobby.tsx useEffect
useEffect(() => {
  const channel = supabase
    .channel('poker-tables-lobby')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'poker_tables',
    }, () => { fetchTables(); })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [fetchTables]);
```

### Database Change
Enable realtime for `poker_tables`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_tables;
```
