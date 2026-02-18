import { ReactNode } from 'react';
import tableBase from '@/assets/poker/table/poker_table_2.webp';

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
    // Visual-only mode: just the image
    return (
      <>
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />
        <img
          src={tableBase}
          alt="Poker table"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
          style={{ zIndex: 1 }}
        />
      </>
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
