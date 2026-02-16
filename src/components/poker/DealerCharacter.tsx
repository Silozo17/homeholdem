import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Crown, Sparkles } from 'lucide-react';
import dealerPortrait from '@/assets/dealer/dealer-main.png';

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
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(43 74% 49% / 0.15) 0%, transparent 70%)',
        }}
      />

      {/* Dealer avatar frame */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center dealer-breathe overflow-hidden',
          expression === 'surprise' && 'scale-110',
        )}
        style={{
          width: 'clamp(40px, 10vw, 56px)',
          height: 'clamp(40px, 10vw, 56px)',
          border: '2px solid hsl(43 74% 49% / 0.7)',
          boxShadow: `
            0 0 16px hsl(43 74% 49% / 0.25),
            0 0 32px hsl(43 74% 49% / 0.1),
            inset 0 2px 4px rgba(255,255,255,0.1),
            inset 0 -2px 4px rgba(0,0,0,0.3)
          `,
          transition: 'transform 0.5s ease',
          background: 'linear-gradient(135deg, hsl(160 25% 12%), hsl(160 30% 8%))',
        }}
      >
        {!imgFailed ? (
          <img
            src={dealerPortrait}
            alt="Dealer"
            className="absolute inset-0 w-full h-full object-cover rounded-full"
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Crown
            className="w-5 h-5 relative z-[1] text-primary/80"
            style={{ filter: 'drop-shadow(0 0 6px hsl(43 74% 49% / 0.5))' }}
          />
        )}

        {/* Inner ring */}
        <div
          className="absolute inset-[2px] rounded-full pointer-events-none"
          style={{ border: '1px dashed hsl(43 74% 49% / 0.25)' }}
        />

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
