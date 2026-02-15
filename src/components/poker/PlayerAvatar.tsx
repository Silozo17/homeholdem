import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  name: string;
  index: number;
  status: 'active' | 'folded' | 'all-in' | 'eliminated';
  isCurrentPlayer: boolean;
  size?: 'sm' | 'md';
}

const AVATAR_COLORS = [
  'hsl(43 74% 49%)',   // gold
  'hsl(200 80% 55%)',  // blue
  'hsl(340 75% 55%)',  // pink
  'hsl(280 65% 55%)',  // purple
  'hsl(160 70% 45%)',  // teal
  'hsl(25 85% 55%)',   // orange
  'hsl(100 60% 45%)',  // green
  'hsl(0 70% 55%)',    // red
  'hsl(220 70% 55%)',  // indigo
];

export function PlayerAvatar({ name, index, status, isCurrentPlayer, size = 'md' }: PlayerAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const isOut = status === 'folded' || status === 'eliminated';

  return (
    <div className={cn(
      'relative rounded-full flex items-center justify-center font-bold select-none',
      size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs',
      isOut && 'opacity-40',
      isCurrentPlayer && !isOut && 'animate-turn-pulse',
    )} style={{
      backgroundColor: isOut ? 'hsl(160 20% 18%)' : color,
      color: 'white',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    }}>
      {initial}
      {/* Status dot */}
      <span className={cn(
        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2',
        'border-background',
        status === 'active' && 'bg-green-500',
        status === 'folded' && 'bg-muted-foreground',
        status === 'all-in' && 'bg-destructive animate-pulse',
        status === 'eliminated' && 'bg-muted',
      )} />
    </div>
  );
}
