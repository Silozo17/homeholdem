

# Fix: Delay End Game Screen to Let Winner Popup + Confetti Display

## Problem

When the final hand is won, the winner banner appears but is almost immediately replaced by the XP/end-game overlay. The sequence is:

1. `handWinners` set → winner banner + confetti show
2. 4-5 seconds later → `gameOver = true` → winner banner hides (condition is `!gameOver`) → `saveXpAndStats` fires → `setXpOverlay` triggers almost instantly (~500ms DB call)
3. Result: winner popup barely visible before end screen covers it

## Fix

Add a 3.5-second delay between `gameOver` becoming true and calling `saveXpAndStats`. This keeps the winner banner and confetti visible for longer before the XP overlay appears.

### Changes

**File: `src/components/poker/OnlinePokerTable.tsx`**

Update the "Save XP on game over" `useEffect` (lines 786-794) to add a delay:

```typescript
// Save XP on game over + leave seat (but stay at table)
useEffect(() => {
  if (!gameOver || !user || xpSavedRef.current) return;
  const mySeatInfo = tableState?.seats.find(s => s.player_id === user.id);
  const isWinner = (mySeatInfo?.stack ?? 0) > 0;
  // Leave seat immediately
  leaveSeat().catch(() => {});
  // Delay XP overlay so winner popup + confetti are visible
  const timer = setTimeout(() => {
    saveXpAndStats(isWinner);
  }, 3500);
  return () => clearTimeout(timer);
}, [gameOver, user, tableState, saveXpAndStats, leaveSeat]);
```

Also keep the winner banner visible during the `gameOver` state until the XP overlay appears — change line 1388 from `!gameOver` to `!xpOverlay`:

```typescript
{handWinners.length > 0 && !xpOverlay && (
  <WinnerOverlay ... />
)}
```

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Add 3.5s delay before `saveXpAndStats` in game-over effect; keep winner banner visible until XP overlay appears |

## What Does NOT Change

- No changes to WinnerOverlay or XPLevelUpOverlay components
- No z-index, style, layout, or navigation changes
- No database or edge function changes

