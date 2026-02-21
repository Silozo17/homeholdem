import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trophy, Target, Flame, Clock, Zap, Crown } from 'lucide-react';

function xpForLevel(n: number) {
  return (n - 1) ** 2 * 100;
}

export interface GameStats {
  handsPlayed: number;
  handsWon: number;
  bestHandName: string;
  biggestPot: number;
  duration: number; // seconds
}

interface XPLevelUpOverlayProps {
  startXp: number;
  endXp: number;
  xpGained: number;
  stats?: GameStats;
  onPlayAgain?: () => void;
  onClose?: () => void;
  /** @deprecated use onClose instead */
  onContinue?: () => void;
}

interface LevelSegment {
  level: number;
  startPct: number;
  endPct: number;
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/** Mini donut chart for win rate */
function WinRateRing({ played, won }: { played: number; won: number }) {
  const pct = played > 0 ? (won / played) * 100 : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="hsl(0 0% 20%)" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={radius} fill="none"
          stroke="hsl(43 74% 49%)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          className="transition-all duration-[1.5s] ease-out"
        />
      </svg>
      <span className="text-[11px] font-black" style={{ color: 'hsl(43 74% 55%)' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function XPLevelUpOverlay({ startXp, endXp, xpGained, stats, onPlayAgain, onClose, onContinue }: XPLevelUpOverlayProps) {
  const segments = useRef(buildSegments(startXp, endXp)).current;
  const [activeIdx, setActiveIdx] = useState(0);
  const [barPct, setBarPct] = useState(0);
  const [flashLevel, setFlashLevel] = useState<number | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleClose = onClose ?? onContinue ?? (() => {});

  // Fade in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Animate segments sequentially
  useEffect(() => {
    if (segments.length === 0) {
      setShowContent(true);
      return;
    }

    const seg = segments[activeIdx];
    if (!seg) {
      setShowContent(true);
      return;
    }

    setBarPct(seg.startPct * 100);

    const fillTimer = setTimeout(() => {
      setBarPct(seg.endPct * 100);
    }, 100);

    const durationMs = Math.min(1200, Math.max(600, (seg.endPct - seg.startPct) * 1200));
    const nextTimer = setTimeout(() => {
      if (seg.levelUp) {
        setFlashLevel(seg.level + 1);
        setTimeout(() => setFlashLevel(null), 600);
      }

      if (activeIdx < segments.length - 1) {
        setTimeout(() => setActiveIdx(activeIdx + 1), seg.levelUp ? 500 : 200);
      } else {
        setTimeout(() => {
          setShowContent(true);
          setTimeout(() => setShowStats(true), 300);
        }, 400);
      }
    }, durationMs + 150);

    return () => {
      clearTimeout(fillTimer);
      clearTimeout(nextTimer);
    };
  }, [activeIdx, segments]);

  const currentSeg = segments[activeIdx];
  const displayLevel = currentSeg?.level ?? (Math.floor(Math.sqrt(endXp / 100)) + 1);

  const winRate = stats && stats.handsPlayed > 0 ? Math.round((stats.handsWon / stats.handsPlayed) * 100) : 0;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center max-h-[100dvh] overflow-hidden transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={{
        background: 'radial-gradient(ellipse at center, hsl(0 0% 8% / 0.97), hsl(0 0% 3% / 0.99))',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="w-full max-w-sm px-5 py-4 flex flex-col items-center">
        {/* XP Earned Header */}
        <div className="text-center mb-4 animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.3em] mb-0.5" style={{ color: 'hsl(43 74% 49% / 0.6)' }}>Match Complete</p>
          <p className="text-3xl font-black" style={{ color: 'hsl(43 74% 49%)', textShadow: '0 0 20px hsl(43 74% 49% / 0.4)' }}>
            +{xpGained} XP
          </p>
        </div>

        {/* Level Progress Area */}
        <div className="w-full space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn('w-8 h-8 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300',
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
              <span className="text-xs font-bold text-white/80">Level {flashLevel ?? displayLevel}</span>
            </div>
            <span className="text-[10px] text-white/40">Lv {displayLevel + 1}</span>
          </div>

          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 15%)' }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${barPct}%`,
                background: 'linear-gradient(90deg, hsl(43 74% 40%), hsl(43 74% 55%))',
                boxShadow: '0 0 12px hsl(43 74% 49% / 0.5)',
                transition: 'width 1s ease-out',
              }}
            />
            {flashLevel && (
              <div className="absolute inset-0 animate-pulse" style={{ background: 'hsl(43 74% 80% / 0.3)' }} />
            )}
          </div>

          {segments.length > 1 && (
            <div className="space-y-1">
              {segments.filter(s => s.levelUp).map((s, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-2 text-[10px] transition-opacity duration-500',
                  i <= activeIdx - 1 ? 'opacity-100' : 'opacity-30',
                )}>
                  <span style={{ color: 'hsl(43 74% 49%)' }}>★</span>
                  <span className="text-white/70">Level {s.level} → Level {s.level + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Section */}
        {stats && showStats && (
          <div className="w-full animate-fade-in space-y-3">
            {/* Win rate ring + key stat */}
            <div className="flex items-center gap-3 justify-center mb-1">
              <WinRateRing played={stats.handsPlayed} won={stats.handsWon} />
              <div className="text-left">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Win Rate</p>
                <p className="text-lg font-black text-white">{winRate}%</p>
                <p className="text-[9px] text-white/30">{stats.handsWon} / {stats.handsPlayed} hands</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <StatCard icon={<Target className="h-3.5 w-3.5" />} label="Hands Played" value={String(stats.handsPlayed)} color="hsl(210 80% 55%)" />
              <StatCard icon={<Trophy className="h-3.5 w-3.5" />} label="Hands Won" value={String(stats.handsWon)} color="hsl(142 70% 45%)" />
              <StatCard icon={<Crown className="h-3.5 w-3.5" />} label="Best Hand" value={stats.bestHandName || '—'} color="hsl(43 74% 49%)" />
              <StatCard icon={<Flame className="h-3.5 w-3.5" />} label="Biggest Pot" value={stats.biggestPot > 0 ? stats.biggestPot.toLocaleString() : '—'} color="hsl(0 70% 50%)" />
              <StatCard icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={formatDuration(stats.duration)} color="hsl(280 60% 55%)" colSpan />
            </div>
          </div>
        )}

        {/* Buttons */}
        {showContent && (
          <div className="mt-5 flex gap-3 animate-fade-in w-full">
            {onPlayAgain ? (
              <>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 py-2.5 font-bold text-sm"
                  style={{
                    background: 'hsl(0 0% 12%)',
                    borderColor: 'hsl(0 0% 25%)',
                    color: 'hsl(0 0% 60%)',
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={onPlayAgain}
                  className="flex-1 py-2.5 font-bold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, hsl(43 74% 40%), hsl(43 74% 55%))',
                    color: 'hsl(0 0% 5%)',
                    boxShadow: '0 4px 20px hsl(43 74% 49% / 0.3)',
                  }}
                >
                  <Zap className="h-4 w-4 mr-1" /> Play Again
                </Button>
              </>
            ) : (
              <Button
                onClick={handleClose}
                className="flex-1 py-2.5 font-bold text-base"
                style={{
                  background: 'linear-gradient(135deg, hsl(43 74% 40%), hsl(43 74% 55%))',
                  color: 'hsl(0 0% 5%)',
                  boxShadow: '0 4px 20px hsl(43 74% 49% / 0.3)',
                }}
              >
                Continue
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, colSpan }: {
  icon: React.ReactNode; label: string; value: string; color: string; colSpan?: boolean;
}) {
  return (
    <div
      className={cn('rounded-xl p-2 flex items-center gap-2', colSpan && 'col-span-2')}
      style={{
        background: 'hsl(0 0% 10%)',
        border: '1px solid hsl(0 0% 18%)',
      }}
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-white/40 uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xs font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}
