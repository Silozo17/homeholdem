import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface BettingControlsProps {
  canCheck: boolean;
  amountToCall: number;
  minRaise: number;
  maxBet: number;
  playerChips: number;
  bigBlind: number;
  pot: number;
  onAction: (action: { type: 'fold' | 'check' | 'call' | 'raise' | 'all-in'; amount?: number }) => void;
}

export function BettingControls({
  canCheck,
  amountToCall,
  minRaise,
  maxBet,
  playerChips,
  bigBlind,
  pot,
  onAction,
}: BettingControlsProps) {
  const minRaiseTotal = maxBet + minRaise;
  const maxRaiseTotal = maxBet + playerChips;
  const [raiseAmount, setRaiseAmount] = useState(minRaiseTotal);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const canRaise = playerChips > amountToCall && minRaiseTotal <= maxRaiseTotal;

  const handleRaiseTap = () => {
    if (!showRaiseSlider) {
      setShowRaiseSlider(true);
      setRaiseAmount(minRaiseTotal);
    } else {
      if (raiseAmount >= maxRaiseTotal) {
        onAction({ type: 'all-in' });
      } else {
        onAction({ type: 'raise', amount: raiseAmount });
      }
      setShowRaiseSlider(false);
    }
  };

  const quickBets = [
    { label: '½', amount: Math.round(pot / 2) },
    { label: 'Pot', amount: pot },
    { label: 'All', amount: maxRaiseTotal },
  ];

  return (
    <div className="flex flex-col gap-1 w-full animate-fade-in">
      {/* Raise slider — only visible after tapping Raise */}
      {showRaiseSlider && canRaise && (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in">
          {quickBets.map((qb) => (
            <button
              key={qb.label}
              className="text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold active:scale-95 transition-transform"
              onClick={() => setRaiseAmount(Math.min(Math.max(qb.amount, minRaiseTotal), maxRaiseTotal))}
            >
              {qb.label}
            </button>
          ))}
          <Slider
            value={[raiseAmount]}
            min={minRaiseTotal}
            max={maxRaiseTotal}
            step={bigBlind}
            onValueChange={([v]) => setRaiseAmount(v)}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-12 text-right font-medium">
            {raiseAmount >= maxRaiseTotal ? 'All-in' : raiseAmount.toLocaleString()}
          </span>
        </div>
      )}

      {/* Action buttons — single compact row */}
      <div className="flex gap-1.5 w-full">
        <Button
          size="sm"
          className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-10
            active:scale-95 transition-transform"
          onClick={() => { onAction({ type: 'fold' }); setShowRaiseSlider(false); }}
        >
          Fold
        </Button>

        {canCheck ? (
          <Button
            size="sm"
            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold h-10
              active:scale-95 transition-transform"
            onClick={() => { onAction({ type: 'check' }); setShowRaiseSlider(false); }}
          >
            Check
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold h-10
              active:scale-95 transition-transform"
            onClick={() => {
              setShowRaiseSlider(false);
              if (amountToCall >= playerChips) {
                onAction({ type: 'all-in' });
              } else {
                onAction({ type: 'call' });
              }
            }}
          >
            {amountToCall >= playerChips
              ? `All-in ${playerChips.toLocaleString()}`
              : `Call ${amountToCall.toLocaleString()}`}
          </Button>
        )}

        {canRaise && (
          <Button
            size="sm"
            className={cn(
              'flex-1 font-bold h-10 active:scale-95 transition-transform',
              showRaiseSlider
                ? (raiseAmount >= maxRaiseTotal
                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground')
                : 'bg-primary hover:bg-primary/90 text-primary-foreground',
            )}
            onClick={handleRaiseTap}
          >
            {showRaiseSlider
              ? (raiseAmount >= maxRaiseTotal ? 'All-in' : `Raise ${raiseAmount.toLocaleString()}`)
              : 'Raise'}
          </Button>
        )}
      </div>
    </div>
  );
}
