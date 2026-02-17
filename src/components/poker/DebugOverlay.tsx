import { Ellipse } from '@/lib/poker/ui/ellipse';
import { SeatPos } from '@/lib/poker/ui/seatLayout';

interface DebugOverlayProps {
  ellipse: Ellipse;
  seatPositions: SeatPos[];
  panelWidth?: number;
}

/**
 * Debug overlay that draws the rail ellipse, table wrapper bounds, and seat anchor points.
 * Enabled via ?debug=1 query parameter.
 */
export function DebugOverlay({ ellipse, seatPositions, panelWidth }: DebugOverlayProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ zIndex: 999, opacity: 0.9 }}
    >
      {/* Table wrapper bounding rectangle */}
      <rect
        x={0.5} y={0.5} width={99} height={99}
        fill="none"
        stroke="rgba(0,255,0,0.6)"
        strokeWidth="0.4"
        strokeDasharray="2,2"
      />
      {/* Rail ellipse */}
      <ellipse
        cx={ellipse.cx}
        cy={ellipse.cy}
        rx={ellipse.rx}
        ry={ellipse.ry}
        fill="none"
        stroke="rgba(255,0,0,0.8)"
        strokeWidth="0.5"
      />
      {/* Center cross */}
      <line x1={ellipse.cx - 2} y1={ellipse.cy} x2={ellipse.cx + 2} y2={ellipse.cy} stroke="yellow" strokeWidth="0.3" />
      <line x1={ellipse.cx} y1={ellipse.cy - 2} x2={ellipse.cx} y2={ellipse.cy + 2} stroke="yellow" strokeWidth="0.3" />
      {/* Seat anchor dots with coordinate labels */}
      {seatPositions.map((s, i) => (
        <g key={i}>
          <circle cx={s.xPct} cy={s.yPct} r="1.5" fill="rgba(0,255,255,0.9)" />
          <text x={s.xPct + 2} y={s.yPct - 1} fontSize="2.5" fill="white" fontWeight="bold">
            {s.seatKey} ({s.xPct.toFixed(0)},{s.yPct.toFixed(0)})
          </text>
        </g>
      ))}
      {/* Panel width indicator */}
      {panelWidth != null && panelWidth > 0 && (
        <text x={50} y={98} fontSize="2.5" fill="lime" textAnchor="middle">
          panel: {panelWidth}px
        </text>
      )}
    </svg>
  );
}
