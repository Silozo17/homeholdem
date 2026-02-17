

## Three Fixes

### 1. All-in runout: Cards must be revealed sequentially

**Problem**: When all players go all-in, the server deals all 5 community cards in a single action and jumps straight from preflop to showdown/complete. The client receives all cards at once, so there's no dramatic flop-turn-river reveal.

**Fix (client-side)**: Add a "staged reveal" system in `OnlinePokerTable.tsx`. When community cards jump from 0 to 5 (or 3 to 5) in a single broadcast, don't render them all immediately. Instead:
- Store incoming community cards in a ref
- Use a local `visibleCommunityCards` state that reveals them in stages with delays:
  - Cards 0-2 (flop): shown immediately
  - Card 3 (turn): shown after 1.5s
  - Card 4 (river): shown after 3s
- Only trigger staged reveal when a "big jump" is detected (e.g., going from 0 cards to 5)
- The showdown timer (3.5s) must also be extended when a staged runout is active, to allow all cards to be revealed before cleanup

**File**: `src/components/poker/OnlinePokerTable.tsx`
- Add `visibleCommunityCards` state and `stagedRunoutRef`
- Detect big jumps in community card count via a `useEffect`
- Replace `hand?.community_cards` with `visibleCommunityCards` in the render
- Extend showdown timer from 3.5s to 7s when staged runout is detected

**File**: `src/hooks/useOnlinePokerTable.ts`
- Export a flag or let the component control showdown duration
- When `hand_result` arrives, check if a staged runout is happening and delay the cleanup accordingly

### 2. Community card deal sprites land too far down

**Problem**: The flying card sprites use `--deal-center-dy: 46vh` (viewport height), but community cards render at `top: 48%` inside the table container (which is smaller than the viewport). The sprites overshoot.

**Fix**: Change the target from `46vh` to `46cqh` (container query height units) to match the container-relative positioning of the actual cards. The table wrapper already has `container-type: size` set (line 490), so `cqh` units will work correctly.

**File**: `src/components/poker/OnlinePokerTable.tsx`
- Change `['--deal-center-dy' as any]: '46vh'` to `['--deal-center-dy' as any]: '46cqh'`

### 3. Game over stats disappear without user input

**Problem**: The showdown timer (3.5s) clears `handWinners`, which causes the Game Over overlay to show empty winner data. The `gameOver` state itself persists, but the data it displays gets wiped.

**Fix**: 
- When `gameOver` is true, save the winners into a separate `gameOverWinners` state that is NOT cleared by the showdown timer
- The Game Over overlay uses `gameOverWinners` instead of `handWinners`
- `gameOverWinners` is only cleared when the user explicitly clicks "Close Game"

**File**: `src/components/poker/OnlinePokerTable.tsx`
- Add `gameOverWinners` state
- In the `gameOver` detection effect, snapshot `handWinners` into `gameOverWinners`
- Game Over `WinnerOverlay` reads from `gameOverWinners`

---

### Summary

| Issue | Root Cause | Fix Location |
|-------|-----------|--------------|
| All-in ends instantly | Server sends all 5 cards + complete in one shot | Client-side staged reveal in OnlinePokerTable.tsx |
| Deal sprites overshoot | `46vh` vs container-relative `48%` mismatch | Change to `46cqh` in OnlinePokerTable.tsx |
| Stats vanish | showdown timer clears handWinners while gameOver overlay depends on them | Snapshot winners into separate gameOverWinners state |

### Files to Modify
- `src/components/poker/OnlinePokerTable.tsx` (all 3 fixes)
- `src/hooks/useOnlinePokerTable.ts` (extend showdown timer for staged runout)

### What Does NOT Change
- No edge function changes
- No database changes
- Seat positions, card display styling, betting controls untouched
- Winner overlay component itself unchanged

