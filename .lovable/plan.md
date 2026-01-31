
## Plan: Event Locking System Enhancement

### Overview
Implement a comprehensive event locking mechanism that prevents users from voting and RSVPing on future events until the current event is either completed, past its game date/time, or deleted. This includes a modal-based UI for locked events with special unlock capability for admins/owners.

---

### Part 1: Database Cleanup - Remove February 2026 Votes and RSVPs

**One-time data cleanup for Royal Poles club:**

```sql
-- Delete all votes for February 2026 event (event_id: 004fe7cf-b645-479e-9d2b-d3a978813986)
DELETE FROM event_date_votes 
WHERE date_option_id IN (
  SELECT id FROM event_date_options 
  WHERE event_id = '004fe7cf-b645-479e-9d2b-d3a978813986'
);

-- Delete all RSVPs for February 2026 event
DELETE FROM event_rsvps 
WHERE event_id = '004fe7cf-b645-479e-9d2b-d3a978813986';
```

---

### Part 2: Database Schema Change - Add `is_unlocked` Column

Add an optional unlock flag to the events table to allow admins to manually unlock future events:

```sql
ALTER TABLE public.events 
ADD COLUMN is_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.events.is_unlocked IS 
  'When true, this event is accessible for voting/RSVP even if previous events are incomplete';
```

---

### Part 3: Frontend Changes

#### 3a. Update ClubDetail.tsx - Locked Event Navigation

**Current behavior:** Clicking a locked event navigates directly to EventDetail.

**New behavior:** Clicking a locked event shows a modal:
- **For regular members:** "This event is locked. Complete or delete the previous event to unlock." with a single "Close" button.
- **For admins/owners:** Same message with two buttons: "Close" and "Unlock". Clicking "Unlock" shows a confirmation dialog.

```text
State additions:
- lockedEventDialogOpen: boolean
- selectedLockedEvent: { id, title, isAdmin } | null
- unlockConfirmOpen: boolean

New Dialog Flow:
┌─────────────────────────────────────────────┐
│  🔒 Event Locked                            │
├─────────────────────────────────────────────┤
│                                             │
│  "Luty 2026" is locked.                     │
│                                             │
│  Complete or delete the previous event      │
│  to unlock voting and RSVPs.                │
│                                             │
├─────────────────────────────────────────────┤
│  [Close]                    [Unlock] (admin)│
└─────────────────────────────────────────────┘

If admin clicks "Unlock":
┌─────────────────────────────────────────────┐
│  ⚠️ Confirm Unlock                          │
├─────────────────────────────────────────────┤
│                                             │
│  Are you sure you want to unlock this       │
│  event? All members will be able to         │
│  vote and RSVP immediately.                 │
│                                             │
├─────────────────────────────────────────────┤
│  [Cancel]                         [Confirm] │
└─────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// In ClubDetail.tsx

// New state
const [lockedEventDialogOpen, setLockedEventDialogOpen] = useState(false);
const [selectedLockedEvent, setSelectedLockedEvent] = useState<{
  id: string;
  title: string;
} | null>(null);
const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);

// Modified event click handler
const handleEventClick = (event: EventWithCounts, isLocked: boolean) => {
  if (isLocked && !event.is_unlocked) {
    setSelectedLockedEvent({ id: event.id, title: event.title });
    setLockedEventDialogOpen(true);
  } else {
    navigate(`/event/${event.id}`);
  }
};

// Unlock handler
const handleUnlockEvent = async () => {
  if (!selectedLockedEvent) return;
  
  const { error } = await supabase
    .from('events')
    .update({ is_unlocked: true })
    .eq('id', selectedLockedEvent.id);
  
  if (!error) {
    toast.success(t('event.unlocked_success'));
    setUnlockConfirmOpen(false);
    setLockedEventDialogOpen(false);
    navigate(`/event/${selectedLockedEvent.id}`);
  } else {
    toast.error(t('common.error'));
  }
};
```

#### 3b. Update Lock Detection Logic

Modify the `isEventLocked` function to also check:
1. If event has `is_unlocked = true` - not locked
2. If previous event's game session is completed - not locked
3. If previous event's `final_date` has passed (game date/time is in the past) - not locked
4. Otherwise - locked

```typescript
const isEventLocked = (eventId: string, events: EventWithCounts[]) => {
  if (currentEventIndex === -1) return false;
  
  const eventIndex = sortedUpcoming.findIndex(e => e.id === eventId);
  if (eventIndex <= currentEventIndex) return false;
  
  // Check if manually unlocked
  const event = events.find(e => e.id === eventId);
  if (event?.is_unlocked) return false;
  
  // Check if previous event's date has passed
  const prevEvent = sortedUpcoming[eventIndex - 1];
  if (prevEvent?.final_date && new Date(prevEvent.final_date) < new Date()) {
    return false;
  }
  
  return true;
};
```

#### 3c. Update EventDetail.tsx - Block Actions on Locked Events

Add lock detection at the EventDetail level to prevent voting/RSVP even if user navigates directly:

```typescript
// New state
const [isEventLocked, setIsEventLocked] = useState(false);
const [showLockedModal, setShowLockedModal] = useState(false);
const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);

// In fetchEventData, after getting event:
const checkIfLocked = async () => {
  // Skip if already unlocked
  if (eventData.is_unlocked) {
    setIsEventLocked(false);
    return;
  }

  // Fetch all club events to determine order
  const { data: allEvents } = await supabase
    .from('events')
    .select('id, created_at, final_date, is_unlocked')
    .eq('club_id', eventData.club_id)
    .order('created_at', { ascending: true });
  
  // Fetch game session statuses
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('event_id, status')
    .in('event_id', allEvents?.map(e => e.id) || []);
  
  const sessionMap = new Map(sessions?.map(s => [s.event_id, s.status]) || []);
  
  // Filter to upcoming/current events
  const today = new Date();
  const upcomingEvents = allEvents?.filter(e => 
    !e.final_date || new Date(e.final_date) >= today
  ) || [];
  
  // Find current active event (first incomplete)
  const currentIdx = upcomingEvents.findIndex(e => 
    sessionMap.get(e.id) !== 'completed'
  );
  
  // Check if this event is locked
  const thisIdx = upcomingEvents.findIndex(e => e.id === eventId);
  
  if (currentIdx !== -1 && thisIdx > currentIdx) {
    // Check if previous event's date has passed
    const prevEvent = upcomingEvents[thisIdx - 1];
    if (prevEvent?.final_date && new Date(prevEvent.final_date) < new Date()) {
      setIsEventLocked(false);
    } else {
      setIsEventLocked(true);
      setShowLockedModal(true);
    }
  }
};
```

**UI Changes when locked:**
- Show modal immediately on page load for locked events
- Disable RSVP buttons
- Disable date voting
- Show "Locked" badge instead of "Voting"
- Admins see "Unlock" button in the modal

#### 3d. Update EventCard.tsx - Add `is_unlocked` Check

Update the EventCard props to include `is_unlocked` and adjust display logic:

```typescript
interface EventCardProps {
  event: {
    // ... existing fields
    is_unlocked?: boolean;
  };
  onClick: () => void;
  isLocked?: boolean;
}

// In component:
const effectivelyLocked = isLocked && !event.is_unlocked;
```

---

### Part 4: Translation Updates

**English (`src/i18n/locales/en.json`):**
```json
{
  "event": {
    "event_locked_title": "Event Locked",
    "event_locked_description": "\"{{title}}\" is locked. Complete or delete the previous event to unlock voting and RSVPs.",
    "event_locked_member_hint": "Contact an admin if you need this event unlocked early.",
    "unlock_event": "Unlock",
    "unlock_confirm_title": "Confirm Unlock",
    "unlock_confirm_description": "Are you sure you want to unlock this event? All members will be able to vote and RSVP immediately.",
    "unlocked_success": "Event unlocked successfully",
    "event_locked_actions_disabled": "Voting and RSVPs are disabled until this event is unlocked"
  }
}
```

**Polish (`src/i18n/locales/pl.json`):**
```json
{
  "event": {
    "event_locked_title": "Wydarzenie zablokowane",
    "event_locked_description": "\"{{title}}\" jest zablokowane. Zakończ lub usuń poprzednie wydarzenie, aby odblokować głosowanie i rezerwacje.",
    "event_locked_member_hint": "Skontaktuj się z administratorem, jeśli potrzebujesz wcześniejszego odblokowania.",
    "unlock_event": "Odblokuj",
    "unlock_confirm_title": "Potwierdź odblokowanie",
    "unlock_confirm_description": "Czy na pewno chcesz odblokować to wydarzenie? Wszyscy członkowie będą mogli natychmiast głosować i rezerwować miejsca.",
    "unlocked_success": "Wydarzenie odblokowane pomyślnie",
    "event_locked_actions_disabled": "Głosowanie i rezerwacje są wyłączone do momentu odblokowania tego wydarzenia"
  }
}
```

---

### Part 5: Summary of Changes

| File | Change |
|------|--------|
| **Database** | Add `is_unlocked` column to `events` table |
| **Database** | One-time cleanup: delete Feb 2026 votes/RSVPs for Royal Poles |
| `src/pages/ClubDetail.tsx` | Add locked event dialog with admin unlock option |
| `src/pages/ClubDetail.tsx` | Update lock detection to check `is_unlocked` and past dates |
| `src/pages/EventDetail.tsx` | Add lock detection on page load |
| `src/pages/EventDetail.tsx` | Show locked modal for locked events |
| `src/pages/EventDetail.tsx` | Disable voting/RSVP when locked |
| `src/components/events/EventCard.tsx` | Support `is_unlocked` in display logic |
| `src/i18n/locales/en.json` | Add lock-related translation keys |
| `src/i18n/locales/pl.json` | Add Polish translations |

---

### Lock Conditions Summary

An event is **unlocked** (accessible) if ANY of these are true:
1. `is_unlocked = true` (manually unlocked by admin)
2. It's the first incomplete event in chronological order
3. All previous events have completed game sessions
4. The previous event's `final_date` has passed (game time is over)

An event is **locked** if:
1. It comes after an incomplete event in chronological order
2. The previous event's date hasn't passed yet
3. It hasn't been manually unlocked
