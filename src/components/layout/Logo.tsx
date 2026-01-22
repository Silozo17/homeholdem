import { cn } from '@/lib/utils';

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

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="flex items-center gap-2">
        <span className="text-poker-red text-xl">♥</span>
        <h1 className={cn('font-bold text-gold-gradient tracking-tight', sizeClasses[size])}>
          Home Hold'em
        </h1>
        <span className="text-foreground/60 text-xl">♠</span>
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
