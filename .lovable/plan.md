
# Fix: Disconnected Players Persist on Table Indefinitely

## Root Cause

The `poker-check-timeouts` edge function already has logic to:
1. Mark stale-heartbeat players as "disconnected" (if mid-hand)
2. Delete stale-heartbeat players entirely (if no active hand)
3. Auto-kick players with 2+ consecutive timeouts

**But `poker-check-timeouts` is NOT on a cron job.** Only `process-pending-notifications` runs on cron. The timeout checker is only triggered by individual player pings (`poker-timeout-ping`), which requires another player at the table to invoke it. If all remaining players are also inactive or nobody triggers it, disconnected players sit there forever.

**Evidence:** Right now there are two stale players on table `b9eb7f44` -- one disconnected since 20:38, one "active" since 20:54 -- both with heartbeats well past the 90-second threshold, still occupying seats.

## Fix

### 1. Add cron job to call `poker-check-timeouts` every minute

Run the following SQL (via the SQL tool, not migration) to schedule `poker-check-timeouts` on a 1-minute cron, matching how `process-pending-notifications` is already scheduled:

```sql
SELECT cron.schedule(
  'poker-check-timeouts-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://kmsthmtbvuxmpjzmwybj.supabase.co/functions/v1/poker-check-timeouts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

This ensures the stale-heartbeat sweep (Section 4 of the function) runs automatically every minute, cleaning up disconnected ghosts.

### 2. Add a second-tier cleanup: force-remove "disconnected" players after 3 minutes

Currently, Section 4 marks mid-hand players as "disconnected" but only removes them when there's no active hand. If the table is stuck in "waiting" with a disconnected player, it should get deleted. But if a hand keeps running, the disconnected player stays forever.

**Add new Section 5 in `poker-check-timeouts`** (after Section 4, before the return):

- Query all seats with `status = 'disconnected'` AND `last_heartbeat < NOW() - 3 minutes`
- For each: delete the seat row entirely (force-remove from table)
- Broadcast a `seat_change` event so all clients update

This provides the two-tier system:
- **Tier 1 (90 seconds):** Player marked "disconnected" (grey avatar, can't act)
- **Tier 2 (3 minutes):** Player fully removed from seat

### 3. Cleanup currently stuck players

Run a one-time query to clean up the two stale players currently stuck on the table.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/poker-check-timeouts/index.ts` | Add Section 5: force-remove disconnected seats older than 3 minutes |
| SQL (via insert tool) | Add cron job for `poker-check-timeouts` every minute |

## What Does NOT Change
- Heartbeat interval (30s) -- untouched
- Heartbeat edge function -- untouched
- Client-side code -- untouched
- Seat positions, dealer, bottom nav -- untouched
- No layout or styling changes
