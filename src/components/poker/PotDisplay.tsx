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
      'flex items-center gap-2 px-3 py-1 rounded-full',
      isAnimating && 'animate-counter-pulse',
      className,
    )} style={{
      background: 'linear-gradient(180deg, hsl(160 25% 15% / 0.8), hsl(160 30% 10% / 0.9))',
      backdropFilter: 'blur(8px)',
      border: '1px solid hsl(43 74% 49% / 0.3)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      {/* Chip stack graphic */}
      <div className="relative w-4 h-5 flex-shrink-0">
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute left-0 w-4 h-2 rounded-full" style={{
            bottom: `${i * 3}px`,
            background: i === 2 ? 'hsl(43 74% 49%)' : i === 1 ? 'hsl(0 70% 50%)' : 'hsl(200 70% 50%)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.3)`,
            border: '0.5px solid rgba(0,0,0,0.2)',
          }} />
        ))}
      </div>
      <span className={cn(
        'font-black text-xs',
        isAnimating ? 'text-primary' : 'text-primary',
      )} style={{
        textShadow: '0 0 8px hsl(43 74% 49% / 0.5)',
      }}>
        {displayPot.toLocaleString()}
      </span>
    </div>
  );
}
