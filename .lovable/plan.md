
Goal: restore multiplayer poker sync with the smallest certain fixes only. I traced the live gameplay flow end-to-end across `usePokerConnection`, `usePokerBroadcast`, `useOnlinePokerTable`, `OnlinePokerTable`, and all poker edge functions that emit table updates.

Confirmed root causes

1. Broadcast contract is broken after the recent “reliability” refactor
- Client subscribes to channel/topic: `poker:table:${tableId}`
- Client listens for broadcast events like: `game_state`, `seat_change`, `hand_complete`
- Server now sends REST broadcasts with:
  - topic: `realtime:poker:table:${tableId}`
  - event: `"broadcast"`
  - payload: `{ type: "broadcast", event, payload }`
- That does not match the client subscription contract, so gameplay broadcasts never hit the actual handlers.
- This exactly explains:
  - players not seeing other players sit/join
  - actions committing on the server but turns not advancing in the UI
  - tables appearing frozen even though server logs show committed actions

2. Seat re-join handling is also deterministically wrong on the client
- In `src/hooks/usePokerBroadcast.ts`, `seat_change` with `action === 'join'` returns early if that seat number already exists in local state.
- After a leave/kick, the client keeps an empty placeholder row for that seat.
- When someone later joins that same seat, the handler discards the update instead of replacing the empty row.
- This explains “players don’t see other players at the table” even after the broadcast issue is fixed for reused seats.

Implementation plan

1. Fix the broadcast wire format in every poker edge function that publishes table updates
Files:
- `supabase/functions/poker-action/index.ts`
- `supabase/functions/poker-start-hand/index.ts`
- `supabase/functions/poker-join-table/index.ts`
- `supabase/functions/poker-leave-table/index.ts`
- `supabase/functions/poker-check-timeouts/index.ts`
- `supabase/functions/poker-moderate-table/index.ts`

Change:
- keep the REST broadcaster approach
- change the payload shape from:
```ts
messages: [{
  topic: `realtime:poker:table:${tableId}`,
  event: "broadcast",
  payload: { type: "broadcast", event, payload }
}]
```
- to the actual channel contract the client is subscribed to:
```ts
messages: [{
  topic: `poker:table:${tableId}`,
  event,
  payload
}]
```

Why this is certain:
- It matches the current frontend subscription exactly:
```ts
supabase.channel(`poker:table:${tableId}`)
  .on('broadcast', { event: 'game_state' }, ...)
```
- It matches the documented REST broadcast API shape.

2. Fix reused-seat join updates in the client
File:
- `src/hooks/usePokerBroadcast.ts`

Change:
- for `seat_change` + `action === 'join'`, replace/update the existing seat row when the same seat number already exists instead of dropping the event.
- Keep current behavior for genuinely new seat rows.

Why this is certain:
- right now the code checks only `seat` existence, not whether the seat is occupied
- empty placeholder rows are common after leave/kick flows

3. Keep the rest of gameplay logic untouched
- No UI redesign
- No broad refactor
- No database migration
- No rule changes
- No bottom navigation changes
- No speculative timer rewrites

Technical details
- The current server commits are likely succeeding; the broken layer is state delivery, not core hand resolution.
- This is why logs show actions being committed while clients still appear frozen.
- The fixes are protocol-level and targeted:
```text
Current:
edge function -> REST broadcast(topic=realtime:poker:table:X, event=broadcast, wrapped payload)
client listens -> channel(poker:table:X), event=game_state/seat_change/hand_complete

Fixed:
edge function -> REST broadcast(topic=poker:table:X, event=game_state|seat_change|hand_complete, direct payload)
client listens -> unchanged, now receives updates
```

Files to change
- `supabase/functions/poker-action/index.ts`
- `supabase/functions/poker-start-hand/index.ts`
- `supabase/functions/poker-join-table/index.ts`
- `supabase/functions/poker-leave-table/index.ts`
- `supabase/functions/poker-check-timeouts/index.ts`
- `supabase/functions/poker-moderate-table/index.ts`
- `src/hooks/usePokerBroadcast.ts`

Verification checklist after implementation
1. Two players join the same table on separate devices and both immediately see both seats.
2. Start a hand and verify both players see hole-card dealing / hand state begin.
3. Player A acts; confirm Player B sees the action and turn passes immediately.
4. Continue through multiple streets; confirm community cards and actor timer advance on both screens.
5. Leave/kick a player, then have another player sit in that same seat; confirm all clients see the seat refill correctly.
6. Reload one device mid-hand; confirm `poker-table-state` restores state and subsequent broadcasts continue normally.

Scope confirmation
- This plan is based on confirmed code-contract mismatches, not guesswork.
- I will only implement the targeted multiplayer sync fixes above and nothing else outside scope.
