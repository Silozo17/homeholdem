
I checked the current implementation and the main remaining gap is a load-time reconciliation race in `EventDetail.tsx`:

- `fetchRsvps()` only triggers promotion when `event` state is already populated.
- On first load, `event` can still be `null` right after `setEvent(eventData)`, so capacity is treated as `0` and promotion is skipped.
- That leaves the UI stuck showing open seats + waitlist until another RSVP event happens.

I’ll fix this with a deterministic reconciliation flow so waitlist always fills immediately when seats are free.

## Implementation Plan

1. Make waitlist reconciliation unconditional in `fetchRsvps`
- Refactor `promoteFromWaitlist()` to return promoted user IDs.
- In `fetchRsvps()`, call promotion RPC directly (not gated by `event` state/capacity in React).
- If any users were promoted, immediately re-fetch RSVPs and profiles and update local state.