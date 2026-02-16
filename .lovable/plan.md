

# Auto-Deal: Make Multiplayer Flow Like Bot Games

## Overview

Remove the manual "Deal Hand" button entirely. The multiplayer game will auto-start hands continuously, matching the bot game's seamless experience.

## How the Bot Game Works (Reference)

The bot game uses a series of auto-transitions driven by `useEffect`:
- `dealing` phase: auto-deals cards after 1.8s
- Bot turns: auto-plays after 1.5-3s
- All-in runouts: auto-advances phases with dramatic pauses
- `showdown`: auto-evaluates after 2.5s  
- `hand_complete`: auto-starts next hand after 4.5s

No manual buttons needed -- hands flow continuously.

## How Multiplayer Currently Works

- After showdown, the 5-second pause ends and `current_hand` is cleared
- A "Deal Hand" button appears, requiring someone to tap it
- Only the table creator or a seated player can press it

## Changes

### File 1: `src/hooks/useOnlinePokerTable.ts`

**A. Auto-deal after showdown**: Inside the `hand_result` handler, after the 5-second showdown pause clears the hand state, automatically call `startHand()`. The server already rejects duplicate start requests (it checks for active hands), so even if multiple clients fire simultaneously, only the first succeeds and the rest silently fail.

**B. Auto-deal on initial table fill**: Add a `useEffect` that watches for "2+ seated players, no active hand" and auto-calls `startHand()` after a short 2-second delay. This handles the first hand when players join, eliminating the need for any manual button.

**C. Guard against loops**: Use a ref (`autoStartAttemptedRef`) to prevent repeated start attempts. Reset it when a new hand begins or when conditions change.

### File 2: `src/components/poker/OnlinePokerTable.tsx`

**A. Remove the "Deal Hand" button** (lines 484-499): Delete the entire block that renders the deal button.

**B. Update waiting text**: Change "Ready to deal" to "Starting soon..." so players know the game is about to auto-start.

**C. Remove `canStartHand` logic**: The variable that computes deal-button visibility is no longer needed.

## Edge Cases Handled

- **Only one hand starts**: Server rejects duplicates via the `activeHand` check in `poker-start-hand`
- **Player leaves mid-showdown**: If players drop below 2, `startHand` returns an error ("Need at least 2 players") which is silently caught
- **First hand**: The new `useEffect` auto-triggers when enough players sit down
- **Reconnection**: On refresh, `refreshState()` loads the current hand -- if none exists and 2+ players are seated, the auto-deal effect fires

## Summary

| Change | File |
|--------|------|
| Auto-call `startHand()` after showdown pause + on initial table fill | `useOnlinePokerTable.ts` |
| Remove "Deal Hand" button, update waiting text | `OnlinePokerTable.tsx` |

