import { memo } from 'react';
import { Card } from '@/lib/poker/types';
import { HandRankingCard } from './HandRankingCard';

interface FannedHandProps {
  cards: Card[];
  highlighted: number[];
}

export const FannedHand = memo(function FannedHand({ cards, highlighted }: FannedHandProps) {
  return (
    <div className="flex rounded-md overflow-hidden border border-white/20 shadow-sm">
      {cards.map((card, i) => (
        <div
          key={i}
          className={i < cards.length - 1 ? 'border-r border-gray-300' : ''}
        >
          <HandRankingCard card={card} isFaded={!highlighted.includes(i)} />
        </div>
      ))}
    </div>
  );
});
