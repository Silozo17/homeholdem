

# Fix Header Cramping, Breku Duplicate, and Drawer Safe Area

## Issue 1: Header too cramped -- Replace icons with hamburger menu

The current header has Crown + Logo + Messages + Friends + Notification Bell (and sometimes Settings), causing overlap on small screens as shown in the screenshot.

**Solution**: Replace the `HeaderSocialIcons` inline icons and `NotificationBell` with a single hamburger menu (3-line icon) on the top right. Tapping it opens a `DropdownMenu` with all the header actions as menu items.

### Files changed:

**`src/components/layout/HeaderSocialIcons.tsx`** -- Rewrite this component to be a hamburger dropdown menu:
- Replace the two separate icon buttons with a single `Menu` (hamburger) icon button
- Use `DropdownMenu` from radix
- Menu items: "Messages" (with unread badge), "Friends", "Notifications" (with unread badge)
- Accept optional `children` or props for extra items (e.g. Settings gear on Profile page)
- Rename component to `HeaderMenu` (or keep name, just change internals)

Actually, to keep changes minimal and follow the user's instruction to not rename things, I will:
- Keep `HeaderSocialIcons` but transform it into a hamburger menu that also includes the notification bell functionality
- Remove the separate `<NotificationBell />` from all page headers since it will be inside the menu

**Modified pages** (each one just replaces `<HeaderSocialIcons /> <NotificationBell />` with the single new `<HeaderSocialIcons />`):
- `src/pages/Dashboard.tsx` -- remove `<NotificationBell />`, keep `<HeaderSocialIcons />`
- `src/pages/Profile.tsx` -- remove `<NotificationBell />`, move Settings into HeaderSocialIcons via prop; or keep Settings separate since it's just one icon
- `src/pages/Events.tsx` -- remove `<NotificationBell />`
- `src/pages/ClubDetail.tsx` -- remove `<NotificationBell />`
- `src/pages/PokerHub.tsx` -- remove `<NotificationBell />`
- `src/components/poker/PlayPokerLobby.tsx` -- remove `<NotificationBell />`
- `src/pages/PaidTournaments.tsx` -- remove `<NotificationBell />`

The hamburger menu will be dynamic -- it accepts optional extra items via props so pages like Profile can add a "Settings" entry.

### New HeaderSocialIcons behavior:
- Single `Menu` icon (hamburger) button
- Opens `DropdownMenu` with:
  - Messages (with unread count badge) -- navigates to `/inbox`
  - Friends -- navigates to `/friends`
  - Notifications (with unread count badge) -- opens `NotificationPanel`
  - (Optional per page) Settings -- navigates to `/settings`

---

## Issue 2: Breku appears twice in leaderboard

**Root cause**: Breku has a placeholder player record (`e531e6ef-db64-4767-8536-fb627f037db3`) for 4 historical games that is NOT linked to their registered account (`70daebda-beea-4a78-abf8-3d9c2833f998`). Additionally, 1 recent game was recorded directly with their `user_id`. The leaderboard treats these as two separate players.

**Fix**: Run a database migration to set `linked_user_id` on the placeholder to point to Breku's registered profile. This merges their stats automatically since the leaderboard code already handles this mapping.

```sql
UPDATE placeholder_players 
SET linked_user_id = '70daebda-beea-4a78-abf8-3d9c2833f998' 
WHERE id = 'e531e6ef-db64-4767-8536-fb627f037db3';
```

Also fix the `PlayerProfileDrawer` stats query: currently it only queries `game_players` by `user_id`, missing games played via placeholder. Update the query to ALSO count games where a `placeholder_player` has `linked_user_id` matching the player.

### File changed:
**`src/components/poker/PlayerProfileDrawer.tsx`** (lines 46-58)
- After fetching `game_players` by `user_id`, also fetch placeholder_players with `linked_user_id = playerId`, then fetch `game_players` by those placeholder IDs
- Merge both sets for accurate Games/Wins counts

---

## Issue 3: Profile drawer needs top safe area

As shown in the screenshot, the drawer content (avatar, name) sits directly under the iOS status bar with no spacing.

### File changed:
**`src/components/poker/PlayerProfileDrawer.tsx`** (line 112)
- Add `safe-area-top` or `pt-[env(safe-area-inset-top)]` padding to the top of the drawer header section (`<div className="p-6 pb-4 ...">`)
- Change to `style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}`

---

## Summary of all changes

| File | Change |
|------|--------|
| `src/components/layout/HeaderSocialIcons.tsx` | Rewrite: single hamburger icon opening a dropdown with Messages, Friends, Notifications |
| `src/pages/Dashboard.tsx` | Remove `<NotificationBell />` from header |
| `src/pages/Profile.tsx` | Remove `<NotificationBell />`, pass `showSettings` prop to HeaderSocialIcons |
| `src/pages/Events.tsx` | Remove `<NotificationBell />` |
| `src/pages/ClubDetail.tsx` | Remove `<NotificationBell />` |
| `src/pages/PokerHub.tsx` | Remove `<NotificationBell />` |
| `src/components/poker/PlayPokerLobby.tsx` | Remove `<NotificationBell />` |
| `src/pages/PaidTournaments.tsx` | Remove `<NotificationBell />` |
| `src/components/poker/PlayerProfileDrawer.tsx` | Add safe-area-top padding; fix stats to include placeholder-linked games |
| Database migration | Link Breku's placeholder to registered account |

## What does NOT change
- Bottom navigation -- untouched
- No styling, layout, or spacing changes beyond the three fixes
- No edge function changes
