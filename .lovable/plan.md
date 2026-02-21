

## Fix Plan: Three Timing Bugs in useOnlinePokerTable.ts

### Problem Summary

Three bugs in `src/hooks/useOnlinePokerTable.ts` cause winners to either never show or show too early:

- **Bug A**: When `game_state` arrives before `hand_result`, the `pendingWinnersRef` check (line 238) runs while the ref is still null. Later, `hand_result` stores into the ref, but no second `game_state` comes to trigger it. Winners are stuck forever.
- **Bug B**: When `hand_result` arrives after `game_state` has rendered, `tableStateRef` already has 5 cards. The code sees no difference, skips the pending path, and fires winners at 500ms -- before staged card animations finish.
- **Bug C**: `showdownTimerRef` delay is `winnerDelay + 3500` (line 450). If `winnerDelay` is wrong due to bugs A/B, cleanup fires while cards are still staging. Additionally, the competing timer at lines 291-304 (phase=complete fallback) can overwrite the hand_result timer.

### Changes (all in `src/hooks/useOnlinePokerTable.ts` unless stated otherwise)

#### Fix 1: Add `runoutCompleteTimeRef`
- Add `const runoutCompleteTimeRef = useRef<number>(0);` near line 98 with other refs.

#### Fix 2: Set runout timestamp in game_state handler
- After line 234 (`newCommunityCount` calculation), insert logic to detect multi-card arrivals and set `runoutCompleteTimeRef.current = Date.now() + runoutMs`.

#### Fix 3: Rewrite pendingWinnersRef check in game_state handler
- Replace lines 237-242. Instead of firing at `pending.winnerDelay`, compute `msUntilRunoutDone` from `runoutCompleteTimeRef` and use `Math.max(pending.winnerDelay, msUntilRunoutDone + 500)`.

#### Fix 4: Rewrite hand_result winner logic
- Replace lines 410-462. Always store into `pendingWinnersRef` first, then immediately check if cards are already delivered. If so, use `runoutCompleteTimeRef` for correct delay. Change `showdownDelay` to a fixed 12000ms to outlast all animations.

#### Fix 5: Clear `runoutCompleteTimeRef` on hand reset
- Add `runoutCompleteTimeRef.current = 0;` wherever `setMyCards(null)` / `setRevealedCards([])` cleanup runs (inside showdown timer callbacks and the hand-id-change effect).

#### Fix 6: Remove competing phase=complete timer
- Delete lines 291-304 entirely. The `hand_result` handler's 12s timer is the single source of truth for cleanup.

### Files Changed
- `src/hooks/useOnlinePokerTable.ts` -- all six fixes

### Verification Criteria
1. Both players all-in preflop: flop staged, 2s, turn, 2s, river, 500ms, winner overlay + voice, cards stay visible, 3s, game over screen
2. Normal hand: winner overlay within 500ms of river card
3. No auto-restart until game over screen shown

