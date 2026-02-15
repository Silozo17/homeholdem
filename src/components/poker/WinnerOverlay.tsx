import { HandResult as HandResultType } from '@/lib/poker/types';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Trophy, Play, LogOut } from 'lucide-react';

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

function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full bg-primary animate-confetti pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${0.8 + Math.random() * 0.5}s`,
      }}
    />
  );
}

function AnimatedChips({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const steps = 20;
    const inc = target / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setDisplay(Math.min(Math.round(inc * step), target));
      if (step >= steps) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [target]);
  return <span>{display.toLocaleString()}</span>;
}

export function WinnerOverlay({ winners, isGameOver, stats, onNextHand, onQuit }: WinnerOverlayProps) {
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.08,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 40,
  }));

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-center justify-center p-4">
      {/* Sparkles */}
      {sparkles.map((s, i) => <Sparkle key={i} {...s} />)}

      <div className="bg-card border border-primary/30 rounded-2xl p-6 max-w-sm w-full text-center space-y-5 animate-scale-in shadow-2xl">
        {/* Trophy */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-winner-glow">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gold-gradient">
          {isGameOver ? 'Game Over' : 'Hand Complete'}
        </h2>

        {/* Winners */}
        <div className="space-y-2">
          {winners.map((w, i) => (
            <div key={i} className="bg-secondary/50 rounded-xl p-3 border border-border/50">
              <p className="font-bold text-foreground text-sm">{w.name}</p>
              <p className="text-xs text-primary font-semibold">{w.hand.name}</p>
              <p className="text-sm font-bold text-foreground">
                <AnimatedChips target={w.chips} /> chips
              </p>
            </div>
          ))}
        </div>

        {/* Game Over Stats */}
        {isGameOver && stats && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground">Hands</p>
              <p className="font-bold text-foreground">{stats.handsPlayed}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground">Won</p>
              <p className="font-bold text-foreground">{stats.handsWon}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground">Best Hand</p>
              <p className="font-bold text-primary text-[11px]">{stats.bestHandName || 'N/A'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground">Biggest Pot</p>
              <p className="font-bold text-foreground">{stats.biggestPot.toLocaleString()}</p>
            </div>
            <div className="col-span-2 bg-muted/50 rounded-lg p-2">
              <p className="text-muted-foreground">Duration</p>
              <p className="font-bold text-foreground">{formatTime(stats.duration)}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={onQuit}>
            <LogOut className="w-4 h-4" />
            Quit
          </Button>
          {!isGameOver && (
            <Button className="flex-1 gap-1.5" onClick={onNextHand}>
              <Play className="w-4 h-4" />
              Next Hand
            </Button>
          )}
          {isGameOver && (
            <Button className="flex-1 gap-1.5" onClick={onQuit}>
              <Play className="w-4 h-4" />
              Play Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
