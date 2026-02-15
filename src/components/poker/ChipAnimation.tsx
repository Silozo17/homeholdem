import { useEffect, useState } from 'react';

interface ChipAnimationProps {
  /** From position as percentage of container */
  fromX: number;
  fromY: number;
  /** To position as percentage of container */
  toX: number;
  toY: number;
  /** Duration in ms */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Chip color */
  color?: string;
}

export function ChipAnimation({
  fromX, fromY, toX, toY,
  duration = 500,
  onComplete,
  color = 'hsl(43 74% 49%)',
}: ChipAnimationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: `${fromX}%`,
        top: `${fromY}%`,
        animation: `chip-fly-custom ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
        '--chip-dx': `${toX - fromX}%`,
        '--chip-dy': `${toY - fromY}%`,
      } as React.CSSProperties}
    >
      {/* Mini chip */}
      <div
        className="w-3 h-3 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}, color-mix(in srgb, ${color} 60%, black))`,
          boxShadow: `0 1px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)`,
          border: `1px solid color-mix(in srgb, ${color} 70%, white)`,
        }}
      />
    </div>
  );
}
