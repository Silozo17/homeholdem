

# Fix: Active Players Falsely Kicked & Game Freeze After Rejoin

## Problems Identified

There are two interrelated bugs:

### Bug 1: Active players kicked despite playing
The heartbeat system (`poker-heartbeat`) sends a ping every 30 seconds to prove a player is still connected. After 90 seconds without a heartbeat, the server marks the player as disconnected or removes them.

**The problem**: The `last_heartbeat` timestamp is ONLY updated by the heartbeat edge function — not when a player actually takes a game action (call, raise, fold). If a player's heartbeat requests fail (network hiccup, edge function cold start) but they are actively playing hands, the server still considers them "stale" and kicks them. This is fundamentally wrong — a player who just bet 500 chips 2 seconds ago should never be considered inactive.

### Bug 2: Game freezes after kicked players rejoin
When a kicked player clicks "Play Again" and rejoins:
1. `resetForNewGame()` sets `handHasEverStarted = false`
2. The auto-start logic requires `handHasEverStarted = true` to trigger
3. If no hand is currently active (table is in "waiting" state), `refreshState` won't flip it back to `true`
4. The remaining players (Borys & Puchar) never had their state reset, but their auto-start leader calculation may have shifted when seats changed
5. Result: nobody triggers the next hand deal — the table is frozen

## Fix Plan (3 files)

### 1. `supabase/functions/poker-action/index.ts`
Update `last_heartbeat` alongside `last_action_at` whenever a player performs a voluntary action. Add a single query after the commit succeeds (~line 634):

```typescript
// After the consecutive_timeouts reset block
await admin
  .from("poker_seats")
  .update({ last_heartbeat: new Date().toISOString() })
  .eq("table_id", table.id)
  .eq("seat_number", actorSeatNum);
```

This ensures any player who is actively playing never gets flagged as having a stale heartbeat, even if their background heartbeat pings are failing.

### 2. `supabase/functions/poker-start-hand/index.ts`
Same fix — update `last_heartbeat` for ALL seated players when a new hand starts. This resets the heartbeat clock for everyone at the table whenever a hand begins.

### 3. `src/hooks/useOnlinePokerTable.ts` — Auto-start freeze fix
The `handHasEverStarted` gate on the auto-start is too aggressive. When a player rejoins a table that has been playing (table status is not brand new), they should be able to auto-start. Change the auto-start condition:

**Current** (line 373): `if (!handHasEverStarted) return;`

**Fixed**: Also allow auto-start if the table status is `'waiting'` (meaning the table has been used before — a hand was completed and the table is waiting for the next one):

```typescript
if (!handHasEverStarted && tableState?.table?.status !== 'waiting') return;
```

This means:
- Fresh new table: `handHasEverStarted = false`, status = `'waiting'` → auto-start IS allowed (but requires the "Deal Hand" button to be clicked first since no one has started yet — actually status is 'waiting' from creation too)

Hmm, let me refine — the better fix is: when `refreshState` returns data with table status `'waiting'` and there's no active hand, set `handHasEverStarted = true` if the table has a hand history (hand_number > 0 or seats with stacks different from buy-in). Actually the simplest and safest fix:

**In `refreshState`** (~line 131): Also set `handHasEverStarted` to `true` if the table status is `'playing'` OR `'waiting'` (meaning the table has been used):

```typescript
if (data.current_hand || data.table.status === 'waiting') {
  setHandHasEverStarted(true);
}
```

This way, when kicked players rejoin a table that's been playing (status = 'waiting' after the last hand completed), the auto-start logic kicks in immediately.

## Impact
- Active players will never be falsely kicked — game actions refresh the heartbeat
- After rejoining, auto-start correctly triggers the next hand
- No changes to UI, layout, navigation, or styles

## Files Changed (3 total)
1. `supabase/functions/poker-action/index.ts` — update heartbeat on action
2. `supabase/functions/poker-start-hand/index.ts` — update heartbeat on hand start
3. `src/hooks/useOnlinePokerTable.ts` — fix auto-start gate for rejoining players

