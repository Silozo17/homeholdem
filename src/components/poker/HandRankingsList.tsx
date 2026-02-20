import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { HAND_RANKING_EXAMPLES } from '@/lib/poker/hand-ranking-examples';
import { FannedHand } from './FannedHand';

export const HandRankingsList = memo(function HandRankingsList() {
  const { t } = useTranslation();

  return (
    <div className="flex">
      {/* Rotated BEST / WORST column */}
      <div className="relative flex flex-col items-center justify-between w-5 shrink-0 mr-1">
        {/* BEST – reads bottom-to-top */}
        <div className="flex items-center gap-0.5 text-emerald-400" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <ChevronUp className="h-3 w-3" />
          <span className="text-[9px] font-bold uppercase tracking-widest">{t('poker.best', 'Best')}</span>
        </div>

        {/* WORST – reads top-to-bottom */}
        <div className="flex items-center gap-0.5 text-red-400" style={{ writingMode: 'vertical-rl' }}>
          <ChevronDown className="h-3 w-3" />
          <span className="text-[9px] font-bold uppercase tracking-widest">{t('poker.worst', 'Worst')}</span>
        </div>
      </div>

      {/* Hand rows */}
      <div className="flex-1 space-y-1.5">
        {HAND_RANKING_EXAMPLES.map((hand) => (
          <div
            key={hand.rank}
            className="flex items-center gap-3"
          >
            {/* Card tray */}
            <div className="shrink-0">
              <FannedHand cards={hand.cards} highlighted={hand.highlighted} />
            </div>

            {/* Rank circle + Name */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                {hand.rank}
              </div>
              <span className="font-semibold text-sm text-foreground truncate">
                {t(`poker.${hand.key}`)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
