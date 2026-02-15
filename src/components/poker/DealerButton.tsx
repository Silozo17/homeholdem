import { cn } from '@/lib/utils';

export function DealerButton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'w-5 h-5 rounded-full flex items-center justify-center',
      'bg-foreground text-background text-[10px] font-black',
      'shadow-md border border-primary/30',
      className,
    )}>
      D
    </div>
  );
}
