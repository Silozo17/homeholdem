import { ReactNode } from 'react';
import feltTexture from '@/assets/poker/felt-texture.jpg';

interface TableFeltProps {
  children: ReactNode;
  className?: string;
}

/**
 * Premium poker table: dark charcoal rail, gold trim, green felt.
 * Uses a stadium (rounded-rectangle) shape matching real poker tables.
 * Children are positioned absolutely over the full area.
 */
export function TableFelt({ children, className }: TableFeltProps) {
  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* Dark room background */}
      <div className="absolute inset-0 bg-background" />

      {/* Table — centred with aspect-ratio constraint */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(94%, 720px)',
          aspectRatio: '2.4 / 1',
          maxHeight: '50vh',
        }}
      >
        {/* Outer dark rail — stadium shape */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: 'calc(min(100%, 50%) / 2.4) / 50%',
            /* Use a simpler stadium radius */
            borderTopLeftRadius: '45%',
            borderTopRightRadius: '45%',
            borderBottomLeftRadius: '45%',
            borderBottomRightRadius: '45%',
            background: `linear-gradient(
              180deg,
              hsl(0 0% 28%) 0%,
              hsl(0 0% 18%) 15%,
              hsl(0 0% 12%) 40%,
              hsl(0 0% 8%) 60%,
              hsl(0 0% 12%) 85%,
              hsl(0 0% 22%) 100%
            )`,
            boxShadow: `
              0 12px 60px rgba(0,0,0,0.7),
              0 4px 16px rgba(0,0,0,0.5),
              inset 0 2px 4px rgba(255,255,255,0.08),
              inset 0 -3px 6px rgba(0,0,0,0.6)
            `,
          }}
        />

        {/* Inner rail highlight (subtle bevel) */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: '3px',
            borderRadius: '44%',
            border: '1px solid hsl(0 0% 24% / 0.6)',
          }}
        />

        {/* Gold trim band */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: '7%',
            borderRadius: '42%',
            border: '2.5px solid hsl(43 74% 49% / 0.7)',
            boxShadow: `
              0 0 8px hsl(43 74% 49% / 0.25),
              inset 0 0 8px hsl(43 74% 49% / 0.15)
            `,
          }}
        />

        {/* Felt surface */}
        <div
          className="absolute overflow-hidden"
          style={{
            inset: '9%',
            borderRadius: '40%',
          }}
        >
          {/* Base green color */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(
                135deg,
                hsl(152 45% 22%) 0%,
                hsl(152 42% 26%) 30%,
                hsl(152 40% 24%) 60%,
                hsl(152 45% 20%) 100%
              )`,
            }}
          />

          {/* Felt texture overlay */}
          <img
            src={feltTexture}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 0.35, mixBlendMode: 'overlay' }}
            draggable={false}
          />

          {/* Diamond/suit pattern overlay (CSS-only) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.06,
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 18px,
                rgba(255,255,255,0.15) 18px,
                rgba(255,255,255,0.15) 19px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 18px,
                rgba(255,255,255,0.15) 18px,
                rgba(255,255,255,0.15) 19px
              )`,
            }}
          />

          {/* Centre spotlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 55% 50% at 50% 45%, hsl(152 50% 30% / 0.35) 0%, transparent 55%)`,
            }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 4px 40px rgba(0,0,0,0.45), inset 0 -4px 30px rgba(0,0,0,0.35)',
              borderRadius: '40%',
            }}
          />

          {/* Edge vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 65% 55% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)',
            }}
          />

          {/* Betting line */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '16%',
              borderRadius: '45%',
              border: '1px solid hsl(43 74% 49% / 0.1)',
            }}
          />
        </div>
      </div>

      {/* Content layer — covers full area */}
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
