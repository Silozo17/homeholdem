
# Multiplayer Poker System — Full Production-Readiness Audit

---

## 0) System Overview

### Architecture

```text
Client (React SPA)
  |
  |-- useOnlinePokerTable.ts (core state hook)
  |     |-- HTTP calls via callEdge() --> Edge Functions
  |     |-- Realtime channel (poker:table:{id}) --> Broadcasts
  |
  +-- OnlinePokerTable.tsx (1444-line rendering component)
        |-- PlayerSeat, BettingControls, CardDisplay, etc.

Edge Functions (Deno / Supabase)
  poker-create-table   POST  create table + auto-seat creator
  poker-join-table     POST  validate + insert seat + broadcast
  poker-leave-table    POST  delete seat + broadcast (+ cascade if empty)
  poker-start-hand     POST  deal cards, post blinds, broadcast
  poker-action         POST  validate + apply + commit_poker_state RPC + broadcast
  poker-check-timeouts POST  find stuck hands, force-fold, auto-kick
  poker-timeout-ping   POST  forward to poker-action as forced fold
  poker-table-state    GET   full state snapshot for client
  poker-my-cards       GET   RLS-filtered hole cards for requesting player
  poker-moderate-table POST  kick/close by creator

Database RPCs
  commit_poker_state     atomic version-gated state update
  read_poker_hand_state  read hand + seats for action processing
  read_showdown_cards    read all hole cards for evaluation

Realtime Broadcasts (poker:table:{id})
  game_state    full hand state after every action
  hand_result   winners + revealed cards at showdown
  seat_change   join/leave/kicked/table_closed
  blinds_up     blind level increased
  chat_emoji    quick chat messages
  presence      online/offline tracking
```

### Sources of Truth

| Data | Authority |
|------|-----------|
| Hand state (phase, pots, actor) | `poker_hands` table, gated by `commit_poker_state` version check |
| Seat stacks | `poker_seats` table, updated atomically via `commit_poker_state` |
| Hole cards | `poker_hole_cards` table, RLS-restricted per player |
| Fold/all-in status | `poker_actions` log (derived per-hand, not stored on seat) |
| Client display state | Local React state, updated via broadcasts + HTTP snapshots |

### State Flow: Join -> Hand -> Actions -> Showdown -> Complete -> Next Hand -> Leave

1. Player calls `poker-join-table` -- seat inserted as `sitting_out`
2. Leader client detects 2+ players, no active hand -- calls `poker-start-hand`
3. `poker-start-hand` activates `sitting_out` players (if joined > 3s ago), deals cards, posts blinds, broadcasts `game_state`
4. Each action: client calls `poker-action` -- server validates, applies, calls `commit_poker_state`, broadcasts `game_state`
5. When round completes: server deals community cards, advances phase
6. On showdown/fold-win: server evaluates hands, distributes pots, broadcasts `game_state` (phase=complete) + `hand_result`
7. Client receives `hand_result`, shows winners for 3.5-6s, then clears hand state
8. `autoStartAttempted` resets, leader triggers next `poker-start-hand`
9. On leave: `poker-leave-table` deletes seat, broadcasts `seat_change`

---

## 1) Contracts and Invariants

| # | Invariant | Status | Proof |
|---|-----------|--------|-------|
| I1 | Only players with hole cards for the current hand can act | ENFORCED | `poker-action/index.ts:195-196` validates player is seated; `poker-start-hand` only deals to active players |
| I2 | Seat participant list must not change mid-hand in a way that affects action resolution | PARTIALLY VIOLATED | See issue MH-1 below |
| I3 | Broadcasts must not regress state_version | ENFORCED on client | `useOnlinePokerTable.ts:192-194` skips stale broadcasts |
| I4 | Client must not rebuild/replace hand state mid-animation | PARTIALLY VIOLATED | See issue CL-1 below |
| I5 | Leaving player must not blank other clients' state | ENFORCED | `seat_change` leave handler does local-only update (line 264-277) |
| I6 | Timeout handling must be idempotent under retries | PARTIALLY VIOLATED | See issue SV-3 below |
| I7 | Only one active hand per table | ENFORCED | Unique partial index `one_active_hand_per_table` + 23505 catch |
| I8 | XP writes must succeed or be logged | NOT ENFORCED | See issue XP-1 below |

---

## 2) Issue Catalogue

### MH-1: Mid-hand join still disrupts via `game_state` broadcast seat replacement

- **Severity**: P0
- **Symptom**: Player joins mid-hand, existing players see card refresh / seat shift. Reported on Testing table with Julia joining late.
- **Repro**: Player A and B are in a hand. Player C joins seat. Next `poker-action` broadcast includes `seats` array that only contains players from `seatStates` (built from ALL `poker_seats` rows). The new joiner appears in the broadcast seats array with `has_cards: true` (line `poker-action/index.ts:622` sets `has_cards: s.status !== "folded"` -- a `sitting_out` player is NOT folded, so `has_cards = true`).
- **Root Cause**: `poker-action/index.ts:243-277` builds `seatStates` from ALL seats at the table (including `sitting_out`). At line 248-249, `sitting_out` is mapped to `"folded"`, BUT the broadcast at line 611-623 maps all seatStates and at line 622 sets `has_cards: s.status !== "folded"`. Since the sitting_out player WAS mapped to "folded" at line 249, this part is actually correct for the action broadcast. HOWEVER the critical problem is at line 243: `setTableState` merges `seats: seats.length > 0 ? seats : prev.seats` -- the broadcast `seats` array replaces the ENTIRE local seat list. If the broadcast includes the mid-hand joiner (it does, since `seatStates` is built from all `poker_seats` rows), the client rebuilds its seat array, potentially re-triggering deal animations.
- **Proof**: `poker-action/index.ts:243-277` -- `seatStates` is built from `seats` which is ALL `poker_seats` for the table. Line 611: broadcast includes all seatStates. Client `useOnlinePokerTable.ts:243`: `seats: seats.length > 0 ? seats : prev.seats` -- full replacement.
- **Fix**: In `poker-action/index.ts`, filter seatStates to only include players who have hole cards for this hand (same approach as `poker-table-state`). Alternatively, exclude `sitting_out` players from the broadcast seats array.
- **Risk**: Low -- additive filter

### MH-2: `poker-check-timeouts` broadcasts `has_cards: true` for sitting_out players

- **Severity**: P0
- **Symptom**: Same as MH-1 but triggered by timeout processing
- **Root Cause**: `poker-check-timeouts/index.ts:200-202` and line 326-338 both set `has_cards: s.status !== "folded"`. Sitting_out players mapped to "folded" at line 98, so this should be correct. BUT line 190-203 builds broadcast seats from ALL seatStates (including sitting_out mapped to folded). The client receives these seats and replaces its local array.
- **Proof**: `poker-check-timeouts/index.ts:190-203` and `326-338`
- **Fix**: Same as MH-1 -- exclude sitting_out from broadcast seats, or set `has_cards` based on actual hole card records.
- **Risk**: Low

### CL-1: `game_state` broadcast replaces entire seat array mid-animation

- **Severity**: P1
- **Symptom**: Card deal animations restart or jump when a broadcast arrives during dealing phase
- **Root Cause**: `useOnlinePokerTable.ts:243` does `seats: seats.length > 0 ? seats : prev.seats`. Every `game_state` broadcast includes seats, so every action replaces the full seat array. The component uses `seatsKey` memo (line 709) which triggers re-render of all PlayerSeat components.
- **Proof**: `useOnlinePokerTable.ts:243`, `OnlinePokerTable.tsx:709`
- **Fix**: During `dealing` state, only update seat stacks/bets from broadcast, don't replace the array. Or: prevent deal animation re-trigger by checking `prevAnimHandIdRef`.
- **Risk**: Medium -- requires careful merge logic

### CL-2: `seatsKey` memo key causes full re-render on every action

- **Severity**: P1
- **Symptom**: Performance lag, especially on low-end mobile
- **Root Cause**: `OnlinePokerTable.tsx:709` -- `seatsKey` is computed from ALL seat properties including `current_bet` and `last_action`. Every action changes at least one seat's `current_bet`, invalidating the memo and re-rendering ALL seats.
- **Proof**: `OnlinePokerTable.tsx:709`
- **Fix**: Split `rotatedSeats` computation from seat data. Use stable seat identity (seat number + player_id) for the rotation, and pass changing data (stack, bet, action) as props to memoized PlayerSeat components.
- **Risk**: Medium

### SV-1: `poker-leave-table` mid-hand doesn't fold the leaving player

- **Severity**: P0
- **Symptom**: Player leaves mid-hand, their seat is deleted from DB, but the hand's `current_actor_seat` might still point to them. If the leaver was the current actor, the hand gets stuck until timeout (20s+). If 2 players and one leaves, the hand is force-completed at line 86-92, but without awarding pots or broadcasting results.
- **Root Cause**: `poker-leave-table/index.ts:85-92` -- when `remainingAfterLeave <= 1`, it force-completes the hand by directly updating `completed_at` without going through `commit_poker_state`. No pot distribution. No `hand_result` broadcast. No `game_state` broadcast with phase=complete. The remaining player's client will be stuck showing an active hand until the 6s cleanup timer fires (line 246-257 of `useOnlinePokerTable.ts`).
- **Proof**: `poker-leave-table/index.ts:85-92` -- just `update({ completed_at, phase: "complete" })`, no pot award, no broadcast
- **Fix**: When leaving mid-hand: (1) Insert a fold action for the leaver, (2) Call `poker-check-timeouts` or implement inline pot award + broadcast, (3) Or at minimum broadcast `game_state` with phase=complete and `hand_result` with pot awarded to remaining player
- **Risk**: Medium -- needs careful pot handling

### SV-2: `poker-start-hand` broadcast only includes `activePlayers`, not sitting_out joiners

- **Severity**: P1
- **Symptom**: After a new hand starts, the client's seat array from the broadcast only contains active players. Sitting_out players (mid-hand joiners from previous hand) disappear from the UI until the next `refreshState`.
- **Root Cause**: `poker-start-hand/index.ts:525` -- `seats: activePlayers.map(...)` only includes players who passed the activation check. Sitting_out players are excluded.
- **Proof**: `poker-start-hand/index.ts:525`
- **Fix**: Include ALL seated players in the broadcast (active + sitting_out), marking sitting_out with `has_cards: false`.
- **Risk**: Low

### SV-3: Timeout double-processing risk (timeout-ping + check-timeouts)

- **Severity**: P1
- **Symptom**: Same fold processed twice, potentially skipping the next player's turn or corrupting state
- **Root Cause**: Three timeout paths exist simultaneously:
  1. `poker-timeout-ping` (line 91-105): forwards to `poker-action` as fold (triggered by individual clients at deadline+2s)
  2. `poker-check-timeouts` (leader polls every 8s, stale recovery polls every 5s): independently finds stuck hands and folds
  3. `poker-action` line 206-210: if deadline passed and wrong player calls, also processes fold
  
  Path 1 and 3 both use `commit_poker_state` which has version gating -- safe against double-apply. BUT path 2 (`check-timeouts`) ALSO uses `commit_poker_state` with version gating. So all three are individually version-safe. The risk is when `timeout-ping` succeeds first (advancing version), then `check-timeouts` runs and gets `version_conflict` -- it logs it but continues to try auto-kicking. The auto-kick at line 371-401 runs UNCONDITIONALLY on seats with `consecutive_timeouts >= 1`, regardless of whether this invocation actually processed a timeout.
- **Proof**: `poker-check-timeouts/index.ts:371-401` -- kicks happen outside the hand-processing loop, based on seat state, not on whether THIS invocation folded someone
- **Fix**: The kick logic should only kick players whose timeout was actually processed by this invocation, not just any seat with `consecutive_timeouts >= 1`. Add a "kicked_this_run" set.
- **Risk**: Low

### SV-4: `poker-check-timeouts` resets folded/all-in status to "active" in seat updates

- **Severity**: P1
- **Symptom**: After a timeout fold, the DB seat status for folded/all-in players is reset to "active", which could confuse subsequent hand processing
- **Root Cause**: `poker-check-timeouts/index.ts:264-269` -- `dbSeatUpdates` maps `all-in` and `folded` back to `"active"`. This is intentional (fold/all-in is hand-level, tracked in actions), but it means the DB seat status doesn't reflect the current hand's fold state. This is consistent with `poker-action/index.ts:551-556` which does the same.
- **Proof**: Both files use the same pattern -- this is by design, not a bug. **NOT AN ISSUE**.

### DB-1: `commit_poker_state` resets folded seats to "active"

- **Severity**: Info
- **Root Cause**: By design. Fold/all-in is tracked in `poker_actions`, not in seat status. This is consistent across all edge functions.
- **Status**: Not a bug.

### CL-3: `refreshState()` during active hand replaces entire state

- **Severity**: P1
- **Symptom**: Full state replacement during active hand causes visual glitch
- **Root Cause**: `refreshState()` at `useOnlinePokerTable.ts:149-164` replaces `tableState` entirely with server response. Called by:
  - `joinTable` (line 464) -- always calls after join. SAFE because the joining player hasn't seen the hand yet.
  - `leaveTable` (line 469) -- called by leaving player. SAFE (they're leaving).
  - Stale recovery (line 621) -- called every 5s if no broadcast in 12s. MID-HAND DANGEROUS -- replaces seat array mid-animation.
  - `seat_change` join handler (line 308-309) -- only when no active hand. SAFE after recent fix.
- **Proof**: `useOnlinePokerTable.ts:149-164, 621`
- **Fix**: For stale recovery, merge server state rather than replace. Or flag that a refresh is happening and suppress animation re-triggers.
- **Risk**: Medium

### CL-4: Stale recovery calls `refreshState` + `check-timeouts` simultaneously

- **Severity**: P2
- **Symptom**: Redundant server calls, potential out-of-order state updates
- **Root Cause**: `useOnlinePokerTable.ts:620-621` calls both `check-timeouts` and `refreshState` in the same tick. The `check-timeouts` may modify state, then `refreshState` returns the pre-modification state, overwriting the timeout result.
- **Proof**: `useOnlinePokerTable.ts:618-621`
- **Fix**: Call `check-timeouts` first, then `refreshState` after a short delay (or await the check-timeouts response).
- **Risk**: Low

### CL-5: `joinTable` calls `refreshState` unconditionally

- **Severity**: P2
- **Symptom**: The joining player triggers a full state fetch. If another hand started between their join and the refresh, they get the new hand state.
- **Root Cause**: `useOnlinePokerTable.ts:464`
- **Fix**: Not critical -- the joining player expects a full state load. Mark as acceptable.

### XP-1: XP writes silently fail on RLS/constraint errors

- **Severity**: P1
- **Symptom**: XP not awarded, no error shown to user
- **Root Cause**: `OnlinePokerTable.tsx:559-583` -- `supabase.from('poker_play_results').insert(...)` and `supabase.from('xp_events').insert(...)` have no error handling. If RLS blocks the insert or a constraint fails, it's silently swallowed.
- **Proof**: `OnlinePokerTable.tsx:559` -- no `.then(({ error })` check. Line 583 -- same.
- **Fix**: Add error logging (`console.error`) for both inserts. Optionally show a toast.
- **Risk**: Low

### XP-2: XP can be awarded multiple times if `saveXpAndStats` is called from multiple paths

- **Severity**: P2
- **Symptom**: Double XP
- **Root Cause**: `xpSavedRef.current` guards against this (line 548), but the guard is only in the callback -- if React re-renders and creates a new closure before the ref is set, there's a theoretical race. In practice this is unlikely due to ref semantics.
- **Proof**: `OnlinePokerTable.tsx:548-550`
- **Status**: Acceptable -- ref guard is sufficient.

### CL-6: `processedActionsRef` never clears between hands for voice announcements

- **Severity**: P2
- **Symptom**: Voice announcement for all-in might not fire in subsequent hands if the same player goes all-in again
- **Root Cause**: `processedActionsRef` is cleared at line 650 (`processedActionsRef.current.clear()`) on new hand, BUT voice all-in detection at line 420-432 uses keys like `voice:${playerId}:${actionStr}:${handId}` which include handId -- so it IS unique per hand.
- **Status**: NOT AN ISSUE. Keys are hand-scoped.

### CL-7: `autoStartRetriesRef` blocks indefinitely after 3 failures

- **Severity**: P2
- **Symptom**: After 3 failed auto-start attempts, auto-dealing stops permanently until page reload
- **Root Cause**: `useOnlinePokerTable.ts:564` -- `autoStartRetriesRef.current < 3` check. After 3 failures, `autoStartAttempted` stays true and is never reset.
- **Proof**: `useOnlinePokerTable.ts:561-564`
- **Fix**: Reset `autoStartRetriesRef` on successful hand completion (e.g., in the `hasActiveHand` effect at line 576-583).
- **Risk**: Low

### CL-8: No guard against null `tableState` in many derived computations

- **Severity**: P2
- **Symptom**: Potential blank screen if `tableState` becomes null briefly
- **Root Cause**: `OnlinePokerTable.tsx:703-706` -- `table`, `seats`, `hand` are derived from `tableState` with fallbacks. But `table` can be null (line 703), and the component continues rendering. Line 767 has a guard: `if (error || !tableState || !table)` shows error screen.
- **Status**: Adequately guarded. NOT AN ISSUE.

### RT-1: `hand_result` has no version gating on client

- **Severity**: P1
- **Symptom**: If `hand_result` arrives before `game_state` with phase=complete, or arrives twice, winners could be shown multiple times
- **Root Cause**: `useOnlinePokerTable.ts:311-363` -- `hand_result` handler has no version check. It always sets `revealedCards`, `handWinners`, and updates `tableState`. If the same `hand_result` is received twice (e.g., check-timeouts and poker-action both complete the hand and both broadcast), the handler runs twice.
- **Proof**: `useOnlinePokerTable.ts:311` -- no version guard. Compare with `game_state` handler at line 189-194 which has version gating.
- **Fix**: Add `hand_result` deduplication by `hand_id`. If `hand_result.hand_id === prevHandIdRef.current` and winners already set, skip.
- **Risk**: Low

### RT-2: `game_state` and `hand_result` can arrive out of order

- **Severity**: P1
- **Symptom**: `hand_result` arrives first, sets phase to complete. Then `game_state` with phase=complete arrives, which passes version check (same version), and replaces seats again.
- **Root Cause**: Both events are broadcast sequentially in edge functions but network delivery is not guaranteed in order. The `game_state` handler at line 247-257 sets a showdown timer. The `hand_result` handler at line 346-362 also sets a showdown timer (overriding the first). This is actually safe -- the second timer overrides the first via `clearTimeout`.
- **Proof**: `useOnlinePokerTable.ts:247-257` and `346-362`
- **Status**: Acceptable -- timer override handles it correctly.

### ML-1: Mobile landscape betting panel overlaps seats on narrow screens

- **Severity**: P2
- **Symptom**: On iPhone SE landscape (568px width), the 160px betting panel can overlap right-side seats
- **Root Cause**: `OnlinePokerTable.tsx:1047` -- `panelW = isMobileLandscape && window.innerWidth < 900 ? 160 : 200`. Table width is `min(79vw, 990px)`. On 568px screen: table = 449px, panel = 160px, total = 609px > 568px. The panel uses `position: absolute; right: 0` (line 1272).
- **Proof**: `OnlinePokerTable.tsx:1047, 1055, 1272`
- **Fix**: Reduce `panelW` further on very narrow screens, or shrink table width to `79vw - panelW`.
- **Risk**: Low

### ML-2: Seat positions don't account for safe-area insets

- **Severity**: P2
- **Symptom**: On iPhones with notch/Dynamic Island in landscape, top seats (D, H at yPct=4) may be obscured
- **Root Cause**: `seatLayout.ts:49-59` -- coordinates are % of table wrapper, not viewport. The table wrapper itself is inside `TableStage` which applies `paddingTop: env(safe-area-inset-top)`. So safe areas ARE accounted for at the container level.
- **Status**: Adequately handled. NOT AN ISSUE.

### SV-5: `poker-action` processes fold for timed-out non-actor player

- **Severity**: P2
- **Symptom**: If player X's action arrives after deadline, AND player X is not the current actor, the server at line 206-210 processes a fold of the CURRENT ACTOR, not player X. This is by design for timeout-ping forwarding, but it means any player can trigger a forced fold of the current actor after deadline.
- **Root Cause**: `poker-action/index.ts:204-210`
- **Fix**: Add a flag to distinguish timeout-ping requests from regular actions. Only allow forced fold of another player's seat via explicit timeout mechanism.
- **Risk**: Low (requires deadline to have passed)

### SV-6: Auto-kick threshold is 1 timeout (too aggressive)

- **Severity**: P1
- **Symptom**: Player with brief network hiccup gets auto-kicked after a single timeout
- **Root Cause**: `poker-check-timeouts/index.ts:375` -- `.gte("consecutive_timeouts", 1)`. One timeout = kicked.
- **Proof**: `poker-check-timeouts/index.ts:375`
- **Fix**: Increase threshold to 2 or 3.
- **Risk**: Low

### CL-9: `inactivityTimer` fires `leaveTable` without checking if hand is active

- **Severity**: P2
- **Symptom**: Player auto-kicked mid-hand due to inactivity (2min idle), triggering SV-1
- **Root Cause**: `OnlinePokerTable.tsx:198-199` -- `leaveTable().then(onLeave)` fires regardless of hand state
- **Fix**: Skip inactivity kick if hand is active, or warn first
- **Risk**: Low

---

## 3) Top Root Causes (Ranked)

### RC-1: Broadcast seat arrays include ALL table players, not just hand participants
**Impact**: MH-1, MH-2, SV-2 -- mid-hand joiners appear in broadcasts with incorrect `has_cards`, causing client re-renders and visual disruption.
**Why worse on mobile**: Smaller screen means visual changes are more noticeable; re-renders on low-end devices cause lag.
**Fix**: In `poker-action` and `poker-check-timeouts` broadcasts, only include players who have hole cards for the current hand. Include sitting_out players separately with `has_cards: false`.

### RC-2: `poker-leave-table` mid-hand doesn't properly resolve the hand
**Impact**: SV-1 -- remaining player stuck, no pot award, no broadcast.
**Why worse on mobile**: Connection drops are more common on mobile, triggering leaves more frequently.
**Fix**: On mid-hand leave, fold the leaver, award pot if only 1 player remains, broadcast properly.

### RC-3: `hand_result` has no deduplication
**Impact**: RT-1 -- winners shown twice, confetti played twice.
**Fix**: Check `hand_id` against previous before processing.

### RC-4: Timeout auto-kick threshold too low (1 timeout)
**Impact**: SV-6 -- players kicked for brief network issues.
**Fix**: Increase to 2+.

### RC-5: XP inserts have no error handling
**Impact**: XP-1 -- silent data loss.
**Fix**: Add error logging.

---

## 4) Production Fix Plan

### P0 (Must-Fix: State Corruption / Freezes / Incorrect Gameplay)

**Fix 1: Broadcast seat filtering in `poker-action`**
- File: `supabase/functions/poker-action/index.ts`
- Lines: 594-629 (broadcast construction)
- Change: Query `poker_hole_cards` for current hand to get actual participants. Only include those players in broadcast seats. Include sitting_out as separate entries with `has_cards: false`, `status: 'sitting_out'`.
- Verify: Join Testing table mid-hand, check debug panel shows new player with `has_cards: false` and no card animation triggers.

**Fix 2: Broadcast seat filtering in `poker-check-timeouts`**
- File: `supabase/functions/poker-check-timeouts/index.ts`
- Lines: 170-225 and 306-360 (both broadcast blocks)
- Change: Same approach as Fix 1.
- Verify: Let a timeout fire mid-hand with a sitting_out player present.

**Fix 3: `poker-leave-table` mid-hand resolution**
- File: `supabase/functions/poker-leave-table/index.ts`
- Lines: 85-92
- Change: When leaving mid-hand with 1 opponent remaining: (1) Award total pot to remaining player via `commit_poker_state`, (2) Broadcast `game_state` phase=complete, (3) Broadcast `hand_result` with winner.
- Verify: In Testing table, player leaves mid-hand. Check remaining player receives pot and hand resolves.

**Fix 4: `hand_result` deduplication**
- File: `src/hooks/useOnlinePokerTable.ts`
- Lines: 311-363
- Change: At top of handler, check if `payload.hand_id` matches a recently processed hand_id ref. If so, skip.
- Verify: Force a hand to complete via timeout while action also completes it. Check winners overlay appears only once.

### P1 (Performance / Lag / UX)

**Fix 5: Auto-kick threshold increase**
- File: `supabase/functions/poker-check-timeouts/index.ts`
- Line: 375
- Change: `.gte("consecutive_timeouts", 2)` (or 3)
- Verify: Let one timeout fire. Player should NOT be kicked.

**Fix 6: `poker-start-hand` broadcast includes all seated players**
- File: `supabase/functions/poker-start-hand/index.ts`
- Lines: 525-541
- Change: Query ALL seats (not just activePlayers). Include sitting_out with `has_cards: false`.
- Verify: Sitting_out player visible in debug panel after hand starts.

**Fix 7: XP error handling**
- File: `src/components/poker/OnlinePokerTable.tsx`
- Lines: 559, 583
- Change: Add `.then(({ error }) => { if (error) console.error('XP write failed:', error); })` to both inserts.
- Verify: Check console for errors after game completion.

**Fix 8: Stale recovery race condition**
- File: `src/hooks/useOnlinePokerTable.ts`
- Lines: 618-621
- Change: Call `check-timeouts`, await it, then call `refreshState`.
- Verify: Disconnect/reconnect scenario doesn't show stale state.

### P2 (Cleanup / Hardening)

**Fix 9: `autoStartRetriesRef` reset on hand completion**
- File: `src/hooks/useOnlinePokerTable.ts`
- Line: 580
- Change: Add `autoStartRetriesRef.current = 0;` (already present -- confirmed at line 580. NOT AN ISSUE.)

**Fix 10: Mobile landscape panel width on iPhone SE**
- File: `src/components/poker/OnlinePokerTable.tsx`
- Line: 1047
- Change: Add check for `window.innerWidth < 600` to use 130px panel width.

**Fix 11: Inactivity kick guard**
- File: `src/components/poker/OnlinePokerTable.tsx`
- Line: 194-199
- Change: Check `tableStateRef.current?.current_hand` before kicking. If hand active, extend timer.

---

## 5) Verification and Test Strategy

### For P0 Fixes (without full MP environment)

1. **Debug panel validation**: All fixes should be testable on the Testing table. After each fix, join a second browser/device mid-hand and observe the debug panel for:
   - New player shows `has_cards: false`
   - No deal animation re-trigger
   - Seat count stays stable

2. **Broadcast payload logging**: Add `console.log('[BROADCAST]', event, payload)` behind `?debug=1` in the channel handler. Capture payloads before and after fixes.

3. **Replay approach**: Record broadcast payloads to localStorage when `?debug=1` is active. Add a "replay" mode that feeds saved payloads into the handlers sequentially to test ordering.

4. **Pass/fail checks for each P0 fix**:
   - Fix 1/2: Debug panel shows mid-hand joiner with `has_cards: false` and no card icon
   - Fix 3: After leaving mid-hand, remaining player's debug panel shows `phase: null` (hand cleared) and stack increased by pot
   - Fix 4: Set breakpoint in `hand_result` handler. Force double broadcast. Handler should skip second.

### Network throttling
- Use Chrome DevTools network throttling (3G) to test timeout scenarios
- Two browser tabs on same machine simulate multiplayer

---

## 6) Deliverables

### Audit Document
This document.

### Next Action Checklist
1. Approve Fix 1 + Fix 2 (broadcast seat filtering) -- highest impact, lowest risk
2. Approve Fix 3 (leave-table resolution) -- critical for correctness
3. Approve Fix 4 (hand_result dedup) -- prevents visual duplication
4. Approve Fix 5 (kick threshold) -- prevents unfair kicks
5. Approve remaining P1/P2 fixes

### Files Most Likely to Contain P0 Bugs
1. `supabase/functions/poker-action/index.ts` -- broadcast seats include sitting_out
2. `supabase/functions/poker-leave-table/index.ts` -- no pot award on mid-hand leave
3. `supabase/functions/poker-check-timeouts/index.ts` -- broadcast seats + auto-kick threshold
4. `src/hooks/useOnlinePokerTable.ts` -- hand_result deduplication missing

---

## Extra Requirements (Confirmations)

### Full state replacement points (mid-hand safety)

| Location | Trigger | Mid-Hand Safe? |
|----------|---------|----------------|
| `useOnlinePokerTable.ts:153` refreshState | HTTP poll / stale recovery / join / leave | DANGEROUS during active hand |
| `useOnlinePokerTable.ts:243` game_state broadcast | Every action | SAFE (version gated, but replaces seats) |
| `useOnlinePokerTable.ts:337-344` hand_result | Hand completion | SAFE (hand is ending) |
| `useOnlinePokerTable.ts:373-385` blinds_up | Blind increase | SAFE (only updates table, not seats) |

### Seat participant changes mid-hand

| Location | How | Safe? |
|----------|-----|-------|
| `poker-join-table` | Inserts seat as sitting_out | SAFE (not active) |
| `poker-leave-table:95` | Deletes seat from DB | DANGEROUS (seat disappears mid-hand) |
| `poker-check-timeouts:383-388` | Nulls seat player_id | DANGEROUS (mid-hand kick) |
| `poker-moderate-table:114` | Deletes seat | SAFE (only allowed when no active hand) |

### hand_result vs game_state version gating
- `game_state`: YES -- version gated at line 189-194
- `hand_result`: NO -- not version gated, no deduplication

### Timeout double-processing
- All three timeout paths use `commit_poker_state` which has version gating
- `version_conflict` prevents double-fold
- BUT auto-kick in `check-timeouts` runs unconditionally based on seat state, not tied to successful processing

### XP write failures
- No error handling on either `poker_play_results` or `xp_events` inserts
- Silent failure -- no logging, no user notification

### Blank screen risks
- `OnlinePokerTable.tsx:767` guards against null tableState/table with error screen
- `useOnlinePokerTable.ts:260-261` sets tableState to null on `table_closed` -- correctly handled by line 509-514 which navigates away
