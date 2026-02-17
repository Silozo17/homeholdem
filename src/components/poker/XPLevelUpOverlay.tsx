import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function xpForLevel(n: number) {
  return (n - 1) ** 2 * 100;
}

interface XPLevelUpOverlayProps {
  startXp: number;
  endXp: number;
  xpGained: number;
  onContinue: () => void;
}

interface LevelSegment {
  level: number;
  startPct: number; // 0-1 within this level
  endPct: number;   // 0-1 within this level
  levelUp: boolean;
}

function buildSegments(startXp: number, endXp: number): LevelSegment[] {
  const segments: LevelSegment[] = [];
  let currentXp = startXp;

  while (currentXp < endXp) {
    const level = Math.floor(Math.sqrt(currentXp / 100)) + 1;
    const levelStart = xpForLevel(level);
    const levelEnd = xpForLevel(level + 1);
    const range = levelEnd - levelStart;
    const startPct = range > 0 ? (currentXp - levelStart) / range : 0;
    const endInLevel = Math.min(endXp, levelEnd);
    const endPct = range > 0 ? (endInLevel - levelStart) / range : 1;
    const levelUp = endXp >= levelEnd;

    segments.push({ level, startPct, endPct: levelUp ? 1 : endPct, levelUp });
    currentXp = levelUp ? levelEnd : endXp;
  }

  return segments;
}

export function XPLevelUpOverlay({ startXp, endXp, xpGained, onContinue }: XPLevelUpOverlayProps) {
  const segments = useRef(buildSegments(startXp, endXp)).current;
  const [activeIdx, setActiveIdx] = useState(0);
  const [barPct, setBarPct] = useState(0);
  const [flashLevel, setFlashLevel] = useState<number | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const [visible, setVisible] = useState(false);

  // Fade in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Animate segments sequentially
  useEffect(() => {
    if (segments.length === 0) {
      setShowContinue(true);
      return;
    }

    const seg = segments[activeIdx];
    if (!seg) {
      setShowContinue(true);
      return;
    }

    // Start bar at segment start position
    setBarPct(seg.startPct * 100);

    // Animate to end
    const fillTimer = setTimeout(() => {
      setBarPct(seg.endPct * 100);
    }, 100);

    // After fill animation, check for level-up
    const durationMs = Math.min(1200, Math.max(600, (seg.endPct - seg.startPct) * 1200));
    const nextTimer = setTimeout(() => {
      if (seg.levelUp) {
        setFlashLevel(seg.level + 1);
        setTimeout(() => setFlashLevel(null), 600);
      }

      if (activeIdx < segments.length - 1) {
        setTimeout(() => setActiveIdx(activeIdx + 1), seg.levelUp ? 500 : 200);
      } else {
        setTimeout(() => setShowContinue(true), 400);
      }
    }, durationMs + 150);

    return () => {
      clearTimeout(fillTimer);
      clearTimeout(nextTimer);
    };
  }, [activeIdx, segments]);

  const currentSeg = segments[activeIdx];
  const displayLevel = currentSeg?.level ?? (Math.floor(Math.sqrt(endXp / 100)) + 1);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={{
        background: 'radial-gradient(ellipse at center, hsl(0 0% 8% / 0.97), hsl(0 0% 3% / 0.99))',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* XP Earned Header */}
      <div className="text-center mb-8 animate-fade-in">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-500/60 mb-1">Match Complete</p>
        <p className="text-4xl font-black" style={{ color: 'hsl(43 74% 49%)', textShadow: '0 0 20px hsl(43 74% 49% / 0.4)' }}>
          +{xpGained} XP
        </p>
      </div>

      {/* Level Progress Area */}
      <div className="w-[85%] max-w-sm space-y-6">
        {/* Current Level Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn('w-10 h-10 rounded-full flex items-center justify-center font-black text-lg transition-all duration-300',
                flashLevel ? 'scale-125' : 'scale-100'
              )}
              style={{
                background: 'hsl(0 0% 10%)',
                border: '2px solid hsl(43 74% 49%)',
                color: 'white',
                boxShadow: flashLevel ? '0 0 20px hsl(43 74% 49% / 0.6)' : '0 0 6px hsl(43 74% 49% / 0.2)',
              }}
            >
              {flashLevel ?? displayLevel}
            </div>
            <span className="text-sm font-bold text-white/80">Level {flashLevel ?? displayLevel}</span>
          </div>
          <span className="text-xs text-white/40">Lv {displayLevel + 1}</span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 15%)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${barPct}%`,
              background: 'linear-gradient(90deg, hsl(43 74% 40%), hsl(43 74% 55%))',
              boxShadow: '0 0 12px hsl(43 74% 49% / 0.5)',
              transition: 'width 1s ease-out',
            }}
          />
          {/* Flash effect on level up */}
          {flashLevel && (
            <div className="absolute inset-0 animate-pulse" style={{ background: 'hsl(43 74% 80% / 0.3)' }} />
          )}
        </div>

        {/* Segments summary - show levels traversed */}
        {segments.length > 1 && (
          <div className="space-y-1.5">
            {segments.filter(s => s.levelUp).map((s, i) => (
              <div key={i} className={cn(
                'flex items-center gap-2 text-xs transition-opacity duration-500',
                i <= activeIdx - 1 ? 'opacity-100' : 'opacity-30',
              )}>
                <span className="text-amber-400">★</span>
                <span className="text-white/70">Level {s.level} → Level {s.level + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Continue Button */}
      {showContinue && (
        <div className="mt-10 animate-fade-in">
          <Button
            onClick={onContinue}
            className="px-8 py-3 font-bold text-base"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 40%), hsl(43 74% 55%))',
              color: 'hsl(0 0% 5%)',
              boxShadow: '0 4px 20px hsl(43 74% 49% / 0.3)',
            }}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
