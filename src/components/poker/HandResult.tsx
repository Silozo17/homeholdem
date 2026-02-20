import { HandResult } from '@/lib/poker/types';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface HandResultOverlayProps {
  winners: Array<{ name: string; hand: HandResult; chips: number }>;
  isGameOver: boolean;
  onNextHand: () => void;
  onQuit: () => void;
}

export function HandResultOverlay({ winners, isGameOver, onNextHand, onQuit }: HandResultOverlayProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">
          {isGameOver ? t('poker_hand_result.game_over') : t('poker_hand_result.hand_complete')}
        </h2>

        <div className="space-y-2">
          {winners.map((w, i) => (
            <div key={i} className="bg-secondary/50 rounded-lg p-3">
              <p className="font-bold text-foreground">{w.name}</p>
              <p className="text-sm text-primary">{w.hand.name}</p>
              <p className="text-xs text-muted-foreground">{w.chips.toLocaleString()} {t('poker_hand_result.chips')}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onQuit}>
            {t('poker_hand_result.quit')}
          </Button>
          {!isGameOver && (
            <Button className="flex-1" onClick={onNextHand}>
              {t('poker_hand_result.next_hand')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
