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
  /** Stagger delay in ms */
  delay?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Chip color */
  color?: string;
}

export function ChipAnimation({
  fromX, fromY, toX, toY,
  duration = 900,
  delay = 0,
  onComplete,
  color = 'hsl(43 74% 49%)',
}: ChipAnimationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration + delay);
    return () => clearTimeout(t);
  }, [duration, delay, onComplete]);

  if (!visible) return null;

  // Use pixel-based calc() for reliable movement
  const dx = toX - fromX;
  const dy = toY - fromY;

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: `${fromX}%`,
        top: `${fromY}%`,
        animationName: 'chip-sweep',
        animationDuration: `${duration}ms`,
        animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        animationFillMode: 'forwards',
        animationDelay: `${delay}ms`,
        '--chip-end-x': `${dx}cqw`,
        '--chip-end-y': `${dy}cqh`,
        opacity: 0,
      } as React.CSSProperties}
    >
      {/* Chip with trail */}
      <div
        className="w-5 h-5 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}, color-mix(in srgb, ${color} 60%, black))`,
          boxShadow: `0 2px 8px rgba(200,160,40,0.8), 0 0 16px rgba(200,160,40,0.5), inset 0 1px 2px rgba(255,255,255,0.4)`,
          border: `2px solid color-mix(in srgb, ${color} 70%, white)`,
        }}
      />
    </div>
  );
}
