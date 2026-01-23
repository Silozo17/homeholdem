import { cn } from '@/lib/utils';

interface CardSuitProps {
  suit: 'spade' | 'heart' | 'diamond' | 'club';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export function CardSuit({ suit, size = 'md', className }: CardSuitProps) {
  const sizeClass = sizeMap[size];
  const isRed = suit === 'heart' || suit === 'diamond';
  
  const paths: Record<string, string> = {
    spade: 'M12 2C12 2 4 10 4 14C4 16.2 5.8 18 8 18C9.1 18 10.1 17.5 10.8 16.8L10 22H14L13.2 16.8C13.9 17.5 14.9 18 16 18C18.2 18 20 16.2 20 14C20 10 12 2 12 2Z',
    heart: 'M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.03L12 21.35Z',
    diamond: 'M12 2L2 12L12 22L22 12L12 2Z',
    club: 'M12 2C9.24 2 7 4.24 7 7C7 8.35 7.56 9.56 8.44 10.44C6.44 10.44 4 12.24 4 15C4 17.21 5.79 19 8 19C9.13 19 10.16 18.53 10.9 17.79L10 22H14L13.1 17.79C13.84 18.53 14.87 19 16 19C18.21 19 20 17.21 20 15C20 12.24 17.56 10.44 15.56 10.44C16.44 9.56 17 8.35 17 7C17 4.24 14.76 2 12 2Z',
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor"
      className={cn(
        sizeClass,
        isRed ? 'text-poker-red' : 'text-primary',
        className
      )}
    >
      <path d={paths[suit]} />
    </svg>
  );
}

interface SuitRowProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  opacity?: number;
}

export function SuitRow({ size = 'md', className, opacity = 0.2 }: SuitRowProps) {
  return (
    <div className={cn('flex justify-center gap-4', className)} style={{ opacity }}>
      <CardSuit suit="heart" size={size} />
      <CardSuit suit="spade" size={size} />
      <CardSuit suit="diamond" size={size} />
      <CardSuit suit="club" size={size} />
    </div>
  );
}
