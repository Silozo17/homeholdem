/**
 * Fixed seat positions for the poker table.
 * All coordinates are % of the TABLE WRAPPER, not the viewport.
 * 
 * 9 canonical seats (from the reference layout):
 *   Y (You)     = bottom center
 *   A (Alex)    = bottom-left
 *   B (Blake)   = left middle
 *   C (Casey)   = upper-left
 *   D (Drew)    = top-left
 *   E (Ellis)   = bottom-right
 *   F (Frankie) = right middle
 *   G (Gray)    = upper-right
 *   H (Harper)  = top-right
 *
 * Fewer players pick a balanced subset of these same positions.
 */

import { type Ellipse } from './ellipse';

export interface SeatPos {
  xPct: number;
  yPct: number;
}

// Portrait: ry reduced so top seat doesn't hit dealer, rx reduced so sides don't clip
export const PORTRAIT_ELLIPSE: Ellipse = { cx: 50, cy: 50, rx: 38, ry: 34 };
export const LANDSCAPE_ELLIPSE: Ellipse = { cx: 50, cy: 50, rx: 44, ry: 38 };

// ── 9 fixed seat positions (landscape) ──────────────────────────────
// Mapped from the reference screenshot yellow markers
const SEATS_LANDSCAPE = {
  Y: { xPct: 50, yPct: 92 },    // bottom center (You)
  A: { xPct: 27, yPct: 78 },    // bottom-left
  B: { xPct: 14, yPct: 50 },    // left middle
  C: { xPct: 20, yPct: 25 },    // upper-left
  D: { xPct: 36, yPct: 8 },     // top-left
  E: { xPct: 64, yPct: 8 },     // top-right      (mirror of D)
  F: { xPct: 80, yPct: 25 },    // upper-right    (mirror of C)
  G: { xPct: 86, yPct: 50 },    // right middle   (mirror of B)
  H: { xPct: 73, yPct: 78 },    // bottom-right   (mirror of A)
};

// Portrait uses tighter positions
const SEATS_PORTRAIT = {
  Y: { xPct: 50, yPct: 92 },
  A: { xPct: 24, yPct: 78 },
  B: { xPct: 10, yPct: 50 },
  C: { xPct: 16, yPct: 25 },
  D: { xPct: 34, yPct: 8 },
  E: { xPct: 66, yPct: 8 },
  F: { xPct: 84, yPct: 25 },
  G: { xPct: 90, yPct: 50 },
  H: { xPct: 76, yPct: 78 },
};

// For each player count, which of the 9 seats to use (always seat 0 = You)
// Picks are chosen for visual balance / symmetry
const SEAT_PICKS: Record<number, (keyof typeof SEATS_LANDSCAPE)[]> = {
  2: ['Y', 'D'],
  3: ['Y', 'C', 'G'],
  4: ['Y', 'B', 'D', 'F'],
  5: ['Y', 'A', 'C', 'G', 'E'],
  6: ['Y', 'A', 'B', 'D', 'F', 'E'],
  7: ['Y', 'A', 'B', 'D', 'H', 'F', 'E'],
  8: ['Y', 'A', 'B', 'C', 'D', 'H', 'G', 'E'],
  9: ['Y', 'A', 'B', 'C', 'D', 'H', 'G', 'F', 'E'],
};

/**
 * Get fixed seat positions for the given player count.
 */
export function getSeatPositions(
  playerCount: number,
  isLandscape: boolean,
  _ellipseOverride?: Ellipse,
): SeatPos[] {
  const count = Math.min(Math.max(playerCount, 2), 9);
  const picks = SEAT_PICKS[count] ?? SEAT_PICKS[9];
  const seats = isLandscape ? SEATS_LANDSCAPE : SEATS_PORTRAIT;

  return picks.map((key) => seats[key]);
}

/**
 * Get the default ellipse for the current orientation (kept for debug overlay).
 */
export function getDefaultEllipse(isLandscape: boolean): Ellipse {
  return isLandscape ? LANDSCAPE_ELLIPSE : PORTRAIT_ELLIPSE;
}
