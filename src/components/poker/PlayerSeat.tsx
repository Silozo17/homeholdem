import { memo, useState, useEffect } from 'react';
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
  totalActivePlayers?: number;
  compact?: boolean;
  level?: number;
  onTimeout?: () => void;
  onLowTime?: () => void;
}

/**
 * PlayerSeat — avatar-centric design with nameplate bar.
 * Opponents see NO cards until showdown, then cards overlay the avatar with a 3D flip.
 * Human player cards render BELOW the nameplate.
 */
export const PlayerSeat = memo(function PlayerSeat({
  player, isCurrentPlayer, showCards, isHuman, isShowdown,
  cardsPlacement, avatarUrl, seatDealOrder = 0, totalActivePlayers = 1, compact = false, level, onTimeout, onLowTime,
}: PlayerSeatProps) {
  const isOut = player.status === 'folded' || player.status === 'eliminated';
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';
  const avatarSize = compact ? 'lg' : 'xl';
  const humanCardSize = compact ? 'lg' : 'xl';

  // Sequential card reveal: cards stay face-down until their deal delay elapses
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const cardKey = player.holeCards.map(c => `${c.suit}-${c.rank}`).join(',');

  useEffect(() => {
    if (!isHuman || player.holeCards.length === 0) {
      setRevealedIndices(new Set());
      return;
    }
    // Reset on new cards
    setRevealedIndices(new Set());
    const timers: ReturnType<typeof setTimeout>[] = [];
    player.holeCards.forEach((_, i) => {
      const dealDelay = (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.1;
      // Reveal after deal animation completes (delay + flight duration ~0.7s)
      const revealMs = (dealDelay + 0.7) * 1000;
      timers.push(setTimeout(() => {
        setRevealedIndices(prev => new Set(prev).add(i));
      }, revealMs));
    });
    return () => timers.forEach(clearTimeout);
  }, [cardKey, isHuman, totalActivePlayers, seatDealOrder]);

  // Only show cards for: human player always, opponents only at showdown
  const shouldShowCards = isHuman || (isShowdown && showCards);
  const shouldRenderCards = isHuman || (isShowdown && showCards && player.holeCards.length > 0);

  // Shared card fan layout — cards ON TOP of avatar, fanned with ~10deg tilt
  const cardFan = (cards: typeof player.holeCards, size: string, useReveal: boolean) => (
    <div className="absolute left-1/2 -translate-x-1/2 flex pointer-events-none"
      style={{ zIndex: 3, top: '-30%' }}>
      {cards.map((card, i) => {
        const dealDelay = useReveal ? (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.1 : i * 0.15;
        const isRevealed = useReveal ? revealedIndices.has(i) : true;
        const displayCard = isRevealed ? (shouldShowCards || (useReveal && isHuman) ? card : undefined) : undefined;
        return (
          <div key={i} style={{
            transform: `rotate(${i === 0 ? -10 : 10}deg)`,
            marginLeft: i > 0 ? '-14px' : '0',
          }}>
            <CardDisplay
              card={displayCard}
              faceDown={!isRevealed}
              size={size as any}
              dealDelay={dealDelay}
              className={isShowdown && showCards && !isOut ? 'animate-winning-cards-glow' : ''}
            />
          </div>
        );
      })}
    </div>
  );

  // Opponent showdown cards (on top of avatar)
  const opponentShowdownCards = !isHuman && shouldRenderCards && player.holeCards.length > 0
    ? cardFan(player.holeCards, humanCardSize, false)
    : null;

  // Human player cards (on top of avatar) — sequential reveal
  const humanCards = isHuman && player.holeCards.length > 0
    ? cardFan(player.holeCards, humanCardSize, true)
    : null;

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
          <div className="absolute inset-[-8px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(43 74% 49% / 0.25), transparent 70%)',
              filter: 'blur(6px)',
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
          level={level}
        />

        {/* Dealer button */}
        {player.isDealer && (
          <DealerButton className="absolute -top-0.5 -right-0.5 scale-75" />
        )}

        {/* Turn timer wraps the avatar */}
        {isCurrentPlayer && !isOut && (
          <TurnTimer active={true} size={compact ? 56 : 80} strokeWidth={4} onTimeout={onTimeout} onLowTime={onLowTime} />
        )}

        {/* Opponent showdown cards overlaying avatar */}
        {opponentShowdownCards}

        {/* Human player cards fanned behind avatar */}
        {humanCards}
      </div>

      {/* Nameplate bar */}
      <div className={cn(
        'flex flex-col items-center rounded-b-lg px-2 py-0.5 mt-0.5',
        compact ? 'min-w-[60px]' : 'min-w-[76px]',
      )} style={{
        background: 'linear-gradient(180deg, hsl(0 0% 0% / 0.75), hsl(0 0% 0% / 0.6))',
        backdropFilter: 'blur(8px)',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
        border: '1px solid hsl(0 0% 100% / 0.08)',
        borderTop: 'none',
      }}>
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
      </div>

      {/* Action badge (floating near nameplate) — hero gets it to the right */}
      {player.lastAction && (
        <span className={cn(
          'absolute text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-fade-in leading-tight whitespace-nowrap',
          isHuman
            ? 'left-full ml-1 top-1/2 -translate-y-1/2'
            : compact ? '-bottom-4' : '-bottom-5',
          player.lastAction.startsWith('Fold') && 'bg-destructive/20 text-destructive border border-destructive/30',
          (player.lastAction.startsWith('Raise') || player.lastAction.startsWith('All-in') || player.lastAction.startsWith('All')) && 'bg-destructive/30 text-destructive border border-destructive/30',
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
