import { memo } from 'react';
import { Card, RANK_NAMES, SUIT_SYMBOLS } from '@/lib/poker/types';
import { cn } from '@/lib/utils';
import cardBackPremium from '@/assets/poker/card-back-premium.png';

interface CardDisplayProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  dealDelay?: number;
  isWinner?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-[34px]',
  sm: 'w-7 h-10',
  md: 'w-10 h-14',
  lg: 'w-12 h-[68px]',
  xl: 'w-14 h-[80px]',
  '2xl': 'w-[96px] h-[136px]',
};

export const CardDisplay = memo(function CardDisplay({ card, faceDown = false, size = 'md', className, dealDelay = 0, isWinner }: CardDisplayProps) {
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

  if (faceDown || !card) {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'rounded-lg overflow-hidden flex items-center justify-center select-none',
          'shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_1px_rgba(255,215,0,0.3)] animate-card-deal-deck',
          'border border-primary/20',
          className,
        )}
        style={{ animationDelay: `${dealDelay}s` }}
      >
        <img src={cardBackPremium} alt="" className="w-full h-full object-cover" draggable={false} />
      </div>
    );
  }

  const rankStr = RANK_NAMES[card.rank];
  const suitStr = SUIT_SYMBOLS[card.suit];
  const textSizes = {
    xs: { rank: 'text-[7px]', suit: 'text-[6px]', center: 'text-xs' },
    sm: { rank: 'text-[9px]', suit: 'text-[8px]', center: 'text-sm' },
    md: { rank: 'text-[11px]', suit: 'text-[10px]', center: 'text-lg' },
    lg: { rank: 'text-xs', suit: 'text-[11px]', center: 'text-xl' },
    xl: { rank: 'text-sm', suit: 'text-xs', center: 'text-2xl' },
    '2xl': { rank: 'text-lg', suit: 'text-base', center: 'text-4xl' },
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg flex flex-col relative select-none',
        'shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.8)]',
        'animate-card-reveal',
        isWinner && 'animate-winner-glow ring-1 ring-primary/60',
        className,
      )}
      style={{
        background: 'linear-gradient(165deg, hsl(0 0% 100%) 0%, hsl(40 20% 96%) 60%, hsl(40 15% 92%) 100%)',
        border: '1px solid hsl(40 20% 85%)',
        animationDelay: `${dealDelay}s`,
      }}
    >
      {/* Top-left corner */}
      <div className={cn('absolute top-0.5 left-1 flex flex-col items-center leading-none')}>
        <span className={cn(
          textSizes[size].rank, 'font-black',
          isRed ? 'text-red-600' : 'text-gray-900',
        )}>
          {rankStr}
        </span>
        <span className={cn(
          textSizes[size].suit,
          isRed ? 'text-red-500' : 'text-gray-800',
        )}>
          {suitStr}
        </span>
      </div>
      {/* Center suit */}
      <div className="flex-1 flex items-center justify-center">
        <span className={cn(
          textSizes[size].center, 'font-bold',
          isRed ? 'text-red-500/80' : 'text-gray-700/80',
        )}>
          {suitStr}
        </span>
      </div>
      {/* Linen texture overlay */}
      <div className="absolute inset-0 rounded-lg pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000' fill-opacity='1'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
});
