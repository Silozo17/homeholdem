/**
 * Seat positions anchored to an ellipse matching the table rail.
 * All coordinates are % of the TABLE WRAPPER, not the viewport.
 */

import { type Ellipse, pointOnEllipsePct, offsetFromCenterPct, clampPct } from './ellipse';

export interface SeatPos {
  xPct: number;
  yPct: number;
}

// Portrait: ry reduced so top seat doesn't hit dealer, rx reduced so sides don't clip
export const PORTRAIT_ELLIPSE: Ellipse = { cx: 50, cy: 50, rx: 38, ry: 34 };
export const LANDSCAPE_ELLIPSE: Ellipse = { cx: 50, cy: 48, rx: 42, ry: 34 };

/**
 * Angle maps per player count.
 * CSS coords: 90° = bottom, 270° = top, 0° = right, 180° = left.
 * Seat 0 (human) is always at bottom (90°).
 *
 * Top-center (270°) is reserved for the dealer character — no player seat goes there.
 */
const portraitAngles: Record<number, number[]> = {
  2: [90, 270],
  3: [90, 200, 340],
  4: [90, 180, 0, 270],
  5: [90, 155, 210, 330, 25],
  6: [90, 145, 200, 250, 310, 35],
  7: [90, 140, 185, 225, 270, 315, 30],
  8: [90, 135, 175, 215, 255, 295, 335, 30],
  9: [90, 130, 160, 200, 240, 270, 300, 340, 20],
};

const landscapeAngles: Record<number, number[]> = {
  2: [90, 270],
  3: [90, 210, 330],
  4: [90, 195, 270, 345],
  5: [90, 155, 210, 330, 25],
  6: [90, 148, 200, 270, 340, 32],
  7: [90, 140, 180, 220, 270, 320, 20],
  8: [90, 135, 170, 210, 250, 290, 330, 25],
  9: [90, 130, 160, 195, 230, 270, 310, 340, 20],
};

// Very small push — seats should sit ON the rail, not far outside
const PUSH_DISTANCE = 2;

/**
 * Compute seat positions anchored to the table rail ellipse.
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
      xPct: clampPct(pushed.xPct, 5, 95),
      yPct: clampPct(pushed.yPct, 5, 95),
    };
  });
}

/**
 * Get the default ellipse for the current orientation.
 */
export function getDefaultEllipse(isLandscape: boolean): Ellipse {
  return isLandscape ? LANDSCAPE_ELLIPSE : PORTRAIT_ELLIPSE;
}
