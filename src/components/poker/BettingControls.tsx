import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { PokerChip } from './PokerChip';

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
  canCheck, amountToCall, minRaise, maxBet, playerChips, bigBlind, pot, onAction,
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
    { label: '½ Pot', amount: Math.round(pot / 2), color: 'hsl(200 70% 50%)' },
    { label: 'Pot', amount: pot, color: 'hsl(43 74% 49%)' },
    { label: 'All-in', amount: maxRaiseTotal, color: 'hsl(0 70% 50%)' },
  ];

  return (
    <div className="flex flex-col gap-1.5 w-full animate-fade-in">
      {/* Raise slider — only visible after tapping Raise */}
      {showRaiseSlider && canRaise && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl animate-fade-in"
          style={{
            background: 'linear-gradient(180deg, hsl(160 25% 12% / 0.9), hsl(160 30% 8% / 0.95))',
            backdropFilter: 'blur(12px)',
            border: '1px solid hsl(43 74% 49% / 0.2)',
          }}
        >
          {quickBets.map((qb) => (
            <button
              key={qb.label}
              className="flex items-center gap-0.5 text-[9px] px-2 py-1 rounded-full font-bold 
                active:scale-90 transition-all duration-150"
              style={{
                background: `linear-gradient(135deg, ${qb.color}, color-mix(in srgb, ${qb.color} 70%, black))`,
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                boxShadow: `0 2px 6px color-mix(in srgb, ${qb.color} 40%, transparent)`,
              }}
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
          <span className="text-[10px] text-primary w-12 text-right font-bold">
            {raiseAmount >= maxRaiseTotal ? 'All-in' : raiseAmount.toLocaleString()}
          </span>
        </div>
      )}

      {/* Action buttons — premium gradient buttons */}
      <div className="flex gap-2 w-full">
        {/* Fold */}
        <button
          className="flex-1 h-11 rounded-xl font-bold text-sm active:scale-95 transition-all duration-150
            flex items-center justify-center gap-1"
          style={{
            background: 'linear-gradient(180deg, hsl(0 50% 35%), hsl(0 60% 25%))',
            color: 'hsl(0 0% 95%)',
            boxShadow: '0 3px 10px rgba(180,40,40,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid hsl(0 40% 40%)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
          onClick={() => { onAction({ type: 'fold' }); setShowRaiseSlider(false); }}
        >
          Fold
        </button>

        {/* Check/Call */}
        <button
          className="flex-1 h-11 rounded-xl font-bold text-sm active:scale-95 transition-all duration-150
            flex items-center justify-center gap-1"
          style={{
            background: canCheck
              ? 'linear-gradient(180deg, hsl(160 45% 30%), hsl(160 50% 22%))'
              : 'linear-gradient(180deg, hsl(200 55% 40%), hsl(200 60% 30%))',
            color: 'hsl(0 0% 95%)',
            boxShadow: canCheck
              ? '0 3px 10px rgba(30,120,80,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 3px 10px rgba(40,100,180,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: canCheck ? '1px solid hsl(160 40% 35%)' : '1px solid hsl(200 50% 45%)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
          onClick={() => {
            setShowRaiseSlider(false);
            if (canCheck) {
              onAction({ type: 'check' });
            } else if (amountToCall >= playerChips) {
              onAction({ type: 'all-in' });
            } else {
              onAction({ type: 'call' });
            }
          }}
        >
          {canCheck ? 'Check' : amountToCall >= playerChips ? `All-in ${playerChips.toLocaleString()}` : `Call ${amountToCall.toLocaleString()}`}
        </button>

        {/* Raise */}
        {canRaise && (
          <button
            className={cn(
              'flex-1 h-11 rounded-xl font-bold text-sm active:scale-95 transition-all duration-150',
              'flex items-center justify-center gap-1',
            )}
            style={{
              background: showRaiseSlider && raiseAmount >= maxRaiseTotal
                ? 'linear-gradient(180deg, hsl(0 70% 45%), hsl(0 70% 35%))'
                : 'linear-gradient(180deg, hsl(43 80% 50%), hsl(43 74% 38%))',
              color: showRaiseSlider && raiseAmount >= maxRaiseTotal ? 'white' : 'hsl(160 30% 8%)',
              boxShadow: '0 3px 10px rgba(200,160,40,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              border: '1px solid hsl(43 70% 55%)',
              textShadow: showRaiseSlider && raiseAmount >= maxRaiseTotal
                ? '0 1px 2px rgba(0,0,0,0.4)' : '0 1px 0 rgba(255,255,255,0.3)',
            }}
            onClick={handleRaiseTap}
          >
            {showRaiseSlider
              ? (raiseAmount >= maxRaiseTotal ? 'All-in' : `Raise ${raiseAmount.toLocaleString()}`)
              : 'Raise'}
          </button>
        )}
      </div>
    </div>
  );
}
