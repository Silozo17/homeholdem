import { HandResult } from '@/lib/poker/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HandResultOverlayProps {
  winners: Array<{ name: string; hand: HandResult; chips: number }>;
  isGameOver: boolean;
  onNextHand: () => void;
  onQuit: () => void;
}

export function HandResultOverlay({ winners, isGameOver, onNextHand, onQuit }: HandResultOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center space-y-4">
        <h2 className="text-xl font-bold text-primary">
          {isGameOver ? '🏆 Game Over' : '🃏 Hand Complete'}
        </h2>

        <div className="space-y-2">
          {winners.map((w, i) => (
            <div key={i} className="bg-secondary/50 rounded-lg p-3">
              <p className="font-bold text-foreground">{w.name}</p>
              <p className="text-sm text-primary">{w.hand.name}</p>
              <p className="text-xs text-muted-foreground">{w.chips.toLocaleString()} chips</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onQuit}>
            Quit
          </Button>
          {!isGameOver && (
            <Button className="flex-1" onClick={onNextHand}>
              Next Hand
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
