import { ReactNode } from 'react';
import tableFelt from '@/assets/poker-table-felt.jpg';

interface TableFeltProps {
  children: ReactNode;
  className?: string;
}

export function TableFelt({ children, className }: TableFeltProps) {
  return (
    <div className={`relative w-full h-full ${className ?? ''}`}>
      {/* Table image fills entire area */}
      <img
        src={tableFelt}
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-[2rem] pointer-events-none"
        draggable={false}
      />
      {/* Inner shadow overlay for depth */}
      <div
        className="absolute inset-0 rounded-[2rem] pointer-events-none"
        style={{
          boxShadow: 'inset 0 4px 30px rgba(0,0,0,0.5), inset 0 -2px 20px rgba(0,0,0,0.3)',
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 rounded-[2rem] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)',
        }}
      />
      {/* Gold betting line */}
      <div
        className="absolute inset-[15%] rounded-[2rem] pointer-events-none"
        style={{
          border: '1px dashed hsl(43 74% 49% / 0.15)',
        }}
      />
      {/* Content — positioned children */}
      {children}
    </div>
  );
}
