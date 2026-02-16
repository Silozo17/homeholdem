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
  Y: { xPct: 50, yPct: 83 },    // bottom center (You)
  A: { xPct: 20, yPct: 68 },    // bottom-left
  B: { xPct: 12, yPct: 47 },    // left middle
  C: { xPct: 17, yPct: 22 },    // upper-left
  D: { xPct: 30, yPct: 5 },     // top-left
  E: { xPct: 80, yPct: 68 },    // bottom-right   (mirror of A)
  F: { xPct: 88, yPct: 47 },    // right middle   (mirror of B)
  G: { xPct: 83, yPct: 22 },    // upper-right    (mirror of C)
  H: { xPct: 70, yPct: 5 },     // top-right      (mirror of D)
};

// Portrait uses tighter positions
const SEATS_PORTRAIT = {
  Y: { xPct: 50, yPct: 83 },
  A: { xPct: 18, yPct: 68 },
  B: { xPct: 8,  yPct: 47 },
  C: { xPct: 14, yPct: 22 },
  D: { xPct: 28, yPct: 5 },
  E: { xPct: 82, yPct: 68 },
  F: { xPct: 92, yPct: 47 },
  G: { xPct: 86, yPct: 22 },
  H: { xPct: 72, yPct: 5 },
};

// For each player count, which of the 9 seats to use (always seat 0 = You)
// Picks are chosen for visual balance / symmetry
const SEAT_PICKS: Record<number, (keyof typeof SEATS_LANDSCAPE)[]> = {
  2: ['Y', 'D'],
  3: ['Y', 'C', 'G'],
  4: ['Y', 'B', 'D', 'F'],
  5: ['Y', 'A', 'C', 'G', 'E'],
  6: ['Y', 'A', 'B', 'D', 'F', 'E'],
  7: ['Y', 'A', 'B', 'D', 'E', 'F', 'H'],
  8: ['Y', 'A', 'B', 'C', 'D', 'E', 'G', 'H'],
  9: ['Y', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
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
