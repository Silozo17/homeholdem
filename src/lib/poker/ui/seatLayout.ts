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
  A: { xPct: 22, yPct: 78 },    // bottom-left
  B: { xPct: 10, yPct: 50 },    // left middle
  C: { xPct: 14, yPct: 24 },    // upper-left
  D: { xPct: 32, yPct: 6 },     // top-left
  E: { xPct: 78, yPct: 78 },    // bottom-right   (mirror of A)
  F: { xPct: 90, yPct: 50 },    // right middle   (mirror of B)
  G: { xPct: 86, yPct: 24 },    // upper-right    (mirror of C)
  H: { xPct: 68, yPct: 6 },     // top-right      (mirror of D)
};

// Portrait uses tighter positions — sides pulled inward to avoid clipping
const SEATS_PORTRAIT = {
  Y: { xPct: 50, yPct: 88 },
  A: { xPct: 20, yPct: 72 },
  B: { xPct: 10, yPct: 50 },
  C: { xPct: 14, yPct: 28 },
  D: { xPct: 32, yPct: 10 },
  E: { xPct: 80, yPct: 72 },
  F: { xPct: 90, yPct: 50 },
  G: { xPct: 86, yPct: 28 },
  H: { xPct: 68, yPct: 10 },
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
