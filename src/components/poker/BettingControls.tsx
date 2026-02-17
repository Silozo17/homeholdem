import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { X, Check, PhoneIncoming, TrendingUp, Flame } from 'lucide-react';

interface BettingControlsProps {
  canCheck: boolean;
  amountToCall: number;
  minRaise: number;
  maxBet: number;
  playerChips: number;
  bigBlind: number;
  pot: number;
  landscape?: boolean;
  panelWidth?: number;
  onAction: (action: { type: 'fold' | 'check' | 'call' | 'raise' | 'all-in'; amount?: number }) => void;
}

export function BettingControls({
  canCheck, amountToCall, minRaise, maxBet, playerChips, bigBlind, pot, landscape, panelWidth, onAction,
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
    { label: '2×BB', amount: Math.max(minRaiseTotal, maxBet + bigBlind * 2) },
    { label: '½ Pot', amount: Math.max(minRaiseTotal, Math.round(pot / 2) + maxBet) },
    { label: '¾ Pot', amount: Math.max(minRaiseTotal, Math.round(pot * 0.75) + maxBet) },
    { label: 'Pot', amount: Math.max(minRaiseTotal, pot + maxBet) },
    { label: 'All-in', amount: maxRaiseTotal },
  ];

  const callLabel = canCheck
    ? 'Check'
    : amountToCall >= playerChips
    ? `All-in ${playerChips.toLocaleString()}`
    : `Call ${amountToCall.toLocaleString()}`;

  const raiseLabel = showRaiseSlider
    ? (raiseAmount >= maxRaiseTotal ? 'All-in' : `Raise ${raiseAmount.toLocaleString()}`)
    : 'Raise';

  const btnStyle = (bg: string, border: string, shadow: string) => ({
    background: bg,
    color: 'hsl(0 0% 95%)',
    boxShadow: shadow + ', inset 0 1px 0 rgba(255,255,255,0.1)',
    border: `1px solid ${border}`,
    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
  });

  // ── Landscape: vertical right-thumb panel ──
  if (landscape) {
    return (
      <div className="flex flex-col gap-1.5 animate-fade-in" style={{ width: panelWidth ? `${panelWidth}px` : '180px' }}>
        {showRaiseSlider && canRaise && (
          <div className="flex flex-col gap-1.5 px-3 py-3 rounded-xl"
            style={{
              background: 'linear-gradient(180deg, hsl(160 25% 12% / 0.95), hsl(160 30% 8% / 0.98))',
              backdropFilter: 'blur(12px)',
              border: '1px solid hsl(43 74% 49% / 0.2)',
            }}
          >
            <div className="flex flex-wrap gap-1.5">
              {quickBets.map((qb) => {
                const capped = Math.min(Math.max(qb.amount, minRaiseTotal), maxRaiseTotal);
                const isActive = raiseAmount === capped;
                return (
                  <button key={qb.label}
                    className="text-[11px] py-1.5 px-2.5 rounded-full font-bold active:scale-90 transition-all"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, hsl(43 80% 50%), hsl(43 74% 38%))'
                        : 'linear-gradient(135deg, hsl(160 20% 18%), hsl(160 25% 14%))',
                      color: isActive ? 'hsl(160 30% 8%)' : 'hsl(0 0% 75%)',
                      border: isActive ? '1px solid hsl(43 70% 55%)' : '1px solid hsl(160 15% 25%)',
                    }}
                    onClick={() => setRaiseAmount(capped)}
                  >
                    {qb.label}
                  </button>
                );
              })}
            </div>
            <Slider
              value={[raiseAmount]}
              min={minRaiseTotal}
              max={maxRaiseTotal}
              step={bigBlind}
              onValueChange={([v]) => setRaiseAmount(v)}
            />
            <span className="text-[11px] text-primary text-center font-bold tabular-nums">
              {raiseAmount >= maxRaiseTotal ? 'All-in' : raiseAmount.toLocaleString()}
            </span>
          </div>
        )}
        <button
          className="h-8 rounded-xl font-bold text-xs flex items-center justify-center gap-0.5 active:scale-[0.92] transition-all"
          style={btnStyle(
            'linear-gradient(180deg, hsl(0 50% 35%), hsl(0 60% 25%))',
            'hsl(0 40% 40%)',
            '0 3px 10px rgba(180,40,40,0.3)'
          )}
          onClick={() => { onAction({ type: 'fold' }); setShowRaiseSlider(false); }}
        >
          <X size={12} /> Fold
        </button>
        <button
          className="h-8 rounded-xl font-bold text-xs flex items-center justify-center gap-0.5 active:scale-[0.92] transition-all"
          style={btnStyle(
            canCheck
              ? 'linear-gradient(180deg, hsl(160 45% 30%), hsl(160 50% 22%))'
              : 'linear-gradient(180deg, hsl(200 55% 40%), hsl(200 60% 30%))',
            canCheck ? 'hsl(160 40% 35%)' : 'hsl(200 50% 45%)',
            canCheck ? '0 3px 10px rgba(30,120,80,0.3)' : '0 3px 10px rgba(40,100,180,0.3)'
          )}
          onClick={() => {
            setShowRaiseSlider(false);
            if (canCheck) onAction({ type: 'check' });
            else if (amountToCall >= playerChips) onAction({ type: 'all-in' });
            else onAction({ type: 'call' });
          }}
        >
          {canCheck ? <Check size={12} /> : amountToCall >= playerChips ? <Flame size={12} /> : <PhoneIncoming size={12} />} {callLabel}
        </button>
        {canRaise && (
          <button
            className="h-8 rounded-xl font-bold text-xs flex items-center justify-center gap-0.5 active:scale-[0.92] transition-all"
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
            {showRaiseSlider && raiseAmount >= maxRaiseTotal ? <Flame size={12} /> : <TrendingUp size={12} />} {raiseLabel}
          </button>
        )}
      </div>
    );
  }

  // ── Portrait: full-width horizontal bar ──
  return (
    <div className="flex flex-col gap-1.5 w-full animate-fade-in">
      {showRaiseSlider && canRaise && (
        <div className="flex flex-col gap-1.5 px-3 py-3 rounded-xl animate-fade-in"
          style={{
            background: 'linear-gradient(180deg, hsl(160 25% 12% / 0.9), hsl(160 30% 8% / 0.95))',
            backdropFilter: 'blur(12px)',
            border: '1px solid hsl(43 74% 49% / 0.2)',
          }}
        >
          <div className="flex gap-1.5">
            {quickBets.map((qb) => {
              const capped = Math.min(Math.max(qb.amount, minRaiseTotal), maxRaiseTotal);
              const isActive = raiseAmount === capped;
              return (
                <button key={qb.label}
                  className={cn('flex-1 text-[11px] py-1.5 px-2 rounded-full font-bold active:scale-90 transition-all duration-150')}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, hsl(43 80% 50%), hsl(43 74% 38%))'
                      : 'linear-gradient(135deg, hsl(160 20% 18%), hsl(160 25% 14%))',
                    color: isActive ? 'hsl(160 30% 8%)' : 'hsl(0 0% 75%)',
                    border: isActive ? '1px solid hsl(43 70% 55%)' : '1px solid hsl(160 15% 25%)',
                    textShadow: isActive ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
                    boxShadow: isActive ? '0 2px 8px hsl(43 74% 49% / 0.3)' : 'none',
                  }}
                  onClick={() => setRaiseAmount(capped)}
                >
                  {qb.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Slider value={[raiseAmount]} min={minRaiseTotal} max={maxRaiseTotal} step={bigBlind} onValueChange={([v]) => setRaiseAmount(v)} className="flex-1 h-6" />
            <span className="text-xs text-primary w-16 text-right font-bold tabular-nums" style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}>
              {raiseAmount >= maxRaiseTotal ? 'All-in' : raiseAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}
      <div className="flex gap-2 w-full">
        <button
          className="flex-1 h-11 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-1 active:scale-[0.92] active:shadow-none"
          style={btnStyle(
            'linear-gradient(180deg, hsl(0 50% 35%), hsl(0 60% 25%))',
            'hsl(0 40% 40%)',
            '0 3px 10px rgba(180,40,40,0.3)'
          )}
          onClick={() => { onAction({ type: 'fold' }); setShowRaiseSlider(false); }}
        >
          <X size={14} /> Fold
        </button>
        <button
          className="flex-1 h-11 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-1 active:scale-[0.92] active:shadow-none"
          style={btnStyle(
            canCheck
              ? 'linear-gradient(180deg, hsl(160 45% 30%), hsl(160 50% 22%))'
              : 'linear-gradient(180deg, hsl(200 55% 40%), hsl(200 60% 30%))',
            canCheck ? 'hsl(160 40% 35%)' : 'hsl(200 50% 45%)',
            canCheck ? '0 3px 10px rgba(30,120,80,0.3)' : '0 3px 10px rgba(40,100,180,0.3)'
          )}
          onClick={() => {
            setShowRaiseSlider(false);
            if (canCheck) onAction({ type: 'check' });
            else if (amountToCall >= playerChips) onAction({ type: 'all-in' });
            else onAction({ type: 'call' });
          }}
        >
          {canCheck ? <Check size={14} /> : amountToCall >= playerChips ? <Flame size={14} /> : <PhoneIncoming size={14} />} {callLabel}
        </button>
        {canRaise && (
          <button
            className="flex-1 h-11 rounded-xl font-bold text-sm transition-all duration-150 flex items-center justify-center gap-1 active:scale-[0.92] active:shadow-none"
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
            {showRaiseSlider && raiseAmount >= maxRaiseTotal ? <Flame size={14} /> : <TrendingUp size={14} />} {raiseLabel}
          </button>
        )}
      </div>
    </div>
  );
}
