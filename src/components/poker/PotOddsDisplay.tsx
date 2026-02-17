import { cn } from '@/lib/utils';

interface PotOddsDisplayProps {
  pot: number;
  amountToCall: number;
  visible: boolean;
}

export function PotOddsDisplay({ pot, amountToCall, visible }: PotOddsDisplayProps) {
  if (!visible || amountToCall <= 0) return null;

  const totalPotAfterCall = pot + amountToCall;
  const equityNeeded = ((amountToCall / totalPotAfterCall) * 100).toFixed(0);

  return (
    <div className="animate-fade-in flex flex-col items-center gap-0">
      <span className="text-[8px] font-bold text-foreground/40" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
        {amountToCall.toLocaleString()} to win {totalPotAfterCall.toLocaleString()}
      </span>
      <span className="text-[8px] font-bold text-primary/70" style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}>
        Need {equityNeeded}% equity
      </span>
    </div>
  );
}
