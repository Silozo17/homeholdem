import { Card, RANK_NAMES, SUIT_SYMBOLS } from '@/lib/poker/types';
import { cn } from '@/lib/utils';

interface CardDisplayProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-12 text-xs',
  md: 'w-11 h-16 text-sm',
  lg: 'w-14 h-20 text-base',
};

export function CardDisplay({ card, faceDown = false, size = 'md', className }: CardDisplayProps) {
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

  if (faceDown || !card) {
    return (
      <div className={cn(
        sizeClasses[size],
        'rounded-md border border-border bg-primary/20 flex items-center justify-center font-bold select-none',
        'shadow-md',
        className,
      )}>
        <span className="text-primary opacity-60">♠</span>
      </div>
    );
  }

  return (
    <div className={cn(
      sizeClasses[size],
      'rounded-md border bg-foreground flex flex-col items-center justify-center font-bold select-none',
      'shadow-md transition-transform duration-200',
      isRed ? 'text-destructive' : 'text-background',
      className,
    )}>
      <span className="leading-none">{RANK_NAMES[card.rank]}</span>
      <span className="leading-none">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}
