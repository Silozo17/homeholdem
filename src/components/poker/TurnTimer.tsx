import { useEffect, useState } from 'react';

interface TurnTimerProps {
  /** Duration in seconds */
  duration?: number;
  /** Size in px */
  size?: number;
  /** Stroke width in px */
  strokeWidth?: number;
  /** Called when timer reaches zero */
  onTimeout?: () => void;
  /** Whether to animate */
  active: boolean;
}

export function TurnTimer({
  duration = 30,
  size = 36,
  strokeWidth = 2.5,
  onTimeout,
  active,
}: TurnTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }

    setElapsed(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const secs = (now - start) / 1000;
      if (secs >= duration) {
        setElapsed(duration);
        clearInterval(interval);
        onTimeout?.();
      } else {
        setElapsed(secs);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [active, duration, onTimeout]);

  if (!active) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(elapsed / duration, 1);
  const dashOffset = circumference * (1 - progress);

  // Color: gold -> orange -> red as timer runs down
  const remaining = 1 - progress;
  const hue = remaining > 0.5 ? 43 : remaining > 0.2 ? 25 : 0;
  const lightness = remaining > 0.2 ? 49 : 45;

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 -rotate-90 pointer-events-none"
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(0 0% 100% / 0.1)"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`hsl(${hue} 74% ${lightness}%)`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{
          transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease',
          filter: remaining < 0.2 ? `drop-shadow(0 0 4px hsl(0 70% 50% / 0.6))` : 'none',
        }}
      />
    </svg>
  );
}
