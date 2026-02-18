import { useState, useEffect } from 'react';
import { HandRecord } from '@/hooks/useHandHistory';
import { CardDisplay } from './CardDisplay';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, List, Trophy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandReplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hand: HandRecord | null;
  isLandscape?: boolean;
  onExportCSV?: () => string;
}

const PHASE_COLORS: Record<string, string> = {
  preflop: 'bg-blue-500/20 text-blue-300',
  flop: 'bg-green-500/20 text-green-300',
  turn: 'bg-yellow-500/20 text-yellow-300',
  river: 'bg-red-500/20 text-red-300',
};

export function HandReplay({ open, onOpenChange, hand, isLandscape = false, onExportCSV }: HandReplayProps) {
  const [step, setStep] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setShowAll(false);
    }
  }, [open]);

  if (!hand) return null;

  const actions = hand.actions;
  const totalSteps = actions.length;

  const phasesUpToStep = showAll
    ? actions.map(a => a.phase)
    : actions.slice(0, step + 1).map(a => a.phase);
  const uniquePhases = [...new Set(phasesUpToStep)];

  const communityCardsToShow = (() => {
    if (uniquePhases.includes('river')) return hand.communityCards.slice(0, 5);
    if (uniquePhases.includes('turn')) return hand.communityCards.slice(0, 4);
    if (uniquePhases.includes('flop')) return hand.communityCards.slice(0, 3);
    return [];
  })();

  const displayActions = showAll ? actions : actions.slice(0, step + 1);

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
          isLandscape ? 'w-[320px] h-full' : 'max-h-[70vh] rounded-t-2xl pb-safe',
          'z-[80]'
        )}
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="text-sm flex items-center gap-2">
            Hand #{hand.handNumber} Replay
            {onExportCSV && (
              <Button variant="ghost" size="sm" onClick={handleExportCSV} className="ml-auto h-7 text-[10px]">
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Community cards */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {communityCardsToShow.length > 0 ? (
            communityCardsToShow.map((card, i) => (
              <CardDisplay key={`${card.suit}-${card.rank}-${i}`} card={card} size="sm" />
            ))
          ) : (
            <span className="text-xs text-muted-foreground italic">No community cards yet</span>
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

        {/* Action timeline */}
        <div className="max-h-[30vh] overflow-y-auto space-y-1 px-1 scrollbar-hide">
          {displayActions.map((action, i) => {
            const isActive = !showAll && i === step;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all',
                  isActive ? 'bg-primary/10 ring-1 ring-primary/30' : 'opacity-70',
                )}
              >
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', PHASE_COLORS[action.phase] ?? 'bg-muted text-muted-foreground')}>
                  {action.phase}
                </span>
                <span className="font-bold text-foreground truncate">{action.playerName}</span>
                <span className="text-muted-foreground capitalize">{action.action}</span>
                {action.amount > 0 && (
                  <span className="text-primary font-bold ml-auto">{action.amount}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Winners */}
        {(showAll || step >= totalSteps - 1) && hand.winners.length > 0 && (
          <div className="mt-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Trophy className="h-3.5 w-3.5" />
              Winner{hand.winners.length > 1 ? 's' : ''}
            </div>
            {hand.winners.map((w, i) => (
              <div key={i} className="text-xs text-foreground/80 mt-0.5">
                {w.display_name} — {w.hand_name} (+{w.amount})
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between pt-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={showAll || step === 0}
            className="text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
          </Button>

          <Button
            variant={showAll ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setShowAll(!showAll); setStep(totalSteps - 1); }}
            className="text-xs"
          >
            <List className="h-3.5 w-3.5 mr-1" /> {showAll ? 'Step Mode' : 'Show All'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(Math.min(totalSteps - 1, step + 1))}
            disabled={showAll || step >= totalSteps - 1}
            className="text-xs"
          >
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
