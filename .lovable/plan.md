

# Fix: Stale Cards After "Play Again" + Auth Loading Delay

## Issue 1: Players Can See Other Players' Cards After "Play Again"

### Root Cause

When a game ends, `gameOverPendingRef.current` is set to `true`. This prevents the showdown cleanup timer (which normally clears `revealedCards`, `handWinners`, and `myCards`) from running -- the cards are intentionally preserved so the game-over/XP screen can display them.

When the user clicks "Play Again" (line 1662 in `OnlinePokerTable.tsx`), the handler:
- Resets game stats (hands played, win streak, etc.)
- Sets `gameOverPendingRef.current = false`
- Calls `refreshState()`

**But it never clears `revealedCards`, `handWinners`, or `myCards`.** These are state variables inside `useOnlinePokerTable.ts` with no external reset mechanism.

Because `revealedCards` persists, line 989 evaluates `revealedCards.length > 0` as `true`, keeping `isShowdown = true`. This causes the `toPokerPlayer` adapter (line 98) to pass the stale `revealedCards` as `holeCards` for opponents -- making their previous hand's cards visible during the new hand.

The freeze before cards are dealt is caused by `refreshState()` being the ONLY state update, but it does not clear these stale arrays, so the UI is stuck rendering the old showdown state while waiting for the new hand to start.

### Fix

**File: `src/hooks/useOnlinePokerTable.ts`**

Add a `resetForNewGame` function that clears all hand-specific state:
- `setRevealedCards([])`
- `setHandWinners([])`
- `setMyCards(null)`
- `setLastActions({})`
- `prevCommunityAtResultRef.current = 0`
- `lastAppliedVersionRef.current = 0`
- `pendingWinnersRef.current = null`
- `runoutCompleteTimeRef.current = 0`
- `lastActedVersionRef.current = null`
- Cancel any pending winner/showdown timers (`winnerTimerRef`, `showdownTimerRef`)

Expose `resetForNewGame` in the return object.

**File: `src/components/poker/OnlinePokerTable.tsx`**

In the `onPlayAgain` handler (line 1662), call `resetForNewGame()` BEFORE `refreshState()`. This ensures all stale card data is wiped before the new game state loads.

---

## Issue 2: Auth Delay on App Open

### Root Cause

The current `AuthContext.tsx` sets `loading = true` on mount and waits for BOTH `onAuthStateChange` and `getSession()` to resolve before showing the app. On a PWA cold start, `getSession()` may need to validate/refresh the JWT token over the network, causing a visible delay (the "Loading..." screen).

### Fix

**File: `src/contexts/AuthContext.tsx`**

Add an optimistic session check: before the async `getSession()` call, synchronously read the cached session from localStorage. Supabase stores the session under a predictable key. If a cached session exists and its `expires_at` is in the future, immediately set `user` and `session` and `loading = false`. The async `getSession()` still runs in the background to validate/refresh the token silently.

This eliminates the visible loading delay for returning users whose session hasn't expired.

Implementation:
- Read `localStorage` for the Supabase auth token key (`sb-PROJECT_ID-auth-token`)
- Parse and check `expires_at > now`
- If valid, set user/session/loading immediately
- Background `getSession()` still runs for token refresh; `onAuthStateChange` handles any corrections

---

## Summary

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Add `resetForNewGame()` function that clears revealedCards, handWinners, myCards, lastActions, and pending timers. Expose in return object. |
| `src/components/poker/OnlinePokerTable.tsx` | Call `resetForNewGame()` in the `onPlayAgain` handler before `refreshState()` |
| `src/contexts/AuthContext.tsx` | Add optimistic session loading from localStorage cache to eliminate auth loading delay |

No changes to layout, navigation, bottom nav, styles, or spacing.

