

# Fix Online Poker Bugs: Landscape, Table Visibility, and Invites

## Bug 1: Android users cannot rotate to landscape

**Root cause (two issues):**

1. `manifest.json` has `"orientation": "portrait"` which tells Android PWAs to lock to portrait mode, preventing rotation entirely.
2. The `useLockLandscape()` hook in `PokerTablePro.tsx` calls `screen.orientation.lock('landscape')`, but on Android Chrome this requires the page to be in fullscreen mode first. Without fullscreen, the call silently fails. Additionally, there's a stale closure bug: the cleanup reads `locked` which is always `false` (initial value captured by the effect).

**Fix:**
- Change `manifest.json` orientation from `"portrait"` to `"any"` so the PWA allows rotation.
- Update `useLockLandscape()` to request fullscreen before attempting orientation lock, and use a ref instead of state for the cleanup flag. Wrap both in proper error handling since not all devices support these APIs.

**Files:** `public/manifest.json`, `src/components/poker/PokerTablePro.tsx`

---

## Bug 2: Created tables not visible to other players

**Root cause:** The RLS policy on `poker_tables` only shows tables where:
- `table_type = 'public'`, OR
- `created_by = auth.uid()`, OR
- User is a club member (for club tables), OR
- User is already seated

For `friends` type tables, no other player can see them in the lobby until they are seated (chicken-and-egg problem). They can only join via invite code.

**Fix:** Update the RLS SELECT policy to also allow visibility for `friends` tables where the viewing user shares at least one club with the table creator. This makes "friends" tables visible to club-mates in the lobby, matching the intent of the feature.

New policy condition adds:
```sql
OR (
  table_type = 'friends' AND EXISTS (
    SELECT 1 FROM club_members cm1
    JOIN club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = poker_tables.created_by
  )
)
```

**Database migration required.**

---

## Bug 3: Invite button broken on mobile PWA

**Root causes (three issues):**

1. **Duplicate notification call:** In `InvitePlayersDialog.tsx` lines 82-83, `notifyPokerInvite()` is called twice per invite click (copy-paste bug). Each invite sends two push notifications.

2. **Empty tableId from lobby:** When opened from the lobby's "Invite Friends" button (not from inside a table), `lastCreatedTable` may be null, passing an empty string as `tableId`. The push notification deep link becomes `/online-poker?table=` which doesn't load any table.

3. **Deep link not handled:** The `OnlinePoker` page reads `clubId` from URL params but never reads the `table` query parameter from the invite deep link, so even valid invite links don't auto-join the table.

**Fix:**
- Remove the duplicate `notifyPokerInvite` call (line 83).
- In the lobby, disable the standalone "Invite Friends" button or only show it when a table has been created in the current session.
- In `OnlinePoker.tsx`, read the `table` query param from the URL and auto-set it as `activeTableId` so invite deep links work.

**Files:** `src/components/poker/InvitePlayersDialog.tsx`, `src/components/poker/OnlinePokerLobby.tsx`, `src/pages/OnlinePoker.tsx`

---

## Summary of Changes

| File | Change |
|------|--------|
| `public/manifest.json` | Change `"orientation"` from `"portrait"` to `"any"` |
| `src/components/poker/PokerTablePro.tsx` | Fix `useLockLandscape` to request fullscreen first, fix stale closure |
| Database migration | Update `poker_tables` SELECT RLS to include friends-of-clubs visibility |
| `src/components/poker/InvitePlayersDialog.tsx` | Remove duplicate `notifyPokerInvite` call |
| `src/components/poker/OnlinePokerLobby.tsx` | Only show "Invite Friends" button when a table exists in session |
| `src/pages/OnlinePoker.tsx` | Read `?table=` query param and auto-join that table on load |

