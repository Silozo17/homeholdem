
# Plan: Fix Event Locking Bug and Clean March 2026 Data

## Problem Summary

The EventDetail page does **not check if an event is locked** before allowing voting and RSVP actions. Users can bypass the lock by directly navigating to a locked event's URL (e.g., `/event/march-event-id`).

The locking logic currently only exists in `ClubDetail.tsx` for display purposes - it shows a "Locked" badge on EventCards and shows a confirmation dialog when clicked. However, once inside EventDetail, there are no restrictions.

## What Needs to Change

### 1. Add Lock Check to EventDetail.tsx

The EventDetail page needs to:

1. Fetch the event's `is_unlocked` field (currently not included in the Event interface)
2. Calculate whether the event is locked by checking if the **previous event** is completed or its date has passed
3. Disable voting and RSVP controls when the event is locked
4. Show a visual indicator that the event is locked

### 2. Implementation Details

**Update Event Interface** (line 56-68):
Add `is_unlocked` field to the interface

**Update fetchEventData** (around line 260):
After fetching the event, also fetch the previous event to determine lock status:
- Get all events for this club ordered by creation date
- Find this event's position in the sequence
- Check if the previous event has `final_date` passed OR has a completed game session
- If neither condition is met and `is_unlocked` is false, the event is locked

**Disable Controls When Locked**:
- Hide or disable the DateVoting component
- Hide or disable the RsvpButtons component
- Show a "This event is locked" message explaining why

### 3. Database Cleanup

Delete Wuzet's vote on March 2026:
```sql
DELETE FROM event_date_votes 
WHERE id = 'b1bc165e-bc8a-4819-912f-68ca3f07bd9d';
```

No RSVPs exist for March 2026 (already clean).

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/EventDetail.tsx` | Add `is_unlocked` to Event interface, add lock calculation logic, conditionally disable voting/RSVP |
| `src/components/events/DateVoting.tsx` | Add `disabled` prop to prevent interactions |
| `src/components/events/RsvpButtons.tsx` | Add `disabled` prop to prevent interactions |
| Database | Delete invalid vote record |

### Lock Calculation Logic

```typescript
// After fetching the event, determine if it's locked
const calculateIsLocked = async (event: Event): Promise<boolean> => {
  // If manually unlocked, not locked
  if (event.is_unlocked) return false;
  
  // If finalized, not locked (date has been set)
  if (event.is_finalized) return false;
  
  // Fetch all events for this club
  const { data: allEvents } = await supabase
    .from('events')
    .select('id, final_date, is_finalized, is_unlocked, created_at')
    .eq('club_id', event.club_id)
    .order('created_at', { ascending: true });
  
  if (!allEvents) return false;
  
  // Find current event's position
  const eventIndex = allEvents.findIndex(e => e.id === event.id);
  if (eventIndex <= 0) return false; // First event, not locked
  
  // Get previous event
  const prevEvent = allEvents[eventIndex - 1];
  
  // If previous event's date has passed, not locked
  if (prevEvent.final_date && new Date(prevEvent.final_date) < new Date()) {
    return false;
  }
  
  // Check if previous event's game is completed
  const { data: prevSession } = await supabase
    .from('game_sessions')
    .select('status')
    .eq('event_id', prevEvent.id)
    .single();
  
  if (prevSession?.status === 'completed') {
    return false;
  }
  
  // Event is locked
  return true;
};
```

### UI When Locked

When an event is locked, the EventDetail page will:

1. Show a prominent "Event Locked" badge next to the title
2. Replace the DateVoting section with a message: "Voting will open once the previous event is complete"
3. Replace the RSVP buttons with a disabled state or message
4. Keep the event viewable (attendees list, chat) but not interactive for voting/RSVP

---

## Verification Steps

After implementation:
1. Navigate directly to a locked event URL and confirm voting/RSVP is disabled
2. Verify the "Event Locked" indicator is visible
3. Complete the previous event and confirm the next event unlocks automatically
4. Check that manually unlocking still works from ClubDetail
