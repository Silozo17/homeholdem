

# Fix: Showdown Cards Not Revealed + Game Stuck After Hand

## Root Causes

### 1. Event name mismatch -- client never receives hand completion
The server broadcasts event `"hand_result"` (poker-action/index.ts line 619), but the client subscribes to `"hand_complete"` (useOnlinePokerTable.ts line 132). Since these don't match, the client never receives the hand result, so:
- `current_hand` is never set to `null`
- The "Deal Hand" button never reappears (it checks `!hand`)
- The game appears frozen

### 2. Opponent cards never populated at showdown
The server sends `revealed_cards` (array of `{ player_id, cards }`) in the `hand_result` payload, but the client ignores this data entirely. Meanwhile, `toPokerPlayer()` always gives opponents empty `holeCards: []`, so even when `isShowdown` is true, `PlayerSeat` has no cards to display.

### 3. No showdown pause before clearing the hand
Even after fixing the event name, the current `hand_complete` handler immediately sets `current_hand: null` and clears cards. This means there's zero time to see the showdown -- it jumps straight to the "waiting" state. We need a brief delay (e.g. 5 seconds) so players can see revealed cards and the winner.

## Plan

### File 1: `src/hooks/useOnlinePokerTable.ts`

**A. Fix event name**: Change `'hand_complete'` to `'hand_result'` in the channel subscription.

**B. Add `revealedCards` state**: New state `revealedCards` that stores the `{ player_id, cards }[]` from the `hand_result` payload. This is what the UI reads to show opponent hole cards at showdown.

**C. Add showdown pause**: When `hand_result` arrives:
1. First, update `current_hand.phase` to `'complete'` and merge `revealed_cards` into state
2. After a 5-second delay, clear `current_hand` to null and reset `revealedCards`

**D. Expose `revealedCards`** in the return object so the table component can use them.

### File 2: `src/components/poker/OnlinePokerTable.tsx`

**A. Pass revealed cards to opponents**: In the seat rendering loop, when building the `PokerPlayer` via `toPokerPlayer()`, if `revealedCards` contains cards for an opponent's `player_id`, pass those as `heroCards` so `PlayerSeat` renders them.

**B. Add "Next Hand" button**: During the showdown pause (phase is `'complete'`), show a "Next Hand" button (like the Deal button) so the table creator can start the next hand once showdown is done. The deal button already appears when `!hand`, but we can also let it appear earlier.

### File 3: `src/components/poker/OnlinePokerTable.tsx` (toPokerPlayer)

Update the `toPokerPlayer` adapter to accept optional `revealedCards` so opponents get their hole cards populated for showdown rendering.

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Game stuck after showdown | Client listens for `hand_complete`, server sends `hand_result` | Rename event to `hand_result` |
| Opponent cards not visible | `revealed_cards` payload ignored, opponents always get `holeCards: []` | Store revealed cards in state, pass to `toPokerPlayer` |
| No time to see results | Hand clears immediately on completion | Add 5-second showdown pause before clearing |

