import { useMemo } from 'react';
import { GameState } from '@/lib/poker/types';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { PlayerSeat } from './PlayerSeat';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { HandResultOverlay } from './HandResult';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PokerTableProps {
  state: GameState;
  isHumanTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  maxBet: number;
  onAction: (action: any) => void;
  onNextHand: () => void;
  onQuit: () => void;
}

export function PokerTable({
  state,
  isHumanTurn,
  amountToCall,
  canCheck,
  maxBet,
  onAction,
  onNextHand,
  onQuit,
}: PokerTableProps) {
  const humanPlayer = state.players.find(p => p.id === 'human');
  const isShowdown = state.phase === 'hand_complete' || state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';

  // Split players: human at bottom, bots around top
  const bots = state.players.filter(p => p.isBot);

  // Calculate winners for hand_complete
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

  return (
    <div className="flex flex-col h-full min-h-[80vh] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <Button variant="ghost" size="icon" onClick={onQuit}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-sm text-muted-foreground">
          Hand #{state.handNumber} • Blinds {state.smallBlind}/{state.bigBlind}
        </div>
        <div className="w-10" />
      </div>

      {/* Bot players - top area */}
      <div className="flex flex-wrap justify-center gap-1 px-2 py-2">
        {bots.map(bot => (
          <PlayerSeat
            key={bot.id}
            player={bot}
            isCurrentPlayer={state.currentPlayerIndex === bot.seatIndex}
            showCards={isShowdown && (bot.status === 'active' || bot.status === 'all-in')}
            isHuman={false}
          />
        ))}
      </div>

      {/* Table felt - center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 mx-4 rounded-2xl bg-secondary/30 border border-border/50 p-4 min-h-[200px]">
        {/* Pot */}
        <PotDisplay pot={state.pot} />

        {/* Community cards */}
        <div className="flex gap-1.5 min-h-[64px] items-center">
          {state.communityCards.map((card, i) => (
            <CardDisplay key={i} card={card} size="md" />
          ))}
          {/* Empty slots */}
          {Array.from({ length: 5 - state.communityCards.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-11 h-16 rounded-md border border-border/30 bg-secondary/20" />
          ))}
        </div>

        {/* Phase indicator */}
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {state.phase === 'preflop' ? 'Pre-Flop' : state.phase}
        </span>
      </div>

      {/* Human player - bottom */}
      {humanPlayer && (
        <div className="px-4 py-3 space-y-3">
          {/* Human cards and info */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex gap-1">
              {humanPlayer.holeCards.map((card, i) => (
                <CardDisplay key={i} card={card} size="lg" />
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-primary">{humanPlayer.name}</p>
              <p className="text-lg font-bold text-foreground">{humanPlayer.chips.toLocaleString()}</p>
              {humanPlayer.lastAction && (
                <p className="text-xs text-muted-foreground">{humanPlayer.lastAction}</p>
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
            <Button className="w-full" onClick={onNextHand}>
              Next Hand →
            </Button>
          )}
        </div>
      )}

      {/* Hand result overlay */}
      {(state.phase === 'hand_complete' || isGameOver) && winners.length > 0 && (
        <HandResultOverlay
          winners={winners}
          isGameOver={isGameOver}
          onNextHand={onNextHand}
          onQuit={onQuit}
        />
      )}
    </div>
  );
}
