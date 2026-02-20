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
      className={`relative flex flex-col items-start rounded-[4px] border border-gray-300 bg-white shadow-sm select-none ${isFaded ? 'opacity-35' : ''}`}
      style={{ width: 40, height: 56, padding: '2px 3px' }}
    >
      <span className={`${colorClass} font-bold leading-none`} style={{ fontSize: 14 }}>
        {rank}
      </span>
      <span className={`${colorClass} leading-none`} style={{ fontSize: 12, marginTop: -1 }}>
        {suit}
      </span>
    </div>
  );
});
