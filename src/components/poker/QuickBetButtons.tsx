import { Button } from '@/components/ui/button';

interface QuickBetButtonsProps {
  pot: number;
  minRaise: number;
  maxBet: number;
  playerChips: number;
  onSetAmount: (amount: number) => void;
}

export function QuickBetButtons({ pot, minRaise, maxBet, playerChips, onSetAmount }: QuickBetButtonsProps) {
  const halfPot = Math.max(maxBet + minRaise, Math.floor(pot / 2) + maxBet);
  const threeFourthPot = Math.max(maxBet + minRaise, Math.floor(pot * 0.75) + maxBet);
  const fullPot = Math.max(maxBet + minRaise, pot + maxBet);
  const allIn = maxBet + playerChips;

  const presets = [
    { label: '½ Pot', value: Math.min(halfPot, allIn) },
    { label: '¾ Pot', value: Math.min(threeFourthPot, allIn) },
    { label: 'Pot', value: Math.min(fullPot, allIn) },
    { label: 'All-in', value: allIn },
  ];

  return (
    <div className="flex gap-1.5">
      {presets.map(p => (
        <button
          key={p.label}
          onClick={() => onSetAmount(p.value)}
          className="flex-1 text-[10px] font-bold py-1 px-1.5 rounded-md
            bg-secondary/80 text-secondary-foreground hover:bg-secondary
            active:scale-95 transition-all duration-100 border border-border/50"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
