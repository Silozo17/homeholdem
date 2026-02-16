

# Fix Multiplayer Poker: Deal Button, Auto-Buy-In, Seat UX

## Problem Analysis

### 1. Deal Button Never Visible (Root Cause Found)
The auto-deal `useEffect` in `useOnlinePokerTable.ts` fires as soon as 2 players are seated, immediately setting `autoStartAttempted = true`. The Deal button requires `!autoStartAttempted`, so it disappears before the user can ever see it.

**The fix**: The auto-deal should only kick in after the first hand has been played (`handHasEverStarted === true`). The first hand is always started manually via the Deal button.

### 2. Remove Buy-In Selection
Players should not choose their buy-in amount. The table's `max_buy_in` is used automatically for all players. The buy-in input and spectator overlay will be simplified.

### 3. Empty Seats Need Pulse Glow + Helper Text
Empty seats should have a pulsing gold glow animation and a "Choose your seat to begin" message when the player is not yet seated.

---

## Technical Changes

### File: `src/hooks/useOnlinePokerTable.ts`

**Auto-deal useEffect** (line 387-398): Add `handHasEverStarted` to the condition so auto-deal only fires for subsequent hands, not the first one.

```typescript
// BEFORE (broken):
if (seatedCount >= 2 && !hasActiveHand && !autoStartAttempted && mySeatNumber !== null) {

// AFTER (fixed):
if (seatedCount >= 2 && !hasActiveHand && !autoStartAttempted && mySeatNumber !== null && handHasEverStarted) {
```

This single change ensures:
- First hand: only the manual Deal button can start it
- All subsequent hands: auto-deal works as before (after showdown clears `autoStartAttempted`)

### File: `src/components/poker/OnlinePokerTable.tsx`

**Deal button condition** (line 546): Simplify to remove `!autoStartAttempted` since auto-deal won't fire before first hand anyway:
```typescript
// Show Deal button when: creator, no hand active, first hand never started, 2+ players
{isCreator && !hand && !handHasEverStarted && activeSeats.length >= 2 && (
  <button ...>Deal Hand</button>
)}
```

**Remove buy-in input** (lines 839-876): Replace the spectator overlay. Remove the `<Input>` for buy-in amount. Instead show only "Choose your seat to begin" with no number input.

**handleJoinSeat** (line 300-309): Always use `table.max_buy_in` instead of parsing user input:
```typescript
const handleJoinSeat = async (seatNum: number) => {
  setJoining(true);
  try {
    await joinTable(seatNum, table.max_buy_in);
    toast({ title: 'Seated!' });
  } catch (err: any) {
    toast({ title: 'Error', description: err.message, variant: 'destructive' });
  } finally {
    setJoining(false);
  }
};
```

**Empty seat pulse glow** (EmptySeatDisplay, lines 950-979): Add a pulsing gold ring animation to joinable seats:
- The dashed border becomes a glowing animated border
- Add CSS class `animate-pulse` with a gold box-shadow
- Change label from "Sit" to show seat number only, with the glow doing the inviting

**Spectator overlay** (lines 839-876): Replace with a simple banner:
```text
"Tap a glowing seat to join"
[Leave button]
```
No buy-in input field.

### File: `src/index.css`

Add a `seat-pulse` keyframe for the empty seat glow:
```css
@keyframes seat-pulse-glow {
  0%, 100% { box-shadow: 0 0 4px hsl(43 74% 49% / 0.3); }
  50% { box-shadow: 0 0 12px hsl(43 74% 49% / 0.7), 0 0 20px hsl(43 74% 49% / 0.3); }
}
```

---

## Summary

| # | Fix | File |
|---|-----|------|
| 1 | Auto-deal only after first hand (add `handHasEverStarted` guard) | `useOnlinePokerTable.ts` |
| 2 | Simplify Deal button condition | `OnlinePokerTable.tsx` |
| 3 | Remove buy-in input, auto-use `table.max_buy_in` | `OnlinePokerTable.tsx` |
| 4 | Add pulse glow to empty seats + helper text | `OnlinePokerTable.tsx`, `index.css` |

