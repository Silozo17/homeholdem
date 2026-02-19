import { HandResult as HandResultType } from '@/lib/poker/types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WinnerOverlayProps {
  winners: Array<{ name: string; hand: HandResultType; chips: number }>;
  isGameOver: boolean;
  stats?: {
    handsPlayed: number;
    handsWon: number;
    bestHandName: string;
    biggestPot: number;
    duration: number;
  };
  onNextHand: () => void;
  onQuit: () => void;
}

function AnimatedChips({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const steps = 25;
    const inc = target / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setDisplay(Math.min(Math.round(inc * step), target));
      if (step >= steps) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  }, [target]);
  return <span className="tabular-nums">{display.toLocaleString()}</span>;
}

export function WinnerOverlay({ winners, isGameOver, stats, onNextHand, onQuit }: WinnerOverlayProps) {
  const { t } = useTranslation();
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  const humanWon = isGameOver && winners.some(w => w.name === 'You');

  // Inline banner for hand_complete
  if (!isGameOver) {
    return (
      <div className="absolute left-1/2 -translate-x-1/2 z-30 animate-winner-banner pointer-events-none"
        style={{ top: '22%' }}
      >
        <div className="relative rounded-xl px-6 py-3 text-center"
          style={{
            background: 'linear-gradient(180deg, hsl(160 25% 14% / 0.95), hsl(160 30% 8% / 0.95))',
            border: '1px solid hsl(43 74% 49% / 0.4)',
            boxShadow: '0 0 40px hsl(43 74% 49% / 0.2), 0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full animate-particle-float"
                style={{ left: `${10 + Math.random() * 80}%`, bottom: '0%', background: 'radial-gradient(circle, hsl(43 74% 70%), hsl(43 74% 49% / 0))', animationDelay: `${i * 0.15}s`, boxShadow: '0 0 3px hsl(43 74% 49% / 0.5)' }} />
            ))}
          </div>

          {winners[0] && winners[0].hand.name !== 'N/A' && (
            <div className="mb-1">
              <span className="text-lg font-black uppercase tracking-wider animate-hand-name-reveal"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', background: 'linear-gradient(135deg, hsl(43 74% 60%), hsl(43 90% 75%), hsl(43 74% 50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 2px 8px hsl(43 74% 49% / 0.5))' }}>
                {winners[0].hand.name}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <Trophy className="w-3.5 h-3.5 text-primary" style={{ filter: 'drop-shadow(0 0 6px hsl(43 74% 49% / 0.6))' }} />
            <span className="text-[10px] font-black text-shimmer tracking-wide">{t('poker_table.winner')}</span>
          </div>
          {winners.map((w, i) => (
            <div key={i}>
              <p className="font-bold text-sm text-foreground">{w.name}</p>
              <p className="text-[10px] text-primary font-semibold" style={{ textShadow: '0 0 8px hsl(43 74% 49% / 0.4)' }}>
                <AnimatedChips target={w.chips} /> {t('poker_table.chips')}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full overlay for game_over
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, hsl(160 30% 8% / 0.85), hsl(0 0% 0% / 0.95))', backdropFilter: 'blur(16px)' }}>
      <div className="rounded-2xl p-6 landscape:p-4 max-w-sm landscape:max-w-2xl w-full text-center animate-scale-in overflow-y-auto max-h-[90dvh]"
        style={{ background: 'linear-gradient(180deg, hsl(160 25% 14% / 0.9), hsl(160 30% 8% / 0.95))', border: '1px solid hsl(43 74% 49% / 0.3)', boxShadow: '0 0 60px hsl(43 74% 49% / 0.15), 0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex flex-col landscape:flex-row landscape:gap-6 landscape:items-start space-y-5 landscape:space-y-0">
          <div className="flex flex-col items-center landscape:flex-1 landscape:min-w-0 space-y-3">
            <div className="relative flex justify-center">
              <div className="w-16 h-16 landscape:w-12 landscape:h-12 rounded-full flex items-center justify-center animate-winner-glow"
                style={{ background: 'radial-gradient(circle, hsl(43 74% 49% / 0.2), transparent)' }}>
                <Trophy className="w-8 h-8 landscape:w-6 landscape:h-6 text-primary" style={{ filter: 'drop-shadow(0 0 12px hsl(43 74% 49% / 0.6))' }} />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="absolute w-1.5 h-1.5 rounded-full animate-particle-float"
                  style={{ left: `${25 + Math.random() * 50}%`, bottom: '10%', background: 'radial-gradient(circle, hsl(43 74% 65%), hsl(43 74% 49% / 0))', animationDelay: `${i * 0.3}s`, boxShadow: '0 0 4px hsl(43 74% 49% / 0.5)' }} />
              ))}
            </div>

            <h2 className="text-2xl landscape:text-xl font-black text-shimmer">
              {humanWon ? t('poker_table.you_won') : t('poker_table.game_over')}
            </h2>
            {!humanWon && (
              <p className="text-sm text-muted-foreground -mt-2">{t('poker_table.you_busted_out')}</p>
            )}

            <div className="space-y-2 w-full">
              {winners.map((w, i) => (
                <div key={i} className="rounded-xl p-3 landscape:p-2" style={{ background: 'linear-gradient(135deg, hsl(160 25% 16% / 0.8), hsl(160 30% 12% / 0.9))', border: '1px solid hsl(43 74% 49% / 0.2)' }}>
                  <p className="font-bold text-foreground">{w.name}</p>
                  {w.hand.name !== 'N/A' && (
                    <p className="text-xs font-semibold"
                      style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(135deg, hsl(43 74% 60%), hsl(43 90% 70%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{w.hand.name}</p>
                  )}
                  <p className="text-lg landscape:text-base font-black text-foreground">
                    <AnimatedChips target={w.chips} /> {t('poker_table.chips')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col landscape:flex-1 landscape:min-w-0 space-y-4 landscape:space-y-3">
            {stats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: t('poker_table.hands'), value: stats.handsPlayed },
                  { label: t('poker_table.won'), value: stats.handsWon, highlight: true },
                  { label: t('poker_table.best_hand'), value: stats.bestHandName || 'N/A', highlight: true, small: true },
                  { label: t('poker_table.biggest_pot'), value: stats.biggestPot.toLocaleString() },
                ].map((s, i) => (
                  <div key={i} className="rounded-lg p-2.5 landscape:p-2" style={{ background: 'hsl(160 25% 14% / 0.6)', border: '1px solid hsl(160 20% 22% / 0.5)' }}>
                    <p className="text-muted-foreground">{s.label}</p>
                    <p className={cn('font-bold', s.highlight ? 'text-primary' : 'text-foreground', s.small ? 'text-[11px]' : 'text-lg landscape:text-base')}>{s.value}</p>
                  </div>
                ))}
                <div className="col-span-2 rounded-lg p-2.5 landscape:p-2" style={{ background: 'hsl(160 25% 14% / 0.6)', border: '1px solid hsl(160 20% 22% / 0.5)' }}>
                  <p className="text-muted-foreground">{t('poker_table.duration')}</p>
                  <p className="font-bold text-foreground">{formatTime(stats.duration)}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button className="flex-1 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.92] transition-transform"
                style={{ background: 'linear-gradient(180deg, hsl(160 20% 20%), hsl(160 25% 15%))', color: 'hsl(0 0% 80%)', border: '1px solid hsl(160 20% 28%)' }}
                onClick={onQuit}>
                <X className="w-4 h-4" />
                {t('poker_table.close_game')}
              </button>
              <button className="flex-1 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shimmer-btn text-primary-foreground active:scale-[0.92] transition-transform"
                style={{ boxShadow: '0 4px 20px rgba(200,160,40,0.3)' }}
                onClick={onNextHand}>
                <Play className="w-4 h-4" />
                {t('poker_table.play_again')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
