import { PokerPlayer } from '@/lib/poker/types';
import { CardDisplay } from './CardDisplay';
import { cn } from '@/lib/utils';

interface PlayerSeatProps {
  player: PokerPlayer;
  isCurrentPlayer: boolean;
  showCards: boolean;
  isHuman: boolean;
}

export function PlayerSeat({ player, isCurrentPlayer, showCards, isHuman }: PlayerSeatProps) {
  const isOut = player.status === 'folded' || player.status === 'eliminated';

  return (
    <div className={cn(
      'flex flex-col items-center gap-1 p-2 rounded-lg min-w-[72px] transition-all',
      isCurrentPlayer && !isOut && 'ring-2 ring-primary bg-primary/10',
      isOut && 'opacity-40',
      player.status === 'all-in' && 'ring-2 ring-destructive',
    )}>
      {/* Cards */}
      <div className="flex gap-0.5">
        {player.holeCards.length > 0 ? (
          player.holeCards.map((card, i) => (
            <CardDisplay
              key={i}
              card={showCards || isHuman ? card : undefined}
              faceDown={!showCards && !isHuman}
              size="sm"
            />
          ))
        ) : (
          <div className="h-12 w-8" /> // Placeholder
        )}
      </div>

      {/* Name & chips */}
      <div className="text-center">
        <p className={cn(
          'text-xs font-semibold truncate max-w-[72px]',
          isHuman ? 'text-primary' : 'text-foreground',
        )}>
          {player.isDealer && '🔘 '}{player.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {player.chips.toLocaleString()}
        </p>
      </div>

      {/* Last action */}
      {player.lastAction && (
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full',
          player.lastAction.startsWith('Fold') ? 'bg-muted text-muted-foreground' :
          player.lastAction.startsWith('Raise') || player.lastAction.startsWith('All-in')
            ? 'bg-destructive/20 text-destructive'
            : 'bg-secondary text-secondary-foreground',
        )}>
          {player.lastAction}
        </span>
      )}
    </div>
  );
}
