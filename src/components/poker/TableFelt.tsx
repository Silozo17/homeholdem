import { ReactNode } from 'react';
import tableBase from '@/assets/poker/table/table_base.png';
import { Z } from './z';

interface TableFeltProps {
  children: ReactNode;
  className?: string;
}

/**
 * Premium poker table using a real generated asset image.
 * The table image is rendered with object-fit: contain inside
 * a fixed aspect-ratio container, ensuring it always looks correct.
 * Children are positioned absolutely over the full area.
 */
export function TableFelt({ children, className }: TableFeltProps) {
  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* Dark room background */}
      <div className="absolute inset-0 bg-background" style={{ zIndex: Z.BG }} />

      {/* Table asset — centred with aspect-ratio constraint */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '48%',
          transform: 'translate(-50%, -50%)',
          width: 'min(96%, 760px)',
          aspectRatio: '16 / 9',
          maxHeight: '52vh',
          zIndex: Z.TABLE,
        }}
      >
        <img
          src={tableBase}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />

        {/* Subtle gold glow around the trim */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: Z.TRIM_GLOW,
            background: 'radial-gradient(ellipse 60% 50% at 50% 48%, hsl(43 74% 49% / 0.06) 0%, transparent 50%)',
          }}
        />
      </div>

      {/* Content layer — covers full area */}
      <div className="absolute inset-0" style={{ zIndex: Z.CARDS }}>
        {children}
      </div>
    </div>
  );
}
