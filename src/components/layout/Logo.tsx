import { cn } from '@/lib/utils';
import hhLogo from '@/assets/poker/hh-logo.webp';

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

  const imgSize = size === 'lg' ? 48 : size === 'md' ? 32 : 24;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={hhLogo}
        alt="Home Hold'em Club"
        width={imgSize}
        height={imgSize}
        className="object-contain"
        draggable={false}
      />
      <div className="flex flex-col">
        <h1 className={cn('font-bold text-gold-gradient tracking-tight leading-tight', sizeClasses[size])}>
          Home Hold'em
        </h1>
        <span className={cn(
          'text-muted-foreground uppercase tracking-[0.3em] font-medium leading-tight',
          size === 'lg' ? 'text-sm' : 'text-xs'
        )}>
          Club
        </span>
      </div>
    </div>
  );
}
