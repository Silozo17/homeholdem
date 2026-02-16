import { cn } from '@/lib/utils';

export function CardFan({ className }: { className?: string }) {
  const suits = ['♠', '♥', '♦', '♣'];
  const rotations = [-20, -7, 7, 20];

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {suits.map((suit, i) => (
        <div
          key={suit}
          className="absolute w-16 h-24 rounded-lg border border-border/30 card-back-premium
            flex items-center justify-center shadow-xl"
          style={{
            transform: `rotate(${rotations[i]}deg) translateY(${Math.abs(rotations[i]) * 0.3}px)`,
            zIndex: i,
            animationDelay: `${i * 0.1}s`,
          }}
        >
          <span className={cn(
            'text-2xl font-bold opacity-60',
            suit === '♥' || suit === '♦' ? 'text-destructive' : 'text-foreground',
          )}>
            {suit}
          </span>
        </div>
      ))}
    </div>
  );
}
