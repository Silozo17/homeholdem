

# Revert Best 5 Cards Glow Feature

## Summary
Remove the showdown card glow/dim feature across three files, restoring the original card rendering behavior.

## Changes

### FILE 1 — OnlinePokerTable.tsx
1. **Remove evaluateHand import** (line 47) — delete the line `import { evaluateHand } from '@/lib/poker/hand-evaluator';`
2. **Keep the `Card` import** (line 45) — it is still used by `toPokerPlayer` function parameters
3. **Delete the bestCards computation block** (lines 1542-1548) — the 7 lines computing `isShowdownActive`, `holeCardsForSeat`, `sevenCards`, and `bestHandCards`
4. **Remove `bestCards={bestHandCards}` prop** from the PlayerSeat JSX (line 1570)

### FILE 2 — PlayerSeat.tsx (props interface)
1. **Remove `bestCards?: Card[];`** from the interface (line 37)
2. **Remove `bestCards = [],`** from the destructured props (line 47)
3. **Keep `Card` in the import** (line 3) — it is still used by the `PokerPlayer` type's `holeCards` throughout the component

### FILE 3 — PlayerSeat.tsx (card rendering logic)
1. **Delete the `isBestCard` helper** (lines 170-171)
2. **Restore `cardFan` to original form** (lines 173-210):
   - Remove `isWinningCard` variable (line 181)
   - Restore the card wrapper `div` style to only have `transform: rotate()`, `marginLeft`, `position: relative`, and `zIndex: i` — remove the winning card transform, filter, and transition styles
   - Remove the golden glow ring div (lines 193-201)
   - Restore the `CardDisplay` className to use `animate-winning-cards-glow` unconditionally during showdown (remove the `bestCards.length === 0` condition)

## Technical Details

The restored `cardFan` inner map will look like:
```typescript
return (
  <div key={i} style={{
    transform: `rotate(${i === 0 ? -10 : 10}deg)`,
    marginLeft: i > 0 ? (compact ? '-14px' : '-16px') : '0',
    position: 'relative',
    zIndex: i,
  }}>
    <CardDisplay
      card={displayCard}
      faceDown={!isRevealed}
      size={size as any}
      dealDelay={dealDelay}
      className={isShowdown && showCards && !isOut ? 'animate-winning-cards-glow' : ''}
    />
  </div>
);
```

## Verification
- Cards render normally during play — no glow, no dim, no transform effects
- Showdown cards use the original `animate-winning-cards-glow` CSS class as before
- No build errors — `Card` type stays imported where needed
- No other files or features affected

