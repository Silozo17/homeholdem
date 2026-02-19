

# Fix Hand History: Safe Padding, Simplified View, and Hand Navigation

## Issue 1: Controls too close to right edge in landscape mode

The `HandReplay` sheet (which opens from the right in landscape) has its control buttons and close button too close to the screen edge, making the X button untappable.

### Fix
**`src/components/poker/HandReplay.tsx`** (line 69-74)
- Add `pr-[calc(5px+env(safe-area-inset-right,0px))]` to the `SheetContent` for landscape mode
- Also add right safe area to the inner content padding

---

## Issue 2: Redesign Hand History display

Currently the hand replay shows a step-by-step action timeline (preflop bet, call, raise, etc.). The user wants:
- Show only the **final result**: community cards (all 5), each participating player's hole cards and hand name
- **Do NOT show** cards for players who folded (per poker rules)
- **Remove** the step-by-step action timeline and Prev/Next step buttons
- **Replace** with hand number navigation: buttons to jump between hands (not steps within a hand)

### Changes to `src/components/poker/HandReplay.tsx`

Rewrite the component to:

1. Accept the **full `handHistory` array** instead of a single `hand` prop
2. Track `currentIndex` state (index within the array) 
3. Show for the selected hand:
   - Hand number badge
   - All 5 community cards
   - "Your cards" section (your hole cards)
   - "Showdown" section: each player who did NOT fold, showing their name, hole cards (from `revealedCards`), and hand name (from `winners` data)
   - Winner highlight with trophy icon and amount won
   - Total pot
4. Navigation: **hand number buttons** or left/right arrows to go between hands in history
5. Remove the step-by-step action replay entirely

### Props change
```
// Old
hand: HandRecord | null

// New  
handHistory: HandRecord[]
initialHandIndex?: number  // defaults to last hand
```

### Changes to `src/components/poker/OnlinePokerTable.tsx`

- Destructure `handHistory` from `useHandHistory` (it's already returned but not used)
- Pass `handHistory` array to `HandReplay` instead of just `lastHand`
- Change the condition `lastHand &&` to `handHistory.length > 0 &&` for showing the history button

Lines affected:
- Line 131: add `handHistory` to destructured values
- Line 1096: change `lastHand` to `handHistory.length > 0`
- Line 1135: change `lastHand` to `handHistory.length > 0`
- Line 1586: pass `handHistory={handHistory}` instead of `hand={lastHand}`

### Changes to `src/hooks/useHandHistory.ts`

No changes needed -- `handHistory` array is already returned.

---

## Display layout for each hand

```text
+-----------------------------------+
| Hand #12                     CSV  |
+-----------------------------------+
|     [5 community cards]           |
|                                   |
| Your cards: [Ah] [Kd]            |
|                                   |
| --- Showdown ---                  |
| Player1: [Qs][Jh] - Two Pair     |
| Player2: [9c][9d] - Pair         |
|                                   |
| Trophy Winner: Player1 (+1,200)   |
| Pot: 2,400                        |
+-----------------------------------+
| [<] Hand #10  #11  [#12]  [>]    |
+-----------------------------------+
```

- Players who folded are not shown in the showdown section
- The navigation shows hand numbers as tappable chips/badges
- Left/right arrows scroll through hands

---

## Summary of files changed

| File | Change |
|------|--------|
| `src/components/poker/HandReplay.tsx` | Rewrite: remove action timeline, show final cards + showdown players, add hand navigation |
| `src/components/poker/OnlinePokerTable.tsx` | Pass full `handHistory` array, update conditions |

## What does NOT change
- `useHandHistory.ts` hook -- untouched
- `HandHistory.tsx` component -- untouched (separate component, not used in online table)
- Bottom navigation -- untouched
- No database changes
- No edge function changes

