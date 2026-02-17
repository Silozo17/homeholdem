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
  lg: 'w-10 h-[58px]',
  xl: 'w-[44px] h-[62px]',
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
          'shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_1px_rgba(255,215,0,0.3)] animate-card-arrive',
          'border border-primary/20',
          className,
        )}
        style={{ animationDelay: `${dealDelay + 0.45}s` }}
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
    lg: { rank: 'text-base', suit: 'text-sm', center: 'text-3xl' },
    xl: { rank: 'text-base', suit: 'text-sm', center: 'text-3xl' },
    '2xl': { rank: 'text-lg', suit: 'text-base', center: 'text-4xl' },
  };

  return (
    <div
      className={cn(
        sizeClasses[size],
        'rounded-lg flex flex-col relative select-none',
        'shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.8)]',
        !isWinner && 'animate-card-reveal',
        isWinner && 'ring-1 ring-primary/60',
        className,
      )}
      style={{
        background: 'linear-gradient(165deg, hsl(0 0% 100%) 0%, hsl(40 20% 96%) 60%, hsl(40 15% 92%) 100%)',
        border: '1px solid hsl(40 20% 85%)',
        ...(isWinner
          ? { animation: `card-reveal 0.4s ease-out both, winner-glow 1.5s ease-in-out 0.4s infinite`, animationDelay: `${dealDelay}s, ${dealDelay + 0.4}s` }
          : { animationDelay: `${dealDelay}s` }),
      }}
    >
      {/* Top-left corner */}
      <div className={cn('absolute top-1 left-1.5 flex flex-col items-center leading-none')}>
        <span className={cn(
          textSizes[size].rank, 'font-black',
          isRed ? 'text-[#C53030]' : 'text-[#1A1A1A]',
        )}>
          {rankStr}
        </span>
        <span className={cn(
          textSizes[size].suit, '-mt-0.5',
          isRed ? 'text-[#C53030]' : 'text-[#1A1A1A]',
        )}>
          {suitStr}
        </span>
      </div>
      {/* Center suit watermark */}
      <div className="flex-1 flex items-end justify-center pb-[15%]">
        <span className={cn(
          textSizes[size].center, 'font-bold',
          isRed ? 'text-[#C53030]/30' : 'text-[#1A1A1A]/30',
        )}>
          {suitStr}
        </span>
      </div>
    </div>
  );
});
