import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface PotDisplayProps {
  pot: number;
  className?: string;
}

export function PotDisplay({ pot, className }: PotDisplayProps) {
  const [displayPot, setDisplayPot] = useState(pot);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPotRef = useRef(pot);

  useEffect(() => {
    if (pot !== prevPotRef.current) {
      setIsAnimating(true);
      // Animate count
      const start = prevPotRef.current;
      const diff = pot - start;
      const steps = 12;
      let step = 0;
      const id = setInterval(() => {
        step++;
        setDisplayPot(Math.round(start + (diff * step) / steps));
        if (step >= steps) {
          clearInterval(id);
          setDisplayPot(pot);
          setTimeout(() => setIsAnimating(false), 200);
        }
      }, 30);
      prevPotRef.current = pot;
      return () => clearInterval(id);
    }
  }, [pot]);

  if (pot <= 0 && displayPot <= 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1 rounded-full',
      'bg-background/40 backdrop-blur-sm border border-primary/30',
      isAnimating && 'animate-counter-pulse',
      className,
    )}>
      <div className="relative w-4 h-4">
        <div className="absolute bottom-0 left-0 w-4 h-1.5 rounded-full bg-primary/80 border border-primary" />
        <div className="absolute bottom-1 left-0 w-4 h-1.5 rounded-full bg-primary/60 border border-primary/80" />
        <div className="absolute bottom-2 left-0 w-4 h-1.5 rounded-full bg-primary/40 border border-primary/60" />
      </div>
      <span className={cn(
        'font-bold text-xs text-primary',
        isAnimating && 'text-primary',
      )}>
        {displayPot.toLocaleString()}
      </span>
    </div>
  );
}
