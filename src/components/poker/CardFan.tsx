import { cn } from '@/lib/utils';

export function CardFan({ className, compact }: { className?: string; compact?: boolean }) {
  const suits = ['♠', '♥', '♦', '♣'];
  const rotations = [-20, -7, 7, 20];

  return (
    <div className={cn('relative flex items-center justify-center', compact ? 'overflow-hidden' : 'overflow-visible', className)} style={{ minHeight: compact ? 56 : 112 }}>
      {suits.map((suit, i) => (
        <div
          key={suit}
          className={cn(
            'absolute rounded-lg border border-border/30 card-back-premium flex items-center justify-center shadow-xl',
            compact ? 'w-11 h-16' : 'w-16 h-24'
          )}
          style={{
            transform: `rotate(${rotations[i]}deg) translateY(${Math.abs(rotations[i]) * 0.3}px)`,
            zIndex: i,
            animationDelay: `${i * 0.1}s`,
          }}
        >
          <span className={cn(
            'font-bold opacity-60',
            compact ? 'text-lg' : 'text-2xl',
            suit === '♥' || suit === '♦' ? 'text-destructive' : 'text-foreground',
          )}>
            {suit}
          </span>
        </div>
      ))}
    </div>
  );
}
