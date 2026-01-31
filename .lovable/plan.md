

## Plan: Comprehensive Notification System Overhaul

### Overview
This plan addresses three major areas:
1. **Fix Push Notifications**: The current implementation is broken - it sends plain HTTP POST requests without VAPID authentication (Web Push requires encrypted payloads)
2. **Add New Notification Triggers**: Game completion, event unlock, voting, RSVPs for ALL club members
3. **Implement 3-Minute Notification Delay**: For RSVP/voting actions to prevent accidental notification spam

---

### Part 1: Fix Push Notifications (Critical Bug)

#### Problem Identified
The current `send-push-notification/index.ts` edge function is **broken**. It:
- Sends a plain `fetch()` POST to the push endpoint without VAPID authentication headers
- Does NOT encrypt the payload (Web Push Protocol RFC 8291 requires encrypted payloads)
- VAPID keys are loaded but never used

This is why users aren't receiving push notifications despite having subscriptions stored in the database.

#### Solution
Use the `@negrel/webpush` library for Deno which properly handles:
- VAPID authentication (JWT signing)
- Payload encryption (RFC 8291)
- Proper HTTP headers (Authorization, TTL, Content-Encoding)

**File: `supabase/functions/send-push-notification/index.ts`**

Replace the broken implementation with:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  type PushSubscription,
} from "jsr:@negrel/webpush@0.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VITE_VAPID_PUBLIC_KEY")!;

// Initialize VAPID application server
const appServer = await ApplicationServer.new({
  contactInformation: "mailto:support@homeholdem.com",
  vapidKeys: {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY,
  },
});

async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: object
): Promise<boolean> {
  try {
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    const subscriber = appServer.subscribe(pushSubscription);
    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    return true;
  } catch (error) {
    console.error("Failed to send push:", error);
    return false;
  }
}

// ... rest of the handler remains similar
```

---

### Part 2: Database Changes

#### 2a. Add `pending_notifications` Table for Delayed Notifications

```sql
CREATE TABLE public.pending_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL, -- 'rsvp', 'vote', 'dropout', 'waitlist_promotion'
  action TEXT NOT NULL, -- 'going', 'maybe', 'not_going', 'voted', 'waitlist_to_going'
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actor_name TEXT NOT NULL,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL, -- When to send (created_at + 3 minutes)
  superseded_by UUID REFERENCES public.pending_notifications(id) ON DELETE SET NULL,
  is_processed BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_notifications_scheduled 
  ON pending_notifications(scheduled_for) 
  WHERE is_processed = FALSE;

CREATE INDEX idx_pending_notifications_actor 
  ON pending_notifications(actor_id, event_id, type);

ALTER TABLE public.pending_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only"
ON public.pending_notifications
FOR ALL
USING (false);
```

#### 2b. Add New Notification Type Preferences

```sql
-- Add new push notification preference columns
ALTER TABLE public.user_preferences
ADD COLUMN push_game_completed BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN push_event_unlocked BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN push_member_rsvp BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN push_member_vote BOOLEAN NOT NULL DEFAULT TRUE;

-- Add new notification types to existing enum (if applicable)
COMMENT ON COLUMN user_preferences.push_game_completed IS 'Notify when a game is finalized with winners';
COMMENT ON COLUMN user_preferences.push_event_unlocked IS 'Notify when an event is unlocked for voting';
COMMENT ON COLUMN user_preferences.push_member_rsvp IS 'Notify when club members RSVP to events';
COMMENT ON COLUMN user_preferences.push_member_vote IS 'Notify when club members vote on dates';
```

---

### Part 3: New Edge Function for Processing Delayed Notifications

**File: `supabase/functions/process-pending-notifications/index.ts`**

This function runs on a schedule (every minute via Supabase Cron) to:
1. Find pending notifications where `scheduled_for <= now()` and `is_processed = FALSE` and `superseded_by IS NULL`
2. Group notifications by club/event to batch into single messages (e.g., "3 members RSVPed going")
3. Send push + in-app notifications to all club members
4. Mark as processed

```typescript
// Key logic:
// 1. Query pending notifications ready to send
const { data: pending } = await supabase
  .from('pending_notifications')
  .select('*')
  .lte('scheduled_for', new Date().toISOString())
  .eq('is_processed', false)
  .is('superseded_by', null);

// 2. Group by event + type
const grouped = groupBy(pending, n => `${n.event_id}-${n.type}`);

// 3. For each group, create summary notification
for (const [key, notifications] of Object.entries(grouped)) {
  const actors = notifications.map(n => n.actor_name);
  const title = buildTitle(notifications[0].type, actors.length);
  const body = buildBody(notifications);
  
  // Get all club members except actors
  const memberIds = await getClubMembers(notifications[0].club_id);
  const recipientIds = memberIds.filter(id => !actorIds.includes(id));
  
  // Send notifications
  await sendPushAndInApp(recipientIds, title, body, eventUrl);
  
  // Mark as processed
  await markAsProcessed(notifications.map(n => n.id));
}
```

---

### Part 4: Frontend Changes - Queue Delayed Notifications

#### 4a. Create New Helper: `src/lib/delayed-notifications.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";

const DELAY_MINUTES = 3;

interface QueueNotificationParams {
  userId: string;
  clubId: string;
  eventId: string;
  type: 'rsvp' | 'vote' | 'dropout';
  action: string;
  actorId: string;
  actorName: string;
}

/**
 * Queue a notification to be sent after 3 minutes.
 * If the user changes their action within 3 minutes, the old notification is superseded.
 */
export async function queueDelayedNotification({
  userId,
  clubId,
  eventId,
  type,
  action,
  actorId,
  actorName,
}: QueueNotificationParams) {
  const scheduledFor = new Date(Date.now() + DELAY_MINUTES * 60 * 1000).toISOString();
  
  // Find any existing pending notification from this actor for this event/type
  const { data: existing } = await supabase
    .from('pending_notifications')
    .select('id')
    .eq('actor_id', actorId)
    .eq('event_id', eventId)
    .eq('type', type)
    .eq('is_processed', false)
    .is('superseded_by', null)
    .maybeSingle();
  
  // Insert new notification
  const { data: newNotification, error } = await supabase
    .from('pending_notifications')
    .insert({
      user_id: userId,
      club_id: clubId,
      event_id: eventId,
      type,
      action,
      actor_id: actorId,
      actor_name: actorName,
      scheduled_for: scheduledFor,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Failed to queue notification:', error);
    return;
  }
  
  // If there was an existing pending notification, supersede it
  if (existing) {
    await supabase
      .from('pending_notifications')
      .update({ superseded_by: newNotification.id })
      .eq('id', existing.id);
  }
}
```

#### 4b. Update `src/pages/EventDetail.tsx` - Add Delayed RSVP Notifications

In `handleRsvp`, after successful DB update:

```typescript
// Queue delayed notification for all club members (except self)
queueDelayedNotification({
  userId: user.id,
  clubId: event.club_id,
  eventId: event.id,
  type: 'rsvp',
  action: status,
  actorId: user.id,
  actorName: userProfile.display_name,
}).catch(console.error);
```

#### 4c. Update `src/pages/EventDetail.tsx` - Add Delayed Vote Notifications

In `handleVote`, after successful DB update:

```typescript
// Queue delayed notification for voting
queueDelayedNotification({
  userId: user.id,
  clubId: event.club_id,
  eventId: event.id,
  type: 'vote',
  action: wasVoted ? 'removed' : 'added',
  actorId: user.id,
  actorName: userProfile?.display_name || 'Someone',
}).catch(console.error);
```

---

### Part 5: Game Completion Notifications

#### 5a. Update `src/lib/game-finalization.ts`

After marking session as completed, add notifications:

```typescript
// At the end of finalizeGame(), after updating session status:

// 1. Get event and club details
const { data: session } = await supabase
  .from('game_sessions')
  .select('event_id')
  .eq('id', sessionId)
  .single();

const { data: event } = await supabase
  .from('events')
  .select('title, club_id')
  .eq('id', session.event_id)
  .single();

// 2. Get winners (position 1, 2, 3)
const winners = players
  .filter(p => p.finish_position && p.finish_position <= 3)
  .sort((a, b) => (a.finish_position || 99) - (b.finish_position || 99));

// 3. Get all club members
const { data: members } = await supabase
  .from('club_members')
  .select('user_id')
  .eq('club_id', clubId);

const memberIds = members?.map(m => m.user_id) || [];

// 4. Build notification content
const winnerNames = winners.map(w => w.display_name);
const title = 'Game Complete';
const body = winnerNames.length > 0
  ? `Winner: ${winnerNames[0]}${winnerNames.length > 1 ? ` | 2nd: ${winnerNames[1]}` : ''}${winnerNames.length > 2 ? ` | 3rd: ${winnerNames[2]}` : ''}`
  : 'Tournament finished!';

// 5. Send push notifications
await sendPushNotification({
  userIds: memberIds,
  title,
  body,
  url: `/club/${clubId}`,
  tag: `game-complete-${sessionId}`,
  notificationType: 'game_completed',
});

// 6. Send in-app notifications
await createBulkNotifications(memberIds, {
  type: 'game_completed',
  title,
  body,
  url: `/club/${clubId}`,
  clubId,
  eventId: session.event_id,
});

// 7. Check if there's a next event to notify about
const { data: nextEvent } = await supabase
  .from('events')
  .select('id, title')
  .eq('club_id', clubId)
  .gt('created_at', event.created_at)
  .order('created_at', { ascending: true })
  .limit(1)
  .single();

if (nextEvent) {
  await sendPushNotification({
    userIds: memberIds,
    title: 'New Event Available',
    body: `Voting is now open for ${nextEvent.title}`,
    url: `/event/${nextEvent.id}`,
    tag: `event-available-${nextEvent.id}`,
    notificationType: 'event_unlocked',
  });
  
  await createBulkNotifications(memberIds, {
    type: 'event_unlocked',
    title: 'New Event Available',
    body: `Voting is now open for ${nextEvent.title}`,
    url: `/event/${nextEvent.id}`,
    eventId: nextEvent.id,
    clubId,
  });
}
```

---

### Part 6: Event Unlock Notifications

#### 6a. Update `src/pages/ClubDetail.tsx` - handleUnlockEvent

After successfully unlocking an event:

```typescript
const handleUnlockEvent = async () => {
  if (!selectedLockedEvent) return;
  
  const { error } = await supabase
    .from('events')
    .update({ is_unlocked: true })
    .eq('id', selectedLockedEvent.id);
  
  if (!error) {
    toast.success(t('event.unlocked_success'));
    
    // Send notifications to all club members
    const { data: members } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId)
      .neq('user_id', user?.id);
    
    if (members && members.length > 0) {
      const memberIds = members.map(m => m.user_id);
      
      // Push notification
      sendPushNotification({
        userIds: memberIds,
        title: 'Event Unlocked',
        body: `Voting is now open for ${selectedLockedEvent.title}`,
        url: `/event/${selectedLockedEvent.id}`,
        tag: `event-unlocked-${selectedLockedEvent.id}`,
        notificationType: 'event_unlocked',
      }).catch(console.error);
      
      // In-app notification
      createBulkNotifications(memberIds, {
        type: 'event_unlocked',
        title: 'Event Unlocked',
        body: `Voting is now open for ${selectedLockedEvent.title}`,
        url: `/event/${selectedLockedEvent.id}`,
        eventId: selectedLockedEvent.id,
        clubId: clubId!,
      }).catch(console.error);
    }
    
    setUnlockConfirmOpen(false);
    setLockedEventDialogOpen(false);
    fetchClubData();
    navigate(`/event/${selectedLockedEvent.id}`);
  } else {
    toast.error(t('common.error'));
  }
};
```

---

### Part 7: Add New Notification Types

#### 7a. Update `src/lib/in-app-notifications.ts`

Add new types to the interface:

```typescript
type: 'rsvp' | 'date_finalized' | 'waitlist_promotion' | 'host_confirmed' | 
      'chat_message' | 'event_created' | 'club_invite' | 
      'game_completed' | 'event_unlocked' | 'member_rsvp' | 'member_vote';
```

Add new convenience functions:

```typescript
export async function notifyGameCompletedInApp(
  userIds: string[],
  winnerName: string,
  eventTitle: string,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'game_completed',
    title: 'Game Complete',
    body: `${winnerName} won ${eventTitle}!`,
    url: `/club/${clubId}`,
    eventId,
    clubId,
  });
}

export async function notifyEventUnlockedInApp(
  userIds: string[],
  eventTitle: string,
  eventId: string,
  clubId: string
) {
  return createBulkNotifications(userIds, {
    type: 'event_unlocked',
    title: 'Event Unlocked',
    body: `Voting is now open for ${eventTitle}`,
    url: `/event/${eventId}`,
    eventId,
    clubId,
  });
}
```

#### 7b. Update `src/lib/push-notifications.ts`

Add new notification type to the interface:

```typescript
notificationType?: 'rsvp_updates' | 'date_finalized' | 'waitlist_promotion' | 
                   'chat_messages' | 'blinds_up' | 'game_completed' | 
                   'event_unlocked' | 'member_rsvp' | 'member_vote';
```

Add convenience functions:

```typescript
export async function notifyGameCompleted(
  userIds: string[],
  winnerName: string,
  eventTitle: string,
  clubId: string
) {
  return sendPushNotification({
    userIds,
    title: 'Game Complete',
    body: `${winnerName} won ${eventTitle}!`,
    url: `/club/${clubId}`,
    tag: `game-completed`,
    notificationType: 'game_completed',
  });
}

export async function notifyEventUnlocked(
  userIds: string[],
  eventTitle: string,
  eventId: string
) {
  return sendPushNotification({
    userIds,
    title: 'Event Unlocked',
    body: `Voting is now open for ${eventTitle}`,
    url: `/event/${eventId}`,
    tag: `event-unlocked-${eventId}`,
    notificationType: 'event_unlocked',
  });
}
```

---

### Part 8: Translation Updates

**English (`src/i18n/locales/en.json`):**
```json
{
  "notifications": {
    "game_completed": "Game Complete",
    "winner_announcement": "{{winner}} won {{event}}!",
    "event_unlocked": "Event Unlocked",
    "voting_now_open": "Voting is now open for {{event}}",
    "new_event_available": "New Event Available",
    "member_rsvp": "{{count}} member(s) updated RSVP",
    "member_vote": "{{count}} member(s) voted on dates"
  }
}
```

**Polish (`src/i18n/locales/pl.json`):**
```json
{
  "notifications": {
    "game_completed": "Gra zakończona",
    "winner_announcement": "{{winner}} wygrał {{event}}!",
    "event_unlocked": "Wydarzenie odblokowane",
    "voting_now_open": "Głosowanie jest teraz otwarte dla {{event}}",
    "new_event_available": "Nowe wydarzenie dostępne",
    "member_rsvp": "{{count}} członek(ów) zaktualizowało RSVP",
    "member_vote": "{{count}} członek(ów) zagłosowało na daty"
  }
}
```

---

### Part 9: Cron Job Setup

Add to `supabase/config.toml`:

```toml
[functions.process-pending-notifications]
verify_jwt = false
```

Set up a Supabase Cron job to run every minute:
```sql
SELECT cron.schedule(
  'process-pending-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://kmsthmtbvuxmpjzmwybj.supabase.co/functions/v1/process-pending-notifications',
    headers:='{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

### Summary of Changes

| Category | Item | Description |
|----------|------|-------------|
| **Bug Fix** | Push notifications | Replace broken implementation with proper VAPID-authenticated web push using `@negrel/webpush` |
| **Database** | `pending_notifications` table | Queue for 3-minute delayed notifications |
| **Database** | New preference columns | `push_game_completed`, `push_event_unlocked`, `push_member_rsvp`, `push_member_vote` |
| **Edge Function** | `send-push-notification` | Complete rewrite with proper encryption |
| **Edge Function** | `process-pending-notifications` | New function to process delayed notifications |
| **Frontend** | `delayed-notifications.ts` | New helper to queue delayed notifications |
| **Frontend** | `EventDetail.tsx` | Add delayed notifications for RSVP/voting |
| **Frontend** | `ClubDetail.tsx` | Add unlock event notifications |
| **Frontend** | `game-finalization.ts` | Add game completion + next event notifications |
| **i18n** | Translation keys | New notification message translations |

---

### Implementation Order

1. Fix push notifications (critical bug)
2. Database migrations
3. Update push notification helper types
4. Create delayed notification system
5. Add game completion notifications
6. Add event unlock notifications
7. Update RSVP/voting with delayed notifications
8. Set up cron job
9. Test end-to-end

