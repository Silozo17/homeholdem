
# Tappable Players Everywhere + Header Icons for Messages/Friends

## Overview

Two changes:
1. Add **Messages** and **Friends** icons to the top header bar (next to the notification bell) on all key pages
2. Create a reusable **TappablePlayer** wrapper component and use the existing **PlayerProfileDrawer** everywhere a player name/avatar appears

---

## 1. Header Icons (Messages + Friends)

### New file: `src/components/layout/HeaderSocialIcons.tsx`

A small component rendering two icon buttons side by side:
- **MessageSquare** icon linking to `/inbox`, with an unread badge (uses `useDirectMessages` hook's `unreadCount`)
- **Users** icon linking to `/friends`

Both icons follow the same size/style as `NotificationBell`.

### Modified pages (header area only)

Every page that currently shows `NotificationBell` in the header will also render `HeaderSocialIcons` next to it. The right-side header area will become: `[HeaderSocialIcons] [NotificationBell] [Settings?]`

Pages affected:
- `src/pages/Dashboard.tsx` (line 211)
- `src/pages/Profile.tsx` (line 224-233)
- `src/pages/Events.tsx` (line 236)
- `src/pages/ClubDetail.tsx` (line 370)
- `src/pages/PokerHub.tsx` (line 32)
- `src/components/poker/PlayPokerLobby.tsx` (line 45)
- `src/pages/PaidTournaments.tsx` (line 110)

For pages using the pattern `<NotificationBell className="absolute right-4" />`, this becomes a `<div className="absolute right-4 flex items-center gap-1">` wrapping `HeaderSocialIcons` + `NotificationBell`.

For `Profile.tsx` which already has a flex wrapper, just add `HeaderSocialIcons` inside it.

---

## 2. Tappable Players Everywhere

### New file: `src/components/common/TappablePlayer.tsx`

A wrapper component that:
- Accepts `userId` (the profile id of the player) and `children` (the existing player row/avatar content)
- On tap, opens the `PlayerProfileDrawer` for that user
- Skips interaction if `userId` matches the current user (no self-profile drawer)
- Renders as a `<button>` with `cursor-pointer` styling but no visual change to the content

```text
Props:
  userId: string          -- the player's profile ID
  children: ReactNode     -- existing row content
  disabled?: boolean      -- optional, skip if placeholder player
```

Internally manages `selectedPlayerId` state and renders `PlayerProfileDrawer` when set.

### Modified files (wrap player rows with TappablePlayer)

**`src/pages/ClubDetail.tsx`** (lines 622-668, members tab)
- Wrap each member row `<div>` inside `<TappablePlayer userId={member.user_id}>` 
- Only for members with a `user_id` (not placeholder)

**`src/components/events/AttendeesList.tsx`** (Going, Maybe, Not Going, Waitlist sections)
- Wrap each attendee pill inside `<TappablePlayer userId={attendee.user_id}>`

**`src/components/clubs/Leaderboard.tsx`** (lines 308-351)
- Wrap each leaderboard row inside `<TappablePlayer userId={player.player_key}>`
- Only when `player_key` looks like a real user UUID (not a placeholder)

**`src/components/game/PlayerList.tsx`** (game mode player list)
- Wrap each player row in `<TappablePlayer>`

**`src/components/clubs/SeasonLeaderboard.tsx`**
- Wrap each standing row in `<TappablePlayer>`

**`src/components/clubs/PaymentLedger.tsx`**
- Wrap player names in settlements

**`src/pages/Friends.tsx`**
- Each friend row already navigable -- wrap in `<TappablePlayer>` for consistency

---

## What Does NOT Change
- Bottom navigation -- untouched
- Existing `PlayerProfileDrawer` component -- reused as-is
- Existing `PlayerSeat` click behavior at poker table -- untouched
- No database changes needed
- No edge function changes
- Styling, spacing, layout of all lists -- untouched (TappablePlayer is a transparent wrapper)
