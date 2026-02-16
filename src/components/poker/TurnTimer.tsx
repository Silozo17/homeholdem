import { useEffect, useState, useRef } from 'react';

interface TurnTimerProps {
  /** Duration in seconds */
  duration?: number;
  /** Size in px */
  size?: number;
  /** Stroke width in px */
  strokeWidth?: number;
  /** Called when timer reaches zero */
  onTimeout?: () => void;
  /** Called when remaining time hits threshold (default 5s) */
  onLowTime?: () => void;
  /** Whether to animate */
  active: boolean;
}

export function TurnTimer({
  duration = 30,
  size = 36,
  strokeWidth = 4,
  onTimeout,
  onLowTime,
  active,
}: TurnTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const lowTimeFired = useRef(false);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      lowTimeFired.current = false;
      return;
    }

    setElapsed(0);
    lowTimeFired.current = false;
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
        // Fire low time callback at 5 seconds remaining
        if (!lowTimeFired.current && (duration - secs) <= 5) {
          lowTimeFired.current = true;
          onLowTime?.();
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [active, duration, onTimeout, onLowTime]);

  if (!active) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(elapsed / duration, 1);
  const dashOffset = circumference * (1 - progress);

  // Color: gold -> orange -> red as timer runs down
  const remaining = 1 - progress;
  const hue = remaining > 0.5 ? 43 : remaining > 0.3 ? 25 : 0;
  const lightness = remaining > 0.3 ? 49 : 45;
  const isLow = remaining < 0.33;
  const isCritical = remaining < 0.2;

  return (
    <svg
      width={size}
      height={size}
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) rotate(-90deg)',
        zIndex: 10,
      }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(0 0% 100% / 0.25)"
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
          filter: isCritical
            ? `drop-shadow(0 0 8px hsl(0 70% 50% / 0.8))`
            : isLow
            ? `drop-shadow(0 0 5px hsl(${hue} 70% 50% / 0.5))`
            : `drop-shadow(0 0 3px hsl(43 74% 49% / 0.3))`,
          ...(isCritical ? { animation: 'pulse 0.6s ease-in-out infinite' } : {}),
        }}
      />
    </svg>
  );
}
