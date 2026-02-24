

# Fix: Friend Request and DM Notifications

## Root Cause

The `notifications` table has an INSERT RLS policy called "Users can create club notifications" with this condition:

```
(sender_id = auth.uid())
AND ((club_id IS NOT NULL) OR (event_id IS NOT NULL))
AND ((club_id IS NULL) OR (is_club_member(...)))
AND ((event_id IS NULL) OR (is_event_club_member(...)))
```

The second clause -- `(club_id IS NOT NULL) OR (event_id IS NOT NULL)` -- blocks ALL friend request and DM notifications because those pass `null` for both `club_id` and `event_id`. The insert fails silently; no error is surfaced to the user.

Push notifications still work because `send-push-notification` runs server-side with the service role key, bypassing RLS entirely.

## Fix (1 change)

### Database migration: Update the notifications INSERT policy

Drop the existing policy and replace it with one that also permits "social" notifications (friend requests, friend accepted, DMs) where neither `club_id` nor `event_id` is required:

```sql
DROP POLICY "Users can create club notifications" ON public.notifications;

CREATE POLICY "Users can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Club/event notifications: sender and receiver must both be members
      (
        (club_id IS NOT NULL OR event_id IS NOT NULL)
        AND (club_id IS NULL OR (is_club_member(auth.uid(), club_id) AND is_club_member(user_id, club_id)))
        AND (event_id IS NULL OR (is_event_club_member(auth.uid(), event_id) AND is_event_club_member(user_id, event_id)))
      )
      -- Social notifications (friend requests, DMs): no club/event required
      OR (club_id IS NULL AND event_id IS NULL)
    )
  );
```

This preserves all existing club/event notification security while opening the door for social notifications that have no club or event context.

## What this does NOT change

- No code file changes -- `useFriendship.ts`, `useDirectMessages.ts`, and `in-app-notifications.ts` already call the correct notification helpers. They just fail silently at the database level today.
- No push notification changes -- those already work via the edge function.
- No UI changes -- `NotificationItem.tsx` already renders friend requests (type `club_invite` maps to the `UserPlus` icon) and DMs (type `chat_message` maps to `MessageCircle` icon) correctly.
- Bottom nav, layout, styles, and spacing are untouched.

## Technical Details

| Component | Status |
|---|---|
| `notifyFriendRequestInApp()` | Already called in `useFriendship.ts` line 107 -- blocked by RLS |
| `notifyFriendAcceptedInApp()` | Already called in `useFriendship.ts` line 120 -- blocked by RLS |
| `notifyDirectMessageInApp()` | Already called in `useDirectMessages.ts` line 133 -- blocked by RLS |
| `notifyFriendRequest()` (push) | Already works -- edge function bypasses RLS |
| `notifyFriendAccepted()` (push) | Already works -- edge function bypasses RLS |
| `notifyDirectMessage()` (push) | Already works -- edge function bypasses RLS |
| Realtime subscription in `useNotifications.ts` | Already listens for INSERT on notifications filtered by user_id -- will pick up new rows once RLS allows them |

## Verification

1. Send a friend request -- recipient sees in-app notification badge increment and "Friend Request" in the notification panel
2. Accept a friend request -- requester sees "Friend Added" in-app notification
3. Send a DM -- recipient sees in-app notification with sender name and "Sent you a message"
4. Tapping each notification navigates to `/friends` or `/inbox` respectively
5. Push notifications continue to work for all three scenarios

