

# Fix "Close Game" Button

## Problem
When the Game Over overlay is showing and the user clicks "Close Game", it calls `onQuit` which dispatches the `QUIT` action. The reducer sets `phase: 'game_over'` -- but the phase is **already** `game_over`, so nothing changes and the button appears broken.

## Solution
Split the behavior: "Close Game" (from the game_over screen) should reset the game back to the idle/lobby state, while the mid-game exit confirmation should still end the game.

### Changes

**File: `src/hooks/usePokerGame.ts`**

1. Add a new action type `RESET` that returns the game to idle state (using the existing `createInitialState()` function)
2. Keep `QUIT` as-is for mid-game exits (transitions to `game_over`)
3. Add a new `resetGame` callback that dispatches `RESET`
4. Export `resetGame` alongside `quitGame`

**File: `src/pages/PlayPoker.tsx`**

1. Destructure `resetGame` from `usePokerGame()`
2. Pass `resetGame` as the `onQuit` prop to `PokerTablePro` (since both "Close Game" on game_over and the exit confirmation should return to the lobby)

Alternatively (simpler): just change the `QUIT` reducer to return to `idle` state instead of `game_over`. But this would break the flow where mid-game quit should show the game_over stats screen first. So the cleanest approach:

- **Mid-game exit confirmation** calls `quitGame` -> dispatches `QUIT` -> sets `phase: 'game_over'` (shows stats)
- **"Close Game" on game_over overlay** calls `resetGame` -> dispatches `RESET` -> sets `phase: 'idle'` (returns to lobby)
- **"Play Again" on game_over overlay** already calls `onNextHand` which restarts

### Technical Detail

In `usePokerGame.ts`, add after the QUIT case:
```
case 'RESET':
  return createInitialState();
```

Add callback:
```
const resetGame = useCallback(() => {
  dispatch({ type: 'RESET' });
}, []);
```

In `PokerTablePro.tsx`, add a new `onReset` prop and wire "Close Game" button in WinnerOverlay (game_over) to use it. The simplest approach: pass both `onQuit` and `onReset` through, and in the WinnerOverlay, use `onQuit` for the close button which now maps to `resetGame`.

Actually the simplest fix with minimal prop changes: just make `PlayPoker.tsx` pass `resetGame` as `onQuit` since the exit confirmation dialog also wants to go back to lobby (not just freeze on game_over).

**Files to modify:**
| File | Change |
|------|--------|
| `src/hooks/usePokerGame.ts` | Add `RESET` case returning `createInitialState()`, add `resetGame` callback, export it |
| `src/pages/PlayPoker.tsx` | Use `resetGame` as `onQuit` |

