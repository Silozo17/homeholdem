/**
 * Seat positions for the poker table.
 * x/y are percentages of the stage container.
 * Seats are ordered: human (bottom-center) first, then clockwise.
 */

export interface SeatPos {
  xPct: number;
  yPct: number;
}

// Portrait (phone upright)
// The oval table occupies roughly 26-56% vertically (centred at ~50% with 48vh height).
// Seats must be OUTSIDE the oval. Top seats ~15-18%, side seats at edges, bottom ~80%.
const portrait: Record<number, SeatPos[]> = {
  2: [
    { xPct: 50, yPct: 80 },   // human bottom
    { xPct: 50, yPct: 15 },   // top
  ],
  3: [
    { xPct: 50, yPct: 80 },
    { xPct: 6, yPct: 48 },
    { xPct: 94, yPct: 48 },
  ],
  4: [
    { xPct: 50, yPct: 80 },
    { xPct: 94, yPct: 48 },
    { xPct: 50, yPct: 15 },
    { xPct: 6, yPct: 48 },
  ],
  5: [
    { xPct: 50, yPct: 80 },
    { xPct: 94, yPct: 55 },
    { xPct: 82, yPct: 17 },
    { xPct: 18, yPct: 17 },
    { xPct: 6, yPct: 55 },
  ],
  6: [
    { xPct: 50, yPct: 80 },
    { xPct: 94, yPct: 58 },
    { xPct: 86, yPct: 17 },
    { xPct: 50, yPct: 12 },
    { xPct: 14, yPct: 17 },
    { xPct: 6, yPct: 58 },
  ],
  7: [
    { xPct: 50, yPct: 80 },
    { xPct: 94, yPct: 62 },
    { xPct: 94, yPct: 32 },
    { xPct: 68, yPct: 14 },
    { xPct: 32, yPct: 14 },
    { xPct: 6, yPct: 32 },
    { xPct: 6, yPct: 62 },
  ],
  8: [
    { xPct: 50, yPct: 80 },
    { xPct: 94, yPct: 62 },
    { xPct: 94, yPct: 32 },
    { xPct: 72, yPct: 14 },
    { xPct: 28, yPct: 14 },
    { xPct: 6, yPct: 32 },
    { xPct: 6, yPct: 62 },
    { xPct: 74, yPct: 80 },
  ],
  9: [
    { xPct: 50, yPct: 80 },
    { xPct: 94, yPct: 66 },
    { xPct: 95, yPct: 38 },
    { xPct: 78, yPct: 14 },
    { xPct: 50, yPct: 10 },
    { xPct: 22, yPct: 14 },
    { xPct: 5, yPct: 38 },
    { xPct: 6, yPct: 66 },
    { xPct: 26, yPct: 80 },
  ],
};

// Landscape (phone sideways / desktop): more horizontal spread
const landscape: Record<number, SeatPos[]> = {
  2: [
    { xPct: 50, yPct: 82 },
    { xPct: 50, yPct: 14 },
  ],
  3: [
    { xPct: 50, yPct: 82 },
    { xPct: 10, yPct: 44 },
    { xPct: 90, yPct: 44 },
  ],
  4: [
    { xPct: 50, yPct: 82 },
    { xPct: 92, yPct: 50 },
    { xPct: 50, yPct: 14 },
    { xPct: 8, yPct: 50 },
  ],
  5: [
    { xPct: 50, yPct: 82 },
    { xPct: 92, yPct: 56 },
    { xPct: 78, yPct: 14 },
    { xPct: 22, yPct: 14 },
    { xPct: 8, yPct: 56 },
  ],
  6: [
    { xPct: 50, yPct: 82 },
    { xPct: 92, yPct: 60 },
    { xPct: 82, yPct: 14 },
    { xPct: 50, yPct: 10 },
    { xPct: 18, yPct: 14 },
    { xPct: 8, yPct: 60 },
  ],
  7: [
    { xPct: 50, yPct: 82 },
    { xPct: 93, yPct: 62 },
    { xPct: 92, yPct: 24 },
    { xPct: 66, yPct: 10 },
    { xPct: 34, yPct: 10 },
    { xPct: 8, yPct: 24 },
    { xPct: 7, yPct: 62 },
  ],
  8: [
    { xPct: 50, yPct: 82 },
    { xPct: 93, yPct: 62 },
    { xPct: 93, yPct: 26 },
    { xPct: 68, yPct: 10 },
    { xPct: 32, yPct: 10 },
    { xPct: 7, yPct: 26 },
    { xPct: 7, yPct: 62 },
    { xPct: 72, yPct: 82 },
  ],
  9: [
    { xPct: 50, yPct: 82 },
    { xPct: 93, yPct: 66 },
    { xPct: 94, yPct: 32 },
    { xPct: 76, yPct: 10 },
    { xPct: 50, yPct: 6 },
    { xPct: 24, yPct: 10 },
    { xPct: 6, yPct: 32 },
    { xPct: 7, yPct: 66 },
    { xPct: 28, yPct: 82 },
  ],
};

export function getSeatPositions(playerCount: number, isLandscape: boolean): SeatPos[] {
  const map = isLandscape ? landscape : portrait;
  const clamped = Math.min(Math.max(playerCount, 2), 9);
  return map[clamped] || map[9];
}
