import { memo } from 'react';
import { Card } from '@/lib/poker/types';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const RANK_LABELS: Record<number, string> = {
  14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10',
  9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2',
};

interface HandRankingCardProps {
  card: Card;
  isFaded?: boolean;
}

export const HandRankingCard = memo(function HandRankingCard({ card, isFaded }: HandRankingCardProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorClass = isRed ? 'text-red-600' : 'text-gray-900';
  const rank = RANK_LABELS[card.rank] ?? String(card.rank);
  const suit = SUIT_SYMBOLS[card.suit] ?? '';

  return (
    <div
      className={`flex flex-col items-start select-none ${isFaded ? 'bg-[#D4D4D4]' : 'bg-white'}`}
      style={{ width: 36, height: 52, padding: '3px 4px' }}
    >
      <span className={`${colorClass} font-bold leading-none`} style={{ fontSize: 15 }}>
        {rank}
      </span>
      <span className={`${colorClass} leading-none`} style={{ fontSize: 13, marginTop: -1 }}>
        {suit}
      </span>
    </div>
  );
});
