import { Card, RANK_NAMES, SUIT_SYMBOLS } from '@/lib/poker/types';
import { cn } from '@/lib/utils';

interface CardDisplayProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dealDelay?: number;
  isWinner?: boolean;
}

const sizeClasses = {
  sm: 'w-7 h-10 text-[10px]',
  md: 'w-10 h-14 text-xs',
  lg: 'w-12 h-[68px] text-sm',
};

export function CardDisplay({ card, faceDown = false, size = 'md', className, dealDelay = 0, isWinner }: CardDisplayProps) {
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

  if (faceDown || !card) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-lg card-back-premium flex items-center justify-center font-bold select-none',
          'shadow-lg border border-border/40 animate-card-deal',
          className,
        )}
        style={{ animationDelay: `${dealDelay}s` }}
      >
        <span className="text-primary/50 text-lg">♠</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg card-face-white flex flex-col items-center justify-center font-bold select-none',
        'shadow-lg border border-border/20 animate-card-deal',
        isWinner && 'animate-winner-glow',
        className,
      )}
      style={{ animationDelay: `${dealDelay}s` }}
    >
      <span className={cn(
        'leading-none font-extrabold',
        isRed ? 'text-red-600' : 'text-gray-900',
      )}>
        {RANK_NAMES[card.rank]}
      </span>
      <span className={cn(
        'leading-none',
        isRed ? 'text-red-500' : 'text-gray-800',
        size === 'lg' && 'text-lg',
      )}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </div>
  );
}
