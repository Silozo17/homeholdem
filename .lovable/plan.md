

# Fix: Rotate Online Poker Seats to Hero Perspective

## Problem

The online poker table renders all players at screen positions matching their raw seat number (0-8). Your seat is hidden from the loop and shown at the bottom, but everyone else stays at their absolute positions. This means:

- If you sit in seat 3, other players appear at positions 0, 1, 2, 4, 5... on screen
- The visual gap where seat 3 was is just skipped
- Other players do NOT rotate around you -- they see the same layout you do

The correct behavior: each player should always see themselves at position 0 (bottom center), with other players arranged clockwise in their correct relative order.

## Solution

Rotate the seat-to-position mapping so that the hero's seat index always maps to position 0 (bottom center). All other seats shift by the same offset, preserving clockwise order.

### File: `src/components/poker/OnlinePokerTable.tsx`

Replace the current direct mapping:

```typescript
// CURRENT (broken): raw seat index = screen position
const allSeats = Array.from({ length: table.max_seats }, (_, i) => 
  seats.find(s => s.seat === i) || null
);
// Then: allSeats[seatIndex] -> positions[seatIndex]
```

With a rotated mapping:

```typescript
// NEW: rotate so hero's seat maps to position 0 (bottom center)
const maxSeats = table.max_seats;
const heroSeat = mySeatNumber ?? 0;

// Build array of seats rotated so hero is at index 0
const rotatedSeats: (OnlineSeatInfo | null)[] = Array.from(
  { length: maxSeats },
  (_, i) => {
    const actualSeat = (heroSeat + i) % maxSeats;
    return seats.find(s => s.seat === actualSeat) || null;
  }
);
```

Then in the rendering loop, use `rotatedSeats` instead of `allSeats`. The `seatIndex` now becomes the screen position index (0 = bottom center = hero), and each element contains the actual seat data for the player who should appear at that position.

The key changes in the rendering loop:
- Use `rotatedSeats` instead of `allSeats`
- For `isCurrentActor` and `isDealer`, compare using the original seat number from `seatData.seat` (not the rotated index)
- For `handleJoinSeat`, pass the actual seat number `(heroSeat + seatIndex) % maxSeats` instead of the rotated index
- When spectating (not seated), skip rotation (heroSeat defaults to 0, so no change)

### Summary of changes

| Location | Change |
|----------|--------|
| Lines 213-215 | Replace `allSeats` with `rotatedSeats` that offsets by `mySeatNumber` |
| Lines 372-412 | Update seat rendering loop to use `rotatedSeats`, derive actual seat number for game logic comparisons |

### How it works after the fix

Example: 6-seat table. You are in seat 3, Kris in seat 4, Pete in seat 2.

**Your view:** You at position 0 (bottom), Kris at position 1 (your left), Pete at position 5 (your right) -- correct clockwise order.

**Kris's view:** Kris at position 0 (bottom), seat 5 at position 1 (Kris's left), you at position 5 (Kris's right) -- correct clockwise order.

**Pete's view:** Pete at position 0 (bottom), you at position 1 (Pete's left) -- correct clockwise order.

Each player always sees themselves centered at the bottom with others arranged in proper relative order.

