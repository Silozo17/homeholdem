import { ReactNode } from 'react';

interface SeatAnchorProps {
  xPct: number;
  yPct: number;
  zIndex: number;
  children: ReactNode;
}

/**
 * Positions its children so that the CENTRE of the child
 * sits exactly at (xPct%, yPct%) within the table wrapper.
 *
 * translate(-50%, -50%) ensures the midpoint of the child element
 * (which should be the avatar circle) lands on the rail coordinate.
 */
export function SeatAnchor({ xPct, yPct, zIndex, children }: SeatAnchorProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: 'translate(-50%, -50%)',
        zIndex,
        pointerEvents: 'auto',
      }}
    >
      {children}
    </div>
  );
}
