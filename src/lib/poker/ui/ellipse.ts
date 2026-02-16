/**
 * Ellipse math helpers for placing seats on the table rail.
 * All coordinates are in percentage (0–100) of the table wrapper.
 */

export interface Ellipse {
  cx: number; // center X %
  cy: number; // center Y %
  rx: number; // radius X %
  ry: number; // radius Y %
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Returns a point on the ellipse at a given angle (in degrees).
 * 0° = right, 90° = bottom, 180° = left, 270° = top.
 * We use math convention but CSS has Y-down, so sin gives downward movement.
 */
export function pointOnEllipsePct(e: Ellipse, thetaDeg: number): { xPct: number; yPct: number } {
  const t = degToRad(thetaDeg);
  const x = e.cx + e.rx * Math.cos(t);
  const y = e.cy + e.ry * Math.sin(t);
  return { xPct: x, yPct: y };
}

/**
 * Push a point outward from the ellipse center by a given distance (in %).
 * Useful for placing seats slightly outside the rail.
 */
export function offsetFromCenterPct(
  e: Ellipse,
  xPct: number,
  yPct: number,
  distancePct: number,
): { xPct: number; yPct: number } {
  const dx = xPct - e.cx;
  const dy = yPct - e.cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    xPct: xPct + (dx / len) * distancePct,
    yPct: yPct + (dy / len) * distancePct,
  };
}

export function clampPct(v: number, min = 4, max = 96): number {
  return Math.max(min, Math.min(max, v));
}
