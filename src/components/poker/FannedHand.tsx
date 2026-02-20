import { memo } from 'react';
import { Card } from '@/lib/poker/types';
import { HandRankingCard } from './HandRankingCard';

interface FannedHandProps {
  cards: Card[];
  highlighted: number[];
}

export const FannedHand = memo(function FannedHand({ cards, highlighted }: FannedHandProps) {
  return (
    <div className="flex items-center">
      {cards.map((card, i) => (
        <div
          key={i}
          style={{ marginLeft: i > 0 ? -26 : 0, zIndex: i }}
        >
          <HandRankingCard card={card} isFaded={!highlighted.includes(i)} />
        </div>
      ))}
    </div>
  );
});
