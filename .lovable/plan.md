

# Fix: Prevent Double-Action After Check/Call

## Problem
After a player checks or calls, there's a brief window where the action buttons reappear before the server state update arrives. If the player taps again, they get a "not your turn" error from the backend.

This happens because:
1. Player acts -- `actionPending` is set to true (buttons hidden)
2. The realtime broadcast arrives and clears `actionPending`
3. But if the broadcast still shows the same `current_actor_seat` (intermediate state), `isMyTurn` briefly evaluates to true again
4. Buttons flash back, player taps, backend rejects

## Solution

Track the `state_version` at which the user last acted. Suppress `isMyTurn` until the state version advances past the one where the action was taken.

### Technical Details

**File:** `src/hooks/useOnlinePokerTable.ts`

1. Add a new ref to track the version the user last acted on:
   - `const lastActedVersionRef = useRef<number | null>(null);`

2. In `sendAction`, record the current state version before sending:
   - `lastActedVersionRef.current = hand.state_version ?? 0;`

3. In the `isMyTurn` derivation (line 119-120), add an extra guard:
   - Before: `const isMyTurn = rawIsMyTurn && !actionPending;`
   - After: `const isMyTurn = rawIsMyTurn && !actionPending && (lastActedVersionRef.current === null || (hand?.state_version ?? 0) > lastActedVersionRef.current);`

4. Clear `lastActedVersionRef` when the hand changes (in the existing `hand_id` change effect) so it doesn't carry over between hands.

This is a minimal, robust fix -- the buttons will only reappear when the server confirms the turn has genuinely advanced to the user again (state version incremented past their action).

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useOnlinePokerTable.ts` | Add `lastActedVersionRef` guard to prevent stale `isMyTurn` |

## NOT Changed
- Bottom navigation
- BettingControls component
- OnlinePokerTable component
- Styles, layout, spacing
- Backend logic
