import { LucideIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameModeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint: string;
  accentClass?: string;
  ctaLabel: string;
  onClick: () => void;
  compact?: boolean;
}

export function GameModeCard({ icon: Icon, title, description, hint, accentClass, ctaLabel, onClick, compact }: GameModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full glass-card rounded-2xl text-left group active:scale-[0.98] transition-all animate-slide-up-fade',
        compact ? 'p-3.5 space-y-1.5' : 'p-5 space-y-3'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn(
          'rounded-xl flex items-center justify-center',
          compact ? 'w-10 h-10' : 'w-12 h-12',
          accentClass || 'bg-primary/15'
        )}>
          <Icon className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', 'text-primary')} />
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all mt-1" />
      </div>
      <div>
        <h3 className={cn('font-bold text-foreground', compact ? 'text-base' : 'text-lg')}>{title}</h3>
        <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>{description}</p>
      </div>
      <p className="text-[10px] text-muted-foreground/70">{hint}</p>
    </button>
  );
}
