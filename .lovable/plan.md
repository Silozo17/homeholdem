
# Comprehensive Multiplayer Poker Overhaul

## Problems Identified (with root causes)

### 1. Cards disappear before game-over screen
**Root cause:** The showdown cleanup timer (`showdownTimerRef`) in `useOnlinePokerTable.ts` sets `current_hand: null` after 3.5-9s. This nullifies `community_cards`, which makes `visibleCommunityCards` go to `[]` (line 850: `if (newCount === 0)` clears everything). The game-over effect fires 4-5s later, but by then the cards are already gone from the UI.

**Fix:** When `gameOverPendingRef` is true, the showdown timer must NOT set `current_hand: null`. Only clear `current_hand` after the game-over screen has been acknowledged (Play Again / Leave).

### 2. Timing is absolute, not sequential
**Root cause:** Throughout the code, delays are hardcoded from `Date.now()` rather than chained. For example:
- Winner overlay appears after `winnerDelay` (0 or 5500ms from hand_result)
- Showdown cleanup fires at `showdownDelay` (3500 or 9000ms from hand_result)
- Game-over fires 4000ms from when handWinners are set
- These all start independently from the same event, creating races

**Fix:** Replace the parallel-timer architecture with a sequential state machine for the end-of-hand flow. One timer triggers the next step, not absolute delays from a single origin.

### 3. Voice: "All in! PlayerName is all in!" (redundant + self-hearing)
**Root cause:** Line 559: `announceCustom(\`All in! ${playerName} is all in!\`)` -- double phrasing. Also, no guard for `playerId === user.id` so the player hears their own all-in.

**Fix:** Change to `announceCustom(\`${playerName} went all in\`)` and add `if (playerId === user?.id) continue;` to skip self-announcements.

### 4. Lag when player joins/leaves
**Root cause:** When `seat_change` with `action === 'join'` arrives during no active hand, it calls `refreshState()` (full HTTP round-trip). The 2-second debounce on `refreshState` means the first call may be skipped if another happened recently, causing a visible delay.

**Fix:** For `join` events (no active hand), apply the seat locally from the broadcast payload immediately (same as the mid-hand join handler already does), then do `refreshState()` in the background. This gives instant visual feedback.

### 5. Losing players: long delay + remain seated
**Root cause:** Even with the `gameOverPendingRef` fix, the loser detection still waits 4 seconds (`setTimeout(..., 4000)` at line 680). The `leaveSeat()` call happens in a separate effect (line 818) that only triggers when `gameOver` becomes true. So the sequence is: bust detected -> 4s wait -> `gameOver = true` -> `leaveSeat()`. Total delay: 4+ seconds.

**Fix:** Reduce the loser game-over delay to match the winner overlay display time. The flow should be: winner announced (0.5s after river) -> game-over screen 3s later -> both players unseated. Use sequential timing, not parallel.

### 6. Hand history limited to 10
**Root cause:** `MAX_HANDS = 20` in `useHandHistory.ts` and it fetches full action logs from the server on every finalize (an async DB query per hand).

**Fix:** Change `MAX_HANDS` to `10`. Also skip the server action fetch (it's redundant since HandReplay only shows showdown results, not step-by-step actions per the memory context).

### 7. Additional performance issues found
- **`finalizeHand` fetches `poker_actions` from DB on every hand result** (line 124-143 of useHandHistory.ts). This is an unnecessary network call per hand since the HandReplay UI only shows final showdown results.
- **`refreshState` debounce is 2s** but multiple code paths call it (seat_change join, timeout polls, reconnections). The debounce is too aggressive -- it silently drops legitimate refreshes.
- **`seatsKey` string recomputation** on every render (line 927) -- minor but creates GC pressure.

---

## The Fix: Sequential End-of-Hand State Machine

Replace the current parallel-timer chaos with a clean sequential flow:

```text
hand_result arrives
  |
  v
[1] Set revealedCards + update seat stacks (immediate)
  |
  v
[2] If all-in runout: stage flop(0ms) -> turn(2s) -> river(4s)
  |  Winner delay = 5.5s (for runout) or 0s (normal)
  v
[3] Show winner overlay + voice announcement (simultaneous)
  |  Wait 3s
  v
[4] If game over (any player busted): show game-over screen
  |  Both players unseated via leaveSeat()
  |  Cards remain visible until player acts (Play Again / Leave)
  v
[5] If NOT game over: clear hand state, prepare for next hand
```

---

## Detailed Changes

### File 1: `src/hooks/useOnlinePokerTable.ts`

**Change A: Showdown timer respects gameOverPending for current_hand too**

In the showdown timer (line 431-443), when `gameOverPendingRef.current` is true, skip BOTH `setHandWinners([])` AND `setTableState(prev => ({...prev, current_hand: null}))`. This keeps community cards visible.

**Change B: Same for the fallback cleanup at line 288-299**

Apply the same guard.

### File 2: `src/components/poker/OnlinePokerTable.tsx`

**Change A: Fix all-in voice announcement (line 547-563)**
- Change format from `"All in! ${playerName} is all in!"` to `"${playerName} went all in"`
- Add `if (playerId === user?.id) continue;` to skip self

**Change B: Reduce loser game-over delay from 4s to 3s (line 674-684)**
- Change `setTimeout(..., 4000)` to `setTimeout(..., 3000)` for loser
- Change winner delay from `5000` to `3000` for consistency

**Change C: Clean up state on Play Again (line 1617-1634)**
- Also reset `gameOverPendingRef.current = false` when playing again
- Call `refreshState()` after reset to get fresh table state

**Change D: Clean up state on Leave (line 1636-1639)**
- Reset `gameOverPendingRef.current = false`

### File 3: `src/hooks/useHandHistory.ts`

**Change A: Reduce MAX_HANDS from 20 to 10 (line 34)**

**Change B: Remove the server action fetch in finalizeHand (lines 122-143)**
- Skip the `supabase.from('poker_actions')` query entirely
- Just use the locally recorded actions (already available)
- This eliminates one DB round-trip per hand

### File 4: `src/hooks/useOnlinePokerTable.ts` (seat_change handler)

**Change: Instant local join for non-hand-active state (line 349-379)**
- Currently, `join` during no active hand falls through to `refreshState()` (line 379)
- Instead, apply the seat locally first (same pattern as mid-hand join at line 355-376), THEN call `refreshState()` in background
- This gives instant visual feedback for joins

---

## Summary Table

| # | Issue | File | Change |
|---|-------|------|--------|
| 1 | Cards disappear | useOnlinePokerTable.ts | Showdown timer skips `current_hand: null` when gameOverPending |
| 2 | All-in voice format + self-hearing | OnlinePokerTable.tsx | Fix format, skip self announcements |
| 3 | Loser delay too long | OnlinePokerTable.tsx | Reduce from 4s/5s to 3s |
| 4 | Join/leave lag | useOnlinePokerTable.ts | Apply join locally, then refresh in background |
| 5 | Hand history too large | useHandHistory.ts | MAX_HANDS=10, remove server action fetch |
| 6 | Play Again doesn't reset pending ref | OnlinePokerTable.tsx | Reset gameOverPendingRef + refreshState |

## What Does NOT Change
- No edge function changes
- No database schema changes  
- No UI/style/layout/navigation changes
- No changes to the bottom navigation
- No changes to card animations, deal animations, or seat layout
- No changes to voice chat, achievements, XP, or betting controls
