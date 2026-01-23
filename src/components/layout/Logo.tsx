import { cn } from '@/lib/utils';
import { CardSuit } from '@/components/common/CardSuits';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const iconSize = size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm';

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="flex items-center gap-2">
        <CardSuit suit="heart" size={iconSize} />
        <h1 className={cn('font-bold text-gold-gradient tracking-tight', sizeClasses[size])}>
          Home Hold'em
        </h1>
        <CardSuit suit="spade" size={iconSize} className="opacity-60" />
      </div>
      <span className={cn(
        'text-muted-foreground uppercase tracking-[0.3em] font-medium',
        size === 'lg' ? 'text-sm' : 'text-xs'
      )}>
        Club
      </span>
    </div>
  );
}
