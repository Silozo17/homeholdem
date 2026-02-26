
# Critical Fix: Players Ejected on Every Hand Deal

## Root Cause

Two bugs in `poker-start-hand` work together to wipe all seat data every time a hand is dealt.

### Bug 1: Broken Promise.all destructuring (`poker-start-hand/index.ts` L521-526)

```text
Current code:
const [, , , { data: allSeatsForBroadcast }] = await Promise.all([
  ...seatUpdatePromises,   // <-- spreads N promises (variable!)
  actionInsertPromise,
  tableStatusPromise,
  allSeatsPromise,
]);
```

With 2 players: the array is `[seatUpdate0, seatUpdate1, actionInsert, tableStatus, allSeats]` -- index 3 is `tableStatus`, NOT `allSeats`. With 6 players: index 3 is `seatUpdate3`. In every case, `allSeatsForBroadcast` reads the wrong result and gets `null`. The broadcast `seats` array becomes `[]`.

### Bug 2: Empty array is truthy (`useOnlinePokerTable.ts` L322)

```text
seats: data.state.seats || prev.seats
```

`[]` is truthy in JavaScript, so `[] || prev.seats` evaluates to `[]`. The player who called `startHand` gets their entire seat list replaced with an empty array. All players vanish from the UI.

## Fix (2 files, 2 surgical changes)

### File 1: `supabase/functions/poker-start-hand/index.ts`

Wrap `seatUpdatePromises` in its own `Promise.all` so the outer array has exactly 4 elements:

```typescript
const [, , , { data: allSeatsForBroadcast }] = await Promise.all([
  Promise.all(seatUpdatePromises),   // single promise at index 0
  actionInsertPromise,               // index 1
  tableStatusPromise,                // index 2
  allSeatsPromise,                   // index 3 -- always correct now
]);
```

### File 2: `src/hooks/useOnlinePokerTable.ts`

Guard against empty arrays in the `startHand` callback:

```typescript
seats: data.state.seats?.length ? data.state.seats : prev.seats,
```

This ensures that if the seats array is empty (from any edge case), the client keeps its existing seat data rather than wiping it.

## What This Fixes
- Players no longer vanish from seats when a hand is dealt
- The broadcast includes all seated players with correct stacks and `has_cards` flags
- The HTTP response includes complete seat data for the hand starter
- No other files, styles, layout, or navigation are changed
