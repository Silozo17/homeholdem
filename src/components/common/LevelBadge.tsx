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
  lg: { wrapper: 'w-[22px] h-[22px]', font: 'text-[11px]' },
  xl: { wrapper: 'w-[26px] h-[26px]', font: 'text-[13px]' },
  '2xl': { wrapper: 'w-[22px] h-[22px]', font: 'text-[12px]' },
};

// Tier 0: level 1-4   → no animation
// Tier 1: level 5-14  → slow gentle pulse
// Tier 2: level 15-29 → medium pulse, orange glow
// Tier 3: level 30-59 → faster pulse, bright orange-red
// Tier 4: level 60+   → fast intense pulse, red-hot glow
function getTier(level: number): number {
  if (level >= 60) return 4;
  if (level >= 30) return 3;
  if (level >= 15) return 2;
  if (level >= 5) return 1;
  return 0;
}

const tierStyles: Record<number, React.CSSProperties> = {
  0: {
    background: 'hsl(0 0% 10%)',
    border: '1.5px solid hsl(0 0% 30%)',
    color: 'white',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  },
  1: {
    background: 'hsl(0 0% 10%)',
    border: '1.5px solid hsl(25 60% 45%)',
    color: 'white',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    animation: 'lvl-glow 3s ease-in-out infinite',
    boxShadow: '0 0 3px 1px hsla(25, 70%, 50%, 0.3)',
  },
  2: {
    background: 'hsl(0 0% 10%)',
    border: '1.5px solid hsl(25 85% 50%)',
    color: 'white',
    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
    animation: 'lvl-glow 2s ease-in-out infinite',
    boxShadow: '0 0 5px 2px hsla(25, 85%, 50%, 0.5)',
  },
  3: {
    background: 'hsl(0 0% 8%)',
    border: '1.5px solid hsl(15 90% 50%)',
    color: 'white',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    animation: 'lvl-glow 1.5s ease-in-out infinite',
    boxShadow: '0 0 8px 3px hsla(15, 90%, 48%, 0.6), 0 0 14px 5px hsla(10, 80%, 40%, 0.3)',
  },
  4: {
    background: 'hsl(0 0% 6%)',
    border: '2px solid hsl(40 95% 55%)',
    color: 'hsl(45 100% 85%)',
    textShadow: '0 0 4px hsla(40, 100%, 60%, 0.8)',
    animation: 'lvl-glow 1s ease-in-out infinite',
    boxShadow: '0 0 10px 4px hsla(10, 95%, 50%, 0.7), 0 0 20px 8px hsla(0, 85%, 45%, 0.4)',
  },
};

// Inject keyframes once
const styleId = 'lvl-glow-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes lvl-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(1.1); }
    }
  `;
  document.head.appendChild(style);
}

export function LevelBadge({ level, size = 'md', className }: LevelBadgeProps) {
  const s = sizeStyles[size] ?? sizeStyles.md;
  const tier = getTier(level);

  return (
    <span
      className={cn(
        'absolute -bottom-1 -left-1 z-10 flex items-center justify-center rounded-full font-bold leading-none',
        s.wrapper,
        s.font,
        className,
      )}
      style={tierStyles[tier]}
    >
      {level}
    </span>
  );
}
