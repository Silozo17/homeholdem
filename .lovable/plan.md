
# Complete Fix: All 7 Multiplayer Poker Issues

## Issue 1: End Game Screen + XP Not Shown After "Play Again"

**Root cause:** `xpSavedRef.current` stays `true` after clicking Play Again, so `saveXpAndStats` early-returns on subsequent games. All tracking refs keep their old values.

**Fix in `OnlinePokerTable.tsx` (lines 1401-1405):**

In the `onPlayAgain` handler, reset all session tracking refs:

```typescript
onPlayAgain={() => {
  setXpOverlay(null);
  setGameOver(false);
  setGameOverWinners([]);
  // Reset all session tracking for next game
  xpSavedRef.current = false;
  handsPlayedRef.current = 0;
  handsWonRef.current = 0;
  bestHandNameRef.current = '';
  bestHandRankRef.current = -1;
  biggestPotRef.current = 0;
  gameStartTimeRef.current = Date.now();
  winStreakRef.current = 0;
  chatCountRef.current = 0;
  startingStackRef.current = 0;
  // Re-fetch current XP as new baseline
  if (user) {
    supabase.from('player_xp').select('total_xp').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { startXpRef.current = data?.total_xp ?? 0; });
  }
}}
```

---

## Issue 2: Pot Hidden Under Dealer

**Root cause:** Pot positioned at `top: '20%'` (line 1302) overlaps with the dealer on some devices.

**Fix in `OnlinePokerTable.tsx` (line 1302):**

Change pot position from `top: '20%'` to `top: '28%'`.

---

## Issue 3: Voice Announcements Delayed / Repeating Into Next Game

**Root cause:** The voice queue is never flushed between hands. Stale items from previous hands play into the next. `STALE_MS` is too generous at 15s.

**Fix in `usePokerVoiceAnnouncements.ts`:**
- Add a `clearQueue` function that empties `queueRef.current`
- Reduce `STALE_MS` from `15000` to `8000`
- Expose `clearQueue` from the hook

**Fix in `OnlinePokerTable.tsx`:**
- Destructure `clearQueue` from the hook (line 127)
- Add an effect that calls `clearQueue()` when `hand_id` changes (clears stale announcements from previous hand)

---

## Issue 4: Winner Announced Before Community Cards Finish Dealing (CRITICAL)

**Root cause:** Two timing systems are not coordinated. The staged runout reveals cards at 0/1500/3000ms, but the winner overlay appears at 4000ms -- only 1s after the river starts its flip animation.

**Fix -- natural, slow runout:**

### `OnlinePokerTable.tsx` (staged runout, lines 787-813):
Change staged card timings from 1500/3000ms to 2000/4000ms for a more natural pace:
```typescript
// Turn at 2000ms (was 1500)
const t1 = setTimeout(() => setVisibleCommunityCards(communityCards.slice(0, 4)), 2000);
// River at 4000ms (was 3000)
const t2 = setTimeout(() => setVisibleCommunityCards(communityCards.slice(0, 5)), 4000);
```

### `useOnlinePokerTable.ts` (winner delay, lines 359-368):
Increase the runout winner delay to 5500ms (river at 4000 + 500ms flip + 1000ms viewing):
```typescript
const winnerDelay = wasRunout ? 5500 : 0;
```

### `useOnlinePokerTable.ts` (showdown cleanup, line 386):
Increase showdown delay to match:
```typescript
const showdownDelay = communityCount >= 5 ? 9000 : 3500;
```

### `OnlinePokerTable.tsx` (voice announcement, lines 521-553):
Simplify voice delay -- voice always speaks 1s after winner overlay appears (which is already properly delayed by the hook):
```typescript
let voiceDelay = 1000; // 1s after winner overlay
```

**Resulting timeline for pre-flop all-in:**
```text
0ms      - Flop (3 cards) appear
2000ms   - Turn card appears
4000ms   - River card appears
4500ms   - River card flip animation completes
5500ms   - Winner overlay shown
6500ms   - Voice announcement
9000ms   - Hand cleanup, next deal
```

---

## Issue 5: End Game Screen Should Not Scroll

**Root cause:** `XPLevelUpOverlay` uses `overflow-y-auto` and has no viewport constraints.

**Fix in `XPLevelUpOverlay.tsx`:**
- Remove `overflow-y-auto` from the outer container
- Add `max-h-[100dvh]` with `overflow-hidden`
- Reduce inner padding from `py-8` to `py-4`
- Reduce header text from `text-4xl` to `text-3xl`
- Reduce level badge from `w-10 h-10` to `w-8 h-8`
- Reduce win rate ring from `w-16 h-16` to `w-12 h-12` (SVG from 64x64 to 48x48)
- Reduce stat card padding from `p-3` to `p-2`
- Reduce spacing between sections

---

## Issue 6: Confetti Animation Laggy / Pieces Stuck

**Root cause:** 24 confetti elements with `animation-fill-mode: both` persist in the DOM indefinitely. After the animation ends, pieces stay in their final frame and never get removed.

**Fix in `src/index.css` (lines 707-712):**
- Add `will-change: transform, opacity` to `.animate-confetti-drift`
- Change fill mode to `forwards`

**Fix in `OnlinePokerTable.tsx`:**
- Reduce confetti count from 24 to 12 (line 925)
- Add a `showConfetti` state that auto-clears after 3 seconds:
  - Set `true` when hero wins a hand or game over with hero as winner
  - Auto-reset to `false` after 3s via `setTimeout`
  - Only render confetti when `showConfetti` is true (not perpetually tied to `handWinners`)

---

## Issue 7: Players Re-joining With Original Stack

This is correct, standard poker behavior. When a busted player clicks "Play Again", they re-join with the table's configured buy-in. Other players keep their earned stacks. No change needed.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/poker/OnlinePokerTable.tsx` | Reset all refs on Play Again (Issue 1); pot top 28% (Issue 2); clearQueue on new hand (Issue 3); staged runout 2000/4000ms + simplified voice delay (Issue 4); confetti count 12 + showConfetti auto-clear (Issue 6) |
| `src/hooks/useOnlinePokerTable.ts` | Winner delay 5500ms; showdown delay 9000ms (Issue 4) |
| `src/hooks/usePokerVoiceAnnouncements.ts` | Add clearQueue; reduce STALE_MS to 8000 (Issue 3) |
| `src/components/poker/XPLevelUpOverlay.tsx` | Compact layout for single viewport (Issue 5) |
| `src/index.css` | Confetti will-change + forwards fill mode (Issue 6) |

## What Does NOT Change

- No database or schema changes
- No navigation, bottom nav, or layout changes outside poker table
- No edge function changes
- No changes to game engine or hand evaluation
- No RLS policy changes
