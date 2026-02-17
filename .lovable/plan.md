

# Speed Up Card Dealing Animation

## Problem

The card dealing sequence has three chained delays that compound, making the last cards reveal far too late:

1. **Fly sprite stagger**: each card staggers by `0.18s` (12 cards for 6 players = 1.98s for last card to even start flying)
2. **Fly duration**: `0.7s` for the card to reach the seat
3. **Reveal delay**: waits the full `dealDelay + 0.7s` before flipping face-up

Total for the last card in a 6-player game: ~3.4 seconds. This feels sluggish.

## Fix: Tighten All Three Timing Values

### 1. Reduce fly sprite stagger from `0.18s` to `0.12s`
**File:** `src/components/poker/OnlinePokerTable.tsx`, line 1184

```
Before: const delay = (cardIdx * activeSeatCount + seatOrder) * 0.18;
After:  const delay = (cardIdx * activeSeatCount + seatOrder) * 0.12;
```

### 2. Reduce fly animation duration from `0.7s` to `0.45s`
**File:** `src/components/poker/OnlinePokerTable.tsx`, line 1187

```
Before: animation: `deal-card-fly 0.7s ease-out ${delay}s both`
After:  animation: `deal-card-fly 0.45s ease-out ${delay}s both`
```

### 3. Sync card-arrive and card-reveal to match the faster fly
**File:** `src/index.css`

```
Before: .animate-card-arrive { animation: card-arrive 0.35s ease-out both; }
After:  .animate-card-arrive { animation: card-arrive 0.25s ease-out both; }

Before: .animate-card-reveal { animation: card-reveal 0.4s ease-out both; }
After:  .animate-card-reveal { animation: card-reveal 0.3s ease-out both; }
```

### 4. Match stagger and reveal delay in PlayerSeat.tsx
**File:** `src/components/poker/PlayerSeat.tsx`

Line 100 (reveal timer calculation):
```
Before: const dealDelay = (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.1;
         const revealMs = (dealDelay + 0.7) * 1000;
After:  const dealDelay = (i * totalActivePlayers + seatDealOrder) * 0.12 + 0.05;
         const revealMs = (dealDelay + 0.45) * 1000;
```

Line 117 (card fan visual delay):
```
Before: const dealDelay = useReveal ? (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.1 : i * 0.15;
After:  const dealDelay = useReveal ? (i * totalActivePlayers + seatDealOrder) * 0.12 + 0.05 : i * 0.1;
```

## Result

With 6 players, last card now reveals at: `11 * 0.12 + 0.05 + 0.45 = 1.82s` (down from 3.4s). Nearly twice as fast. Cards arrive visually in sync with the flying sprites.

## Files Changed

| File | Change |
|------|--------|
| `src/components/poker/OnlinePokerTable.tsx` | Fly stagger 0.18 to 0.12, fly duration 0.7 to 0.45 |
| `src/components/poker/PlayerSeat.tsx` | Reveal delay synced to 0.12 stagger + 0.45 fly |
| `src/index.css` | card-arrive 0.35 to 0.25, card-reveal 0.4 to 0.3 |

## What Does NOT Change

- No layout, navigation, spacing, or style changes
- No BottomNav changes
- No game logic or chip accounting changes
- Community card dealing sprite timing unchanged (already at 0.55s which feels fine)

