import { useState, useMemo } from 'react';
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
  onAction: (action: { type: 'fold' | 'check' | 'call' | 'raise' | 'all-in'; amount?: number }) => void;
}

export function BettingControls({
  canCheck,
  amountToCall,
  minRaise,
  maxBet,
  playerChips,
  bigBlind,
  onAction,
}: BettingControlsProps) {
  const minRaiseTotal = maxBet + minRaise;
  const maxRaiseTotal = maxBet + playerChips; // going all-in
  const [raiseAmount, setRaiseAmount] = useState(minRaiseTotal);

  const canRaise = playerChips > amountToCall && minRaiseTotal <= maxRaiseTotal;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Raise slider (only if can raise) */}
      {canRaise && (
        <div className="flex items-center gap-3 px-2">
          <span className="text-xs text-muted-foreground w-10">{minRaiseTotal}</span>
          <Slider
            value={[raiseAmount]}
            min={minRaiseTotal}
            max={maxRaiseTotal}
            step={bigBlind}
            onValueChange={([v]) => setRaiseAmount(v)}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-14 text-right">
            {raiseAmount >= maxRaiseTotal ? 'All-in' : raiseAmount.toLocaleString()}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 w-full">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={() => onAction({ type: 'fold' })}
        >
          Fold
        </Button>

        {canCheck ? (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onAction({ type: 'check' })}
          >
            Check
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
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
            variant="default"
            size="sm"
            className="flex-1"
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
