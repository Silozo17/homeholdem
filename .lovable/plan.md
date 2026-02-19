

# Plan: XP Screen Improvements + Voice Chat Fix

## 1. Voice Chat: Silent failure instead of error toast

**Problem:** The auto-connect `useEffect` fires repeatedly because `voiceChat.connect` and `voiceChat.connecting` are recreated each render, causing a flood of calls to the livekit-token edge function. When the connection fails (e.g. browser blocks mic permission, or LiveKit credentials issue), it shows a disruptive red error toast.

**Fix in `src/hooks/useVoiceChat.ts`:**
- Add a `failedRef` flag so that after the first connection failure, auto-connect does not keep retrying in a loop. The manual phone button still works to retry.
- Expose this `failed` state so the auto-connect effect can check it.

**Fix in `src/components/poker/OnlinePokerTable.tsx` (auto-connect effect, ~line 179):**
- Check `voiceChat.failed` to avoid retrying after a failure. Only auto-connect once per session.

## 2. Remove WinnerOverlay stats screen, merge stats into XPLevelUpOverlay

**Problem:** After game over, WinnerOverlay shows a full stats screen, then XP overlay shows separately. User wants: remove the WinnerOverlay game-over stats screen entirely, and instead show stats inside the XP overlay with "Play Again" and "Close" buttons.

### Changes to `src/components/poker/XPLevelUpOverlay.tsx`:
- Add new props: `stats` (handsPlayed, handsWon, bestHandName, biggestPot, duration), `onPlayAgain`, `onClose`
- Replace the single "Continue" button with two buttons: "Close" (exits table) and "Play Again" (stays at table)
- Add a stats section below the XP bar showing: Hands Played, Hands Won, Best Hand, Biggest Pot, Duration in a styled grid

### Changes to `src/components/poker/OnlinePokerTable.tsx`:

**Remove WinnerOverlay for game over (lines 1270-1283):**
- Remove the `{gameOver && <WinnerOverlay ...>}` block entirely. The hand-win inline banner (non-game-over WinnerOverlay) stays.

**Update XPLevelUpOverlay rendering (lines 1286-1296):**
- Pass `stats`, `onPlayAgain`, and `onClose` props
- `onClose`: sets xpOverlay to null, then calls `leaveTable().then(onLeave)`
- `onPlayAgain`: sets xpOverlay to null, leaves seat (so player is removed from seat) but stays at the table as a spectator who can re-join a seat

**Seat removal during XP screen:**
- When `gameOver` is set to true and XP overlay shows, call `leaveSeat()` (not `leaveTable()`) so the player is removed from the seat but remains at the table
- "Play Again" dismisses the overlay (player is already a spectator, can tap an open seat)
- "Close" calls `leaveTable().then(onLeave)` to fully exit

### Changes to `src/components/poker/WinnerOverlay.tsx`:
- No changes needed (the non-game-over hand-win banner is still used)

## 3. Leave seat on game over (before XP screen)

**In `src/components/poker/OnlinePokerTable.tsx`:**
- In the `saveXpAndStats` callback or in the game-over useEffect, call `leaveSeat()` right when game over triggers (before XP overlay shows). This removes the player from their seat but keeps them at the table.

## Summary of file changes

| File | Change |
|---|---|
| `src/hooks/useVoiceChat.ts` | Add `failed` state + `failedRef` to prevent retry loops |
| `src/components/poker/OnlinePokerTable.tsx` | Remove game-over WinnerOverlay, pass stats to XP overlay, call leaveSeat on game over, guard auto-connect with failed check |
| `src/components/poker/XPLevelUpOverlay.tsx` | Add stats grid, "Play Again" + "Close" buttons, new props |

## What does NOT change
- Hand-win WinnerOverlay (inline banner) stays
- Seat positions, dealer, bottom nav untouched
- No layout/styling changes outside the XP overlay
- VoiceChatControls component untouched
- No navigation changes

