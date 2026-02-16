

# Verify: Manual Deal (First Hand) + Auto-Deal (Subsequent Hands)

After reviewing the code, the current logic is **already correct** and properly implements the desired flow:

## How It Works

1. **First hand**: The "Deal Hand" button appears for the table creator when 2+ players are seated and no hand is active. Clicking it calls `startHand()`. The button disappears once a hand begins.

2. **After each hand completes**: The `hand_result` broadcast triggers a 5-second showdown pause, then:
   - Clears the current hand state (`current_hand = null`)
   - Resets `autoStartAttempted = false`
   - This causes the auto-deal `useEffect` to fire, which waits 2s + random jitter, then calls `startHand()` automatically

3. **Race condition safety**: Only one client succeeds at calling `startHand()` (the server rejects "Hand already in progress"). Failed attempts reset `autoStartAttempted` so the system retries.

## Potential Issue: Double-Trigger

There is one subtle problem. Both the manual Deal button AND the auto-deal useEffect are active simultaneously when 2+ players are seated and no hand exists. If the creator clicks "Deal Hand" while auto-deal is also about to fire, two `startHand()` calls race. The server handles this (rejects the second), but it causes a console error.

### Fix

Hide the Deal button once `autoStartAttempted` is true, so the button only appears before the very first auto-deal attempt fires. This makes the button a true "first hand" trigger.

### Changes

**File: `src/components/poker/OnlinePokerTable.tsx`**
- Pass `autoStartAttempted` from the hook to the component
- Change the Deal button condition from `!hand` to `!hand && !autoStartAttempted`

**File: `src/hooks/useOnlinePokerTable.ts`**
- Export `autoStartAttempted` in the return object so the component can read it

This is a minor polish -- 2 small edits, no new files.
