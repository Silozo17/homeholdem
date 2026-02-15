import { cn } from '@/lib/utils';

interface PokerChipProps {
  value?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const sizeMap = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
};

export function PokerChip({ value, color = 'hsl(43 74% 49%)', size = 'sm', className }: PokerChipProps) {
  return (
    <div
      className={cn('poker-chip', sizeMap[size], className)}
      style={{ '--chip-color': color } as React.CSSProperties}
    >
      {value && <span className="poker-chip-value">{value}</span>}
    </div>
  );
}
