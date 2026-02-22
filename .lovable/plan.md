
# Fix: Timer Not Showing + Late Actions Being Folded

## Root Cause Analysis

### Issue 1: Actions at 1-2 seconds left get folded anyway

**Root cause: The opponent's timeout ping races with the player's legitimate action.**

The flow:
1. Player clicks check/raise at ~1-2 seconds left on their timer
2. Their action is sent to the server via `sendAction` (mobile HTTP round-trip ~500-1000ms)
3. At `deadline + 2000ms`, the **opponent's client** fires `pingTimeout` which calls `poker-timeout-ping`
4. `poker-timeout-ping` forwards to `poker-action` as a forced fold
5. On a slow mobile connection, the opponent's ping can arrive at the server at `deadline + 2200-2600ms`
6. `poker-action` checks `deadline + 2500ms < now()` — if it's past 2.5s, the fold is accepted
7. The player's legitimate action arrives after the fold and gets rejected as "Not your turn" or "action_superseded"

The opponent ping delay (2000ms) is too close to the server grace period (2500ms). Only a 500ms margin exists, which is easily exceeded on mobile networks.

**Fix (1 file):** In `useOnlinePokerTable.ts`, increase the ping delay from `deadline + 2000ms` to `deadline + 6000ms`. This ensures the opponent's ping never arrives before the grace window closes, giving the acting player's action time to reach the server first.

### Issue 2: Timer circle doesn't show on first hand dealt

**Root cause: `poker-start-hand` edge function does NOT include `current_actor_seat` in its broadcast payload.**

In `poker-start-hand/index.ts`, the `publicState` object (lines 541-585) contains `current_actor_id` but is **missing `current_actor_seat`**. When the client receives this broadcast:
- `payload.current_actor_seat` is `undefined`
- Line 267 in `useOnlinePokerTable.ts`: `current_actor_seat: payload.current_actor_seat ?? null` resolves to `null`
- `isCurrentActor = hand?.current_actor_seat === actualSeatNumber` is `null === N` which is `false`
- `isCurrentPlayer` is `false` for everyone
- The timer never activates

It works on subsequent turns because `poker-action/index.ts` line 643 DOES include `current_actor_seat` in its broadcast. So after the first player acts (manually, without timer guidance), all subsequent turns show the timer correctly.

The `startHand()` callback in the client (line 737) also reads `data.state.current_actor_seat` which is undefined in the response, so even the auto-start leader gets `null`.

**Fix (1 file):** In `poker-start-hand/index.ts`, add `current_actor_seat: firstActor` to the `publicState` object.

---

## Changes

### File 1: `supabase/functions/poker-start-hand/index.ts` (line ~546)

Add the missing `current_actor_seat` field to the `publicState` object:

```typescript
const publicState = {
  hand_id: hand.id,
  phase: "preflop",
  community_cards: [],
  pots: hand.pots,
  current_actor_seat: firstActor,        // <-- ADD THIS LINE
  current_actor_id:
    activePlayers.find((p: any) => p.seat_number === firstActor)
      ?.player_id || null,
  // ... rest unchanged
};
```

### File 2: `src/hooks/useOnlinePokerTable.ts` (line ~681)

Increase the opponent timeout ping delay from `+ 2000` to `+ 6000`:

```typescript
// Before
const delay = deadline - Date.now() + 2000;

// After
const delay = deadline - Date.now() + 6000;
```

This gives a 3.5-second margin beyond the server's 2.5s grace period, ensuring legitimate player actions always arrive before any timeout ping.

---

## Why these fixes work

**Timer fix:** The `current_actor_seat` field is what drives the entire timer visual chain: `isCurrentActor` -> `isCurrentPlayer` -> `isTimerActive` -> conic-gradient border. Without it in the initial broadcast, the timer simply cannot activate. Adding it to `poker-start-hand`'s `publicState` makes the timer show immediately when cards are dealt.

**Late-action fix:** By pushing the opponent ping to `deadline + 6s`, the acting player has a full 6-second window after the 45-second deadline to get their action to the server. The server-side `poker-check-timeouts` cron (which fires at `deadline + 7.5s`) remains the authoritative timeout mechanism. The opponent ping becomes a backup that fires 1.5s before the cron, rather than competing with legitimate actions.

## No other changes needed

- No changes to `PlayerSeat.tsx`, `OnlinePokerTable.tsx`, or any other file
- No changes to `poker-action` or `poker-check-timeouts` edge functions
- The 1500ms debounce fix from earlier remains valid and complementary
