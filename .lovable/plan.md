

# Five Fixes for Online Poker Broadcast Consistency

## FIX 1 -- poker-check-timeouts/index.ts

Two locations send split `game_state` + `hand_result` broadcasts that must be merged into single `hand_complete` events.

### Location A: Empty-seat force-complete (L194-240)
Replace the two `channel.send` calls (L195-227 for `game_state` and L229-240 for `hand_result`) with a single `hand_complete` broadcast. The payload combines the `publicState` fields (seats, phase, dealer info, etc.) with `winners` and `revealed_cards`. All data is already computed -- no new queries.

### Location B: Normal timeout fold that ends the hand (L382-398)
Currently L383 sends `game_state` and L385-398 sends `hand_result` when `handComplete && completedResults` is true. Replace both with a single `hand_complete` broadcast. The `publicState` object (L350-380) already has all needed fields; merge in `winners`, `revealed_cards`, and `hand_number` from `completedResults`. For the non-hand-ending case (L383 alone), keep the existing `game_state` broadcast unchanged.

## FIX 2 -- poker-leave-table/index.ts

### Part A: Fix leave broadcast payload (L391-401)
The `seat_change` broadcast at L391 sends `player_id: null` and `display_name: null`. Change to send `player_id: user.id`. For `display_name`, add a single profile fetch before the broadcast (around L388):
```
const { data: leavingProfile } = await admin.from("profiles").select("display_name").eq("id", user.id).single();
```
Then use `leavingProfile?.display_name || 'Player'` in the payload.

### Part B: Merge split broadcasts -- two locations

**Location 1 (L138-174):** When `remainingAfterLeave <= 1` and only 1 opponent remains. Replace the `game_state` (L138-161) + `hand_result` (L163-174) with a single `hand_complete`. Include the full seats array with the winner's updated stack. Currently L148-158 builds a partial seat -- fix to include `seat_number` properly (use the winner seat's `seat_number` from the DB query).

**Location 2 (L268-294):** When leaving player's fold causes only 1 non-folded player to remain. Replace `game_state` (L269-281, which is missing seats!) + `hand_result` (L282-293) with a single `hand_complete`. Build a full seats array from `allSeatsFull` (already queried at L217), including the winner's updated stack. Include `dealer_seat`, `sb_seat`, `bb_seat`, `hand_number` from `handData`.

## FIX 3 -- poker-join-table/index.ts

Change L261 from:
```typescript
return new Response(JSON.stringify({ seat }), { ... });
```
To:
```typescript
return new Response(JSON.stringify({
  seat,
  display_name: profile?.display_name || 'Player',
  avatar_url: profile?.avatar_url || null,
  country_code: profile?.country_code || null,
}), { ... });
```
The `profile` object is already fetched at L188-192 -- no new query needed.

## FIX 4 -- usePokerBroadcast.ts

In the `hand_complete` handler, after the winner timer is set (after L469), add:
```typescript
prevHandIdRef.current = payload.hand_id;
```
This prevents a stale `hand_result` broadcast from a different code path (e.g. check-timeouts sending a legacy event) from triggering a duplicate winner overlay for the same hand.

## FIX 5 -- useOnlinePokerTable.ts

In `refreshState` (L126-147):
- Move `lastRefreshRef.current = now` (L130) from before the `try` to inside the `try`, after `setTableState(data)` succeeds (after L133).
- In the `catch` block (L141-143), add `lastRefreshRef.current = 0;` so a failed refresh doesn't block retries for 2 seconds.

## Files Changed (5 total)
1. `supabase/functions/poker-check-timeouts/index.ts`
2. `supabase/functions/poker-leave-table/index.ts`
3. `supabase/functions/poker-join-table/index.ts`
4. `src/hooks/usePokerBroadcast.ts`
5. `src/hooks/useOnlinePokerTable.ts`

## No Changes To
- Bottom navigation, styles, layout, spacing
- usePokerConnection, usePokerAnimations, usePokerAudio, usePokerGameOver, usePokerPreActions
- poker-action/index.ts, poker-start-hand/index.ts
- OnlinePokerTable.tsx

