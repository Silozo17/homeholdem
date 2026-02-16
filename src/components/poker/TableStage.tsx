import { ReactNode } from 'react';

interface TableStageProps {
  children: ReactNode;
  className?: string;
}

/**
 * TableStage is the top-level layout container for the poker game.
 * It fills the viewport, adds safe-area insets, and provides a
 * relative positioning context for all children (table, seats, etc.).
 */
export function TableStage({ children, className }: TableStageProps) {
  return (
    <div
      className={`fixed inset-0 flex flex-col overflow-hidden ${className ?? ''}`}
      style={{
        /* Ensure safe areas are accounted for */
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {children}
    </div>
  );
}
