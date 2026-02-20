import { memo } from 'react';
import { Card } from '@/lib/poker/types';
import { CardDisplay } from '@/components/poker/CardDisplay';

interface MiniCardRowProps {
  cards: Card[];
}

export const MiniCardRow = memo(function MiniCardRow({ cards }: MiniCardRowProps) {
  return (
    <div className="flex gap-0.5 mt-1">
      {cards.map((card, idx) => (
        <CardDisplay key={idx} card={card} size="xs" dealDelay={0} />
      ))}
    </div>
  );
});
