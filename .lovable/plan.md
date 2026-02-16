

# 1. Invite Club Members to Poker Game + 2. Fix /poker Hub Viewport

## What This Delivers

**Feature 1 — Invite Friends to Poker**
A new "Invite Players" button on the Online Poker Lobby (and after creating a table). Tapping it opens a modal listing your club members. Each member has an "Invite" button that sends a push notification instantly, inviting them to join your table.

**Feature 2 — /poker Hub Fits in Viewport**
The Poker Hub page (`/poker`) currently scrolls because of spacing and the CardFan hero taking too much vertical space. The fix makes everything fit within `100dvh` on both mobile and desktop with no scroll.

---

## Technical Plan

### Fix 1: /poker Hub — No Scroll (PokerHub.tsx)

- Remove `pb-24` padding and reduce `space-y-6` to `space-y-3`
- Shrink the CardFan hero section (reduce from `h-32` to `h-20`, or hide it entirely on small screens)
- Change the outer container from `min-h-[100dvh]` to `h-[100dvh] overflow-hidden`
- Make the game mode cards area `flex-1 overflow-hidden` and use `justify-center` so they're centered vertically
- Reduce GameModeCard padding from `p-5` to `p-4` and shrink spacing

### Fix 2: Invite Club Members Modal

**New component: `src/components/poker/InvitePlayersDialog.tsx`**

A dialog that:
- Accepts `clubId` (optional) and `tableId` props
- If `clubId` is provided, fetches club members via `get_club_member_profiles` RPC
- If no `clubId`, fetches the user's clubs, then their members
- Displays each member with their avatar, name, and an "Invite" button
- On "Invite" tap: calls `sendPushNotification` with a poker game invite notification type
- Shows a checkmark after sending (per-member loading state)
- Filters out the current user from the list

**Push notification helper: `src/lib/push-notifications.ts`**

Add a new convenience function:

```
notifyPokerInvite(userId, inviterName, tableName, tableId)
```

This sends a push notification with:
- Title: "Poker Invite"
- Body: "{inviterName} invited you to play at {tableName}"
- URL: `/online-poker?table={tableId}`
- Tag: `poker-invite-{tableId}`

**Integration points:**

1. `OnlinePokerLobby.tsx` — After creating a table, show the invite dialog (if user has clubs). Also add an "Invite Friends" button in the action row.
2. `OnlinePokerTable.tsx` — Add an "Invite" button in the table header/menu that opens the same dialog.

### Files to Create
- `src/components/poker/InvitePlayersDialog.tsx`

### Files to Modify
- `src/pages/PokerHub.tsx` — Remove scroll, fit in viewport
- `src/components/poker/CardFan.tsx` — Add optional `compact` prop to reduce height
- `src/components/poker/GameModeCard.tsx` — Add optional `compact` prop for tighter padding
- `src/lib/push-notifications.ts` — Add `notifyPokerInvite` function
- `src/components/poker/OnlinePokerLobby.tsx` — Add "Invite Friends" button + dialog integration
- `src/components/poker/OnlinePokerTable.tsx` — Add invite button in header menu

