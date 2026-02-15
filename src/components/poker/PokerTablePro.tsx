import { useMemo, useState, useEffect } from 'react';
import { GameState } from '@/lib/poker/types';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { PlayerAvatar } from './PlayerAvatar';
import { DealerButton } from './DealerButton';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { WinnerOverlay } from './WinnerOverlay';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PokerTableProProps {
  state: GameState;
  isHumanTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  maxBet: number;
  onAction: (action: any) => void;
  onNextHand: () => void;
  onQuit: () => void;
}

export function PokerTablePro({
  state, isHumanTurn, amountToCall, canCheck, maxBet, onAction, onNextHand, onQuit,
}: PokerTableProProps) {
  const humanPlayer = state.players.find(p => p.id === 'human');
  const isShowdown = state.phase === 'hand_complete' || state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';
  const bots = state.players.filter(p => p.isBot);
  const [showAllinFlash, setShowAllinFlash] = useState(false);

  useEffect(() => {
    const anyAllIn = state.players.some(p => p.lastAction?.startsWith('All-in'));
    if (anyAllIn) {
      setShowAllinFlash(true);
      const t = setTimeout(() => setShowAllinFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [state.players.map(p => p.lastAction).join(',')]);

  const winners = useMemo(() => {
    if (state.phase !== 'hand_complete' && state.phase !== 'game_over') return [];
    return state.players
      .filter(p => p.lastAction?.includes('!') || (isGameOver && p.chips > 0))
      .map(p => {
        const hand = p.holeCards.length >= 2 && state.communityCards.length >= 3
          ? evaluateHand([...p.holeCards, ...state.communityCards])
          : { rank: 0, name: 'N/A', score: 0, bestCards: [] };
        return { name: p.name, hand, chips: p.chips };
      });
  }, [state.phase, state.players, state.communityCards, isGameOver]);

  const gameStats = useMemo(() => ({
    handsPlayed: state.handsPlayed,
    handsWon: state.handsWon,
    bestHandName: state.bestHandName,
    biggestPot: state.biggestPot,
    duration: Date.now() - state.startTime,
  }), [state.handsPlayed, state.handsWon, state.bestHandName, state.biggestPot, state.startTime]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden poker-felt-bg">
      {/* All-in flash */}
      {showAllinFlash && (
        <div className="absolute inset-0 z-20 bg-gradient-to-r from-destructive/0 via-primary/15 to-destructive/0 allin-flash pointer-events-none" />
      )}

      {/* Header — compact 32px */}
      <div className="flex items-center justify-between px-3 h-8 z-10 safe-area-top shrink-0">
        <Button variant="ghost" size="icon" onClick={onQuit} className="text-foreground/70 hover:text-foreground h-7 w-7">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-[10px] text-muted-foreground font-medium tracking-wide">
          #{state.handNumber} &bull; {state.smallBlind}/{state.bigBlind}
        </div>
        <div className="w-7" />
      </div>

      {/* Bot players — horizontal scroll, no wrap */}
      <div className="flex items-start justify-center gap-0.5 px-1 shrink-0 overflow-x-auto scrollbar-hide py-1">
        {bots.map((bot) => (
          <div key={bot.id} className={cn(
            'flex flex-col items-center gap-0 min-w-[52px] max-w-[56px]',
            bot.status === 'folded' && 'opacity-40',
          )}>
            <div className="relative">
              <PlayerAvatar
                name={bot.name}
                index={bot.seatIndex}
                status={bot.status}
                isCurrentPlayer={state.currentPlayerIndex === bot.seatIndex && !isShowdown}
                size="sm"
              />
              {bot.isDealer && <DealerButton className="absolute -top-0.5 -right-0.5 scale-75" />}
            </div>
            <div className="flex gap-0.5 mt-0.5">
              {bot.holeCards.length > 0 ? (
                bot.holeCards.map((card, i) => (
                  <CardDisplay
                    key={i}
                    card={isShowdown && (bot.status === 'active' || bot.status === 'all-in') ? card : undefined}
                    faceDown={!isShowdown || (bot.status !== 'active' && bot.status !== 'all-in')}
                    size="sm"
                    dealDelay={i * 0.1}
                    className={bot.status === 'folded' ? 'animate-fold-away' : ''}
                  />
                ))
              ) : <div className="h-8" />}
            </div>
            <p className="text-[9px] font-semibold text-foreground/80 truncate w-full text-center leading-tight">{bot.name}</p>
            <p className="text-[9px] text-muted-foreground leading-none">{bot.chips.toLocaleString()}</p>
            {bot.lastAction && (
              <span className={cn(
                'text-[8px] px-1 py-0 rounded-full font-medium animate-fade-in leading-tight mt-0.5',
                bot.lastAction.startsWith('Fold') && 'bg-muted text-muted-foreground',
                (bot.lastAction.startsWith('Raise') || bot.lastAction.startsWith('All-in')) && 'bg-destructive/20 text-destructive',
                (bot.lastAction.startsWith('Call') || bot.lastAction.startsWith('Check')) && 'bg-secondary text-secondary-foreground',
                bot.lastAction.includes('!') && 'bg-primary/20 text-primary animate-winner-glow',
              )}>
                {bot.lastAction}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Felt center — flexible, takes remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 mx-2 rounded-[1.5rem] border border-border/30 p-2 relative"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 50%, hsl(160 50% 20%) 0%, hsl(160 40% 14%) 50%, hsl(160 30% 10%) 100%)',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <PotDisplay pot={state.pot} />

        {/* Community cards — only show dealt cards + minimal placeholders */}
        <div className="flex gap-1 items-center">
          {state.communityCards.map((card, i) => (
            <CardDisplay
              key={`${card.suit}-${card.rank}-${i}`}
              card={card}
              size="md"
              dealDelay={i * 0.12}
              isWinner={false}
            />
          ))}
          {state.communityCards.length === 0 && (
            <div className="text-[10px] text-muted-foreground/40 italic">Waiting for cards...</div>
          )}
        </div>

        {/* Phase indicator */}
        <span className={cn(
          'text-[9px] text-muted-foreground/70 uppercase tracking-[0.15em] font-medium',
          (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') && 'animate-phase-flash',
        )}>
          {state.phase === 'preflop' ? 'Pre-Flop' : state.phase === 'hand_complete' ? 'Showdown' : state.phase}
        </span>

        {/* Next Hand button inside felt */}
        {state.phase === 'hand_complete' && (
          <Button className="shimmer-btn text-primary-foreground font-bold text-xs h-8 px-6" onClick={onNextHand}>
            Next Hand →
          </Button>
        )}
      </div>

      {/* Human player — compact bottom section */}
      {humanPlayer && (
        <div className="px-2 py-1.5 z-10 safe-area-bottom shrink-0">
          {/* Cards + avatar + chips in one row */}
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="flex gap-1">
              {humanPlayer.holeCards.map((card, i) => (
                <CardDisplay key={i} card={card} size="lg" dealDelay={i * 0.15}
                  className={humanPlayer.status === 'folded' ? 'animate-fold-away' : ''} />
              ))}
              {humanPlayer.holeCards.length === 0 && (
                <>
                  <div className="w-12 h-[68px] rounded-lg border border-border/20 bg-secondary/10" />
                  <div className="w-12 h-[68px] rounded-lg border border-border/20 bg-secondary/10" />
                </>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <PlayerAvatar
                  name={humanPlayer.name}
                  index={0}
                  status={humanPlayer.status}
                  isCurrentPlayer={isHumanTurn && humanPlayer.status === 'active'}
                  size="sm"
                />
                {humanPlayer.isDealer && <DealerButton />}
              </div>
              <p className="text-sm font-bold text-foreground">{humanPlayer.chips.toLocaleString()}</p>
              {isHumanTurn && humanPlayer.status === 'active' && (
                <span className="text-[9px] px-1.5 py-0 rounded-full bg-primary/20 text-primary font-bold animate-turn-pulse">
                  YOUR TURN
                </span>
              )}
              {humanPlayer.lastAction && !isHumanTurn && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0 rounded-full font-medium',
                  humanPlayer.lastAction.includes('!') ? 'bg-primary/20 text-primary' : 'bg-secondary/50 text-muted-foreground',
                )}>
                  {humanPlayer.lastAction}
                </span>
              )}
            </div>
          </div>

          {/* Betting controls */}
          {isHumanTurn && humanPlayer.status === 'active' && (
            <BettingControls
              canCheck={canCheck}
              amountToCall={amountToCall}
              minRaise={state.minRaise}
              maxBet={maxBet}
              playerChips={humanPlayer.chips}
              bigBlind={state.bigBlind}
              pot={state.pot}
              onAction={onAction}
            />
          )}
        </div>
      )}

      {/* Winner overlay */}
      {(state.phase === 'hand_complete' || isGameOver) && winners.length > 0 && (
        <WinnerOverlay
          winners={winners}
          isGameOver={isGameOver}
          stats={isGameOver ? gameStats : undefined}
          onNextHand={onNextHand}
          onQuit={onQuit}
        />
      )}
    </div>
  );
}
