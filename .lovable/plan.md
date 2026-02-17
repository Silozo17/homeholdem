

# Comprehensive Multiplayer Poker Audit -- Findings & Fixes

## Summary

After auditing every file involved in the multiplayer poker lifecycle (table creation, joining, dealing, betting, showdown, game over, XP, history), I found **13 issues** ranging from critical bugs to polish items. The game is architecturally sound but has specific gaps that affect the user experience.

---

## CRITICAL BUGS

### 1. Hand History Replay -- "Nothing Happens" When Clicking

**File**: `src/components/poker/OnlinePokerTable.tsx` (line 1110)
**File**: `src/hooks/useHandHistory.ts`

The HandReplay Sheet is correctly wired (`open={replayOpen}` at line 1110), but the `lastHand` value from `useHandHistory(tableId)` only has data if `finalizeHand()` was called. The problem is that `finalizeHand` (line 275) is inside a `useEffect` that depends on `handWinners.length > 0`. During all-in runouts, `handWinners` is now delayed by 4 seconds (our recent fix). During those 4 seconds, the `hand_result` handler also sets the `current_hand` to `{ phase: 'complete' }`, and the showdown timer starts. But the `prevHandIdRef` in the hand history snapshot effect (line 240) tracks `hand_id` correctly.

**Actual bug**: The `HandReplay` component reads `hand.actions`, but the `recordAction` function (line 250-266) only captures actions from `lastActions` state changes. The `lastActions` map is reset to `{}` on new `hand_id` (line 127 of useOnlinePokerTable.ts). Since `lastActions` is only populated from broadcast `game_state` events (which only include the *most recent* actor's action), many actions are lost. The history ends up with incomplete action logs, making the replay appear broken or empty.

**Fix**: Instead of relying on `lastActions` (which only contains the latest actor), fetch the full action log from the `poker_actions` table when finalizing the hand. Add a call to `supabase.from('poker_actions').select('*').eq('hand_id', handId).order('sequence')` inside `finalizeHand` and populate the actions from the server data.

### 2. No XP Awarded for Multiplayer Games

**File**: `src/components/poker/OnlinePokerTable.tsx`

The practice game (`PlayPoker.tsx`, lines 27-46) saves results to `poker_play_results` and awards XP via `xp_events` inserts. The multiplayer game does *neither*. There is no code in `OnlinePokerTable.tsx` that inserts into `poker_play_results` or `xp_events` when `gameOver` becomes true.

**Fix**: Add an effect in `OnlinePokerTable.tsx` that, when `gameOver` becomes true, inserts a record into `poker_play_results` and `xp_events` similar to the practice game logic. This should run once using a `savedRef` pattern.

### 3. No Stats Saved for Multiplayer Games

Same root cause as issue 2 -- no `poker_play_results` insert happens for multiplayer. Player career stats (hands played, wins, best hand) are never persisted for online games.

**Fix**: Combined with issue 2.

---

## GAMEPLAY FLOW ISSUES

### 4. Deal Animation Sprites Fly to Wrong Positions

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 917-937)

The deal sprite uses CSS custom properties `--deal-dx` and `--deal-dy` calculated as:
```
--deal-dx: ${pos.xPct - 50}vw
--deal-dy: ${pos.yPct - 2}vh
```

The unit is `vw` and `vh` but the seat positions (`pos.xPct`, `pos.yPct`) are percentages of the **table wrapper**, not the viewport. Since the table wrapper is only ~79vw wide and ~82vh tall (not 100vw/100vh), the sprites overshoot their targets. For example, a seat at xPct=84 calculates `--deal-dx: 34vw` but the actual distance within the table is only ~34% of 79vw = ~27vw.

**Fix**: Change the units from `vw/vh` to container-relative units (`cqw/cqh`) since the table wrapper has `containerType: 'size'` set (line 826). This makes the sprite destinations match the percentage-based seat positions exactly:
```
--deal-dx: ${pos.xPct - 50}cqw
--deal-dy: ${pos.yPct - 2}cqh
```

### 5. Dealing Order Not Truly Clockwise

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 917-937)

The deal sprite stagger uses `seatOrder = activeScreenPos.indexOf(screenPos)` which is the order of *screen positions* (hero-rotated), not the actual clockwise order from the dealer. In a real poker game, cards are dealt starting from the player to the left of the dealer. The current code deals in screen-order (starting from the hero at the bottom), which visually doesn't match the clockwise-from-dealer expectation.

**Fix**: Reorder `activeScreenPos` so that dealing starts from the seat immediately after the dealer seat (clockwise). Calculate the dealer's screen position and rotate the deal order array so the first seat dealt to is the one after the dealer.

### 6. Community Cards Position Slightly Low

**File**: `src/components/poker/OnlinePokerTable.tsx` (line 841)

Community cards are at `top: '48%'` which places them slightly below center. For a standard poker table layout, `42-44%` would better center them within the felt area (accounting for the dealer character above and the phase label below at 68%).

**Fix**: Adjust to `top: '44%'`.

---

## RACE CONDITIONS & TIMING

### 7. Winner Delay Uses Wrong Reference for Runout Detection

**File**: `src/hooks/useOnlinePokerTable.ts` (lines 265-275)

The runout detection reads `prevCommunityCount` from `tableStateRef.current?.current_hand?.community_cards?.length`. However, this ref is updated by the `game_state` broadcast handler (line 195-214) which may fire *before* the `hand_result` handler. If the `game_state` broadcast with 5 community cards arrives first, `prevCommunityCount` would already be 5, and the runout would NOT be detected.

The `hand_result` payload does NOT include `community_cards` -- checking `payload.community_cards` is always undefined/empty, so `incomingCommunityCount` is 0. This means the runout detection is unreliable.

**Fix**: Instead of comparing community card counts, detect runout by checking if the `hand_result` includes `revealed_cards` (showdown happened) AND the phase transition jumped past normal betting (check if there are all-in players in the seat data). A simpler approach: check if `revealed_cards.length > 0` (showdown) and the `game_state` that just arrived had phase jump from preflop/flop/turn directly to complete.

### 8. Potential Auto-Deal Race When Showdown Timer Finishes

**File**: `src/hooks/useOnlinePokerTable.ts` (lines 487-511)

The auto-deal logic has a leader election (lowest seated player), but after the showdown timer clears the hand (line 292-302), `autoStartAttempted` is reset to `false` (line 301). Multiple players could then race to start the next hand. The leader election mitigates this, but there's a window where the state update hasn't propagated and both players could call `startHand`. The server protects against this with `activeHand` check (line 187-200 of poker-start-hand), so it's safe but causes unnecessary 400 errors.

**Status**: Acceptable -- server-side guard prevents actual issues. No fix needed.

---

## POLISH & UX

### 9. `hand_result` Broadcast Missing `community_cards`

**File**: `supabase/functions/poker-action/index.ts` (lines 618-628)

The `hand_result` broadcast payload does not include `community_cards`. This is needed by the client for:
1. Runout detection (issue 7)
2. Hand history finalization (community cards are read from `tableState` which may be stale)

**Fix**: Add `community_cards: communityCards` to the `hand_result` broadcast payload.

### 10. Seat Status Reset After Fold

**File**: `supabase/functions/poker-action/index.ts` (line 524, 530-535)

After a hand completes, seat statuses are reset to `active` even if a player folded:
```
status: s.status === "all-in" ? "active" : s.status === "folded" ? "active" : s.status
```
This is correct behavior (fold is hand-level, not seat-level), but the broadcast at line 598 sends `status: s.status` which is the *hand-level* status (including "folded"). The client then shows these seats as folded even after the hand ends, until the next `refreshState()`.

**Status**: Minor -- the showdown timer forces a `refreshState` via auto-deal, which corrects this. But it causes a brief visual flicker. Could be improved by having the client reset fold status locally when hand clears.

### 11. Game Over Overlay Missing Stats for Multiplayer

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 896-900)

The `WinnerOverlay` for game over passes no `stats` prop:
```tsx
<WinnerOverlay winners={...} isGameOver={true} onNextHand={...} onQuit={...} />
```

The practice game passes `stats` with handsPlayed, handsWon, bestHandName, biggestPot, and duration. The multiplayer version doesn't track these, so the game over screen shows no stats. `handsPlayedRef.current` is tracked but never used.

**Fix**: Pass a `stats` object using the refs already tracked: `handsPlayedRef.current`, `winStreakRef.current`, etc. Track `handsWon` and `bestHandName` in refs similarly to the practice game.

### 12. Deal Sprite Animation Uses `vw/vh` Mismatch

Already covered in issue 4 above. The `deal-card-fly` animation in CSS (index.css line 707-711) uses `var(--deal-dx)` and `var(--deal-dy)` which are set with `vw/vh` units but should be `cqw/cqh`.

### 13. `hand_result` `community_cards` in Staged Runout

**File**: `src/components/poker/OnlinePokerTable.tsx` (lines 460-486)

The staged runout effect reads `tableState?.current_hand?.community_cards`. During an all-in runout, the server sends all 5 cards at once in the `game_state` broadcast, then immediately sends `hand_result`. The staged effect correctly reveals them over 3 seconds. However, if the `hand_result` handler sets the phase to `complete` (line 281), the community cards ref might get nulled before the staged reveal finishes when the showdown timer fires.

**Status**: The showdown timer is set to 8.5s for runouts (line 290), which is well after the 3s staged reveal. No fix needed.

---

## FIX PRIORITY & FILE CHANGES

| Priority | Issue | Files to Change |
|----------|-------|-----------------|
| P0 | 1. Hand history actions incomplete | `useHandHistory.ts`, `OnlinePokerTable.tsx` |
| P0 | 2+3. No XP/stats for multiplayer | `OnlinePokerTable.tsx` |
| P1 | 4+12. Deal sprites overshoot targets | `OnlinePokerTable.tsx` (CSS vars), `index.css` |
| P1 | 5. Deal order not clockwise from dealer | `OnlinePokerTable.tsx` |
| P1 | 9. `hand_result` missing community_cards | `poker-action/index.ts` |
| P1 | 7. Runout detection unreliable | `useOnlinePokerTable.ts` |
| P2 | 6. Community cards position | `OnlinePokerTable.tsx` |
| P2 | 11. Game over missing stats | `OnlinePokerTable.tsx` |

### Implementation Summary

1. **`supabase/functions/poker-action/index.ts`**: Add `community_cards` to `hand_result` broadcast payload
2. **`src/hooks/useOnlinePokerTable.ts`**: Fix runout detection to use the `hand_result` payload's `community_cards` instead of comparing against stale ref
3. **`src/hooks/useHandHistory.ts`**: Add a `populateActions` method that fetches the full action log from the server
4. **`src/components/poker/OnlinePokerTable.tsx`**:
   - Fix deal sprite CSS vars from `vw/vh` to `cqw/cqh`
   - Reorder deal stagger to start from dealer+1 clockwise
   - Add XP/stats saving on game over
   - Pass stats to game over WinnerOverlay
   - Adjust community card vertical position
5. **`src/index.css`**: No changes needed (CSS vars come from JS)

