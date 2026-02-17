

# Fix: 3 Multiplayer Poker Issues

## Issue 1: Action buttons appear before cards are dealt

**Root cause**: In `OnlinePokerTable.tsx` line 741, `showActions` is simply `isMyTurn && !actionPending && mySeat && mySeat.status !== 'folded'`. There is no deal animation grace period -- the buttons appear as soon as the server broadcasts that it is the player's turn, which happens instantly when the hand starts, while the card dealing animation (sprites flying from dealer to each seat) takes 3-5 seconds.

**Fix**: Add a `dealAnimDone` state (similar to the single-player fix in `PokerTablePro.tsx`):
- When a new hand starts (new `hand_id` detected at `preflop` phase), set `dealAnimDone = false`
- Calculate the total deal animation duration based on active player count: `((1 * activePlayers + (activePlayers - 1)) * 0.35 + 0.8) * 1000` ms
- After that delay, set `dealAnimDone = true`
- Gate `showActions` behind `dealAnimDone` so controls only appear after all cards are visually dealt

**File**: `src/components/poker/OnlinePokerTable.tsx`

---

## Issue 2: Deal card sprites should fade out before reaching the player, then cards appear at the player

**Root cause**: The `deal-card-fly` keyframe (line 706-711 in `index.css`) currently ends at `opacity: 0.9` -- the sprite remains visible when it lands at the player position. The user wants the sprite to fade out just before reaching the player, and then the card appears directly at the player's avatar position.

**Fix**: Modify the `deal-card-fly` keyframe so the card fades out around 70-80% of the animation, reaching `opacity: 0` at 100%. The actual card reveal at the player seat is already handled by `PlayerSeat`'s `revealedIndices` timer, so this change makes the visual transition clean: sprite fades out mid-flight, then card appears at the player.

```
@keyframes deal-card-fly {
  0% { transform: translate(0, 0) scale(0.5); opacity: 0.8; }
  40% { opacity: 1; }
  75% { opacity: 0.6; }
  100% { transform: translate(var(--deal-dx), var(--deal-dy)) scale(1); opacity: 0; }
}
```

**File**: `src/index.css`

---

## Issue 3: Emojis should float up slowly and fade out (max 5 seconds)

**Root cause**: The current `float-up` animation runs for 6 seconds and only moves `-20px` upward, barely noticeable. The `animate-emote-pop` class referenced for single emojis has no keyframe definition at all (missing from CSS). Emojis either use a missing animation or barely float.

**Fix**:
1. Update the `float-up` keyframe to drift upward more visibly (~40px) and fade out over the duration
2. Change the animation duration from 6s to 5s max
3. Add the missing `emote-pop` keyframe: a quick scale-up pop followed by slow upward drift and fade-out over 5s
4. Also update the chat bubble auto-removal timer in `useOnlinePokerTable.ts` from 6000ms to 5000ms to match

**Files**: `src/index.css`, `src/hooks/useOnlinePokerTable.ts`

---

## Technical Summary

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Add `dealAnimDone` state gating `showActions` behind deal animation completion |
| `src/index.css` | Fix `deal-card-fly` to fade out before landing; fix `float-up` to drift up more and last 5s; add missing `emote-pop` keyframe |
| `src/hooks/useOnlinePokerTable.ts` | Change chat bubble removal timer from 6000ms to 5000ms |

