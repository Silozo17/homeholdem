import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeStyles: Record<string, { wrapper: string; font: string }> = {
  xs: { wrapper: 'w-3.5 h-3.5', font: 'text-[8px]' },
  sm: { wrapper: 'w-3.5 h-3.5', font: 'text-[8px]' },
  md: { wrapper: 'w-4 h-4', font: 'text-[9px]' },
  lg: { wrapper: 'w-[18px] h-[18px]', font: 'text-[10px]' },
  xl: { wrapper: 'w-[22px] h-[22px]', font: 'text-[12px]' },
  '2xl': { wrapper: 'w-[22px] h-[22px]', font: 'text-[12px]' },
};

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const s = sizeStyles[size] ?? sizeStyles.md;

  return (
    <span
      className={cn(
        'absolute -bottom-1 -left-1 z-10 flex items-center justify-center rounded-full font-bold leading-none',
        s.wrapper,
        s.font,
        className,
      )}
      style={{
        background: 'hsl(0 0% 10%)',
        border: '1.5px solid hsl(43 74% 49%)',
        color: 'white',
        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
      }}
    >
      {level}
    </span>
  );
}
