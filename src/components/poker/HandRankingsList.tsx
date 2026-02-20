import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { HAND_RANKING_EXAMPLES } from '@/lib/poker/hand-ranking-examples';
import { FannedHand } from './FannedHand';

export const HandRankingsList = memo(function HandRankingsList() {
  const { t } = useTranslation();

  return (
    <div className="relative">
      {/* BEST marker */}
      <div className="flex items-center gap-1 mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
        <ChevronUp className="h-3.5 w-3.5" />
        <span>{t('poker.best', 'Best')}</span>
      </div>

      <div className="space-y-1.5">
        {HAND_RANKING_EXAMPLES.map((hand) => (
          <div
            key={hand.rank}
            className="flex items-center gap-3 py-2 px-2 rounded-lg bg-card/40"
          >
            {/* Fanned cards */}
            <div className="shrink-0">
              <FannedHand cards={hand.cards} highlighted={hand.highlighted} />
            </div>

            {/* Rank + Name */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                {hand.rank}
              </div>
              <span className="font-semibold text-sm text-foreground truncate">
                {t(`poker.${hand.key}`)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* WORST marker */}
      <div className="flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wider text-red-400">
        <ChevronDown className="h-3.5 w-3.5" />
        <span>{t('poker.worst', 'Worst')}</span>
      </div>
    </div>
  );
});
