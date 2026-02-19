

# Player Profile Drawer, Friends System, and Private Messaging

## Overview

This plan adds three interconnected features:
1. **Player Profile Drawer** -- tap any player at the poker table to see their stats, send a message, or add as friend
2. **Friends List** -- add/accept/remove friends, with a dedicated UI on the Profile page
3. **Private Messaging (Inbox)** -- direct messages between players, accessible from a new Inbox page

---

## Database Changes (4 new tables)

### Table: `friendships`
Tracks friend relationships between users.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| requester_id | uuid | NOT NULL, references profiles(id) |
| addressee_id | uuid | NOT NULL, references profiles(id) |
| status | text | NOT NULL, default 'pending' ('pending', 'accepted', 'declined') |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| UNIQUE | (requester_id, addressee_id) | prevent duplicates |

RLS policies:
- SELECT: user can see rows where they are requester or addressee
- INSERT: requester_id = auth.uid()
- UPDATE: addressee_id = auth.uid() (only the receiver can accept/decline)
- DELETE: either party can remove the friendship

### Table: `direct_messages`
Stores private messages between two users.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| sender_id | uuid | NOT NULL, references profiles(id) |
| receiver_id | uuid | NOT NULL, references profiles(id) |
| message | text | NOT NULL |
| read_at | timestamptz | nullable |
| created_at | timestamptz | default now() |

RLS policies:
- SELECT: sender_id = auth.uid() OR receiver_id = auth.uid()
- INSERT: sender_id = auth.uid()
- UPDATE: receiver_id = auth.uid() (only receiver can mark as read)
- DELETE: sender_id = auth.uid() (only sender can delete their own)

Enable realtime on `direct_messages` for live message delivery:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
```

### Table: `conversations` (view/materialized helper -- optional, can compute client-side)
Not a table -- we will compute conversation threads client-side by grouping `direct_messages` by the other user's ID and taking the latest message. This keeps things simple.

---

## New Files

### 1. `src/components/poker/PlayerProfileDrawer.tsx`
A Sheet (sliding from the left) that opens when tapping an opponent at the poker table.

**Contents:**
- Player avatar, display name, country flag, level badge
- Quick stats: games played, wins, XP level (fetched from `profiles`, `player_xp`, `game_players`)
- Three action buttons:
  - **Send Message** -- opens inline message composer or navigates to inbox
  - **Add Friend / Pending / Friends** -- contextual button based on friendship status
  - **Kick** (if table creator, no active hand) -- existing kick functionality

**Data fetched on open:**
- Profile info from `profiles` table
- Player XP from `player_xp` table
- Game stats count from `game_players` table
- Friendship status from `friendships` table

### 2. `src/pages/Inbox.tsx`
Full inbox page with conversation list and message thread view.

**Layout:**
- Header with back button and "Messages" title
- List of conversations (grouped by other user), showing avatar, name, last message preview, unread indicator, timestamp
- Tapping a conversation opens the thread (inline, not a separate route)
- Thread view: scrollable message list + text input at bottom
- Real-time updates via Supabase realtime subscription on `direct_messages`

### 3. `src/pages/Friends.tsx`
Friends list page accessible from Profile.

**Layout:**
- Tabs: "Friends" | "Requests"
- Friends tab: list of accepted friends with avatar, name, level, "Message" and "Remove" actions
- Requests tab: incoming friend requests with "Accept" and "Decline" buttons
- Outgoing pending requests shown with "Cancel" option

### 4. `src/hooks/useFriendship.ts`
Hook to manage friendship state between two users.

**Methods:**
- `sendRequest(targetUserId)` -- INSERT into friendships
- `acceptRequest(friendshipId)` -- UPDATE status to 'accepted'
- `declineRequest(friendshipId)` -- UPDATE status to 'declined'
- `removeFriend(friendshipId)` -- DELETE row
- `getFriendshipStatus(targetUserId)` -- returns 'none' | 'pending_sent' | 'pending_received' | 'accepted'

### 5. `src/hooks/useDirectMessages.ts`
Hook for direct messaging.

**Methods:**
- `sendMessage(receiverId, text)` -- INSERT into direct_messages
- `getConversations()` -- fetch all DMs grouped by other user, with latest message
- `getThread(otherUserId)` -- fetch all messages between current user and target
- `markAsRead(messageId)` -- UPDATE read_at
- `unreadCount` -- count of unread messages (for badge display)

Includes a realtime subscription for live message delivery.

---

## Modified Files

### `src/components/poker/OnlinePokerTable.tsx`
- Add state: `selectedPlayer` (player_id string or null)
- Wrap each non-hero `PlayerSeat` inside `SeatAnchor` with an `onClick` handler that sets `selectedPlayer`
- Render `PlayerProfileDrawer` when `selectedPlayer` is set
- Import and use the new drawer component

### `src/components/poker/PlayerSeat.tsx`
- Add optional `onClick` prop to the component
- Attach it to the root div so the entire seat area is tappable

### `src/App.tsx`
- Add routes: `/inbox` and `/friends`

### `src/components/layout/BottomNav.tsx`
- **Not changed** (per instructions). Inbox and Friends are accessed from Profile page links.

### `src/pages/Profile.tsx`
- Add two new navigation buttons (between "View Full Stats" and "Achievements"):
  - "Messages" with unread badge count
  - "Friends" with friend count

---

## Flow Summary

```text
Poker Table
  |-- tap opponent avatar
  |-- PlayerProfileDrawer slides from left
      |-- View stats (name, level, country, games, wins)
      |-- [Add Friend] / [Pending] / [Friends]
      |-- [Send Message] --> navigates to /inbox?user=<id>
      |-- [Kick] (if creator)

Profile Page
  |-- [Messages (3)] --> /inbox
  |-- [Friends (12)] --> /friends

/inbox
  |-- conversation list
  |-- tap conversation --> thread view
  |-- compose new message

/friends
  |-- Friends tab (list of accepted friends)
  |-- Requests tab (pending incoming/outgoing)
```

---

## What Does NOT Change
- Bottom navigation -- untouched
- Existing chat system (club chat, event chat) -- untouched
- PlayerSeat styling, layout, animations -- untouched (only adds onClick prop)
- No changes to any edge functions
- No changes to existing tables

