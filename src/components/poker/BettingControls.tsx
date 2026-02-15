import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { QuickBetButtons } from './QuickBetButtons';
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

  const canRaise = playerChips > amountToCall && minRaiseTotal <= maxRaiseTotal;

  return (
    <div className="flex flex-col gap-2 w-full animate-fade-in">
      {/* Quick bet presets */}
      {canRaise && (
        <QuickBetButtons
          pot={pot}
          minRaise={minRaise}
          maxBet={maxBet}
          playerChips={playerChips}
          onSetAmount={(v) => setRaiseAmount(Math.min(Math.max(v, minRaiseTotal), maxRaiseTotal))}
        />
      )}

      {/* Raise slider */}
      {canRaise && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground w-10 text-right">{minRaiseTotal}</span>
          <Slider
            value={[raiseAmount]}
            min={minRaiseTotal}
            max={maxRaiseTotal}
            step={bigBlind}
            onValueChange={([v]) => setRaiseAmount(v)}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-14 text-right font-medium">
            {raiseAmount >= maxRaiseTotal ? 'All-in' : raiseAmount.toLocaleString()}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 w-full">
        <Button
          size="lg"
          className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold
            active:scale-95 transition-transform"
          onClick={() => onAction({ type: 'fold' })}
        >
          Fold
        </Button>

        {canCheck ? (
          <Button
            size="lg"
            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold
              active:scale-95 transition-transform"
            onClick={() => onAction({ type: 'check' })}
          >
            Check
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold
              active:scale-95 transition-transform"
            onClick={() => {
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
            size="lg"
            className={cn(
              'flex-1 font-bold active:scale-95 transition-transform',
              raiseAmount >= maxRaiseTotal
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground',
            )}
            onClick={() => {
              if (raiseAmount >= maxRaiseTotal) {
                onAction({ type: 'all-in' });
              } else {
                onAction({ type: 'raise', amount: raiseAmount });
              }
            }}
          >
            {raiseAmount >= maxRaiseTotal
              ? 'All-in'
              : `Raise ${raiseAmount.toLocaleString()}`}
          </Button>
        )}
      </div>
    </div>
  );
}
