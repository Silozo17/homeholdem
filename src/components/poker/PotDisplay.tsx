import { cn } from '@/lib/utils';

interface PotDisplayProps {
  pot: number;
  className?: string;
}

export function PotDisplay({ pot, className }: PotDisplayProps) {
  if (pot <= 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
      'bg-primary/20 border border-primary/30 text-primary font-bold text-sm',
      className,
    )}>
      <span className="text-xs">🏆</span>
      <span>{pot.toLocaleString()}</span>
    </div>
  );
}
