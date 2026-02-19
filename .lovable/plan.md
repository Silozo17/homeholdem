
# Wire Up All Missing Push Notifications

## Current State

| Notification | Push Function | Push Called? | In-App Called? |
|---|---|---|---|
| Chat message | notifyNewChatMessage | Yes | Yes |
| Game started | notifyGameStarted | Yes | Yes |
| Game completed | notifyGameCompleted | Yes | Yes |
| Player eliminated | notifyPlayerEliminated | Yes | Yes |
| Rebuy/add-on | notifyRebuyAddon | Yes | Yes |
| Host confirmed | notifyHostConfirmed | Yes | Yes |
| Waitlist promotion | notifyWaitlistPromotion | Yes | Yes |
| Event unlocked | notifyEventUnlocked | Yes | Yes |
| New event available | notifyNewEventAvailable | Yes | Yes |
| Poker invite | notifyPokerInvite | Yes | No (push only) |
| Broadcast | sendBroadcastPush | Yes | Yes |
| **Date finalized** | notifyDateFinalized | **NO** | Yes (in-app only) |
| **RSVP received** | notifyEventRsvp | **NO** | Yes (in-app only) |
| **Blinds up** | notifyBlindsUp | **NO** | **NO** |
| **Friend request** | -- | **NO** | **NO** |
| **Friend accepted** | -- | **NO** | **NO** |
| **Direct message** | -- | **NO** | **NO** |
| **New member joins club** | -- | **NO** | **NO** |

---

## Plan: 7 notifications to add

### 1. Wire up `notifyDateFinalized` (push)
**File:** `src/pages/EventDetail.tsx` (around line 790)
- After calling `notifyDateFinalizedInApp(...)`, add a parallel call to `notifyDateFinalized(userIds, event.title, event.id, formattedDate)`
- Import `notifyDateFinalized` from push-notifications (already partially imported)

### 2. Wire up `notifyEventRsvp` (push)
**File:** `src/pages/EventDetail.tsx` (around line 562)
- After calling `notifyEventRsvpInApp(...)`, add a parallel call to `notifyEventRsvp(event.created_by, event.title, playerName, event.id)`
- Import `notifyEventRsvp` from push-notifications

### 3. Wire up `notifyBlindsUp` (push + in-app)
**File:** `src/components/game/TournamentClock.tsx`
- When blinds advance to a new level, call both `notifyBlindsUp(memberIds, smallBlind, bigBlind, ante)` and `notifyBlindsUpInApp(memberIds, smallBlind, bigBlind, ante)`
- Need to find the blind level change handler and add the calls there
- Import both functions

### 4. Friend request sent (push + in-app -- new functions)
**File:** `src/lib/push-notifications.ts` -- add `notifyFriendRequest()`
**File:** `src/lib/in-app-notifications.ts` -- add `notifyFriendRequestInApp()`
**File:** `src/hooks/useFriendship.ts` -- call both when a friend request is sent
- Title: "Friend Request"
- Body: "{senderName} wants to be your friend"
- URL: `/friends`

### 5. Friend request accepted (push + in-app -- new functions)
**File:** `src/lib/push-notifications.ts` -- add `notifyFriendAccepted()`
**File:** `src/lib/in-app-notifications.ts` -- add `notifyFriendAcceptedInApp()`
**File:** `src/hooks/useFriendship.ts` -- call both when accepting a request
- Title: "Friend Added"
- Body: "{accepterName} accepted your friend request"
- URL: `/friends`

### 6. Direct message received (push + in-app -- new functions)
**File:** `src/lib/push-notifications.ts` -- add `notifyDirectMessage()`
**File:** `src/lib/in-app-notifications.ts` -- add `notifyDirectMessageInApp()`
**File:** `src/hooks/useDirectMessages.ts` -- call both when sending a DM (notify the receiver)
- Title: "{senderName}"
- Body: "Sent you a message"
- URL: `/inbox`
- Tag: `dm-{senderId}` (so multiple DMs from the same person replace each other)

### 7. New member joins club (push + in-app -- new functions)
**File:** `src/lib/push-notifications.ts` -- add `notifyNewMemberJoined()`
**File:** `src/lib/in-app-notifications.ts` -- add `notifyNewMemberJoinedInApp()`
**File:** `src/components/clubs/JoinClubDialog.tsx` -- after successfully joining, notify the club owner/admins
- Title: "New Member"
- Body: "{memberName} joined your club"
- URL: `/club/{clubId}`
- Only sent to owner and admins, not all members

---

## User preferences

The existing preference system (`push_${notification_type}` columns on `user_preferences`) already handles opt-in/out for push delivery. New notification types (friend requests, DMs, new member) will need new preference columns added via a database migration:
- `push_friend_requests` (default true)
- `push_direct_messages` (default true)
- `push_new_member` (default true)

The `send-push-notification` edge function dynamically checks the column name, so no edge function changes are needed -- just the new DB columns and the matching `notificationType` string in each call.

---

## Files changed summary

| File | Change |
|---|---|
| `src/pages/EventDetail.tsx` | Add push calls for date finalized + RSVP |
| `src/components/game/TournamentClock.tsx` | Add blinds-up push + in-app calls |
| `src/hooks/useFriendship.ts` | Add friend request + accepted notifications |
| `src/hooks/useDirectMessages.ts` | Add DM received notification |
| `src/components/clubs/JoinClubDialog.tsx` | Add new member joined notification |
| `src/lib/push-notifications.ts` | Add 4 new functions (friend request, friend accepted, DM, new member) |
| `src/lib/in-app-notifications.ts` | Add 4 new in-app functions + wire blinds-up |
| Database migration | Add 3 new preference columns |

## What does NOT change
- Bottom navigation
- No edge function changes
- No UI layout or styling changes
- Existing notification functions remain untouched
