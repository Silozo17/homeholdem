

# Fix Waitlist Auto-Promotion & Data Corrections

## Problem Analysis

The waitlist promotion logic (lines 580-641 in `EventDetail.tsx`) only triggers when the **current user** changes their own RSVP from "going" to "not going". It does NOT trigger when:
- An admin removes/changes someone's RSVP
- The page loads and there are open spots with waitlisted users
- The realtime handler fires from another client's RSVP change

This means if a going user changes status on **their** device, only **their** client runs the promotion. If they close the tab before it completes, or if the RSVP change happens through any other path, nobody gets promoted.

The "maybe" option was already removed in a previous change — no further work needed there.

## Plan

### 1. Add waitlist promotion check to `fetchRsvps` (EventDetail.tsx)
After fetching fresh RSVP data, automatically check if there are open "going" spots and waitlisted users that should be promoted. This ensures promotion happens:
- On page load
- When any realtime RSVP change is received
- After any client-side RSVP update

Extract the promotion logic into a reusable `promoteFromWaitlist()` function, then call it at the end of `fetchRsvps` (only for admins, to avoid multiple clients racing).

### 2. Also trigger promotion in the realtime handler
When the realtime subscription detects an RSVP change (line 200-203), after `fetchRsvps()` completes, run the promotion check. This handles the case where someone changes their RSVP on a different device.

### 3. Move "Kula" to last waitlist position (data operation)
Run a database query to find the user "Kula" in the waitlist and update their `waitlist_position` to be the last position.

## Technical Details

### File: `src/pages/EventDetail.tsx`

**New function `promoteFromWaitlist`** — extracted from lines 584-641:
- Queries current RSVPs from DB
- Compares going count vs capacity
- If under capacity and waitlisted users exist, promotes the first one
- Repositions remaining waitlist
- Sends notifications (email, push, in-app)
- Refetches RSVPs

**Modified `fetchRsvps`** — after setting state, call `promoteFromWaitlist()` if the current user is an admin (prevents multiple clients from racing).

**Modified `handleRsvp`** — replace inline promotion code with call to `promoteFromWaitlist()`.

### Data fix: Move Kula
Run a SQL query via the database migration tool to update Kula's waitlist position.

## Files Changed
1. `src/pages/EventDetail.tsx` — extract and broaden waitlist promotion logic

