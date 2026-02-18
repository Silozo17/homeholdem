
# Fix: Game Over Screen Missing When Last Opponent Leaves

## Problem

When the last opponent leaves the table (instead of busting out), the player hears the "Congratulations" voice but sees no confetti, no game over stats screen, and no XP overlay. They're stuck on the table with no way out except manually quitting.

**Root cause:** The game over detection in `OnlinePokerTable.tsx` line 528 requires `handWinners.length > 0`:

```typescript
if (!mySeatInfo || handWinners.length === 0) return; // <-- blocks game over
```

When opponents leave mid-hand or between hands, there is no `hand_result` broadcast, so `handWinners` stays empty and the game over screen never triggers.

## Fix

**File:** `src/components/poker/OnlinePokerTable.tsx`

### Change 1: Add a separate "last standing" detection that doesn't depend on handWinners

Add a new `useEffect` that watches `tableState.seats` independently. When only 1 player with chips remains (the hero) and there is no active hand in progress, trigger the game over screen directly -- without needing `handWinners`.

```typescript
// Game over: last player standing (opponent left, no hand result)
useEffect(() => {
  if (gameOver || !tableState || !user) return;
  const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
  if (!mySeatInfo || mySeatInfo.stack <= 0) return;

  const activePlayers = tableState.seats.filter(s => s.player_id && s.stack > 0);
  if (activePlayers.length !== 1 || activePlayers[0].player_id !== user.id) return;

  // Don't trigger if handWinners already handled it (avoids double-fire)
  if (handWinners.length > 0) return;

  // Only trigger if no hand is in progress (between hands or hand just completed)
  const handPhase = tableState.current_hand?.phase;
  if (handPhase && handPhase !== 'complete') return;

  announceGameOver('You', true);
  const timer = setTimeout(() => {
    setGameOver(true);
    // Create synthetic winner entry for the game over screen
    setGameOverWinners([{
      player_id: user.id,
      display_name: 'You',
      amount: mySeatInfo.stack,
      hand_name: 'Last Standing',
    }]);
  }, 4000);
  return () => clearTimeout(timer);
}, [tableState?.seats, user, gameOver, handWinners]);
```

### Change 2: Show confetti on gameOver too, not just handWinners

Update the confetti rendering condition (line 1169) to also trigger when `gameOver` is true and the player won:

```typescript
{((handWinners.length > 0 && handWinners.some(w => w.player_id === user?.id)) || 
  (gameOver && gameOverWinners.some(w => w.player_id === user?.id))) && (
```

## Summary

| File | Change | Lines |
|------|--------|-------|
| `src/components/poker/OnlinePokerTable.tsx` | Add separate last-standing detection effect (no handWinners dependency) | After line 552 |
| `src/components/poker/OnlinePokerTable.tsx` | Update confetti condition to include gameOver winners | Line 1169 |

## What Does NOT Change

- No layout, style, navigation, spacing, or BottomNav changes
- No database or edge function changes
- No file renames or refactoring
- The existing handWinners-based game over detection stays intact for bust-out scenarios
- XP save and overlay logic already triggers from `gameOver` state, so no changes needed there
