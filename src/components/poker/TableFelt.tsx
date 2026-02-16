import { ReactNode } from 'react';
import feltTexture from '@/assets/poker/felt-texture.jpg';

interface TableFeltProps {
  children: ReactNode;
  className?: string;
}

/**
 * The oval poker table rendered inside a flex-1 container.
 * Uses aspect-ratio to force a wide ellipse centred in available space.
 * Children are positioned absolutely over the full area (not just the oval).
 */
export function TableFelt({ children, className }: TableFeltProps) {
  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* Dark room background */}
      <div className="absolute inset-0 bg-background" />

      {/* Oval table — centred with aspect-ratio constraint */}
      <div
        className="absolute pointer-events-none"
        style={{
          /* Centre the oval */
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          /* Force a wide oval regardless of viewport */
          width: 'min(92%, 700px)',
          aspectRatio: '2.1 / 1',
          maxHeight: '48vh',
        }}
      >
        {/* Wood rail */}
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background: `linear-gradient(
              180deg,
              hsl(20 35% 22%) 0%,
              hsl(20 40% 18%) 30%,
              hsl(20 45% 14%) 50%,
              hsl(20 40% 18%) 70%,
              hsl(20 35% 22%) 100%
            )`,
            boxShadow: `
              0 8px 40px rgba(0,0,0,0.6),
              0 2px 8px rgba(0,0,0,0.4),
              inset 0 2px 4px rgba(255,255,255,0.08),
              inset 0 -2px 4px rgba(0,0,0,0.5)
            `,
          }}
        />

        {/* Rail highlight */}
        <div
          className="absolute inset-[2px] rounded-[50%] pointer-events-none"
          style={{ border: '1px solid hsl(20 30% 28% / 0.5)' }}
        />

        {/* Felt surface */}
        <div className="absolute rounded-[50%] overflow-hidden" style={{ inset: '6%' }}>
          <img
            src={feltTexture}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          {/* Centre spotlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 50% at 50% 45%, hsl(160 50% 25% / 0.3) 0%, transparent 60%)`,
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 4px 40px rgba(0,0,0,0.5), inset 0 -4px 30px rgba(0,0,0,0.4)',
              borderRadius: '50%',
            }}
          />
          {/* Edge vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 100%)',
            }}
          />
          {/* Betting line */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '18%',
              borderRadius: '50%',
              border: '1px dashed hsl(43 74% 49% / 0.12)',
            }}
          />
        </div>
      </div>

      {/* Content layer — covers full area */}
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
