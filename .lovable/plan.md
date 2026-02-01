
# Plan: Club Owner Broadcast Notifications

## Overview

Add a feature that allows club owners to send broadcast push and in-app notifications to all club members. This will be accessible from the club detail page, giving owners a simple way to communicate important announcements to their poker group.

---

## Feature Scope

| Capability | Description |
|------------|-------------|
| Target audience | All club members (excluding the sender) |
| Notification types | Push notification + In-app notification |
| Access control | Owner only (not admins) |
| Message customization | Custom title and message body |
| Character limits | Title: 50 chars, Body: 280 chars |

---

## User Interface

### Location
The broadcast feature will be added to the **Settings tab** on the club detail page, visible only to club owners. It will appear as a new collapsible section with a "megaphone" icon.

### UI Components

1. **Collapsible Section** - "Broadcast Message" with Megaphone icon
2. **Title Input** - Short title (max 50 chars)
3. **Message Textarea** - Body text (max 280 chars) with character counter
4. **Send Button** - With confirmation before sending
5. **Confirmation Dialog** - Shows member count and prevents accidental sends

---

## Files to Create

### 1. New Component: `BroadcastMessageDialog.tsx`

**Path:** `src/components/clubs/BroadcastMessageDialog.tsx`

A dialog component with:
- Text input for notification title
- Textarea for message body
- Character counters for both fields
- Confirmation step showing recipient count
- Loading state during send
- Success/error feedback

---

## Files to Modify

### 2. Update Notification Libraries

**File:** `src/lib/push-notifications.ts`

Add new function:
```typescript
export async function sendBroadcastPush(
  userIds: string[],
  title: string,
  body: string,
  clubId: string
) {
  return sendPushNotification({
    userIds,
    title,
    body,
    url: `/club/${clubId}`,
    tag: `broadcast-${clubId}-${Date.now()}`,
    notificationType: 'rsvp_updates', // Re-use existing type
  });
}
```

**File:** `src/lib/in-app-notifications.ts`

Add new notification type 'club_broadcast' and function:
```typescript
export async function sendBroadcastInApp(
  userIds: string[],
  title: string,
  body: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'club_broadcast',
    title,
    body,
    url: `/club/${clubId}`,
    clubId,
  });
}
```

### 3. Update Type Definition

**File:** `src/lib/in-app-notifications.ts`

Update the `CreateNotificationParams` type to include the new notification type:
```typescript
type: 'rsvp' | 'date_finalized' | ... | 'club_broadcast';
```

### 4. Integrate into Club Settings

**File:** `src/components/clubs/ClubSettings.tsx`

Add a new collapsible section at the bottom (before save button) that contains the broadcast dialog trigger:
- Only visible when `isAdmin` is true AND user role is 'owner'
- Requires passing `members` list and `clubId` as props

### 5. Update ClubDetail Page

**File:** `src/pages/ClubDetail.tsx`

Pass the members list and owner status to ClubSettings component so it can render the broadcast section.

### 6. Add Translations

**File:** `src/i18n/locales/en.json`

```json
{
  "club": {
    "broadcast": "Broadcast Message",
    "broadcast_description": "Send a notification to all club members",
    "broadcast_title": "Title",
    "broadcast_title_placeholder": "e.g., Important Update",
    "broadcast_message": "Message",
    "broadcast_message_placeholder": "Write your announcement...",
    "broadcast_send": "Send to All Members",
    "broadcast_confirm_title": "Send Broadcast?",
    "broadcast_confirm_description": "This will send a push notification and in-app message to {{count}} members.",
    "broadcast_sent": "Broadcast sent successfully",
    "broadcast_error": "Failed to send broadcast"
  }
}
```

**File:** `src/i18n/locales/pl.json`

Equivalent Polish translations.

---

## Technical Details

### Component Structure

```text
BroadcastMessageDialog
├── Dialog (from shadcn/ui)
│   ├── Trigger (Megaphone button)
│   └── Content
│       ├── Title Input (max 50 chars)
│       ├── Message Textarea (max 280 chars)
│       ├── Character counters
│       └── Footer
│           ├── Cancel button
│           └── Send button → Opens confirmation
├── Confirmation AlertDialog
│   ├── Shows member count
│   └── Confirm/Cancel actions
└── Toast feedback on success/error
```

### Send Logic

```typescript
async function handleSend() {
  // Get all member IDs except current user
  const recipientIds = members
    .filter(m => m.user_id !== currentUserId)
    .map(m => m.user_id);

  if (recipientIds.length === 0) return;

  // Send both push and in-app notifications
  await Promise.all([
    sendBroadcastPush(recipientIds, title, message, clubId),
    sendBroadcastInApp(recipientIds, title, message, clubId),
  ]);
}
```

### Props for BroadcastMessageDialog

```typescript
interface BroadcastMessageDialogProps {
  clubId: string;
  clubName: string;
  members: Array<{ user_id: string; role: string }>;
  currentUserId: string;
}
```

---

## User Flow

```text
1. Owner opens Club → Settings tab
2. Expands "Broadcast Message" section
3. Enters title (max 50 chars)
4. Enters message (max 280 chars)
5. Clicks "Send to All Members"
6. Sees confirmation: "Send to 8 members?"
7. Confirms → notifications sent
8. Success toast appears
9. Form resets
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| Title | Required, 1-50 characters |
| Message | Required, 1-280 characters |
| Recipients | At least 1 other member |

---

## Access Control

- **Owner only**: The broadcast feature is restricted to club owners
- Admins cannot send broadcasts (they handle day-to-day operations; announcements are owner responsibility)
- This is enforced in the UI by conditionally rendering the component

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No other members | Show disabled state with "No members to notify" |
| Send fails | Show error toast, keep form data |
| User navigates away mid-send | Promise continues, no issue |
| Very long club name | Title is independent, no truncation needed |

---

## Implementation Order

1. Add translations to both locale files
2. Create `BroadcastMessageDialog` component
3. Add helper functions to `push-notifications.ts` and `in-app-notifications.ts`
4. Update `ClubSettings.tsx` to include broadcast section
5. Update `ClubDetail.tsx` to pass required props
6. Test end-to-end flow

---

## No Database Changes Required

The feature uses existing infrastructure:
- `notifications` table for in-app notifications
- `push_subscriptions` table for push delivery
- `sendPushNotification` edge function already handles bulk sends
- No new tables or columns needed
