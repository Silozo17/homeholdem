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
}

export function GameModeCard({ icon: Icon, title, description, hint, accentClass, ctaLabel, onClick }: GameModeCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full glass-card rounded-2xl p-5 text-left space-y-3 group active:scale-[0.98] transition-all animate-slide-up-fade"
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', accentClass || 'bg-primary/15')}>
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all mt-1" />
      </div>
      <div>
        <h3 className="font-bold text-foreground text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <p className="text-[10px] text-muted-foreground/70">{hint}</p>
    </button>
  );
}
