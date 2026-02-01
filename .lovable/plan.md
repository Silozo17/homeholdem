

# Plan: Add Push Notifications for Chat Messages

## Overview
Currently, when a user sends a message in club or event chat, only **in-app notifications** are created. **Push notifications** are not being sent, even though the infrastructure exists. This means members won't receive alerts on their devices unless they're actively in the app.

## The Issue
In `ChatWindow.tsx`, the `sendChatNotifications` function only calls:
- `notifyNewChatMessageInApp()` - creates database notification entries

But it does NOT call:
- `notifyNewChatMessage()` - sends push notifications to devices

## Solution

### File: `src/components/chat/ChatWindow.tsx`

**Changes:**
1. Import the `notifyNewChatMessage` function from push-notifications
2. Update `sendChatNotifications` to also send push notifications alongside in-app notifications
3. Both notification types will be sent in parallel (fire-and-forget)

```text
+--------------------------------------+
|        User sends a message          |
+--------------------------------------+
                   |
                   v
+--------------------------------------+
|   Get other club members (excluding  |
|   the sender)                        |
+--------------------------------------+
                   |
                   v
+--------------------------------------+
|   Get sender's display name          |
+--------------------------------------+
                   |
    +--------------+--------------+
    |                             |
    v                             v
+------------------+    +------------------+
| In-App Notifs    |    | Push Notifs      |
| (notifyNewChat   |    | (notifyNewChat   |
| MessageInApp)    |    | Message)         |
+------------------+    +------------------+
```

### Technical Details

The push notification function already respects user preferences via the `push_chat_messages` preference column - the edge function filters out users who have disabled chat notifications.

### Code Changes

```typescript
// Add import
import { notifyNewChatMessage } from '@/lib/push-notifications';

// Update sendChatNotifications function
const sendChatNotifications = async () => {
  // ... existing throttle logic ...
  
  try {
    // Get other club members
    const { data: members } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId)
      .neq('user_id', user!.id);
    
    if (!members || members.length === 0) return;
    
    // Get sender name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user!.id)
      .single();
    
    const userIds = members.map(m => m.user_id);
    const senderName = profile?.display_name || 'Someone';
    
    // Send both in-app and push notifications in parallel
    await Promise.allSettled([
      notifyNewChatMessageInApp(userIds, senderName, clubId, user!.id, eventId),
      notifyNewChatMessage(userIds, senderName, clubId, eventId),
    ]);
  } catch (err) {
    console.error('Failed to send chat notifications:', err);
  }
};
```

## What This Enables

After this change, when someone sends a chat message:

| Notification Type | Where it appears | Respects Preference |
|-------------------|------------------|---------------------|
| In-app | Notification bell in app | Always shown |
| Push | Device notification | `push_chat_messages` |

## Existing Throttling

The 5-minute throttle remains in place to prevent notification spam during active conversations. This applies to both notification types.

