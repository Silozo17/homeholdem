import { useState, useEffect, useRef } from 'react';
import { HandRecord } from '@/hooks/useHandHistory';
import { CardDisplay } from './CardDisplay';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trophy, Download, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandReplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handHistory: HandRecord[];
  initialHandIndex?: number;
  isLandscape?: boolean;
  onExportCSV?: () => string;
}

export function HandReplay({ open, onOpenChange, handHistory, initialHandIndex, isLandscape = false, onExportCSV }: HandReplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navScrollRef = useRef<HTMLDivElement>(null);

  // Reset to latest hand on open
  useEffect(() => {
    if (open && handHistory.length > 0) {
      setCurrentIndex(initialHandIndex ?? handHistory.length - 1);
    }
  }, [open, handHistory.length, initialHandIndex]);

  // Scroll active hand badge into view
  useEffect(() => {
    if (navScrollRef.current) {
      const active = navScrollRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIndex]);

  if (handHistory.length === 0) return null;

  const hand = handHistory[currentIndex];
  if (!hand) return null;

  // Determine which players folded: anyone NOT in revealedCards and NOT a winner
  const revealedPlayerIds = new Set(hand.revealedCards.map(rc => rc.player_id));
  const winnerPlayerIds = new Set(hand.winners.map(w => w.player_id));

  // Showdown players = players whose cards were revealed (didn't fold)
  const showdownPlayers = hand.revealedCards.map(rc => {
    const winner = hand.winners.find(w => w.player_id === rc.player_id);
    const playerSnapshot = hand.players.find(p => p.playerId === rc.player_id);
    const winnerName = hand.winners.find(w => w.player_id === rc.player_id)?.display_name;
    return {
      playerId: rc.player_id,
      name: playerSnapshot?.name || winnerName || 'Unknown',
      cards: rc.cards,
      handName: winner?.hand_name || null,
      isWinner: winnerPlayerIds.has(rc.player_id),
      winAmount: winner?.amount || 0,
    };
  });

  const totalPot = hand.pots.reduce((s, p) => s + p.amount, 0);

  const handleExportCSV = () => {
    if (!onExportCSV) return;
    const csv = onExportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hand-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isLandscape ? 'right' : 'bottom'}
        className={cn(
          isLandscape
            ? 'w-[320px] h-full pr-[calc(5px+env(safe-area-inset-right,0px))]'
            : 'max-h-[70vh] rounded-t-2xl pb-safe',
          'z-[80]'
        )}
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-sm flex items-center gap-2">
            Hand #{hand.handNumber}
            {onExportCSV && (
              <Button variant="ghost" size="sm" onClick={handleExportCSV} className="ml-auto h-7 text-[10px]">
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Community cards */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {hand.communityCards.length > 0 ? (
            hand.communityCards.map((card, i) => (
              <CardDisplay key={`${card.suit}-${card.rank}-${i}`} card={card} size="sm" />
            ))
          ) : (
            <span className="text-xs text-muted-foreground italic">No community cards</span>
          )}
        </div>

        {/* My cards */}
        {hand.myCards && hand.myCards.length > 0 && (
          <div className="flex items-center justify-center gap-1 pb-2">
            <span className="text-[10px] text-muted-foreground mr-1">Your cards:</span>
            {hand.myCards.map((card, i) => (
              <CardDisplay key={`my-${card.suit}-${card.rank}-${i}`} card={card} size="xs" />
            ))}
          </div>
        )}

        {/* Showdown */}
        <div className="max-h-[28vh] overflow-y-auto space-y-1.5 px-1 scrollbar-hide">
          {showdownPlayers.length > 0 ? (
            <>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold px-1">Showdown</div>
              {showdownPlayers.map((p) => (
                <div
                  key={p.playerId}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs',
                    p.isWinner ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/30'
                  )}
                >
                  <div className="flex items-center gap-1 shrink-0">
                    {p.cards.map((card, i) => (
                      <CardDisplay key={`${p.playerId}-${i}`} card={card} size="xs" />
                    ))}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn('font-bold truncate', p.isWinner && 'text-primary')}>
                      {p.isWinner && <Trophy className="h-3 w-3 inline mr-0.5 -mt-0.5" />}
                      {p.name}
                    </span>
                    {p.handName && (
                      <span className="text-[10px] text-muted-foreground">{p.handName}</span>
                    )}
                  </div>
                  {p.isWinner && p.winAmount > 0 && (
                    <span className="ml-auto text-primary font-bold text-xs whitespace-nowrap">+{p.winAmount}</span>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic text-center py-2">No showdown data</div>
          )}
        </div>

        {/* Pot */}
        {totalPot > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Coins className="h-3.5 w-3.5" /> Pot: <span className="font-bold text-foreground">{totalPot}</span>
          </div>
        )}

        {/* Hand navigation */}
        <div className="flex items-center gap-1.5 pt-3">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <div ref={navScrollRef} className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-1 px-0.5">
            {handHistory.map((h, i) => (
              <button
                key={h.handId}
                data-active={i === currentIndex}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'shrink-0 px-2 py-1 rounded-full text-[10px] font-bold transition-colors',
                  i === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                #{h.handNumber}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setCurrentIndex(Math.min(handHistory.length - 1, currentIndex + 1))}
            disabled={currentIndex >= handHistory.length - 1}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
