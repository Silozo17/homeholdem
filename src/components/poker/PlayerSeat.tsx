import { memo, useState, useEffect, useRef } from 'react';
import { WifiOff, Volume2 } from 'lucide-react';
import { PokerPlayer, Card } from '@/lib/poker/types';
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
  actionDeadline?: string | null;
  onTimeout?: () => void;
  onThirtySeconds?: () => void;
  onCriticalTime?: () => void;
  isDisconnected?: boolean;
  isSpeaking?: boolean;
  onClick?: () => void;
  seatKey?: string;
  isSB?: boolean;
  isBB?: boolean;
  bestCards?: Card[];
}

/**
 * PlayerSeat — avatar-centric design with nameplate bar.
 * Opponents see NO cards until showdown, then cards overlay the avatar with a 3D flip.
 * Human player cards render BELOW the nameplate.
 */
export const PlayerSeat = memo(function PlayerSeat({
  player, isCurrentPlayer, showCards, isHuman, isShowdown,
  cardsPlacement, avatarUrl, seatDealOrder = 0, totalActivePlayers = 1, compact = false, level, countryCode, disableDealAnim = false, actionDeadline, onTimeout, onThirtySeconds, onCriticalTime, isDisconnected = false, isSpeaking = false, onClick, seatKey, isSB = false, isBB = false, bestCards = [],
}: PlayerSeatProps) {
  const isOut = player.status === 'folded' || player.status === 'eliminated';
  const isAllIn = player.status === 'all-in';
  const avatarSize = compact ? 'lg' : 'xl';
  const humanCardSize = compact ? 'lg' : 'xl';

  // --- Turn timer logic (nameplate-integrated) ---
  const TIMER_DURATION = 47.5; // Matches server grace period (45s deadline + 2.5s grace)
  const [timerElapsed, setTimerElapsed] = useState(0);
  const thirtySecFired = useRef(false);
  const criticalFired = useRef(false);
  const isTimerActive = isCurrentPlayer && !isOut;
  const timerActiveRef = useRef(false);
  const timerResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDeadlineRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isTimerActive) {
      // Don't reset immediately — wait 1500ms to filter out single-render flickers
      timerResetTimeoutRef.current = setTimeout(() => {
        if (!timerActiveRef.current) {
          setTimerElapsed(0);
          thirtySecFired.current = false;
          criticalFired.current = false;
          lastDeadlineRef.current = null;
        }
      }, 1500);
      timerActiveRef.current = false;
      return () => {
        if (timerResetTimeoutRef.current) clearTimeout(timerResetTimeoutRef.current);
      };
    }

    // Skip if the deadline hasn't actually changed (prevents duplicate intervals)
    if (timerActiveRef.current && actionDeadline === lastDeadlineRef.current) return;

    // Cancel any pending reset
    if (timerResetTimeoutRef.current) clearTimeout(timerResetTimeoutRef.current);
    timerActiveRef.current = true;
    lastDeadlineRef.current = actionDeadline ?? null;

    // Anchor to server deadline if available, otherwise fall back to local start
    const deadlineMs = actionDeadline ? new Date(actionDeadline).getTime() : null;
    const localStart = Date.now();

    const getElapsed = () => {
      if (deadlineMs) {
        const remaining = (deadlineMs - Date.now()) / 1000;
        return Math.max(0, TIMER_DURATION - remaining);
      }
      return (Date.now() - localStart) / 1000;
    };

    // Set immediately so there's no visual jump on first render
    setTimerElapsed(getElapsed());
    thirtySecFired.current = false;
    criticalFired.current = false;

    const interval = setInterval(() => {
      const secs = getElapsed();
      if (secs >= TIMER_DURATION) {
        setTimerElapsed(TIMER_DURATION);
        clearInterval(interval);
        onTimeout?.();
      } else {
        setTimerElapsed(secs);
        if (!thirtySecFired.current && (TIMER_DURATION - secs) <= 30) {
          thirtySecFired.current = true;
          onThirtySeconds?.();
        }
        if (!criticalFired.current && (TIMER_DURATION - secs) <= 5) {
          criticalFired.current = true;
          onCriticalTime?.();
        }
      }
    }, 200);

    return () => {
      clearInterval(interval);
      timerActiveRef.current = false;
    };
  }, [isTimerActive, actionDeadline]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const isBestCard = (card: Card) =>
    bestCards.some(bc => bc.suit === card.suit && bc.rank === card.rank);

  // Card fan — 10deg tilt, tight overlap, on top of avatar
  const cardFan = (cards: typeof player.holeCards, size: string, useReveal: boolean) => (
    <div className="absolute left-1/2 -translate-x-1/2 flex pointer-events-none"
      style={{ zIndex: 3, top: 'calc(-28% + 40px)' }}>
      {cards.map((card, i) => {
        const dealDelay = useReveal ? (i * totalActivePlayers + seatDealOrder) * 0.18 + 0.05 : i * 0.1;
        const isRevealed = useReveal ? revealedIndices.has(i) : true;
        const displayCard = isRevealed ? (shouldShowCards || (useReveal && isHuman) ? card : undefined) : undefined;
        const isWinningCard = isShowdown && bestCards.length > 0 && !!displayCard && isBestCard(displayCard);
        return (
          <div key={i} style={{
            transform: `rotate(${i === 0 ? -10 : 10}deg)${isWinningCard ? ' translateY(-6px) scale(1.08)' : ''}`,
            marginLeft: i > 0 ? (compact ? '-14px' : '-16px') : '0',
            position: 'relative',
            zIndex: isWinningCard ? 10 : i,
            filter: isShowdown && bestCards.length > 0 && !isWinningCard && isRevealed
              ? 'brightness(0.55) saturate(0.4)'
              : 'none',
            transition: 'filter 0.4s ease, transform 0.3s ease',
          }}>
            {isWinningCard && (
              <div className="absolute inset-[-3px] rounded-lg pointer-events-none"
                style={{
                  boxShadow: '0 0 10px 3px hsl(43 74% 49% / 0.6), 0 0 20px 6px hsl(43 74% 49% / 0.3)',
                  borderRadius: '8px',
                  zIndex: -1,
                }}
              />
            )}
            <CardDisplay
              card={displayCard}
              faceDown={!isRevealed}
              size={size as any}
              dealDelay={dealDelay}
              className={isShowdown && showCards && !isOut && bestCards.length === 0 ? 'animate-winning-cards-glow' : ''}
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
    <div
      className={cn(
        'relative flex flex-col items-center transition-all duration-300',
        isOut && 'opacity-50',
        isCurrentPlayer && !isOut && 'animate-spotlight-pulse',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
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

        {/* Dealer / SB / BB badges — positioned by seatKey */}
        {(() => {
          const badgePos = (() => {
            switch (seatKey) {
              case 'D': case 'H': return '-bottom-1 -left-1';
              case 'B': case 'C': return '-top-1 -right-1';
              default: return '-top-1 -left-1';
            }
          })();
          return (
            <>
              {player.isDealer && (
                <div className={`absolute ${badgePos} z-20`}>
                  <DealerButton />
                </div>
              )}
              {isSB && !player.isDealer && (
                <div className={`absolute ${badgePos} z-20 w-5 h-5 rounded-full flex items-center justify-center`}
                  style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(224 76% 48%))', border: '2px solid hsl(213 94% 78%)' }}>
                  <span className="text-[7px] font-black text-white leading-none">SB</span>
                </div>
              )}
              {isBB && !player.isDealer && (
                <div className={`absolute ${badgePos} z-20 w-5 h-5 rounded-full flex items-center justify-center`}
                  style={{ background: 'linear-gradient(135deg, hsl(0 72% 51%), hsl(0 63% 31%))', border: '2px solid hsl(0 94% 82%)' }}>
                  <span className="text-[7px] font-black text-white leading-none">BB</span>
                </div>
              )}
            </>
          );
        })()}

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

        {/* Speaking indicator */}
        {isSpeaking && !isDisconnected && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
            style={{ zIndex: 6, background: 'hsl(142 70% 45%)', border: '2px solid hsl(0 0% 10%)' }}>
            <Volume2 className="h-2.5 w-2.5 text-white" />
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
