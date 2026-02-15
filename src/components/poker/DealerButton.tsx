import { cn } from '@/lib/utils';

export function DealerButton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'w-5 h-5 rounded-full flex items-center justify-center',
      'text-[10px] font-black',
      className,
    )} style={{
      background: 'linear-gradient(145deg, hsl(0 0% 95%), hsl(0 0% 80%))',
      color: 'hsl(160 30% 15%)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.4)',
      border: '1.5px solid hsl(43 74% 49%)',
    }}>
      D
    </div>
  );
}
