import { ReactNode } from 'react';
import tableBase from '@/assets/poker/table/table_premium.png';
import leatherBg from '@/assets/leather-bg.jpg';

interface TableFeltProps {
  children?: ReactNode;
  className?: string;
}

/**
 * TableFelt renders the premium table asset image.
 * In PokerTablePro: no children (visual only).
 * In OnlinePokerTable: accepts children for legacy layout.
 */
export function TableFelt({ children, className }: TableFeltProps) {
  if (!children) {
    // Visual-only mode: table image with leather backing to hide PNG bg
    return (
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {/* Leather backing matches the page background so PNG transparent/light areas blend */}
        <img
          src={leatherBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.2), rgba(0,0,0,0.8))' }}
        />
        <img
          src={tableBase}
          alt="Poker table"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
          style={{ zIndex: 2 }}
        />
      </div>
    );
  }

  // Legacy mode with children (OnlinePokerTable)
  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      <div className="absolute inset-0 bg-black rounded-3xl" style={{ zIndex: 0 }} />
      <img
        src={tableBase}
        alt="Poker table"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
        style={{ zIndex: 1 }}
      />
      <div className="absolute inset-0" style={{ zIndex: 5 }}>
        {children}
      </div>
    </div>
  );
}
