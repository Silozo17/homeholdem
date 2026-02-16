

# Fix Multiplayer Poker: Actions, Showdown, Winner Display, and Button Lag

## Issues Identified

### 1. Buttons stay visible after pressing ("action failed", "not your turn")
**Root cause**: After the player taps an action (e.g., Call), `sendAction()` fires an HTTP request to the server. But `isMyTurn` remains `true` until the next `game_state` broadcast arrives (~200-500ms later). During this window, the buttons stay visible and tappable. Pressing again triggers "Not your turn" from the server.

**Fix**: Add an `actionPending` flag. Set it to `true` immediately when `sendAction` is called; set it back to `false` when the next `game_state` broadcast arrives. `isMyTurn` will incorporate this flag so buttons disappear instantly on tap.

### 2. Opponent actions/raises not visible
**Root cause**: In the `game_state` broadcast (poker-action line 597), `last_action` is only populated for the player who just acted -- everyone else gets `null`. So every broadcast wipes the previous actor's action label.

**Fix**: On the client, track `lastActions` as a `Map<string, string>` that accumulates actions from each `game_state` broadcast. When a new hand starts (new `hand_id`), clear the map. This way, each player's most recent action stays visible (e.g., "call", "raise", "fold").

### 3. No showdown / no winner display
**Root cause**: The `hand_result` payload contains `winners` (array of `{ player_id, amount, hand_name }`) and `revealed_cards`, but the client only stores `revealed_cards`. It completely ignores `winners`, so there's no UI showing who won or how.

**Fix**: Store the `winners` data from `hand_result` in state. During the 5-second showdown pause, render the same `WinnerOverlay` banner component used in bot games (the inline `!isGameOver` variant that shows hand name + winner name + chip count).

### 4. Showdown cards timing
**Root cause**: Two broadcasts arrive in sequence -- first `game_state` (with `phase: "complete"`), then `hand_result` (with `revealed_cards`). The revealed cards briefly lag behind the phase change.

**Fix**: This is actually fine as-is since the showdown pause is 5 seconds. But we should ensure `isShowdown` remains true for the full pause duration by checking `revealedCards.length > 0` as an additional condition.

---

## Changes

### File 1: `src/hooks/useOnlinePokerTable.ts`

**A. Add `actionPending` state**
- New `useState<boolean>(false)` called `actionPending`
- In `sendAction`: set `actionPending = true` before the API call, reset to `false` in a `finally` block
- In the `game_state` broadcast handler: always reset `actionPending = false`
- Modify `isMyTurn` computation: `isMyTurn && !actionPending`

**B. Add `lastActions` state**
- New `useState<Record<string, string>>({})` to track per-player actions
- In the `game_state` handler: for each seat in the payload, if `last_action` is not null, update the map
- When `hand_id` changes (new hand), clear the map
- Expose via return object

**C. Add `handWinners` state**
- New state for storing winner info from `hand_result`
- In the `hand_result` handler: store `payload.winners` along with display names from the current seat data
- Clear when hand resets after the 5-second pause
- Expose via return object

**D. Expose new values in return**
- `actionPending`, `lastActions`, `handWinners`

### File 2: `src/components/poker/OnlinePokerTable.tsx`

**A. Hide buttons immediately on action**
- Use `actionPending` from the hook; modify `showActions` to also check `!actionPending`

**B. Show opponent actions**
- When building `toPokerPlayer`, pass `lastActions[player_id]` as the `lastAction` field instead of the raw broadcast value (which is null for non-actors)

**C. Render WinnerOverlay banner**
- Import `WinnerOverlay`
- When `handWinners` is populated (during the showdown pause), render `WinnerOverlay` with `isGameOver={false}`, mapping the server's winner data to the component's expected format (`{ name, hand: { name, rank, score, bestCards }, chips }`)
- `onNextHand` and `onQuit` can be no-ops since auto-deal handles progression

### File 3: `src/hooks/useOnlinePokerTable.ts` (sendAction refinement)

Wrap `sendAction` to set/clear `actionPending`:
```
const sendAction = useCallback(async (action, amount?) => {
  if (!hand || actionPending) return;
  setActionPending(true);
  try {
    await callEdge('poker-action', { ... });
  } finally {
    // Will also be cleared by next game_state broadcast
    setTimeout(() => setActionPending(false), 3000); // safety fallback
  }
}, [...]);
```

## Summary

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Buttons stay after tap | `isMyTurn` doesn't update until broadcast | `actionPending` flag hides buttons instantly |
| "Action failed" / "Not your turn" | Double-tap during broadcast delay | Block `sendAction` while `actionPending` |
| Opponent actions invisible | Server only sends last_action for current actor | Client accumulates actions in a local map |
| No winner display | `hand_result.winners` is ignored | Store winners, render `WinnerOverlay` banner |
| No showdown cards | Already fixed, but verify timing | Ensure `isShowdown` also checks `revealedCards` |

