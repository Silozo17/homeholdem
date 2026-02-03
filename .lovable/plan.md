
# Plan: Add "Can't Go" Section to Attendees List

## Problem Analysis

The database shows that **Luty 2026** has:
- **10 Going** users (correctly displayed)
- **0 Waitlist** users (correctly hidden when empty)
- **0 Maybe** users (correctly hidden when empty)
- **3 Can't Go** users (Kadokyourdad, Kuba, BluffMeBaby) - **NOT DISPLAYED**

The `AttendeesList` component was designed to only show Going, Waitlist, and Maybe sections. The "Can't Go" (`not_going` status) section was never implemented.

## Solution

Add a "Can't Go" section to the AttendeesList component.

### Changes Required

| File | Changes |
|------|---------|
| `src/components/events/AttendeesList.tsx` | Add `notGoing` prop and render section |
| `src/pages/EventDetail.tsx` | Create `notGoingList` and pass to component |

---

## Technical Implementation

### 1. Update AttendeesList Component

**Add new prop to interface** (lines 18-23):
```typescript
interface AttendeesListProps {
  going: Attendee[];
  waitlist: Attendee[];
  maybe: Attendee[];
  notGoing: Attendee[];  // NEW
  capacity: number;
}
```

**Add new section after Maybe** (after line 111):
```typescript
{/* Can't Go */}
{notGoing.length > 0 && (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <X className="h-3 w-3" />
      {t('event.cant_go')} ({notGoing.length})
    </div>
    <div className="flex flex-wrap gap-2">
      {notGoing.map((attendee) => (
        <div
          key={attendee.user_id}
          className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-full"
        >
          <UserAvatar 
            name={attendee.profile.display_name} 
            avatarUrl={attendee.profile.avatar_url}
            size="xs"
          />
          <span className="text-sm text-muted-foreground">{attendee.profile.display_name}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

### 2. Update EventDetail.tsx

**Add notGoingList to memoized values** (lines 923-930):
```typescript
const { goingList, waitlist, maybeList, notGoingList, totalCapacity, isAdmin } = useMemo(() => ({
  goingList: rsvps.filter(r => r.status === 'going' && !r.is_waitlisted),
  waitlist: rsvps.filter(r => r.is_waitlisted).sort((a, b) => 
    (a.waitlist_position || 0) - (b.waitlist_position || 0)),
  maybeList: rsvps.filter(r => r.status === 'maybe'),
  notGoingList: rsvps.filter(r => r.status === 'not_going'),  // NEW
  totalCapacity: event ? event.max_tables * event.seats_per_table : 0,
  isAdmin: userRole === 'owner' || userRole === 'admin'
}), [rsvps, event, userRole]);
```

**Pass to AttendeesList** (lines 1175-1180):
```typescript
<AttendeesList 
  going={goingList}
  waitlist={waitlist}
  maybe={maybeList}
  notGoing={notGoingList}
  capacity={totalCapacity}
/>
```

---

## Visual Design

The "Can't Go" section will use:
- Red/destructive color scheme to indicate unavailability
- X icon consistent with the RSVP button
- Positioned after "Maybe" section
- Same pill-style layout as other sections

---

## Expected Result After Fix

The Attendees tab for Luty 2026 will show:
- ✅ **Going (10)**: Kryniu, Tomek, Breku, Matt R, Amir, Puchar, Mikołaj, Kris_Head_Hunter, Borys, Damian C
- **Waitlist (0)**: Hidden (empty)
- **Maybe (0)**: Hidden (empty)
- ❌ **Can't Go (3)**: Kadokyourdad, Kuba, BluffMeBaby
