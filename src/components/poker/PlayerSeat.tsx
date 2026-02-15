import { PokerPlayer } from '@/lib/poker/types';
import { CardDisplay } from './CardDisplay';
import { PlayerAvatar } from './PlayerAvatar';
import { DealerButton } from './DealerButton';
import { TurnTimer } from './TurnTimer';
import { cn } from '@/lib/utils';

interface PlayerSeatProps {
  player: PokerPlayer;
  isCurrentPlayer: boolean;
  showCards: boolean;
  isHuman: boolean;
  isShowdown: boolean;
}

export function PlayerSeat({ player, isCurrentPlayer, showCards, isHuman, isShowdown }: PlayerSeatProps) {
  const isOut = player.status === 'folded' || player.status === 'eliminated';

  return (
    <div className={cn(
      'flex flex-col items-center gap-0.5 transition-all duration-300',
      isOut && 'opacity-40',
    )}>
      {/* Avatar with dealer button + turn timer */}
      <div className="relative">
        <PlayerAvatar
          name={player.name}
          index={player.seatIndex}
          status={player.status}
          isCurrentPlayer={isCurrentPlayer && !isOut}
          size="sm"
        />
        {player.isDealer && (
          <DealerButton className="absolute -top-0.5 -right-0.5 scale-75" />
        )}
        {/* Turn timer ring */}
        {isCurrentPlayer && !isOut && (
          <TurnTimer active={true} size={40} strokeWidth={2.5} />
        )}
      </div>

      {/* Cards */}
      {player.holeCards.length > 0 && (
        <div className="flex gap-0.5 mt-0.5">
          {player.holeCards.map((card, i) => (
            <CardDisplay
              key={i}
              card={showCards ? card : undefined}
              faceDown={!showCards}
              size="sm"
              dealDelay={i * 0.1}
              className={isOut ? 'animate-fold-away' : ''}
            />
          ))}
        </div>
      )}

      {/* Name */}
      <p className={cn(
        'text-[9px] font-bold truncate max-w-[56px] leading-tight',
        isHuman ? 'text-primary' : 'text-foreground/90',
      )} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        {player.name}
      </p>

      {/* Chips */}
      <p className="text-[9px] text-primary/80 font-semibold leading-none"
        style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}
      >
        {player.chips.toLocaleString()}
      </p>

      {/* Action badge */}
      {player.lastAction && (
        <span className={cn(
          'text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-fade-in leading-tight',
          player.lastAction.startsWith('Fold') && 'bg-muted/80 text-muted-foreground',
          (player.lastAction.startsWith('Raise') || player.lastAction.startsWith('All-in')) && 'bg-destructive/30 text-destructive border border-destructive/30',
          (player.lastAction.startsWith('Call') || player.lastAction.startsWith('Check')) && 'bg-secondary/80 text-secondary-foreground',
          player.lastAction.includes('!') && 'bg-primary/30 text-primary animate-winner-glow border border-primary/30',
        )} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {player.lastAction}
        </span>
      )}

      {/* Current bet indicator */}
      {player.currentBet > 0 && !isShowdown && (
        <div className="flex items-center gap-0.5 mt-0.5 animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 60% 35%))',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          />
          <span className="text-[8px] font-bold text-primary" style={{ textShadow: '0 0 4px hsl(43 74% 49% / 0.4)' }}>
            {player.currentBet.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
