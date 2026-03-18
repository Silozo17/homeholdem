

# Remove "Maybe" RSVP Option

## Summary
Remove the "Maybe" button from the RSVP system. Players can only choose "Going" or "Not Going".

## Changes

### 1. `src/components/events/RsvpButtons.tsx`
- Remove the entire "Maybe" button (middle column)
- Change grid from `grid-cols-3` to `grid-cols-2`
- Remove `'maybe'` from the type unions in the interface

### 2. `src/components/events/AttendeesList.tsx`
- Remove the `maybe` prop and the entire "Maybe" section rendering block
- Remove `HelpCircle` import
- Update the empty-state check to remove `maybe.length === 0`

### 3. `src/pages/EventDetail.tsx`
- Remove `maybeList` from the memoized computed values (~line 935)
- Remove `maybe={maybeList}` from the `<AttendeesList>` props (~line 1188)
- Remove `'maybe'` from the `handleRsvp` type signature (~line 475) and `userRsvp` state type (~line 113)
- Remove `'maybe'` from the `Rsvp` interface status union (~line 95)

### 4. `src/components/events/EventCard.tsx`
- Remove the `maybe_count` conditional rendering block (~lines 101-104)
- Remove `maybe_count` from the event interface (~line 19)

### 5. `src/pages/ClubDetail.tsx`
- Remove `maybe_count` from the event type and the computed value (~lines 98, 260)

### 6. `src/lib/email-templates.ts`
- Remove the `maybe` entry from the `rsvpConfirmationTemplate` config object (~line 146)

## Not Changed
- Database schema (the `maybe` enum value stays in the DB — harmless and avoids a migration)
- Bottom navigation, styles, layout, spacing
- Any other files or behaviour

