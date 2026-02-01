
# Plan: Fix Automatic Waitlist Promotion

## Problem Identified

When a user changes from "Going" to "Can't Go" or "Maybe":
- Their RSVP is updated in the database correctly
- **BUT** the first person on the waitlist is NOT automatically promoted to fill the open spot
- Matt R is still showing `is_waitlisted: true` even though only 9/10 spots are filled

**Database evidence:**
- Kuba: `status: not_going` (correctly updated)
- Matt R: `is_waitlisted: true, waitlist_position: 1` (should have been promoted)

## Root Cause

The `handleRsvp` function in `EventDetail.tsx` (lines 435-533) handles RSVP changes but has **no logic to promote waitlisted users** when a spot opens up.

---

## Solution

Add waitlist promotion logic to the `handleRsvp` function that triggers when:
1. A user changes FROM "going" (non-waitlisted) to another status
2. There are people on the waitlist

### Logic Flow

```text
User changes RSVP from "going" → "not_going"
         │
         ▼
Check: Was user "going" and NOT on waitlist?
         │ Yes
         ▼
Find first waitlisted user (lowest position)
         │ Found
         ▼
Update their record:
  - is_waitlisted: false
  - waitlist_position: null
         │
         ▼
Reposition remaining waitlist (decrement positions)
         │
         ▼
Call promote-waitlist edge function (sends email + in-app notification)
         │
         ▼
Send push notification
         │
         ▼
Refetch RSVPs to update UI
```

---

## Files to Modify

### 1. `src/pages/EventDetail.tsx`

After the database update in `handleRsvp`, add waitlist promotion logic:

```typescript
// After successful RSVP update, check if we need to promote from waitlist
if (previousRsvp === 'going' && status !== 'going') {
  // A "going" spot just opened up - check for waitlist
  const { data: existingRsvps } = await supabase
    .from('event_rsvps')
    .select('user_id, is_waitlisted, waitlist_position')
    .eq('event_id', event.id)
    .eq('status', 'going');

  const goingCount = existingRsvps?.filter(r => !r.is_waitlisted).length || 0;
  const totalCapacity = event.max_tables * event.seats_per_table;

  // If we're under capacity and there's someone waitlisted
  if (goingCount < totalCapacity) {
    const waitlistUsers = existingRsvps
      ?.filter(r => r.is_waitlisted)
      .sort((a, b) => (a.waitlist_position || 999) - (b.waitlist_position || 999));

    if (waitlistUsers && waitlistUsers.length > 0) {
      const promotedUser = waitlistUsers[0];

      // Promote the first waitlisted user
      await supabase
        .from('event_rsvps')
        .update({ 
          is_waitlisted: false, 
          waitlist_position: null 
        })
        .eq('event_id', event.id)
        .eq('user_id', promotedUser.user_id);

      // Reposition remaining waitlist
      for (let i = 1; i < waitlistUsers.length; i++) {
        await supabase
          .from('event_rsvps')
          .update({ waitlist_position: i })
          .eq('event_id', event.id)
          .eq('user_id', waitlistUsers[i].user_id);
      }

      // Call edge function to send email + in-app notification
      await supabase.functions.invoke('promote-waitlist', {
        body: { 
          event_id: event.id, 
          promoted_user_id: promotedUser.user_id 
        }
      });

      // Send push notification
      notifyWaitlistPromotion(
        promotedUser.user_id,
        event.title,
        event.id
      ).catch(console.error);
    }
  }

  // Always refetch to ensure UI is up-to-date
  await fetchRsvps();
}
```

---

## Immediate Data Fix

The current data for "Luty 2026" event needs a one-time fix to promote Matt R:

```sql
-- Promote Matt R from waitlist
UPDATE event_rsvps 
SET is_waitlisted = false, waitlist_position = null
WHERE event_id = '004fe7cf-b645-479e-9d2b-d3a978813986'
  AND user_id = '7e5a9aef-d68b-4bf8-aab4-137fbd170d60';
```

This will be done after the code fix is implemented.

---

## Additional Considerations

### Also Check When User Changes FROM Waitlist

If a waitlisted user changes to "not_going", the remaining waitlist positions should be decremented. This is a secondary edge case but should also be handled.

### Import Required Functions

Need to import `notifyWaitlistPromotion` from push-notifications:
```typescript
import { notifyWaitlistPromotion } from '@/lib/push-notifications';
```

---

## Testing After Implementation

1. Verify Matt R is promoted and visible in "Going" list
2. Test: Have a waitlisted user, then have a "going" user change to "not going"
3. Confirm the waitlisted user is automatically promoted
4. Confirm push notification is sent to promoted user
5. Confirm remaining waitlist positions are decremented
