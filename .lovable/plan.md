
# Fix: Wait for Card Deal Animation Before Bot Actions

## Problem

In bot games, when a new hand starts, the card dealing animation takes several seconds to complete (cards fly out one by one to each player). But the bot action timer starts immediately when the phase changes to `preflop`, so bots act before the human player has even received their cards visually. This breaks immersion -- in a real poker game, no one acts until all cards are dealt.

## Root Cause

The flow is:
1. `dealing` phase -- 1.8s pause (shuffle sound)
2. `DEAL_HAND` dispatch -- deals cards, sets phase to `preflop`, sets `currentPlayerIndex` to first-to-act
3. Bot auto-action effect fires after 1.5-3.0s
4. But the card reveal animation takes up to ~4.5s for the last card (depends on player count)

The bot action delay (1.5-3.0s) is shorter than the deal animation duration (~4.5s with 6 players).

## Solution

Add a "deal grace period" in the bot action `useEffect` inside `usePokerGame.ts`. When a new hand starts (phase transitions from `dealing` to `preflop`), calculate the total deal animation duration and delay bot actions until after all cards have been revealed.

### Changes

**File: `src/hooks/usePokerGame.ts`**

1. Add a `dealAnimEndRef = useRef(0)` to track when the deal animation finishes
2. In the `dealing` -> `DEAL_HAND` timeout (line 547), after dispatching, calculate the total deal animation time and store it:
   - Formula: `totalDealTime = ((1 * activePlayers + (activePlayers - 1)) * 0.35 + 0.8) * 1000` (matches PlayerSeat's reveal formula)
   - Set `dealAnimEndRef.current = Date.now() + totalDealTime`
3. In the bot action block (line 582-604), before scheduling the bot timeout, check if we're still within the deal animation grace period:
   - `const dealWait = Math.max(0, dealAnimEndRef.current - Date.now())`
   - Add `dealWait` to the existing bot delay: `dealWait + 1500 + Math.random() * 1500`

This way:
- First bot action after a deal waits for the full card animation to finish
- Subsequent bot actions in the same betting round use normal timing (dealWait will be 0)
- Human turn is unaffected (the betting controls appear immediately, but the player naturally waits to see their cards anyway)
- No changes to the animation system, game state, or reducer

### Also applies to human turn indicator

The "YOUR TURN" badge and betting controls appear immediately too. Since the human also needs to see their cards first, add the same grace period to the `isHumanTurn` computation:

**File: `src/components/poker/PokerTablePro.tsx`**

Add a `dealAnimDoneState` that starts as `false` when `handNumber` changes, then flips to `true` after the deal animation duration. Gate `showActions` behind it so the human's betting controls don't appear until cards are dealt.

## File Summary

| File | Change |
|------|--------|
| `src/hooks/usePokerGame.ts` | Add `dealAnimEndRef`, calculate deal duration after `DEAL_HAND`, delay bot actions by remaining deal time |
| `src/components/poker/PokerTablePro.tsx` | Gate `showActions` behind a `dealAnimDone` state that activates after deal animation completes |
