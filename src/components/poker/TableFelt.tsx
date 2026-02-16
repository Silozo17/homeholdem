import { ReactNode } from 'react';
import tableBase from '@/assets/poker/table/table_premium.png';

interface TableFeltProps {
  children?: ReactNode;
  className?: string;
}

/**
 * TableFelt renders the premium table asset image.
 * When used in PokerTablePro: no children (visual only).
 * When used in OnlinePokerTable: accepts children for legacy layout.
 */
export function TableFelt({ children, className }: TableFeltProps) {
  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* Dark backing so table transparency doesn't show checkerboard */}
      <div className="absolute inset-0 bg-background rounded-3xl" style={{ zIndex: 0 }} />
      <img
        src={tableBase}
        alt="Poker table"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
        style={{ zIndex: 1 }}
      />
      {children && (
        <div className="absolute inset-0" style={{ zIndex: 5 }}>
          {children}
        </div>
      )}
    </div>
  );
}
