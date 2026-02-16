import { memo } from 'react';
import { PokerPlayer } from '@/lib/poker/types';
import { CardDisplay } from './CardDisplay';
import { PlayerAvatar } from './PlayerAvatar';
import { DealerButton } from './DealerButton';
import { TurnTimer } from './TurnTimer';
import { PokerChip } from './PokerChip';
import { CardsPlacement } from '@/lib/poker/ui/seatLayout';
import { cn } from '@/lib/utils';

interface PlayerSeatProps {
  player: PokerPlayer;
  isCurrentPlayer: boolean;
  showCards: boolean;
  isHuman: boolean;
  isShowdown: boolean;
  cardsPlacement: CardsPlacement;
  avatarUrl?: string | null;
  seatDealOrder?: number;
  compact?: boolean;
  onTimeout?: () => void;
}

/**
 * PlayerSeat — avatar + info stack with explicit card placement direction.
 */
export const PlayerSeat = memo(function PlayerSeat({
  player, isCurrentPlayer, showCards, isHuman, isShowdown,
  cardsPlacement, avatarUrl, seatDealOrder = 0, compact = false, onTimeout,
}: PlayerSeatProps) {
  const isOut = player.status === 'folded' || player.status === 'eliminated';
  const isFolded = player.status === 'folded';
  const avatarSize = compact ? 'xs' : 'md';
  const cardSize = compact ? 'xs' : 'sm';

  const isHorizontal = cardsPlacement === 'left' || cardsPlacement === 'right';

  // ── Cards element ──
  const cardsEl = player.holeCards.length > 0 ? (
    <div className={cn('relative flex gap-0.5', isHorizontal ? 'flex-row' : 'flex-row')}>
      {player.holeCards.map((card, i) => {
        const dealDelay = (i * player.holeCards.length + seatDealOrder) * 0.15 + 0.1;
        return (
          <CardDisplay
            key={i}
            card={showCards ? card : undefined}
            faceDown={!showCards}
            size={cardSize}
            dealDelay={dealDelay}
            className={isOut ? 'animate-fold-away' : ''}
          />
        );
      })}
      {isFolded && player.holeCards.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-destructive/90 border border-destructive/30">
            Fold
          </span>
        </div>
      )}
    </div>
  ) : null;

  // ── Text info (name, chips, badge, bet) ──
  const textInfo = (
    <div className="flex flex-col items-center gap-0.5" style={{ whiteSpace: 'nowrap' }}>
      <p className={cn(
        compact ? 'text-[9px] max-w-[56px]' : 'text-[11px] max-w-[72px]',
        'font-bold truncate leading-tight',
        isHuman ? 'text-primary' : 'text-foreground/90',
      )} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
        {player.name}
      </p>
      <p className={cn(compact ? 'text-[8px]' : 'text-[10px]', 'text-primary/80 font-semibold leading-none')}
        style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}
      >
        {player.chips.toLocaleString()}
      </p>
      {player.lastAction && (
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-fade-in leading-tight',
          player.lastAction.startsWith('Fold') && 'bg-destructive/20 text-destructive border border-destructive/30',
          (player.lastAction.startsWith('Raise') || player.lastAction.startsWith('All-in')) && 'bg-destructive/30 text-destructive border border-destructive/30',
          (player.lastAction.startsWith('Call') || player.lastAction.startsWith('Check')) && 'bg-secondary/80 text-secondary-foreground',
          player.lastAction.includes('!') && 'bg-primary/30 text-primary animate-winner-glow border border-primary/30',
        )} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {player.lastAction}
        </span>
      )}
      {player.currentBet > 0 && !isShowdown && (
        <div className="flex items-center gap-0.5 animate-fade-in">
          <PokerChip size="xs" />
          <span className="text-[10px] font-bold text-primary" style={{ textShadow: '0 0 4px hsl(43 74% 49% / 0.4)' }}>
            {player.currentBet.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );

  // ── Avatar element ──
  const avatarEl = (
    <div className="relative flex items-center justify-center">
      <PlayerAvatar
        name={player.name}
        index={player.seatIndex}
        status={player.status}
        isCurrentPlayer={isCurrentPlayer && !isOut}
        avatarUrl={avatarUrl}
        size={avatarSize}
      />
      {player.isDealer && (
        <DealerButton className="absolute -top-0.5 -right-0.5 scale-75" />
      )}
      {isCurrentPlayer && !isOut && (
        <TurnTimer active={true} size={48} strokeWidth={2.5} onTimeout={onTimeout} />
      )}
    </div>
  );

  // ── Layout based on cardsPlacement ──
  // above/below: vertical stack (cards above or below avatar)
  // left/right: horizontal layout (cards beside avatar, text below)

  if (isHorizontal) {
    // Left/right: avatar + cards side by side, text below the row
    const isLeft = cardsPlacement === 'left';
    return (
      <div className={cn('transition-all duration-300', isOut && 'opacity-60')}>
        <div className={cn('flex items-center gap-1', isLeft ? 'flex-row-reverse' : 'flex-row')}>
          {avatarEl}
          {cardsEl}
        </div>
        <div className="mt-0.5 flex justify-center">
          {textInfo}
        </div>
      </div>
    );
  }

  // Above/below: vertical stack
  const isAbove = cardsPlacement === 'above';
  return (
    <div className={cn('flex flex-col items-center transition-all duration-300', isOut && 'opacity-60')}>
      {isAbove && (
        <>
          {cardsEl}
          {textInfo}
          {avatarEl}
        </>
      )}
      {!isAbove && (
        <>
          {avatarEl}
          {cardsEl}
          {textInfo}
        </>
      )}
    </div>
  );
});
