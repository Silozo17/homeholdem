
# Multiplayer Poker: Root Cause Analysis and Comprehensive Fix

## The Fundamental Problem

There is ONE root cause behind most of the reported issues: **a race condition between two independent broadcasts**.

The server sends `game_state` (with community cards) and `hand_result` (with winners) as **separate** broadcasts. They can arrive in **any order**. The current code assumes `game_state` always arrives first (to set `wasRunoutRef`), but this is not guaranteed.

When `hand_result` arrives BEFORE `game_state`:
- `wasRunoutRef` is still `false`, so `winnerDelay = 0`
- Winners are shown immediately (before ANY cards are staged)
- Chip animation fires immediately (before river)
- Game-over detection fires immediately (stack=0 seen before cards shown)
- The game appears to "auto-end" on all-in

This single race condition causes issues 1, 3, 4, and 5 from the user's report.

---

## Issue-by-Issue Breakdown

### Issue 1: Winner announcement delayed ~3s after river (normal play)
**Root cause:** For normal play (not all-in), `winnerDelay = 0` (correct), but the voice effect adds a separate `voiceDelay = 1000ms` (line 527 of OnlinePokerTable.tsx). The overlay appears instantly, but voice comes 1s later. User wants both at 0.5s after the last card.

**Fix:** Add a 500ms base delay for ALL winner displays (overlay + voice simultaneously). Remove the separate 1000ms voice delay.

### Issue 2: Voice announcements not playing
**Root cause:** Line 592-595 of OnlinePokerTable.tsx calls `clearQueue()` every time `hand_id` changes. This clears BOTH the queue AND the `announcedThisHandRef` set. If auto-deal starts a new hand quickly (within seconds of the previous result), the `clearQueue` wipes any in-progress voice fetch/playback from the previous hand. Additionally, the voice announcement is enqueued 1000ms after `handWinners` is set, but the showdown cleanup can clear `handWinners` at 3500ms, causing the effect dependencies to change and potentially cancel the timer.

**Fix:** Change `clearQueue` call to only clear `announcedThisHandRef` (not the queue itself), so in-flight audio continues. Fire voice announcement at the same time as the winner overlay (not 1s later).

### Issue 3: Chips fly before river on all-in
**Root cause:** The race condition. `hand_result` arrives before `game_state`, so `wasRunoutRef = false`, `winnerDelay = 0`, `handWinners` is set immediately, and the chip animation effect fires immediately.

**Fix:** Detect runout directly in the `hand_result` handler using its own payload data, not `wasRunoutRef`.

### Issue 4: Game auto-ends on all-in
**Root cause:** Same race condition. `handWinners` is set immediately (delay=0), game-over effect detects stack=0, fires the 3s game-over timer. The player sees game over before cards are even shown.

**Fix:** With the corrected winner delay (5.5s for runout), game-over detection will only fire AFTER all cards are staged and winner is displayed.

### Issue 5: Losing players see delayed game-over + remain seated
**Root cause:** The `leaveSeat()` call at line 820 fires when `gameOver` becomes true, which itself is delayed 3s after winner overlay. The `gameOverPendingRef` guard works correctly but the total time (winner delay + 3s) can feel long. Additionally, both players should be unseated the moment the game-over screen appears, not after XP save.

**Fix:** Keep the 3s delay (this is correct per user's specification). Ensure `leaveSeat()` fires reliably when game-over is set.

### Issue 6: Hand history (already fixed)
MAX_HANDS is already 10, server fetch already removed. No changes needed.

---

## The Fix: Self-Contained Runout Detection in hand_result

Instead of relying on `wasRunoutRef` (set by `game_state` which may not have arrived), detect runout directly from the `hand_result` payload:

```text
hand_result arrives with payload.community_cards
  |
  v
Check: how many community cards does the current state already have?
  currentCount = tableStateRef.current?.current_hand?.community_cards?.length ?? 0
  resultCount = payload.community_cards?.length ?? 0
  |
  v
If currentCount < 3 and resultCount >= 5:
  -> Full runout (preflop all-in). Delay = 5500ms (flop@0 + turn@2s + river@4s + 1.5s)
If currentCount < 4 and resultCount >= 5:
  -> Partial runout (flop all-in). Delay = 3500ms (turn@0 + river@2s + 1.5s)
If currentCount < 5 and resultCount >= 5:
  -> River only. Delay = 1500ms
Else:
  -> Normal hand (all cards already shown). Delay = 500ms
```

This is completely self-contained -- no dependency on broadcast ordering.

---

## Detailed Changes

### File 1: `src/hooks/useOnlinePokerTable.ts`

**Change A: Self-contained runout detection in hand_result handler (lines 381-440)**

Replace the current `wasRunoutRef`-dependent logic with payload-based detection:

```typescript
// BEFORE (broken):
const winnerDelay = wasRunoutRef.current ? 5500 : 0;
wasRunoutRef.current = false;

// AFTER (self-contained):
const currentCommunity = tableStateRef.current?.current_hand?.community_cards?.length ?? 0;
const resultCommunity = (payload.community_cards || []).length;

let winnerDelay = 500; // Default: 0.5s after last card for normal hands
if (resultCommunity >= 5 && currentCommunity < 3) {
  winnerDelay = 5500; // Full runout: flop(0) + turn(2s) + river(4s) + 1.5s buffer
} else if (resultCommunity >= 5 && currentCommunity < 4) {
  winnerDelay = 3500; // Turn+river staging
} else if (resultCommunity >= 5 && currentCommunity < 5) {
  winnerDelay = 1500; // Just river staging
}
```

Also remove `wasRunoutRef` entirely (lines 96, 236-239, 405) as it's no longer needed.

**Change B: Showdown delay matches winner delay**

Currently `showdownDelay` is calculated separately from `winnerDelay`. Align them: showdown cleanup = winnerDelay + 3500ms (winner visible for 3s + buffer).

### File 2: `src/components/poker/OnlinePokerTable.tsx`

**Change A: Voice announcement fires with winner overlay, not 1s later (lines 522-545)**

Remove the separate `voiceDelay = 1000` timer. Instead, fire the voice announcement immediately when `handWinners` changes (the delay is already baked into when `handWinners` is set by the hook).

```typescript
// BEFORE:
const voiceDelay = 1000;
const timer = setTimeout(() => { ... announceCustom(...) ... }, voiceDelay);

// AFTER:
// No delay -- handWinners is already delayed by the hook (500ms or 5500ms)
for (const winner of handWinners) {
  // ... same announcement logic, just no setTimeout wrapper
}
```

**Change B: clearQueue on new hand -- only clear announcedThisHandRef, not the queue (lines 592-595)**

```typescript
// BEFORE:
if (handId) clearQueue();

// AFTER:
// Don't wipe the queue (in-flight audio should finish).
// clearQueue is still available for explicit use (e.g., play again).
// The per-hand dedup set will naturally be fresh for the new hand.
```

Actually, looking more carefully: `clearQueue` clears both `queueRef` and `announcedThisHandRef`. We want to clear `announcedThisHandRef` (so the new hand's announcements aren't blocked) but NOT wipe the queue (so the previous hand's winner announcement finishes playing). 

The fix is to add a new function `resetHandDedup` to the voice hook that only clears `announcedThisHandRef`, and call that instead of `clearQueue` on new hand.

**Change C: No other timing changes needed for game-over**

The current game-over delay (3s after handWinners set) is correct. With the winner delay fix, the full timeline becomes:
- Normal hand: winner at 0.5s after result, game-over at 3.5s after result
- All-in runout: winner at 5.5s after result (1.5s after river staged), game-over at 8.5s

### File 3: `src/hooks/usePokerVoiceAnnouncements.ts`

**Change: Add `resetHandDedup` function**

```typescript
const resetHandDedup = useCallback(() => {
  announcedThisHandRef.current.clear();
}, []);
```

Expose this alongside `clearQueue` in the return value.

---

## Summary Table

| # | Issue | Root Cause | File | Fix |
|---|-------|-----------|------|-----|
| 1 | Winner overlay timing | No delay for normal hands | useOnlinePokerTable.ts | 500ms base delay for all winners |
| 2 | Voice not playing | clearQueue wipes in-flight audio on new hand | OnlinePokerTable.tsx + usePokerVoiceAnnouncements.ts | New resetHandDedup function; remove 1s voice delay |
| 3 | Chips fly before river | Race: hand_result before game_state | useOnlinePokerTable.ts | Self-contained runout detection from payload |
| 4 | Game auto-ends on all-in | Same race condition | useOnlinePokerTable.ts | Same fix -- correct winnerDelay prevents premature game-over |
| 5 | Loser delay + remains seated | Chained from issues above | Already correct | No change needed (leaveSeat fires on gameOver=true) |

## What Does NOT Change
- No edge function changes
- No database schema changes
- No UI/style/layout/navigation changes
- No changes to the bottom navigation
- No changes to card staging animation logic (lines 831-857)
- No changes to deal animation, seat layout, or game-over screen UI
- No changes to XP, achievements, or hand history (already fixed)
- `wasRunoutRef` is removed (dead code after fix)
- `prevCommunityAtResultRef` is removed (dead code after fix)
