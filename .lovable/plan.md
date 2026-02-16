
# Tighter Card Fan + Sequential Deal Animation

## 1. Tighter card fan for ALL players

### Human cards (PlayerSeat.tsx, lines 63-77)
- Remove `translateX` entirely (set to 0) so cards stack directly on top of each other
- Reduce rotation from +/-5deg to +/-3deg for a tight, overlapping fan
- Add negative margin (`marginLeft: -8px` on the second card) so they overlap significantly

### Opponent showdown cards (PlayerSeat.tsx, lines 45-58)
- Same treatment: reduce rotation from +/-8deg to +/-3deg
- Remove translateX spread (set to 0)
- Add negative margin on second card for tight overlap

## 2. Sequential dealing animation (one card at a time, round-robin)

Currently the `card-deal-from-deck` animation just fades/scales in from above. The `dealDelay` logic already staggers per player based on `seatDealOrder`, but the formula doesn't properly simulate real dealing (card 1 to each player, then card 2 to each player).

### Fix deal delay formula (PlayerSeat.tsx)
- Change from: `(i * player.holeCards.length + seatDealOrder) * 0.15`
- Change to: `(i * totalActivePlayers + seatDealOrder) * 0.18`
- This means: card 0 is dealt to players 0,1,2...N with 0.18s gaps, then card 1 to players 0,1,2...N
- Need to pass `totalActivePlayers` as a new prop

### Update PokerTablePro.tsx
- Pass `totalActivePlayers` (count of non-eliminated players) to each `PlayerSeat`

### Improve the deal animation (index.css)
- Update `card-deal-from-deck` to start from a position that simulates coming from the dealer (center-top of table): `translate(-50vw, -30vh)` origin, flying to `translate(0,0)` with a slight rotation

## Files to Modify

| File | Change |
|------|--------|
| `src/components/poker/PlayerSeat.tsx` | Tighten fan overlap for both human and opponent cards; accept `totalActivePlayers` prop; fix deal delay formula |
| `src/components/poker/PokerTablePro.tsx` | Compute and pass `totalActivePlayers` to each PlayerSeat |
| `src/index.css` | Update `card-deal-from-deck` keyframes for a more dramatic fly-from-dealer animation |

## Technical Details

**PlayerSeat.tsx - Human cards (line 67):**
```
// From:
transform: `rotate(${i === 0 ? -5 : 5}deg) translateX(${i === 0 ? -1 : 1}px)`
// To:
transform: `rotate(${i === 0 ? -3 : 3}deg)`
marginLeft: i > 0 ? '-12px' : '0'
```

**PlayerSeat.tsx - Opponent cards (line 48):**
```
// From:
transform: `rotate(${i === 0 ? -8 : 8}deg) translateX(${i === 0 ? -4 : 4}px)`
// To:
transform: `rotate(${i === 0 ? -3 : 3}deg)`
marginLeft: i > 0 ? '-10px' : '0'
```

**PlayerSeat.tsx - Deal delay (line 65):**
```
// From:
const dealDelay = (i * player.holeCards.length + seatDealOrder) * 0.15 + 0.1;
// To (for both human and opponent face-down cards):
const dealDelay = (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.1;
```
This produces real dealing order: player0-card0, player1-card0, ..., playerN-card0, player0-card1, player1-card1, ...

**New prop in PlayerSeatProps:**
- `totalActivePlayers?: number` (default 1)

**PokerTablePro.tsx:**
- Compute `const totalActive = state.players.filter(p => p.status !== 'eliminated').length;`
- Pass `totalActivePlayers={totalActive}` to each PlayerSeat

**index.css - Updated keyframes:**
```css
@keyframes card-deal-from-deck {
  0% { opacity: 0; transform: translate(0, -60px) scale(0.3) rotateZ(-15deg); }
  40% { opacity: 1; }
  100% { opacity: 1; transform: translate(0, 0) scale(1) rotateZ(0deg); }
}
```
