import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Crown, Sparkles } from 'lucide-react';
import dealerPortrait from '@/assets/poker/dealer-portrait.png';

interface DealerCharacterProps {
  className?: string;
  expression?: 'neutral' | 'smile' | 'surprise';
}

export function DealerCharacter({ className, expression = 'neutral' }: DealerCharacterProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      {/* Spotlight glow behind dealer */}
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(43 74% 49% / 0.12) 0%, transparent 70%)',
        }}
      />

      {/* Dealer avatar frame */}
      <div
        className={cn(
          'relative w-14 h-14 rounded-full flex items-center justify-center dealer-breathe overflow-hidden',
          expression === 'surprise' && 'scale-110',
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(160 25% 12%), hsl(160 30% 8%))',
          border: '2px solid hsl(43 74% 49% / 0.6)',
          boxShadow: `
            0 0 20px hsl(43 74% 49% / 0.2),
            0 0 40px hsl(43 74% 49% / 0.1),
            inset 0 2px 4px rgba(255,255,255,0.1),
            inset 0 -2px 4px rgba(0,0,0,0.3)
          `,
          transition: 'transform 0.5s ease',
        }}
      >
        {/* Portrait image */}
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

        {/* Inner decorative ring */}
        <div
          className="absolute inset-[3px] rounded-full pointer-events-none"
          style={{
            border: '1px dashed hsl(43 74% 49% / 0.3)',
          }}
        />

        {/* Sparkle on win */}
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
