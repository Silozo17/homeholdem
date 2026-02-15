import { useState } from 'react';
import { History, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandAction {
  player: string;
  action: string;
  amount?: number;
  phase: string;
}

interface HandHistoryEntry {
  handNumber: number;
  actions: HandAction[];
  winners?: string[];
  pot?: number;
}

interface HandHistoryProps {
  entries: HandHistoryEntry[];
  className?: string;
}

export function HandHistory({ entries, className }: HandHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedHand, setExpandedHand] = useState<number | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className={cn('fixed bottom-0 left-0 right-0 z-40', className)}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 mx-auto px-3 py-1 rounded-t-lg text-[10px] font-bold"
        style={{
          background: 'linear-gradient(180deg, hsl(160 25% 14% / 0.95), hsl(160 30% 10% / 0.98))',
          border: '1px solid hsl(43 74% 49% / 0.2)',
          borderBottom: 'none',
          color: 'hsl(43 74% 60%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <History className="w-3 h-3" />
        Hand History
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Slide-up panel */}
      {isOpen && (
        <div
          className="max-h-[40vh] overflow-y-auto animate-fade-in"
          style={{
            background: 'linear-gradient(180deg, hsl(160 25% 12% / 0.95), hsl(160 30% 8% / 0.98))',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid hsl(43 74% 49% / 0.15)',
          }}
        >
          {entries.map((entry) => (
            <div key={entry.handNumber} className="border-b border-border/10">
              <button
                onClick={() => setExpandedHand(expandedHand === entry.handNumber ? null : entry.handNumber)}
                className="flex items-center justify-between w-full px-3 py-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary">#{entry.handNumber}</span>
                  {entry.winners && (
                    <span className="text-[9px] text-foreground/60">
                      Won by {entry.winners.join(', ')}
                    </span>
                  )}
                </div>
                {entry.pot && (
                  <span className="text-[9px] text-primary/70 font-bold tabular-nums">
                    Pot: {entry.pot.toLocaleString()}
                  </span>
                )}
              </button>

              {expandedHand === entry.handNumber && (
                <div className="px-3 pb-2 space-y-0.5 animate-fade-in">
                  {entry.actions.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px]">
                      <span className="text-foreground/40 w-12 uppercase tracking-wider">{action.phase}</span>
                      <span className="text-foreground/80 font-semibold">{action.player}</span>
                      <span className={cn(
                        'font-bold',
                        action.action === 'fold' && 'text-muted-foreground',
                        action.action === 'raise' && 'text-primary',
                        action.action === 'all_in' && 'text-destructive',
                        (action.action === 'call' || action.action === 'check') && 'text-foreground/70',
                      )}>
                        {action.action.replace('_', '-')}
                        {action.amount ? ` ${action.amount.toLocaleString()}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
