
## Goal
Make waitlist promotion truly automatic and deterministic: whenever there are free seats, the top waitlisted players are immediately moved into **Going** until capacity is full.

## Confirmed root causes
1. **Promotion updates are executed from client-side code against other users’ RSVP rows**, but RLS only allows users to update their own RSVP. So promotions silently fail.
2. `promoteFromWaitlist()` uses `while(true)` **without error handling/break on failed updates**, which can loop and repeatedly trigger notifications.
3. Initial promotion check in `fetchRsvps()` can run with `event === null` (capacity becomes `0`), so open seats are skipped on first load.

## Implementation plan

### 1) Move promotion logic to backend (atomic + RLS-safe)
Create a migration with a `SECURITY DEFINER` function, e.g. `public.promote_event_waitlist(_event_id uuid)`, that:
- Acquires an advisory lock per event (prevents race conditions).
- Computes event capacity (`max_tables * seats_per_table`).
- Repeatedly promotes the first waitlisted RSVP (`status='going'`, `is_waitlisted=true`) until full or waitlist empty.
- Reindexes remaining waitlist positions to 1..N.
- Returns promoted user IDs/count.
- Verifies caller is authenticated and a club member for that event.

### 2) Refactor EventDetail to call backend function (no direct cross-user updates)
In `src/pages/EventDetail.tsx`:
- Replace current client-side row-update loop in `promoteFromWaitlist()` with an RPC call to the new backend function.
- Add an in-flight guard (`useRef`) so realtime bursts don’t trigger concurrent promotion calls.
- Keep current trigger points (after RSVP changes and during RSVP refresh), but now they call RPC safely.
- Fix initial-load race by using known event capacity (from fetched event data) instead of relying on stale `event` state.

### 3) Notification behavior (only after real promotions)
Still in `EventDetail.tsx`:
- Use RPC return value (`promoted_user_ids`) and only then call existing `promote-waitlist` notification flow for those users.
- This prevents spam and ensures notifications are sent only for actual successful promotions.

### 4) Immediate data correction for current broken event
After deploying migration/code:
- Run a one-time call to `promote_event_waitlist('8b00bfbb-5916-4a67-8ac3-e4da66223ac3')` so the current event instantly fills the two free seats from waitlist positions #1 and #2.
- Verify resulting counts become `10/10` with waitlist reduced accordingly.

## Files to change
- `supabase/migrations/<new_migration>.sql` (new RPC function + grants)
- `src/pages/EventDetail.tsx` (replace client loop with RPC flow + guards)

## Verification checklist
1. Reproduce scenario: event at 8/10 with waitlist > 0.
2. Confirm auto-promotion fills to 10/10 without manual refresh.
3. Change one Going user to Not Going; confirm waitlist #1 is auto-promoted immediately.
4. Change two Going users to Not Going; confirm top two waitlisted are promoted in order.
5. Confirm no runaway promotion loops and no duplicate promotion notifications.
