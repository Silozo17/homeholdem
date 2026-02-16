/**
 * Seat positions for the poker table using ellipse-anchored placement.
 * All coordinates are percentages of the TABLE WRAPPER, not the viewport.
 *
 * The ellipse represents the table rail. Seats are pushed slightly
 * outward from the rail so they sit "on" it visually.
 */

import { type Ellipse, pointOnEllipsePct, offsetFromCenterPct, clampPct } from './ellipse';

export interface SeatPos {
  xPct: number;
  yPct: number;
}

// Default ellipse params matching the premium table asset
// The table oval sits roughly centered with these proportions
// Ellipse matching the table rail. Seats pushed outward will land on/outside the rail.
// rx/ry sized so pushed seats stay within visible screen bounds.
export const PORTRAIT_ELLIPSE: Ellipse = { cx: 50, cy: 50, rx: 34, ry: 30 };
export const LANDSCAPE_ELLIPSE: Ellipse = { cx: 50, cy: 50, rx: 40, ry: 32 };

/**
 * Angle maps per player count.
 * In CSS coordinates (y-down): 90° = bottom, 270° = top, 0° = right, 180° = left.
 * Local player (seat 0) is always at the bottom (90°).
 */
const portraitAngles: Record<number, number[]> = {
  2: [90, 270],
  3: [90, 210, 330],
  4: [90, 180, 270, 0],
  5: [90, 150, 210, 270, 330],
  6: [90, 140, 200, 270, 340, 40],
  7: [90, 130, 170, 210, 270, 330, 10],
  8: [90, 125, 160, 200, 240, 290, 330, 35],
  9: [90, 120, 150, 195, 235, 270, 305, 345, 30],
};

const landscapeAngles: Record<number, number[]> = {
  2: [90, 270],
  3: [90, 210, 330],
  4: [90, 195, 270, 345],
  5: [90, 150, 210, 270, 330],
  6: [90, 145, 200, 270, 340, 35],
  7: [90, 135, 170, 210, 270, 330, 10],
  8: [90, 130, 165, 195, 235, 280, 330, 30],
  9: [90, 125, 155, 190, 225, 270, 315, 345, 25],
};

/**
 * How far (in %) to push each seat outward from the ellipse rail.
 * Bigger = further from the felt center.
 */
const PUSH_DISTANCE = 6;

/**
 * Compute seat positions anchored to the table rail ellipse.
 *
 * @param playerCount - number of players (2-9)
 * @param isLandscape - orientation
 * @param ellipseOverride - optional custom ellipse params
 */
export function getSeatPositions(
  playerCount: number,
  isLandscape: boolean,
  ellipseOverride?: Ellipse,
): SeatPos[] {
  const ellipse = ellipseOverride ?? (isLandscape ? LANDSCAPE_ELLIPSE : PORTRAIT_ELLIPSE);
  const count = Math.min(Math.max(playerCount, 2), 9);
  const angles = (isLandscape ? landscapeAngles : portraitAngles)[count] ?? portraitAngles[9];

  return angles.map((theta) => {
    const p = pointOnEllipsePct(ellipse, theta);
    const pushed = offsetFromCenterPct(ellipse, p.xPct, p.yPct, PUSH_DISTANCE);
    return {
      xPct: clampPct(pushed.xPct, 6, 94),
      yPct: clampPct(pushed.yPct, 2, 98),
    };
  });
}

/**
 * Get the default ellipse for the current orientation.
 */
export function getDefaultEllipse(isLandscape: boolean): Ellipse {
  return isLandscape ? LANDSCAPE_ELLIPSE : PORTRAIT_ELLIPSE;
}
