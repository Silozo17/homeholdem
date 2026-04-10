

# Fix: Three Multiplayer Poker Issues

## Issue 1: "Removed for inactivity" persists after app restart — player cannot rejoin

**Root cause**: `kickedForInactivity` is a React `useState(false)` in `usePokerBroadcast`. When the player's seat is deleted server-side (heartbeat kick or consecutive timeout kick), the seat row is gone. The player restarts the app, loads the table fresh — `kickedForInactivity` starts as `false`, so this shouldn't persist.

The real problem is the **broadcast handler** at line 240 in `usePokerBroadcast.ts`: any `seat_change` with `action === 'kicked'` where the `player_id` matches sets `kickedForInactivity = true`. But this includes **manual admin kicks** (from `poker-moderate-table`), heartbeat kicks, and consecutive-timeout kicks — all of which broadcast `action: "kicked"`. When the player reconnects, another client's timeout poll triggers `poker-check-timeouts`, which may re-broadcast a stale kick for the already-removed player, and the freshly connected client picks it up.

Additionally, `kickedForInactivity` is **never reset**. Once set to `true`, the effect at line 291–299 in `OnlinePokerTable.tsx` calls `leaveSeat()` — but if the seat is already gone, `leaveSeat` may error silently. The state stays `true` and blocks further interaction. Even on component remount, the broadcast may fire again.

**Fix**:
1. In `usePokerBroadcast.ts`, only set `kickedForInactivity = true` for `action === 'force_removed'` (the actual inactivity removal), not generic `kicked` (which covers admin kicks too).
2. In `OnlinePokerTable.tsx`, reset `kickedForInactivity` after handling (set it back to false after showing toast and calling leaveSeat) so it doesn't block re-joining.
3. Add a `resetKickedState` function exposed from the broadcast hook and call it in `joinTable` to clear the flag when a player sits back down.

## Issue 2: "Deal Hand" button not showing when 2 players first sit at a new table

**Root cause**: The "Deal Hand" button is gated by `!handHasEverStarted` (line 961 in `OnlinePokerTable.tsx`). `handHasEverStarted` is set to `true` in `refreshState` when `data.current_hand` exists OR `data.table?.status === 'waiting'`. 

When two players join a **fresh table**, the table status is `'playing'` or whatever its initial status is — need to check. The auto-start logic at line 371 also checks `if (!handHasEverStarted) return;`, meaning auto-start won't fire either.

The flow is: player joins → `refreshState` called → table status is the initial status (not `'waiting'`) and there's no `current_hand` → `handHasEverStarted` stays `false` → button shows. Wait — the condition is `!handHasEverStarted`, so the button **should** show when it's `false`. Let me re-read line 961:

```tsx
{isSeated && !hand && !autoStartAttempted && !handHasEverStarted && activeSeats.length >= 2 && (
```

So the button shows when `handHasEverStarted === false`. But auto-start at line 373 checks `if (!handHasEverStarted) return;` — this means auto-start is **blocked** when `handHasEverStarted` is false. The idea is: first game, player must manually press "Deal". After first hand, auto-start takes over.

The actual problem: `activeSeats` filtering. Players join as `sitting_out`, and `activeSeats` may filter them out. Let me check:

Looking at `refreshState` (line 126–148): it calls `poker-table-state` which returns seats with their DB status. Players join as `sitting_out`. The `activeSeats` calculation needs checking.

Let me look at the `activeSeats` filter in OnlinePokerTable:
<br/>

Actually, looking more carefully at line 359: `const seatedCount = tableState?.seats.filter(s => s.player_id && s.status !== 'eliminated' && s.stack > 0).length ?? 0;` — this includes `sitting_out` players.

And the button condition uses `activeSeats.length >= 2`. I need to find the `activeSeats` definition.

Given the complexity, the most likely issue is that when the second player joins, the first player's client doesn't get the seat update (broadcast might work, but the join broadcast adds a seat with status `sitting_out` and the `activeSeats` filter might exclude it). Or the `refreshState` after join doesn't update the seat count correctly because of the 2s debounce.

**Fix**: The `joinTable` callback does an optimistic local update but doesn't trigger `refreshState`. The second player's join broadcast adds them to the first player's seat list, but with status `sitting_out`. If `activeSeats` filters out `sitting_out`, the button won't show.

I need to check `activeSeats` definition — let me include that in the plan.

## Issue 3: Player restart → can't sit down

This ties to Issue 1. The player's seat was deleted by heartbeat/timeout, but `kickedForInactivity` gets set on reconnect from stale broadcasts, and the effect calls `leaveSeat()` which errors because there's no seat. The UI shows the inactivity toast and doesn't allow interaction.

## Implementation Plan

### File 1: `src/hooks/usePokerBroadcast.ts`
- Change kick detection (line 240): only set `kickedForInactivity` for `action === 'force_removed'`, not `'kicked'` (admin kicks shouldn't trigger the inactivity message)
- Add a `resetKickedForInactivity` function that sets the state back to `false`
- Expose it in the return object

### File 2: `src/hooks/useOnlinePokerTable.ts`
- In the `kickedForInactivity` handling (exposed via broadcast), reset it after processing
- In `joinTable`, call `broadcast.resetKickedForInactivity()` to clear stale state
- For the "Deal Hand" button: when calculating seated players for auto-start and button visibility, include `sitting_out` players (they get activated by `poker-start-hand`)

### File 3: `src/components/poker/OnlinePokerTable.tsx`
- After handling `kickedForInactivity` (line 298), reset the flag so the player can rejoin
- Check `activeSeats` definition — if it filters `sitting_out`, change it to include them for the Deal Hand button condition

## Verification
1. Kick a player → they see toast → they can rejoin immediately
2. Restart app after being removed → no stale "removed for inactivity" message
3. Two players join fresh table → "Deal Hand" button appears for first seated player
4. After first hand, auto-deal works as before

