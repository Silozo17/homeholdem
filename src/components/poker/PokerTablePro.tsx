import { useMemo, useState, useEffect } from 'react';
import { GameState } from '@/lib/poker/types';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { PlayerAvatar } from './PlayerAvatar';
import { DealerButton } from './DealerButton';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { WinnerOverlay } from './WinnerOverlay';
import { TableFelt } from './TableFelt';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import leatherBg from '@/assets/leather-bg.jpg';

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
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Leather background */}
      <img src={leatherBg} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* All-in flash */}
      {showAllinFlash && (
        <div className="absolute inset-0 z-20 bg-gradient-to-r from-destructive/0 via-primary/15 to-destructive/0 allin-flash pointer-events-none" />
      )}

      {/* Header — glass bar */}
      <div className="flex items-center justify-between px-3 h-9 z-10 safe-area-top shrink-0 relative"
        style={{
          background: 'linear-gradient(180deg, hsl(0 0% 0% / 0.5), hsl(0 0% 0% / 0.3))',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(43 74% 49% / 0.15)',
        }}
      >
        <button onClick={onQuit} className="w-7 h-7 rounded-full flex items-center justify-center 
          bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
          <ArrowLeft className="h-3.5 w-3.5 text-foreground/80" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 60% 40%))',
              color: 'hsl(160 30% 8%)',
              boxShadow: '0 1px 4px rgba(200,160,40,0.3)',
            }}
          >
            #{state.handNumber}
          </span>
          <span className="text-[10px] text-foreground/60 font-medium">
            {state.smallBlind}/{state.bigBlind}
          </span>
        </div>
        <div className="w-7" />
      </div>

      {/* Bot players — horizontal layout */}
      <div className="flex items-start justify-center gap-1 px-2 shrink-0 overflow-x-auto scrollbar-hide py-1.5 relative z-10">
        {bots.map((bot) => (
          <div key={bot.id} className={cn(
            'flex flex-col items-center gap-0 min-w-[52px] max-w-[58px]',
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
            <p className="text-[9px] font-bold text-foreground/90 truncate w-full text-center leading-tight mt-0.5"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
            >{bot.name}</p>
            <p className="text-[9px] text-primary/80 font-semibold leading-none"
              style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}
            >{bot.chips.toLocaleString()}</p>
            {bot.lastAction && (
              <span className={cn(
                'text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-fade-in leading-tight mt-0.5',
                bot.lastAction.startsWith('Fold') && 'bg-muted/80 text-muted-foreground',
                (bot.lastAction.startsWith('Raise') || bot.lastAction.startsWith('All-in')) && 'bg-destructive/30 text-destructive border border-destructive/30',
                (bot.lastAction.startsWith('Call') || bot.lastAction.startsWith('Check')) && 'bg-secondary/80 text-secondary-foreground',
                bot.lastAction.includes('!') && 'bg-primary/30 text-primary animate-winner-glow border border-primary/30',
              )} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {bot.lastAction}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Felt table center */}
      <TableFelt>
        <PotDisplay pot={state.pot} />

        {/* Community cards */}
        <div className="flex gap-1.5 items-center">
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
            <div className="text-[10px] text-foreground/20 italic font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              Waiting for cards...
            </div>
          )}
        </div>

        {/* Phase indicator */}
        <span className={cn(
          'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
          (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') && 'animate-phase-flash',
        )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
          {state.phase === 'preflop' ? 'Pre-Flop' : state.phase === 'hand_complete' ? 'Showdown' : state.phase}
        </span>

        {/* Next Hand button inside felt */}
        {state.phase === 'hand_complete' && (
          <button
            className="px-8 py-2 rounded-xl font-bold text-sm shimmer-btn text-primary-foreground
              active:scale-95 transition-transform shadow-lg"
            style={{
              boxShadow: '0 4px 20px rgba(200,160,40,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
            onClick={onNextHand}
          >
            Next Hand →
          </button>
        )}
      </TableFelt>

      {/* Human player — compact bottom section */}
      {humanPlayer && (
        <div className="px-3 py-2 z-10 safe-area-bottom shrink-0 relative"
          style={{
            background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.5))',
          }}
        >
          {/* Cards + avatar + chips in one row */}
          <div className="flex items-center justify-center gap-3 mb-1.5">
            <div className="flex gap-1">
              {humanPlayer.holeCards.map((card, i) => (
                <CardDisplay key={i} card={card} size="lg" dealDelay={i * 0.15}
                  className={humanPlayer.status === 'folded' ? 'animate-fold-away' : ''} />
              ))}
              {humanPlayer.holeCards.length === 0 && (
                <>
                  <div className="w-12 h-[68px] rounded-lg border border-primary/10 bg-secondary/5" />
                  <div className="w-12 h-[68px] rounded-lg border border-primary/10 bg-secondary/5" />
                </>
              )}
            </div>
            <div className="flex flex-col items-center gap-0.5">
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
              <p className="text-sm font-black text-foreground" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                {humanPlayer.chips.toLocaleString()}
              </p>
              {isHumanTurn && humanPlayer.status === 'active' && (
                <span className="text-[9px] px-2 py-0.5 rounded-full font-black animate-turn-pulse"
                  style={{
                    background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.3), hsl(43 74% 49% / 0.15))',
                    color: 'hsl(43 74% 60%)',
                    border: '1px solid hsl(43 74% 49% / 0.4)',
                    textShadow: '0 0 8px hsl(43 74% 49% / 0.5)',
                  }}
                >
                  YOUR TURN
                </span>
              )}
              {humanPlayer.lastAction && !isHumanTurn && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  humanPlayer.lastAction.includes('!') ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground',
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
