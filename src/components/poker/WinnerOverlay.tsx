import { HandResult as HandResultType } from '@/lib/poker/types';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Trophy, Play, LogOut, Star } from 'lucide-react';
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

function GoldParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none animate-confetti"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${3 + Math.random() * 5}px`,
        height: `${3 + Math.random() * 5}px`,
        background: `hsl(${40 + Math.random() * 10} ${70 + Math.random() * 20}% ${50 + Math.random() * 20}%)`,
        animationDelay: `${delay}s`,
        animationDuration: `${0.8 + Math.random() * 0.7}s`,
        boxShadow: '0 0 6px hsl(43 74% 49% / 0.6)',
      }}
    />
  );
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
  return <span>{display.toLocaleString()}</span>;
}

export function WinnerOverlay({ winners, isGameOver, stats, onNextHand, onQuit }: WinnerOverlayProps) {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    delay: i * 0.04,
    x: 5 + Math.random() * 90,
    y: 5 + Math.random() * 60,
  }));

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, hsl(160 30% 8% / 0.85), hsl(0 0% 0% / 0.95))',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Gold particles */}
      {particles.map((s, i) => <GoldParticle key={i} {...s} />)}

      <div className="rounded-2xl p-6 max-w-sm w-full text-center space-y-5 animate-scale-in"
        style={{
          background: 'linear-gradient(180deg, hsl(160 25% 14% / 0.9), hsl(160 30% 8% / 0.95))',
          border: '1px solid hsl(43 74% 49% / 0.3)',
          boxShadow: '0 0 60px hsl(43 74% 49% / 0.15), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Trophy */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full flex items-center justify-center animate-winner-glow"
              style={{
                background: 'radial-gradient(circle, hsl(43 74% 49% / 0.2), transparent)',
              }}
            >
              <Trophy className="w-10 h-10 text-primary" style={{ filter: 'drop-shadow(0 0 12px hsl(43 74% 49% / 0.6))' }} />
            </div>
            {[0, 1, 2].map(i => (
              <Star key={i} className="absolute w-3 h-3 text-primary animate-confetti" style={{
                top: `${20 + i * 20}%`,
                left: i === 1 ? '85%' : `${-5 + i * 10}%`,
                animationDelay: `${i * 0.2}s`,
                filter: 'drop-shadow(0 0 4px hsl(43 74% 49% / 0.8))',
              }} />
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-black text-shimmer">
          {isGameOver ? 'Game Over' : 'Hand Complete'}
        </h2>

        {/* Winners */}
        <div className="space-y-2">
          {winners.map((w, i) => (
            <div key={i} className="rounded-xl p-3" style={{
              background: 'linear-gradient(135deg, hsl(160 25% 16% / 0.8), hsl(160 30% 12% / 0.9))',
              border: '1px solid hsl(43 74% 49% / 0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}>
              <p className="font-bold text-foreground">{w.name}</p>
              <p className="text-xs text-primary font-semibold" style={{ textShadow: '0 0 8px hsl(43 74% 49% / 0.4)' }}>
                {w.hand.name}
              </p>
              <p className="text-lg font-black text-foreground">
                <AnimatedChips target={w.chips} /> chips
              </p>
            </div>
          ))}
        </div>

        {/* Game Over Stats */}
        {isGameOver && stats && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: 'Hands', value: stats.handsPlayed },
              { label: 'Won', value: stats.handsWon, highlight: true },
              { label: 'Best Hand', value: stats.bestHandName || 'N/A', highlight: true, small: true },
              { label: 'Biggest Pot', value: stats.biggestPot.toLocaleString() },
            ].map((s, i) => (
              <div key={i} className="rounded-lg p-2.5" style={{
                background: 'hsl(160 25% 14% / 0.6)',
                border: '1px solid hsl(160 20% 22% / 0.5)',
              }}>
                <p className="text-muted-foreground">{s.label}</p>
                <p className={cn(
                  'font-bold',
                  s.highlight ? 'text-primary' : 'text-foreground',
                  s.small ? 'text-[11px]' : 'text-lg',
                )}>{s.value}</p>
              </div>
            ))}
            <div className="col-span-2 rounded-lg p-2.5" style={{
              background: 'hsl(160 25% 14% / 0.6)',
              border: '1px solid hsl(160 20% 22% / 0.5)',
            }}>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-bold text-foreground">{formatTime(stats.duration)}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5
            active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(180deg, hsl(160 20% 20%), hsl(160 25% 15%))',
              color: 'hsl(0 0% 80%)',
              border: '1px solid hsl(160 20% 28%)',
            }}
            onClick={onQuit}
          >
            <LogOut className="w-4 h-4" />
            Quit
          </button>
          {!isGameOver && (
            <button className="flex-1 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5
              shimmer-btn text-primary-foreground active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 20px rgba(200,160,40,0.3)' }}
              onClick={onNextHand}
            >
              <Play className="w-4 h-4" />
              Next Hand
            </button>
          )}
          {isGameOver && (
            <button className="flex-1 h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5
              shimmer-btn text-primary-foreground active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 20px rgba(200,160,40,0.3)' }}
              onClick={onQuit}
            >
              <Play className="w-4 h-4" />
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
