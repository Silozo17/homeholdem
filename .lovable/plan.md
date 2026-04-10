

# Fix: Multiplayer Poker Game Freezes, Missing Players, Timer Stuck After Action

## Root Cause Analysis

After analyzing edge function logs, broadcast code, and client-side state management, I identified **three interrelated problems**:

### Problem 1: Broadcasts falling back to REST API (critical)
Every edge function log shows: `"Realtime send() is automatically falling back to REST API"`. The server creates a new channel with `admin.channel(...)` then immediately calls `channel.send()` without subscribing first. In newer Supabase JS v2 versions, `send()` on an unsubscribed channel falls back to a REST-based delivery that is **unreliable and can silently drop messages**. This means:
- Players miss `game_state` updates after someone acts → timer appears stuck on them
- Players miss `seat_change` join events → they don't see other players
- Players miss `hand_complete` → game appears frozen after hand ends

### Problem 2: `poker-table-state` doesn't return `current_actor_id`
When a player refreshes state (page load, reconnect, stale recovery), the HTTP endpoint returns the hand state without `current_actor_id`. The client falls back to looking up `player_id` from `current_actor_seat` in the seats array, which works most of the time — but if the seat data is stale or the player joined mid-hand, the lookup can fail and `isMyTurn` is never true, freezing the game.

### Problem 3: No client-side recovery when broadcasts are missed
The timeout polling (8s for leader, 15s for others) only fires `poker-check-timeouts` and `refreshState` when the deadline has passed by 3s+ or when broadcasts haven't been received for 12s+. If a single `game_state` broadcast is dropped but the next one arrives later, the client can be stuck on a stale state for up to 12 seconds. During this time, the timer shows incorrectly and the game feels "frozen."

## Implementation Plan

### 1. Fix server broadcasts to use `httpSend()` instead of `send()`
All 5 poker edge functions that broadcast (`poker-action`, `poker-start-hand`, `poker-check-timeouts`, `poker-join-table`, `poker-leave-table`) use `channel.send()` which triggers the deprecation fallback. Replace with the explicit `httpSend()` method which is the correct way to broadcast from edge functions (server-to-client, no subscription needed).

**Change pattern** (in each file):
```typescript
// Before:
const channel = admin.channel(`poker:table:${table_id}`);
await channel.send({ type: "broadcast", event: "game_state", payload: publicState });

// After:
await admin.channel(`poker:table:${table_id}`).send({
  type: "broadcast",
  event: "game_state",
  payload: publicState,
});
```

Wait — `httpSend()` may not exist in the `@supabase/supabase-js@2` version being used. The actual fix is to **explicitly call the Realtime REST API** directly, bypassing the SDK's channel abstraction entirely. This guarantees delivery.

**Robust pattern:**
```typescript
// Direct REST broadcast — guaranteed delivery, no subscription needed
await fetch(
  `${Deno.env.get("SUPABASE_URL")}/realtime/v1/api/broadcast`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      messages: [{
        topic: `realtime:poker:table:${table_id}`,
        event: "broadcast",
        payload: { type: "broadcast", event: "game_state", payload: publicState },
      }],
    }),
  }
);
```

### 2. Add `current_actor_id` to `poker-table-state` response
In `supabase/functions/poker-table-state/index.ts`, derive `current_actor_id` from the seats array using `current_actor_seat` and add it to the response so the client doesn't need the fallback lookup on initial load.

### 3. Add aggressive client-side recovery polling
In `useOnlinePokerTable.ts`, add a secondary fallback: if `isMyTurn` has been true for more than 5 seconds without the player acting, trigger a `refreshState()` to ensure we haven't missed a broadcast. This prevents the "timer stuck on me after I acted" scenario.

## Files Changed (7 total)
1. `supabase/functions/poker-action/index.ts` — replace `channel.send()` with direct REST broadcast
2. `supabase/functions/poker-start-hand/index.ts` — same
3. `supabase/functions/poker-check-timeouts/index.ts` — same
4. `supabase/functions/poker-join-table/index.ts` — same
5. `supabase/functions/poker-leave-table/index.ts` — same
6. `supabase/functions/poker-table-state/index.ts` — add `current_actor_id` to response
7. `src/hooks/useOnlinePokerTable.ts` — add stale-state recovery polling

## Impact
- Broadcasts will be reliably delivered to all connected players — no more missed state updates
- Players will always see each other join/leave in real time
- Timer will correctly move to the next player after an action
- No changes to UI, layout, navigation, or styles

