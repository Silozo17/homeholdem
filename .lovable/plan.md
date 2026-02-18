
# Heartbeat-Based Disconnect Detection

Detect when a player fully closes the app (not just minimizes) and remove them from the table after ~90 seconds of silence.

## How It Works

The client sends a lightweight "heartbeat" to the server every 30 seconds. The server records the timestamp. The existing `poker-check-timeouts` function (which already runs periodically) will check for seats where no heartbeat has been received in 90+ seconds and kick those players.

This 90-second window is intentional:
- Minimized apps on iOS/Android typically keep running for 30-60 seconds before being suspended.
- A closed app stops sending heartbeats immediately.
- So a closed app gets kicked after ~90s, while a briefly minimized app survives.

## Changes

### 1. Database: Add `last_heartbeat` column to `poker_seats`

Add a `last_heartbeat` timestamp column (default `now()`) to the `poker_seats` table via migration.

### 2. Client: Send heartbeats every 30s

In `src/hooks/useOnlinePokerTable.ts`:
- Add a new `useEffect` that runs a `setInterval` every 30 seconds when the player is seated (`mySeatNumber !== null`).
- Each tick calls `callEdge('poker-heartbeat', { table_id })` -- a new lightweight edge function.
- On cleanup (unmount / leave seat), the interval is cleared.

### 3. New Edge Function: `poker-heartbeat`

Create `supabase/functions/poker-heartbeat/index.ts`:
- Authenticates the user.
- Uses service role to update `poker_seats.last_heartbeat = now()` where `table_id` and `player_id` match.
- Returns `{ ok: true }`.
- Minimal logic, fast execution.

### 4. Server: Kick stale heartbeats in `poker-check-timeouts`

In `supabase/functions/poker-check-timeouts/index.ts`, add a new section (Section 4) after the existing auto-kick logic:
- Query `poker_seats` where `last_heartbeat < now() - 90 seconds` and `player_id IS NOT NULL`.
- For each stale seat: clear the seat (`player_id = null, stack = 0, status = active`) and broadcast a `seat_change` event with `action: "disconnected"`.
- This reuses the same kick pattern already used for consecutive timeouts.

### 5. Config: Disable JWT verification for heartbeat

Add to `supabase/config.toml`:
```
[functions.poker-heartbeat]
verify_jwt = false
```
(JWT is verified manually in code, matching the pattern of other poker functions.)

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `last_heartbeat` column to `poker_seats` |
| `supabase/functions/poker-heartbeat/index.ts` | New edge function: update heartbeat timestamp |
| `supabase/config.toml` | Add `poker-heartbeat` JWT config |
| `src/hooks/useOnlinePokerTable.ts` | Add 30s heartbeat interval when seated |
| `supabase/functions/poker-check-timeouts/index.ts` | Add Section 4: kick seats with stale heartbeats (90s+) |

## NOT Changed
- Bottom navigation, layout, styles, card animations, hand history, QuickChat, header buttons, any other UI
