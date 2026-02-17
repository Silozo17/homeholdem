

# Production Readiness Fix Pack: Mid-Hand Joins + Freezes + Lag

## Summary

Five targeted fixes across 5 files to eliminate mid-hand join glitches, hand freezes, and mobile performance issues. No UI/layout/navigation changes.

---

## P0-A: has_cards must be derived from hole cards, not seat status

**Problem:** In `poker-action/index.ts` (line 636) and `poker-check-timeouts/index.ts` (lines 201, 337), broadcasts set `has_cards: s.status !== "folded"`. This means a `sitting_out` mid-hand joiner who has no hole cards would broadcast `has_cards: true`, causing card-backs to appear on their seat.

**Fix (2 files):**

- `supabase/functions/poker-action/index.ts`: Before building the broadcast (around line 608), fetch `poker_hole_cards` for this hand to build a `holeCardPlayerIds` set. Change line 636 from `has_cards: s.status !== "folded"` to `has_cards: holeCardPlayerIds.has(s.player_id) && s.status !== "folded"`.

- `supabase/functions/poker-check-timeouts/index.ts`: Same fix in both broadcast locations (lines 201 and 337). Before each broadcast block, query `poker_hole_cards` for the hand_id and build a set, then use it for `has_cards`.

**Why:** Card-back display is now tied to actual hole card ownership, not seat status. Mid-hand joiners (sitting_out, no hole cards) will never show card-backs.

---

## P0-B: Mid-hand join is always sitting_out, activation only between hands

**Problem:** `poker-join-table/index.ts` already inserts as `sitting_out`, which is correct. `poker-start-hand/index.ts` already activates `sitting_out` players and uses a 3s `joined_at` cutoff, which is also correct.

**Fix:** No structural change needed. The only missing piece is that `poker-start-hand` broadcasts only `activePlayers` in its seats array (line 525), so mid-hand joiners who are `sitting_out` are excluded from the new hand's broadcast. This is correct behavior.

**One small addition** to `poker-start-hand/index.ts`: Add a console log confirming which players were activated and which remained sitting_out (debug aid, gated behind existing server logging).

---

## P0-C: Client refreshState never replaces seats/hand mid-hand (already implemented)

**Current state:** This was already implemented in prior changes (Option A). The `refreshState` function checks `handActive` and only merges `table` metadata mid-hand. The `seat_change` join handler maps in-place without calling `refreshState`. Stale recovery only calls `poker-check-timeouts`.

**Fix:** Add `?debug=1` console logging (no UI) to confirm:
- When `refreshState` runs mid-hand, log that it skipped seats/hand replacement
- When a `seat_change` join arrives mid-hand, log the seat number and `has_cards=false`

Changes in `src/hooks/useOnlinePokerTable.ts`: Add 3 `console.log` calls gated behind `window.location.search.includes('debug=1')`.

---

## P0-D: Never kick players mid-hand

**Problem:** `poker-check-timeouts/index.ts` lines 371-401 auto-kick players with `consecutive_timeouts >= 1` unconditionally, even while a hand is active for that table. This can clear a seat mid-hand, causing the actor reference to point to an empty seat (freeze).

**Fix in `supabase/functions/poker-check-timeouts/index.ts`:**

- Before kicking each seat, check if there is an active hand on that table (`completed_at IS NULL`). If yes, skip the kick -- defer it to the next between-hands cycle.
- Change the threshold from `>=1` to `>=2` (require 2+ consecutive timeouts before kicking, matching the comment "2+ consecutive timeouts").

```
// For each seat to kick:
const { data: activeHandForTable } = await admin
  .from("poker_hands")
  .select("id")
  .eq("table_id", seat.table_id)
  .is("completed_at", null)
  .limit(1)
  .maybeSingle();

if (activeHandForTable) {
  console.log(`Skipping kick for ${seat.player_id} — hand active on table ${seat.table_id}`);
  continue;
}
```

Also change `gte("consecutive_timeouts", 1)` to `gte("consecutive_timeouts", 2)` on line 375.

**Why:** No seat is ever cleared while a hand is running. Kicks only happen between hands. The timeout fold logic (earlier in the function) already handles advancing the hand forward safely.

---

## P0-E: Memoize seat/player props in OnlinePokerTable

**Problem:** `toPokerPlayer()` is called inline during render for every seat on every render cycle. This creates new objects every time, defeating `PlayerSeat`'s `memo()`. On iPhone 12 landscape with 9 seats, this causes unnecessary re-renders on every broadcast.

**Fix in `src/components/poker/OnlinePokerTable.tsx`:**

Memoize the player objects using `useMemo` keyed on stable values:

```typescript
const memoizedPlayers = useMemo(() => {
  return rotatedSeats.map((seatData, screenPos) => {
    if (!seatData?.player_id) return null;
    const actualSeatNumber = (heroSeat + screenPos) % maxSeats;
    const isMe = seatData.player_id === user?.id;
    const isDealer = hand?.dealer_seat === actualSeatNumber;
    const opponentRevealed = !isMe
      ? revealedCards.find(rc => rc.player_id === seatData.player_id)?.cards ?? null
      : null;
    const playerLastAction = seatData.player_id ? lastActions[seatData.player_id] : undefined;
    return toPokerPlayer(seatData, !!isDealer, isMe ? myCards : null, isMe, opponentRevealed, playerLastAction);
  });
}, [seatsKey, hand?.dealer_seat, heroSeat, maxSeats, myCards, revealedCards, lastActions, user?.id]);
```

Then in the render loop, use `memoizedPlayers[screenPos]` instead of calling `toPokerPlayer` inline. This ensures `PlayerSeat` memo receives the same object reference when nothing changed.

---

## Debug logging (console only, gated behind ?debug=1)

Added to:
- `useOnlinePokerTable.ts`: Log when refreshState skips mid-hand, when seat_change join is handled mid-hand
- Server functions: Log table_id, hand_id, phase, state_version on timeout processing and action commits (already partially present, will add has_cards debug info)

No UI overlays. No new components.

---

## Files changed (exact paths)

1. `supabase/functions/poker-action/index.ts` -- P0-A: has_cards from hole cards
2. `supabase/functions/poker-check-timeouts/index.ts` -- P0-A + P0-D: has_cards from hole cards, no mid-hand kicks
3. `supabase/functions/poker-start-hand/index.ts` -- P0-B: debug log for activation
4. `src/hooks/useOnlinePokerTable.ts` -- P0-C: debug logging
5. `src/components/poker/OnlinePokerTable.tsx` -- P0-E: memoize player objects

---

## What does NOT change

- Bottom navigation
- Any visual layout, styles, spacing
- PlayerSeat component internals
- poker-join-table (already correct)
- poker-table-state (already correct)
- Any unrelated screens or files

---

## Verification checklist (2-4 phones)

1. **Mid-hand join**: Player A and B start a hand. Player C joins mid-hand. Verify: C sees "sitting_out", no card-backs on C's seat, A and B see no visual disruption (no re-deal, no card jump). After hand completes, C is dealt into the next hand.

2. **Timeout/freeze**: Start a hand, have the actor close their browser. Wait 25s. Verify: hand auto-folds and advances. The folded player is NOT kicked until the hand ends.

3. **Reconnect stability**: During an active hand, toggle airplane mode on one phone for 15s, then reconnect. Verify: no card re-deal, community cards stay, seat positions stable.

4. **Performance**: On iPhone 12 landscape, play 5 hands. Verify: no visible stutter on broadcasts, no unnecessary PlayerSeat flickers.

