import { ReactNode } from 'react';

interface SeatAnchorProps {
  xPct: number;
  yPct: number;
  zIndex: number;
  children: ReactNode;
}

/**
 * Positions its children so that the CENTRE of the first child (the avatar circle)
 * sits exactly at (xPct%, yPct%) within the table wrapper.
 *
 * The trick: we position this div at (xPct, yPct) with translate(-50%, -50%)
 * so its own centre is on the point. Then PlayerSeat uses a relative layout
 * where the avatar row is the "origin" and info stacks extend outward.
 */
export function SeatAnchor({ xPct, yPct, zIndex, children }: SeatAnchorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: `${yPct}%`,
        zIndex,
        // We do NOT translate -50%/-50% on this wrapper.
        // Instead, PlayerSeat handles centering the avatar at (0,0).
        pointerEvents: 'auto',
      }}
    >
      {children}
    </div>
  );
}
