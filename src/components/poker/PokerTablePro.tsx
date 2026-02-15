import { useMemo } from 'react';
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
  state,
  isHumanTurn,
  amountToCall,
  canCheck,
  maxBet,
  onAction,
  onNextHand,
  onQuit,
}: PokerTableProProps) {
  const humanPlayer = state.players.find(p => p.id === 'human');
  const isShowdown = state.phase === 'hand_complete' || state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';
  const bots = state.players.filter(p => p.isBot);

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
    <div className="flex flex-col h-[100dvh] relative overflow-hidden poker-felt-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 z-10 safe-area-top">
        <Button variant="ghost" size="icon" onClick={onQuit} className="text-foreground/70 hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-xs text-muted-foreground font-medium tracking-wide">
          Hand #{state.handNumber} &bull; {state.smallBlind}/{state.bigBlind}
        </div>
        <div className="w-10" />
      </div>

      {/* Bot players - arc layout */}
      <div className="flex flex-wrap justify-center gap-1 px-2 pt-1 pb-2 z-10">
        {bots.map((bot) => (
          <div key={bot.id} className="flex flex-col items-center gap-0.5 min-w-[64px]">
            <div className="relative">
              <PlayerAvatar
                name={bot.name}
                index={bot.seatIndex}
                status={bot.status}
                isCurrentPlayer={state.currentPlayerIndex === bot.seatIndex && !isShowdown}
              />
              {bot.isDealer && <DealerButton className="absolute -top-1 -right-1" />}
            </div>
            {/* Cards */}
            <div className="flex gap-0.5">
              {bot.holeCards.length > 0 ? (
                bot.holeCards.map((card, i) => (
                  <CardDisplay
                    key={i}
                    card={isShowdown && (bot.status === 'active' || bot.status === 'all-in') ? card : undefined}
                    faceDown={!isShowdown || (bot.status !== 'active' && bot.status !== 'all-in')}
                    size="sm"
                    dealDelay={i * 0.1}
                  />
                ))
              ) : <div className="h-10" />}
            </div>
            {/* Name & chips */}
            <p className="text-[10px] font-semibold text-foreground/80 truncate max-w-[64px]">{bot.name}</p>
            <p className="text-[10px] text-muted-foreground">{bot.chips.toLocaleString()}</p>
            {/* Action badge */}
            {bot.lastAction && (
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded-full font-medium animate-fade-in',
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

      {/* Table felt - center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2.5 mx-3 rounded-[2rem] border border-border/30 p-4 min-h-[180px] relative"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 50%, hsl(160 50% 20%) 0%, hsl(160 40% 14%) 50%, hsl(160 30% 10%) 100%)',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* Pot */}
        <PotDisplay pot={state.pot} />

        {/* Community cards */}
        <div className="flex gap-1.5 min-h-[68px] items-center">
          {state.communityCards.map((card, i) => (
            <CardDisplay
              key={`${card.suit}-${card.rank}-${i}`}
              card={card}
              size="md"
              dealDelay={i * 0.12}
              isWinner={false}
            />
          ))}
          {Array.from({ length: 5 - state.communityCards.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-11 h-16 rounded-lg border border-border/20 bg-secondary/10" />
          ))}
        </div>

        {/* Phase indicator */}
        <span className={cn(
          'text-[10px] text-muted-foreground/70 uppercase tracking-[0.15em] font-medium',
          (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') && 'animate-phase-flash',
        )}>
          {state.phase === 'preflop' ? 'Pre-Flop' : state.phase === 'hand_complete' ? 'Showdown' : state.phase}
        </span>
      </div>

      {/* Human player - bottom */}
      {humanPlayer && (
        <div className="px-3 py-2 space-y-2 z-10 safe-area-bottom">
          {/* Human cards and info */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex gap-1.5">
              {humanPlayer.holeCards.map((card, i) => (
                <CardDisplay key={i} card={card} size="lg" dealDelay={i * 0.15} />
              ))}
              {humanPlayer.holeCards.length === 0 && (
                <>
                  <div className="w-14 h-20 rounded-lg border border-border/20 bg-secondary/10" />
                  <div className="w-14 h-20 rounded-lg border border-border/20 bg-secondary/10" />
                </>
              )}
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <PlayerAvatar
                  name={humanPlayer.name}
                  index={0}
                  status={humanPlayer.status}
                  isCurrentPlayer={isHumanTurn && humanPlayer.status === 'active'}
                  size="sm"
                />
                {humanPlayer.isDealer && <DealerButton />}
              </div>
              <p className="text-lg font-bold text-foreground mt-0.5">{humanPlayer.chips.toLocaleString()}</p>
              {humanPlayer.lastAction && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
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

          {/* Next hand button */}
          {state.phase === 'hand_complete' && (
            <Button className="w-full shimmer-btn text-primary-foreground font-bold" onClick={onNextHand}>
              Next Hand →
            </Button>
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
