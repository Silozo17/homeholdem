import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import dealerImg from '@/assets/dealer/poker-dealer.webp';

interface DealerCharacterProps {
  className?: string;
  expression?: 'neutral' | 'smile' | 'surprise';
}

export function DealerCharacter({ className, expression = 'neutral' }: DealerCharacterProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={cn('flex flex-col items-center gap-0.5 relative', className)}>
      {/* Spotlight glow */}
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(43 74% 49% / 0.18) 0%, transparent 70%)',
        }}
      />

      {/* Dealer image — scales with viewport */}
      <div
        className={cn(
          'relative flex items-center justify-center dealer-breathe',
          expression === 'surprise' && 'scale-110',
        )}
        style={{
          width: 'min(18vw, 140px)',
          transition: 'transform 0.5s ease',
          filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))',
        }}
      >
        {!imgFailed ? (
          <img
            src={dealerImg}
            alt="Dealer"
            className="w-full h-auto object-contain"
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-xl font-bold">D</span>
          </div>
        )}

        {/* Sparkles on win */}
        {expression === 'smile' && (
          <>
            <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-primary animate-sparkle z-10" />
            <Sparkles className="absolute -bottom-0.5 -left-1 w-2.5 h-2.5 text-primary animate-sparkle z-10" style={{ animationDelay: '0.3s' }} />
          </>
        )}
      </div>

      {/* Label */}
      <span
        className="text-[7px] font-bold uppercase tracking-[0.2em] text-primary/60"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
      >
        Dealer
      </span>
    </div>
  );
}
