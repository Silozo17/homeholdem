

## Slow Down the Final Hand Sequence

### Current Problem

When the last hand finishes (whether all-in or not), everything happens too fast:
- The showdown timer (3.5s or 7s) clears `handWinners`, which removes the winner banner
- The `gameOver` overlay appears but the winner celebration is rushed
- There's no distinct "stages" -- cards reveal, winner banner, confetti, and game over all blur together

### Desired Sequence (applies to ALL final hands)

1. **Cards reveal** -- community cards shown (staged if all-in, normal otherwise)
2. **Opponent hands shown** -- revealed cards visible on the table
3. **Winner banner appears** -- gold banner with hand name + confetti for ~4 seconds
4. **Winner banner fades** -- pot chips fly to winner
5. **Game Over overlay slides in** -- with stats, "Close Game" and "Play Again" buttons
6. **Stays until user dismisses** -- already fixed in previous commit

### Implementation

**File: `src/components/poker/OnlinePokerTable.tsx`**

**Change 1 -- Delay game over detection**

Currently (line 172-179), game over triggers immediately when `handWinners` populates and the player's stack is 0. Instead, delay the game over by 4 seconds so the winner banner has time to display first:

```typescript
useEffect(() => {
  if (!tableState || !user) return;
  const mySeatInfo = tableState.seats.find(s => s.player_id === user.id);
  if (mySeatInfo && mySeatInfo.stack <= 0 && handWinners.length > 0) {
    // Delay game over so winner banner + confetti play out first
    const timer = setTimeout(() => {
      setGameOver(true);
      setGameOverWinners(handWinners);
    }, 4000);
    return () => clearTimeout(timer);
  }
}, [tableState, user, handWinners]);
```

**File: `src/hooks/useOnlinePokerTable.ts`**

**Change 2 -- Extend showdown timer for final hands**

The showdown timer currently clears `handWinners` after 3.5s (or 7s for all-in). For the final hand, we need to keep `handWinners` alive longer so the game over overlay can snapshot them. Increase the base showdown delay to 5s (normal) and 8.5s (all-in runout) to give the delayed game over (4s) time to capture the data:

```typescript
// In hand_result handler (line 254):
const showdownDelay = communityCount >= 5 ? 8500 : 5000;
```

### What This Achieves

| Step | Timing | What Happens |
|------|--------|--------------|
| 0s | Cards + hands revealed on table |
| 0s | Winner banner appears with hand name |
| 0s | Confetti bursts (if human won) |
| 0-3s | Staged card reveal (if all-in) |
| 0s-5s | Winner banner visible, pot chips fly to winner |
| 4s | Game Over overlay appears (delayed) |
| 5s+ | Showdown cleanup runs, but gameOverWinners already snapshotted |
| User click | Close Game or Play Again |

### What Does NOT Change
- No edge function changes
- No database changes
- Winner overlay component unchanged
- Card animations unchanged
- Normal (non-final) hand timing stays the same for the banner (it still auto-clears)

