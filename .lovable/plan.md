

# Online Poker Freeze/Delay Analysis

## Issue 1: Seat click freeze — `joinTable` is sequential and slow

**Root cause**: When a player clicks a seat, `handleJoinSeat` (L589-606 in OnlinePokerTable.tsx) calls `joinTable` which does TWO sequential awaits:

```
joinTable (useOnlinePokerTable.ts L224-229):
  1. await callEdge('poker-join-table', ...)   // ~500-1500ms edge function cold start
  2. await refreshState()                       // ~500-1500ms ANOTHER edge function call
  3. await channel.track(...)                   // presence update
```

The `poker-join-table` edge function itself is also sequential — it does ~8 sequential DB queries (table lookup, seat check, stack cache, profile fetch, broadcast, watcher notifications). Total time: 1-3 seconds during which the UI shows no feedback.

**Fix**: Make `joinTable` optimistic. After the edge function succeeds, update local state immediately instead of awaiting `refreshState()`. The seat_change broadcast will also arrive, but the optimistic update gives instant visual feedback.

In `useOnlinePokerTable.ts`, change `joinTable`:
- After `callEdge('poker-join-table', ...)` succeeds, immediately call `setTableState` to add the new seat locally (same pattern the broadcast handler uses in usePokerBroadcast.ts L248-267)
- Remove the `await refreshState()` — the broadcast `seat_change` event handles sync for other players
- Run `channel.track()` without await (fire-and-forget)

## Issue 2: Cards not appearing — `poker-my-cards` fetch has unnecessary 50ms delay + race condition

**Root cause**: In `useOnlinePokerTable.ts` L192-203, when a new hand starts (`hand.hand_id` changes), there's a `setTimeout` of 50ms before fetching cards. But the real problem is the **dependency array**: it depends on `hand?.hand_id`, `userId`, and `mySeatNumber`.

When `poker-start-hand` broadcasts, the `game_state` handler in usePokerBroadcast updates `tableState` with the new hand. But `mySeatNumber` is derived from `tableState.seats`, and it may not update in the same render cycle. If `mySeatNumber` is `null` momentarily, the effect short-circuits (`if (!hand?.hand_id || !userId || mySeatNumber === null) return;`) and never fetches cards.

Additionally, `refreshState` in `useOnlinePokerTable.ts` L132-134 sets `myCards` from `data.my_cards`, but only if `refreshState` is called. The initial load and reconnect call `refreshState`, but after that, cards come from the separate `poker-my-cards` fetch effect — which can fail silently (the catch block does nothing at L198-199).

**Fix**: 
- Remove the `mySeatNumber === null` guard from the card fetch effect. If the player has a `hand_id` and `userId`, they should attempt to fetch cards regardless. The server will return null if they're not in the hand.
- Remove the 50ms setTimeout — it serves no purpose and adds latency.
- Add a retry: if the first fetch returns null cards but the player is seated, retry once after 500ms.

## Issue 3: Timer runs but game appears frozen — `refreshState` 2-second debounce blocks critical updates

**Root cause**: `refreshState` (L126-147) has a 2-second debounce:
```
if (now - lastRefreshRef.current < 2000) return;
```

This means if `refreshState` was called within the last 2 seconds (e.g., from the join flow), a subsequent call from the broadcast reconnect or seat_change handler is silently dropped. The player sees the timer ticking (from `action_deadline` in the broadcast) but their state is stale — no cards, wrong seat info.

**Fix**: Add a `force` parameter to `refreshState` that bypasses the debounce. Use it for critical calls like after joining. Alternatively, reduce the debounce to 1 second for non-critical paths.

## Issue 4: `poker-start-hand` edge function is slow — sequential DB operations

**Root cause**: The `poker-start-hand` function (622 lines) does ~15 sequential database operations:
- L230-237: Activate sitting_out players
- L240-256: Auto-kick busted players (one by one in a loop with broadcasts)
- L259-266: Get active seats
- L285-291: Get last hand number
- L448-473: Insert hand row
- L489-496: Insert hole cards (one by one in a loop!)
- L498-504: Update seat stacks (one by one in a loop!)
- L507-512: Insert action records (one by one in a loop!)
- L515-518: Update table status
- L521-535: Get profiles for broadcast

With 6 players, that's ~25+ sequential DB queries. Cold start + these queries = 2-4 seconds.

**Fix**: Parallelize where possible:
- Batch hole card inserts into a single `.insert([...])` call
- Batch seat stack updates (or use a single SQL function)
- Batch action record inserts into a single `.insert([...])` call
- Parallelize independent queries (profiles fetch + table status update can run together)

## Issue 5: Voice announcement on join triggers TTS fetch — adds perceived delay

**Root cause**: When a player joins, the `announceCustomRef` fires `"X has joined the table"` which calls `tournament-announce` edge function (ElevenLabs TTS API). While this doesn't block the UI directly (it's async), on slow connections it can cause audio playback to compete with the card fetch and state refresh, adding to the perception of freezing.

This is not a primary issue but contributes to the "frozen" feeling.

---

## Recommended Fix Priority

### Priority 1: Optimistic seat join (biggest impact)
- In `joinTable`, add the seat to local state immediately after the edge function returns, before `refreshState`
- Remove `await refreshState()` from joinTable — let the broadcast handle sync

### Priority 2: Fix card fetch reliability
- Remove `mySeatNumber === null` guard from card fetch effect
- Remove 50ms setTimeout
- Add retry logic for null cards when seated

### Priority 3: Parallelize `poker-start-hand` DB operations
- Batch inserts for hole cards, seat updates, and action records
- Parallelize independent operations

### Priority 4: Add force bypass for refreshState debounce
- Allow critical callers to bypass the 2-second debounce

## Technical Details

### Files to change:
1. `src/hooks/useOnlinePokerTable.ts` — optimistic joinTable, card fetch fix, refreshState force param
2. `supabase/functions/poker-start-hand/index.ts` — batch DB operations
3. `src/components/poker/OnlinePokerTable.tsx` — minor: show joining state feedback on seat click

### No changes to:
- Bottom navigation
- Styles, layout, spacing
- usePokerBroadcast (already correct)
- usePokerConnection (already correct)

