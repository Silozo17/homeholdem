import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  name: string;
  index: number;
  status: 'active' | 'folded' | 'all-in' | 'eliminated';
  isCurrentPlayer: boolean;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const AVATAR_COLORS = [
  'hsl(43 74% 49%)',
  'hsl(200 80% 55%)',
  'hsl(340 75% 55%)',
  'hsl(280 65% 55%)',
  'hsl(160 70% 45%)',
  'hsl(25 85% 55%)',
  'hsl(100 60% 45%)',
  'hsl(0 70% 55%)',
  'hsl(220 70% 55%)',
];

const sizeMap = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
};

export function PlayerAvatar({ name, index, status, isCurrentPlayer, avatarUrl, size = 'md' }: PlayerAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const isOut = status === 'folded' || status === 'eliminated';

  return (
    <div className={cn(
      'relative rounded-full flex items-center justify-center font-bold select-none',
      sizeMap[size],
      isOut && 'opacity-70 grayscale-[30%]',
    )}>
      {/* Animated gold ring for current player */}
      {isCurrentPlayer && !isOut && (
        <div className="absolute inset-[-4px] rounded-full animate-turn-pulse"
          style={{
            background: `conic-gradient(from 0deg, hsl(43 74% 49%), hsl(43 74% 70%), hsl(43 74% 49%), hsl(43 60% 40%), hsl(43 74% 49%))`,
            opacity: 0.9,
          }}
        />
      )}
      {/* All-in pulse ring */}
      {status === 'all-in' && (
        <div className="absolute inset-[-4px] rounded-full animate-pulse"
          style={{ background: 'hsl(0 70% 50%)', opacity: 0.5 }}
        />
      )}
      {/* Avatar body */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center w-full h-full z-[1] overflow-hidden',
        )}
        style={{
          background: isOut
            ? 'linear-gradient(135deg, hsl(160 10% 25%), hsl(160 10% 18%))'
            : `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, black))`,
          boxShadow: isOut
            ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
            : `inset 0 2px 6px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.4), 0 3px 12px rgba(0,0,0,0.5)`,
          color: 'white',
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          border: isOut ? '2px solid hsl(160 10% 30%)' : `3px solid color-mix(in srgb, ${color} 60%, white)`,
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </div>
      {/* Status dot */}
      <span className={cn(
        'absolute -bottom-0.5 -right-0.5 rounded-full border-2 z-[2]',
        'border-background',
        size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3',
        status === 'active' && 'bg-green-500',
        status === 'folded' && 'bg-muted-foreground',
        status === 'all-in' && 'bg-destructive animate-pulse',
        status === 'eliminated' && 'bg-muted',
      )} />
    </div>
  );
}
