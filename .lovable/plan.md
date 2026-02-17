
# Fix 4 Poker Game Issues

## Issue 1: Winner doesn't see winning animation, stays at table, no stats/XP

**Root Cause**: When the last hand completes and only 1 player has chips, `NEXT_HAND` transitions to `game_over`. But the winner overlay for `hand_complete` auto-advances to `NEXT_HAND` after 4.5s (line 547-551 in usePokerGame.ts), so the winner briefly sees the hand-complete banner, then immediately goes to `game_over`. The problem is the `game_over` overlay checks `winners` from `lastHandWinners`, but the `NEXT_HAND` reducer doesn't preserve `lastHandWinners` -- it just sets `phase: 'game_over'` with no winner data update.

Additionally, practice game results are never saved to `poker_play_results` and no XP is awarded.

**Fix**:
- In `usePokerGame.ts` `NEXT_HAND` case: when transitioning to `game_over`, populate `lastHandWinners` with the surviving player's data so the game-over overlay shows the correct winner.
- Add a `useEffect` in `PokerTablePro.tsx` (or `PlayPoker.tsx`) that saves results to `poker_play_results` and awards XP when `game_over` is reached, using the authenticated user's ID.

## Issue 2: Emojis/achievements jitter (auto-align to center)

**Root Cause**: `AchievementToast` uses `left-1/2 -translate-x-1/2` for centering, combined with `animate-fade-in` which includes `translateY(10px) -> translateY(0)`. The CSS `animate-fade-in` transform **overwrites** the `-translate-x-1/2` class because both use the `transform` property. On first render, `-translate-x-1/2` applies, then the animation kicks in and replaces the entire transform, causing the horizontal jump.

**Fix**: Use a wrapper div for the centering transform and apply the animation to an inner div, OR change `animate-fade-in` to use only `opacity` (no translateY) for the toast, OR wrap in a container that uses `left-1/2 -translate-x-1/2` as a stable parent and animate the child with opacity only.

## Issue 3: "Play Again" button does nothing at game over

**Root Cause**: `PlayPoker.tsx` passes `onNextHand={nextHand}` to `PokerTablePro`, and the game-over `WinnerOverlay` calls `onNextHand`. But `nextHand` dispatches `NEXT_HAND`, which checks `alivePlayers.length <= 1` and just returns `game_over` again -- an infinite no-op loop.

**Fix**: "Play Again" should dispatch `RESET` followed by showing the lobby, OR better: add a new action `RESTART` that resets the game state and immediately starts a new game with the same settings. The simplest fix is to make the game-over overlay's "Play Again" call `onQuit` (which is `resetGame` -> lobby) and rename the button to "New Game", OR add a `restartGame` callback that resets and auto-starts.

Recommended approach: Make "Play Again" call `resetGame` (returns to lobby where user can start fresh). This is already wired as `onQuit` in PokerTablePro.

## Issue 4: Card dealing animations not sliding to correct positions

**Root Cause**: The `animate-card-arrive` and `animate-card-reveal` animations are pure scale/opacity transitions (scale 0.5 -> 1). They don't actually "fly" cards from a dealer position to the seat. The cards just pop into place at each seat. Community cards similarly just appear in center without a slide. There's a `@keyframes community-card-fly` defined but it uses `translateY` from top which doesn't account for the actual dealer position.

**Fix**: For a proper dealing feel:
- Change `card-arrive` to include a translateY from negative (cards drop from above/dealer area) so they appear to fly down to the player.
- Stagger the deal delays properly so cards arrive sequentially per player.
- For community cards, ensure `community-card-fly` is actually used (currently `CardDisplay` for community cards uses `animate-card-reveal`, not the fly animation).

---

## Technical Changes

### `src/hooks/usePokerGame.ts`
1. In `NEXT_HAND` case (line 425-443): When `alivePlayers.length <= 1`, populate `lastHandWinners` from the surviving player before returning `game_over`.
2. Store the original `LobbySettings` in state so "Play Again" can restart with the same config.

### `src/pages/PlayPoker.tsx`
1. Wire "Play Again" (game over) to `resetGame` instead of `nextHand`.
2. Add a `useEffect` that saves results to `poker_play_results` and awards XP via edge function or direct insert when `state.phase === 'game_over'`.

### `src/components/poker/PokerTablePro.tsx`
1. Pass different callbacks for hand-complete vs game-over overlays: hand-complete uses `onNextHand`, game-over uses a new `onPlayAgain` (= reset to lobby).

### `src/components/poker/AchievementToast.tsx`
1. Wrap the centering in a stable container div and apply the fade animation to the inner content without conflicting transforms.

### `src/index.css`
1. Update `card-arrive` keyframes to include a `translateY(-30px)` start so cards visually drop from above into position.
2. Apply `community-card-fly` animation to community cards properly.

### `src/components/poker/CardDisplay.tsx`
1. Use the flying animation class for community cards (pass a prop or detect context).
