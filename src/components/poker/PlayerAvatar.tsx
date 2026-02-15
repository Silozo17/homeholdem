import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  name: string;
  index: number;
  status: 'active' | 'folded' | 'all-in' | 'eliminated';
  isCurrentPlayer: boolean;
  size?: 'sm' | 'md';
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

export function PlayerAvatar({ name, index, status, isCurrentPlayer, size = 'md' }: PlayerAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const isOut = status === 'folded' || status === 'eliminated';

  return (
    <div className={cn(
      'relative rounded-full flex items-center justify-center font-bold select-none',
      size === 'md' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs',
      isOut && 'opacity-40',
    )}>
      {/* Animated ring for current player */}
      {isCurrentPlayer && !isOut && (
        <div className="absolute inset-[-3px] rounded-full animate-turn-pulse"
          style={{
            background: `conic-gradient(from 0deg, hsl(43 74% 49%), hsl(43 74% 60%), hsl(43 74% 49%))`,
            opacity: 0.8,
          }}
        />
      )}
      {/* All-in pulse ring */}
      {status === 'all-in' && (
        <div className="absolute inset-[-3px] rounded-full animate-pulse"
          style={{ background: 'hsl(0 70% 50%)', opacity: 0.5 }}
        />
      )}
      {/* Avatar body */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center w-full h-full z-[1]',
        )}
        style={{
          background: isOut
            ? 'linear-gradient(135deg, hsl(160 10% 25%), hsl(160 10% 18%))'
            : `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, black))`,
          boxShadow: isOut
            ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
            : 'inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
          color: 'white',
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          border: isOut ? '2px solid hsl(160 10% 30%)' : `2px solid color-mix(in srgb, ${color} 60%, white)`,
        }}
      >
        {initial}
      </div>
      {/* Status dot */}
      <span className={cn(
        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 z-[2]',
        'border-background',
        status === 'active' && 'bg-green-500',
        status === 'folded' && 'bg-muted-foreground',
        status === 'all-in' && 'bg-destructive animate-pulse',
        status === 'eliminated' && 'bg-muted',
      )} />
    </div>
  );
}
