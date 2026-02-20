import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Spade, Layers, Trophy, Gamepad2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HAND_RANKING_EXAMPLES } from '@/lib/poker/hand-ranking-examples';
import { MiniCardRow } from '@/components/poker/MiniCardRow';

type TranslateFn = ReturnType<typeof useTranslation>['t'];

interface TutorialExplainerProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_PAGES = 5;

export function TutorialExplainer({ onComplete, onSkip }: TutorialExplainerProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);

  const goNext = useCallback(() => {
    if (page >= TOTAL_PAGES - 1) {
      onComplete();
    } else {
      setPage(p => p + 1);
    }
  }, [page, onComplete]);

  const goPrev = useCallback(() => {
    setPage(p => Math.max(0, p - 1));
  }, []);

  const pageIcons = [Spade, Layers, Trophy, Gamepad2, Rocket];
  const PageIcon = pageIcons[page];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with skip */}
      <div className="flex items-center justify-end p-4 safe-area-top">
        <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
          {t('explainer.skip', 'Skip')}
          <X className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto px-6 pb-4">
        <div className="max-w-md mx-auto space-y-5">
          {/* Icon */}
          <div className="flex justify-center pt-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <PageIcon className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Page content */}
          {page === 0 && <Page1 t={t} />}
          {page === 1 && <Page2 t={t} />}
          {page === 2 && <Page3 t={t} />}
          {page === 3 && <Page4 t={t} />}
          {page === 4 && <Page5 t={t} />}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 px-6 pb-6 safe-area-bottom space-y-4">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i === page ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {page > 0 && (
            <Button variant="outline" onClick={goPrev} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('explainer.previous', 'Previous')}
            </Button>
          )}
          <Button onClick={goNext} className={cn(page === 0 ? 'w-full' : 'flex-1')}>
            {page >= TOTAL_PAGES - 1
              ? t('explainer.begin_lesson', 'Begin Lesson 1')
              : t('explainer.next', 'Next')}
            {page < TOTAL_PAGES - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Page1({ t }: { t: TranslateFn }) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-black text-foreground">{t('explainer.page1_title', 'What is Texas Hold\'em?')}</h1>
      <p className="text-muted-foreground leading-relaxed">{t('explainer.page1_text')}</p>
      <p className="text-muted-foreground leading-relaxed">{t('explainer.page1_text2')}</p>
    </div>
  );
}

function Page2({ t }: { t: TranslateFn }) {
  const rounds = [
    { emoji: '🂠', key: 'page2_preflop' },
    { emoji: '🃏', key: 'page2_flop' },
    { emoji: '🎴', key: 'page2_turn' },
    { emoji: '♠️', key: 'page2_river' },
    { emoji: '🏆', key: 'page2_showdown' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-foreground text-center">{t('explainer.page2_title', 'How a Hand Works')}</h1>
      <div className="space-y-3">
        {rounds.map((round, i) => (
          <div key={round.key} className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/30">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {i + 1}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{t(`explainer.${round.key}`)}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center">{t('explainer.page2_text')}</p>
    </div>
  );
}

function Page3({ t }: { t: TranslateFn }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-black text-foreground">{t('explainer.page3_title', 'Hand Rankings')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('explainer.page3_subtitle')}</p>
      </div>
      <div className="space-y-2">
        {HAND_RANKING_EXAMPLES.map((hand) => (
          <div key={hand.rank} className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-card/50 border border-border/30">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {hand.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">{t(`poker.${hand.key}`)}</div>
              <div className="text-xs text-muted-foreground">{t(`poker.${hand.key}_desc`)}</div>
              <MiniCardRow cards={hand.cards} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Page4({ t }: { t: TranslateFn }) {
  const actions = [
    { key: 'page4_fold', icon: '✋' },
    { key: 'page4_check', icon: '👆' },
    { key: 'page4_call', icon: '📞' },
    { key: 'page4_raise', icon: '⬆️' },
    { key: 'page4_allin', icon: '🔥' },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-foreground text-center">{t('explainer.page4_title', 'Your Actions')}</h1>
      <div className="space-y-2.5">
        {actions.map((action) => (
          <div key={action.key} className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/30">
            <span className="text-xl shrink-0">{action.icon}</span>
            <p className="text-sm text-foreground leading-relaxed">{t(`explainer.${action.key}`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Page5({ t }: { t: TranslateFn }) {
  return (
    <div className="space-y-4 text-center pt-8">
      <div className="text-6xl">🎯</div>
      <h1 className="text-2xl font-black text-foreground">{t('explainer.page5_title', 'Ready to Play?')}</h1>
      <p className="text-muted-foreground leading-relaxed text-lg">{t('explainer.page5_text')}</p>
    </div>
  );
}
