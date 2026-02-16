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
        className="w-4 h-4 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}, color-mix(in srgb, ${color} 60%, black))`,
          boxShadow: `0 1px 6px rgba(200,160,40,0.6), 0 0 10px rgba(200,160,40,0.3), inset 0 1px 2px rgba(255,255,255,0.4)`,
          border: `1.5px solid color-mix(in srgb, ${color} 70%, white)`,
        }}
      />
    </div>
  );
}
