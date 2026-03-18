

# Fix: Waitlist Auto-Promotion Should Fill All Open Spots

## Problem

`promoteFromWaitlist()` only promotes **one** user per call. If 3 people leave "going", only 1 waitlisted user gets promoted — the remaining 2 spots stay empty with waitlisted users sitting idle.

The function also only runs for admins on page load or when the current user switches from going to not_going. It should promote in a loop until all open spots are filled.

## Fix (1 file)

### `src/pages/EventDetail.tsx` — `promoteFromWaitlist` function (lines 226-271)

Change the function to **loop** and promote users one-by-one until capacity