import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { CardDisplay } from './CardDisplay';
import { Card } from '@/lib/poker/types';
import cardBackPremium from '@/assets/poker/card-back-premium.png';
import { cn } from '@/lib/utils';

const PEEK_HINT_KEY = 'poker-peek-hint-shown';
const DRAG_THRESHOLD = 80;
const SNAP_THRESHOLD = 0.65;

interface PeekableCardProps {
  card: Card;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  dealDelay?: number;
  isPeeked: boolean;
  onPeek: () => void;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-[34px]',
  sm: 'w-7 h-10',
  md: 'w-10 h-14',
  lg: 'w-12 h-[68px]',
  xl: 'w-14 h-[80px]',
  '2xl': 'w-[96px] h-[136px]',
};

export const PeekableCard = memo(function PeekableCard({
  card, size = '2xl', dealDelay = 0, isPeeked, onPeek, className,
}: PeekableCardProps) {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Show hint once
  useEffect(() => {
    if (isPeeked) return;
    try {
      if (!localStorage.getItem(PEEK_HINT_KEY)) {
        setShowHint(true);
        const t = setTimeout(() => {
          setShowHint(false);
          localStorage.setItem(PEEK_HINT_KEY, '1');
        }, 3000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [isPeeked]);

  // Non-passive touchmove listener to prevent scroll interference
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isPeeked) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const dy = startYRef.current - e.touches[0].clientY;
      const p = Math.max(0, Math.min(1, dy / DRAG_THRESHOLD));
      setProgress(p);
    };

    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleTouchMove);
  }, [isPeeked]);

  if (isPeeked) {
    return (
      <CardDisplay
        card={card}
        faceDown={false}
        size={size}
        dealDelay={dealDelay}
        className={className}
      />
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
    isDraggingRef.current = true;
    setShowHint(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    isDraggingRef.current = false;
    if (progress >= SNAP_THRESHOLD) {
      setProgress(1);
      onPeek();
    } else {
      setProgress(0);
    }
  };

  // Mouse fallback for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    setIsDragging(true);
    isDraggingRef.current = true;
    setShowHint(false);

    const handleMove = (ev: MouseEvent) => {
      const dy = startYRef.current - ev.clientY;
      const p = Math.max(0, Math.min(1, dy / DRAG_THRESHOLD));
      setProgress(p);
    };
    const handleUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      setProgress(prev => {
        if (prev >= SNAP_THRESHOLD) {
          setTimeout(onPeek, 0);
          return 1;
        }
        return 0;
      });
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const tiltDeg = -15 * progress;
  const revealPct = progress * 100;
  const shadowIntensity = 0.3 + progress * 0.4;

  return (
    <div
      ref={containerRef}
      className={cn('relative cursor-grab select-none', isDragging && 'cursor-grabbing')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{ perspective: '400px', touchAction: 'none' }}
    >
      {/* Card container with tilt */}
      <div
        className={cn(sizeClasses[size], 'relative rounded-lg overflow-hidden')}
        style={{
          transform: `rotateX(${tiltDeg}deg)`,
          transformOrigin: 'bottom center',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 ${4 + progress * 12}px ${8 + progress * 16}px rgba(0,0,0,${shadowIntensity})`,
        }}
      >
        <img
          src={cardBackPremium}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
          draggable={false}
        />
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            clipPath: `inset(${100 - revealPct}% 0 0 0)`,
            transition: isDragging ? 'none' : 'clip-path 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <CardDisplay
            card={card}
            faceDown={false}
            size={size}
            className="!shadow-none !animate-none"
          />
        </div>
        {progress > 0 && (
          <div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: `linear-gradient(180deg, transparent ${80 - revealPct * 0.5}%, hsl(43 74% 80% / ${progress * 0.15}) 100%)`,
            }}
          />
        )}
      </div>

      {showHint && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap animate-fade-in">
          <span className="text-[7px] font-bold text-primary/60 uppercase tracking-wider"
            style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}
          >
            ↑ Drag to peek
          </span>
        </div>
      )}
    </div>
  );
});
