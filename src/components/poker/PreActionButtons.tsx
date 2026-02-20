import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type PreActionType = 'check_fold' | 'call_any' | 'check' | null;

interface PreActionButtonsProps {
  canPreCheck: boolean;
  amountToCall: number;
  onQueue: (action: PreActionType) => void;
  queued: PreActionType;
}

export const PreActionButtons = memo(function PreActionButtons({
  canPreCheck, amountToCall, onQueue, queued,
}: PreActionButtonsProps) {
  const { t } = useTranslation();

  const ACTIONS: { id: PreActionType; label: string; description: string }[] = [
    { id: 'check_fold', label: `${t('poker_table.check')}/${t('poker_table.fold')}`, description: 'Auto-check or fold' },
    { id: 'call_any', label: t('poker_table.call_any'), description: 'Auto-call any bet' },
    { id: 'check', label: t('poker_table.check'), description: 'Auto-check only' },
  ];

  return (
    <div className="flex flex-col items-end gap-1">
      {ACTIONS.map(action => {
        if (action.id === 'check' && amountToCall > 0 && !canPreCheck) return null;

        const isActive = queued === action.id;

        return (
          <button
            key={action.id}
            onClick={() => {
              onQueue(isActive ? null : action.id);
              if ('vibrate' in navigator) navigator.vibrate([30]);
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95',
              isActive
                ? 'border-primary/60 bg-primary/15 text-primary'
                : 'border-white/10 bg-white/5 text-foreground/50 hover:bg-white/10',
            )}
            style={{
              border: `1.5px solid ${isActive ? 'hsl(43 74% 49% / 0.6)' : 'hsl(0 0% 100% / 0.1)'}`,
              backdropFilter: 'blur(8px)',
              textShadow: isActive ? '0 0 6px hsl(43 74% 49% / 0.4)' : 'none',
            }}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
});
