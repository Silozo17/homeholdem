import { memo, useState, useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { PokerPlayer } from '@/lib/poker/types';
import { CardDisplay } from './CardDisplay';
import { PlayerAvatar } from './PlayerAvatar';
import { DealerButton } from './DealerButton';
import { PokerChip } from './PokerChip';
import { LevelBadge } from '@/components/common/LevelBadge';
import { CountryFlag } from '@/components/poker/CountryFlag';
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
  countryCode?: string | null;
  disableDealAnim?: boolean;
  onTimeout?: () => void;
  onLowTime?: () => void;
  isDisconnected?: boolean;
}

/**
 * PlayerSeat — avatar-centric design with nameplate bar.
 * Opponents see NO cards until showdown, then cards overlay the avatar with a 3D flip.
 * Human player cards render BELOW the nameplate.
 */
export const PlayerSeat = memo(function PlayerSeat({
  player, isCurrentPlayer, showCards, isHuman, isShowdown,
  cardsPlacement, avatarUrl, seatDealOrder = 0, totalActivePlayers = 1, compact = false, level, countryCode, disableDealAnim = false, onTimeout, onLowTime, isDisconnected = false,
}: PlayerSeatProps) {
  const isOut = player.status === 'folded' || player.status === 'eliminated';
  const isAllIn = player.status === 'all-in';
  const avatarSize = compact ? 'lg' : 'xl';
  const humanCardSize = compact ? 'lg' : 'xl';

  // --- Turn timer logic (nameplate-integrated) ---
  const TIMER_DURATION = 20;
  const [timerElapsed, setTimerElapsed] = useState(0);
  const lowTimeFired = useRef(false);
  const isTimerActive = isCurrentPlayer && !isOut;

  useEffect(() => {
    if (!isTimerActive) {
      setTimerElapsed(0);
      lowTimeFired.current = false;
      return;
    }
    setTimerElapsed(0);
    lowTimeFired.current = false;
    const start = Date.now();
    const interval = setInterval(() => {
      const secs = (Date.now() - start) / 1000;
      if (secs >= TIMER_DURATION) {
        setTimerElapsed(TIMER_DURATION);
        clearInterval(interval);
        onTimeout?.();
      } else {
        setTimerElapsed(secs);
        if (!lowTimeFired.current && (TIMER_DURATION - secs) <= 5) {
          lowTimeFired.current = true;
          onLowTime?.();
        }
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isTimerActive, onTimeout, onLowTime]);

  const timerProgress = isTimerActive ? Math.min(timerElapsed / TIMER_DURATION, 1) : 0;
  const timerRemaining = 1 - timerProgress;
  const timerHue = timerRemaining > 0.5 ? 43 : timerRemaining > 0.3 ? 25 : 0;
  const timerLightness = timerRemaining > 0.3 ? 49 : 45;

  // Sequential card reveal: cards stay face-down until their deal delay elapses
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const cardKey = player.holeCards.map(c => `${c.suit}-${c.rank}`).join(',');

  // Use refs so the effect reads latest values without re-triggering on seat changes
  const totalActiveRef = useRef(totalActivePlayers);
  totalActiveRef.current = totalActivePlayers;
  const seatDealOrderRef = useRef(seatDealOrder);
  seatDealOrderRef.current = seatDealOrder;

  useEffect(() => {
    if (!isHuman || player.holeCards.length === 0) {
      setRevealedIndices(new Set());
      return;
    }
    if (disableDealAnim) {
      setRevealedIndices(new Set(player.holeCards.map((_, i) => i)));
      return;
    }
    setRevealedIndices(new Set());
    const timers: ReturnType<typeof setTimeout>[] = [];
    player.holeCards.forEach((_, i) => {
      const dealDelay = (i * totalActiveRef.current + seatDealOrderRef.current) * 0.18 + 0.05;
      const revealMs = (dealDelay + 0.30) * 1000;
      timers.push(setTimeout(() => {
        setRevealedIndices(prev => new Set(prev).add(i));
      }, revealMs));
    });
    return () => timers.forEach(clearTimeout);
  }, [cardKey, isHuman, disableDealAnim]);

  const shouldShowCards = isHuman || (isShowdown && showCards);
  const shouldRenderCards = isHuman || (isShowdown && showCards && player.holeCards.length > 0);

  // Card fan — 10deg tilt, tight overlap, on top of avatar
  const cardFan = (cards: typeof player.holeCards, size: string, useReveal: boolean) => (
    <div className="absolute left-1/2 -translate-x-1/2 flex pointer-events-none"
      style={{ zIndex: 3, top: 'calc(-28% + 40px)' }}>
      {cards.map((card, i) => {
        const dealDelay = useReveal ? (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.05 : i * 0.1;
        const isRevealed = useReveal ? revealedIndices.has(i) : true;
        const displayCard = isRevealed ? (shouldShowCards || (useReveal && isHuman) ? card : undefined) : undefined;
        return (
          <div key={i} style={{
            transform: `rotate(${i === 0 ? -10 : 10}deg)`,
            marginLeft: i > 0 ? (compact ? '-14px' : '-16px') : '0',
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

  const opponentShowdownCards = !isHuman && shouldRenderCards && player.holeCards.length > 0
    ? cardFan(player.holeCards, humanCardSize, false)
    : null;

  const humanCards = isHuman && player.holeCards.length > 0
    ? cardFan(player.holeCards, humanCardSize, true)
    : null;

  return (
    <div className={cn(
      'relative flex flex-col items-center transition-all duration-300',
      isOut && 'opacity-50',
      isCurrentPlayer && !isOut && 'animate-spotlight-pulse',
    )}>
      {/* Avatar with ring + dealer */}
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
        />

        {/* Dealer button */}
        {player.isDealer && (
          <DealerButton className="absolute -top-0.5 -right-0.5 scale-75" />
        )}

        {/* Opponent showdown cards overlaying avatar */}
        {opponentShowdownCards}

        {/* Human player cards fanned behind avatar */}
        {humanCards}

        {/* Disconnect indicator */}
        {isDisconnected && (
          <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
            style={{ zIndex: 6, background: 'hsl(0 70% 50%)', border: '2px solid hsl(0 0% 10%)' }}>
            <WifiOff className="h-2.5 w-2.5 text-white" />
          </div>
        )}

      </div>

      {/* Nameplate bar — wide rounded rectangle, overlaps avatar bottom */}
      <div className={cn(
      'relative flex flex-col items-center rounded-2xl',
        compact ? '-mt-4' : '-mt-5',
        compact ? 'min-w-[100px] px-4 py-1' : 'min-w-[120px] px-5 py-1.5',
      )} style={{
        zIndex: 4,
        background: isTimerActive
          ? `conic-gradient(from 0deg, hsl(${timerHue} 74% ${timerLightness}%) ${timerRemaining * 100}%, transparent ${timerRemaining * 100}%) border-box`
          : 'linear-gradient(180deg, hsl(0 0% 8% / 0.9), hsl(0 0% 5% / 0.85))',
        backdropFilter: 'blur(8px)',
        border: isTimerActive ? 'none' : '1px solid hsl(0 0% 100% / 0.1)',
        padding: isTimerActive ? '1px' : undefined,
      }}>
        {/* Inner content (dark bg when timer active) */}
        <div className={cn(
          'flex flex-col items-center w-full',
          isTimerActive ? 'rounded-2xl px-5 py-1.5' : '',
        )} style={isTimerActive ? {
          background: 'linear-gradient(180deg, hsl(0 0% 8% / 0.95), hsl(0 0% 5% / 0.9))',
        } : {}}>
          <p className={cn(
            compact ? 'text-[11px] max-w-[80px]' : 'text-[13px] max-w-[100px]',
            'font-bold truncate leading-tight text-white',
          )} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {player.name}
          </p>
          <p className={cn(compact ? 'text-[10px]' : 'text-[12px]', 'text-white/80 font-semibold leading-none')}>
            {player.chips.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Level badge — z-[5], bottom-left of avatar edge, ABOVE nameplate */}
      {level != null && level > 0 && (
        <div className="absolute" style={{ zIndex: 5, bottom: compact ? '18px' : '22px', left: compact ? '2px' : '0px' }}>
          <LevelBadge level={level} size={avatarSize} className="!relative !inset-auto" />
        </div>
      )}
      {/* Country flag — z-[5], bottom-right of avatar edge, ABOVE nameplate */}
      {countryCode && (
        <div className="absolute" style={{ zIndex: 5, bottom: compact ? '18px' : '22px', right: compact ? '2px' : '0px' }}>
          <CountryFlag countryCode={countryCode} size={avatarSize} className="!relative !inset-auto" />
        </div>
      )}

      {/* Action badge */}
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
