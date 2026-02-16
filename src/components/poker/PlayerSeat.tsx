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
 * PlayerSeat — avatar-centric design with nameplate bar.
 * Opponents see NO cards until showdown, then cards overlay the avatar with a 3D flip.
 */
export const PlayerSeat = memo(function PlayerSeat({
  player, isCurrentPlayer, showCards, isHuman, isShowdown,
  cardsPlacement, avatarUrl, seatDealOrder = 0, compact = false, onTimeout,
}: PlayerSeatProps) {
  const isOut = player.status === 'folded' || player.status === 'eliminated';
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';
  const avatarSize = compact ? 'sm' : 'lg';
  const cardSize = compact ? 'xs' : 'sm';

  // Only show cards for: human player always, opponents only at showdown
  const shouldShowCards = isHuman || (isShowdown && showCards);
  const shouldRenderCards = isHuman || (isShowdown && showCards && player.holeCards.length > 0);

  // ── Cards element (only rendered for human or at showdown) ──
  const cardsEl = shouldRenderCards && player.holeCards.length > 0 ? (
    <div className={cn(
      'absolute left-1/2 -translate-x-1/2 flex gap-0.5',
      isShowdown && !isHuman ? 'animate-showdown-reveal' : '',
      isHuman ? '-bottom-1' : '-top-1',
    )} style={{ zIndex: 2 }}>
      {player.holeCards.map((card, i) => {
        const dealDelay = isShowdown && !isHuman
          ? i * 0.15
          : (i * player.holeCards.length + seatDealOrder) * 0.15 + 0.1;
        return (
          <CardDisplay
            key={i}
            card={shouldShowCards ? card : undefined}
            faceDown={!shouldShowCards}
            size={cardSize}
            dealDelay={dealDelay}
            className={cn(
              isOut && !isShowdown ? 'animate-fold-away' : '',
              isShowdown && showCards && !isOut ? 'animate-winning-cards-glow' : '',
            )}
          />
        );
      })}
      {isFolded && player.holeCards.length > 0 && !isShowdown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-destructive/90 border border-destructive/30">
            Fold
          </span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className={cn(
      'relative flex flex-col items-center transition-all duration-300',
      isOut && 'opacity-50',
      isCurrentPlayer && !isOut && 'animate-spotlight-pulse',
    )}>
      {/* Avatar with ring + timer + dealer */}
      <div className="relative">
        {/* Active player spotlight glow */}
        {isCurrentPlayer && !isOut && (
          <div className="absolute inset-[-6px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(43 74% 49% / 0.25), transparent 70%)',
              filter: 'blur(4px)',
            }}
          />
        )}

        <PlayerAvatar
          name={player.name}
          index={player.seatIndex}
          status={player.status}
          isCurrentPlayer={isCurrentPlayer && !isOut}
          avatarUrl={avatarUrl}
          size={avatarSize}
        />

        {/* Dealer button */}
        {player.isDealer && (
          <DealerButton className="absolute -top-0.5 -right-0.5 scale-75" />
        )}

        {/* Turn timer wraps the avatar */}
        {isCurrentPlayer && !isOut && (
          <TurnTimer active={true} size={compact ? 40 : 56} strokeWidth={2.5} onTimeout={onTimeout} />
        )}

        {/* Cards overlaying avatar area */}
        {cardsEl}
      </div>

      {/* Nameplate bar */}
      <div className={cn(
        'flex flex-col items-center rounded-b-lg px-2 py-0.5 -mt-1',
        compact ? 'min-w-[52px]' : 'min-w-[68px]',
      )} style={{
        background: 'linear-gradient(180deg, hsl(0 0% 0% / 0.75), hsl(0 0% 0% / 0.6))',
        backdropFilter: 'blur(8px)',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
        border: '1px solid hsl(0 0% 100% / 0.08)',
        borderTop: 'none',
      }}>
        <p className={cn(
          compact ? 'text-[8px] max-w-[48px]' : 'text-[10px] max-w-[64px]',
          'font-bold truncate leading-tight',
          isHuman ? 'text-primary' : 'text-foreground/90',
        )} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          {player.name}
        </p>
        <p className={cn(compact ? 'text-[7px]' : 'text-[9px]', 'text-primary/80 font-semibold leading-none')}
          style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}
        >
          {player.chips.toLocaleString()}
        </p>
      </div>

      {/* Action badge (floating near nameplate) */}
      {player.lastAction && (
        <span className={cn(
          'absolute text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-fade-in leading-tight whitespace-nowrap',
          compact ? '-bottom-4' : '-bottom-5',
          player.lastAction.startsWith('Fold') && 'bg-destructive/20 text-destructive border border-destructive/30',
          (player.lastAction.startsWith('Raise') || player.lastAction.startsWith('All-in')) && 'bg-destructive/30 text-destructive border border-destructive/30',
          (player.lastAction.startsWith('Call') || player.lastAction.startsWith('Check')) && 'bg-secondary/80 text-secondary-foreground',
          player.lastAction.includes('!') && 'bg-primary/30 text-primary animate-winner-glow border border-primary/30',
        )} style={{
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          zIndex: 3,
        }}>
          {player.lastAction}
        </span>
      )}

      {/* Bet indicator */}
      {player.currentBet > 0 && !isShowdown && (
        <div className="flex items-center gap-0.5 animate-fade-in mt-0.5" style={{ zIndex: 3 }}>
          <PokerChip size="xs" />
          <span className="text-[9px] font-bold text-primary" style={{ textShadow: '0 0 4px hsl(43 74% 49% / 0.4)' }}>
            {player.currentBet.toLocaleString()}
          </span>
        </div>
      )}

      {/* All-in shockwave ring */}
      {isAllIn && (
        <div className="absolute inset-[-8px] rounded-full pointer-events-none animate-allin-shockwave"
          style={{
            border: '2px solid hsl(0 70% 50% / 0.4)',
          }}
        />
      )}
    </div>
  );
});
