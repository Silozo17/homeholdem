/**
 * Fixed seat positions for the poker table.
 * All coordinates are % of the TABLE WRAPPER, not the viewport.
 *
 * 9 canonical seats:
 *   Y (You)     = bottom center (hero)
 *   A (Alex)    = bottom-left
 *   B (Blake)   = left middle
 *   C (Casey)   = upper-left
 *   D (Drew)    = top-left
 *   E (Ellis)   = bottom-right
 *   F (Frankie) = right middle
 *   G (Gray)    = upper-right
 *   H (Harper)  = top-right
 */

import { type Ellipse } from './ellipse';

export interface SeatPos {
  xPct: number;
  yPct: number;
  /** Which of the 9 canonical seat keys this position maps to */
  seatKey: SeatKey;
}

export type SeatKey = 'Y' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export type CardsPlacement = 'above' | 'below' | 'left' | 'right';

/** Hard-mapped card placement per seat – NO inference from coordinates */
export const CARDS_PLACEMENT: Record<SeatKey, CardsPlacement> = {
  Y: 'below',
  A: 'below',
  E: 'below',
  B: 'left',
  C: 'left',
  F: 'right',
  G: 'right',
  D: 'above',
  H: 'above',
};

// Portrait: ry reduced so top seat doesn't hit dealer, rx reduced so sides don't clip
export const PORTRAIT_ELLIPSE: Ellipse = { cx: 50, cy: 50, rx: 38, ry: 34 };
export const LANDSCAPE_ELLIPSE: Ellipse = { cx: 50, cy: 50, rx: 44, ry: 38 };

// ── 9 fixed seat positions (landscape) ──────────────────────────────
// Coordinates place avatar circles ON the brown rail edge
const SEATS_LANDSCAPE: Record<SeatKey, { xPct: number; yPct: number }> = {
  Y: { xPct: 50, yPct: 92 },   // bottom center (hero)
  A: { xPct: 16, yPct: 78 },   // bottom-left
  B: { xPct: 6,  yPct: 48 },   // left middle
  C: { xPct: 16, yPct: 18 },   // upper-left
  D: { xPct: 34, yPct: 4 },    // top-left
  E: { xPct: 84, yPct: 78 },   // bottom-right (mirror of A)
  F: { xPct: 94, yPct: 48 },   // right middle (mirror of B)
  G: { xPct: 84, yPct: 18 },   // upper-right (mirror of C)
  H: { xPct: 66, yPct: 4 },    // top-right (mirror of D)
};

// Portrait uses tighter positions
const SEATS_PORTRAIT: Record<SeatKey, { xPct: number; yPct: number }> = {
  Y: { xPct: 50, yPct: 88 },
  A: { xPct: 16, yPct: 72 },
  B: { xPct: 4,  yPct: 48 },
  C: { xPct: 10, yPct: 24 },
  D: { xPct: 30, yPct: 6 },
  E: { xPct: 84, yPct: 72 },
  F: { xPct: 96, yPct: 48 },
  G: { xPct: 90, yPct: 24 },
  H: { xPct: 70, yPct: 6 },
};

// For each player count, which of the 9 seats to use (always seat 0 = You)
// Clockwise order from hero (Y at bottom): E(bot-right) → F(right) → G(upper-right) → H(top-right) → D(top-left) → C(upper-left) → B(left) → A(bot-left)
const SEAT_PICKS: Record<number, SeatKey[]> = {
  2: ['Y', 'D'],
  3: ['Y', 'F', 'B'],
  4: ['Y', 'F', 'D', 'B'],
  5: ['Y', 'E', 'G', 'C', 'A'],
  6: ['Y', 'E', 'F', 'D', 'B', 'A'],
  7: ['Y', 'E', 'F', 'H', 'D', 'B', 'A'],
  8: ['Y', 'E', 'G', 'H', 'D', 'C', 'B', 'A'],
  9: ['Y', 'E', 'F', 'G', 'H', 'D', 'C', 'B', 'A'],
};

/**
 * Get fixed seat positions for the given player count.
 * Returns SeatPos with xPct, yPct, and seatKey for hard-mapped lookups.
 */
export function getSeatPositions(
  playerCount: number,
  isLandscape: boolean,
  _ellipseOverride?: Ellipse,
): SeatPos[] {
  const count = Math.min(Math.max(playerCount, 2), 9);
  const picks = SEAT_PICKS[count] ?? SEAT_PICKS[9];
  const seats = isLandscape ? SEATS_LANDSCAPE : SEATS_PORTRAIT;

  return picks.map((key) => ({
    ...seats[key],
    seatKey: key,
  }));
}

/**
 * Get the default ellipse for the current orientation (kept for debug overlay).
 */
export function getDefaultEllipse(isLandscape: boolean): Ellipse {
  return isLandscape ? LANDSCAPE_ELLIPSE : PORTRAIT_ELLIPSE;
}
