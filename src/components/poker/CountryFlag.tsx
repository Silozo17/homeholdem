import { cn } from '@/lib/utils';

interface CountryFlagProps {
  countryCode?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeStyles: Record<string, string> = {
  xs: 'w-3.5 h-3.5 text-[8px]',
  sm: 'w-3.5 h-3.5 text-[8px]',
  md: 'w-4 h-4 text-[9px]',
  lg: 'w-[18px] h-[18px] text-[10px]',
  xl: 'w-[26px] h-[26px] text-[14px]',
  '2xl': 'w-[22px] h-[22px] text-[12px]',
};

function isoToEmoji(code: string): string {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

export function CountryFlag({ countryCode, size = 'md', className }: CountryFlagProps) {
  if (!countryCode) return null;

  const s = sizeStyles[size] ?? sizeStyles.md;

  return (
    <span
      className={cn(
        'absolute -bottom-1 -right-1 z-10 flex items-center justify-center rounded-sm overflow-hidden leading-none',
        s,
        className,
      )}
      style={{
        background: 'hsl(0 0% 10%)',
        border: '1.5px solid hsl(0 0% 30%)',
      }}
      title={countryCode.toUpperCase()}
    >
      {isoToEmoji(countryCode)}
    </span>
  );
}
