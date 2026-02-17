import { useEffect } from 'react';
import { Achievement } from '@/lib/poker/achievements';
import { cn } from '@/lib/utils';
import {
  Swords, Flame, Zap, Crown, Shield, TrendingUp, RotateCcw,
  Sparkles, Star, Grid2x2, Home, Coins, Dumbbell, MessageCircle,
  Trophy, ShieldCheck, Sword, Medal, Droplets, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Swords, Flame, Zap, Crown, Shield, TrendingUp, RotateCcw,
  Sparkles, Stars: Star, Grid2x2, Home, Coins, Dumbbell, MessageCircle,
  Trophy, ShieldCheck, Sword, Medal, Droplets, ArrowRight,
};

const RARITY_STYLES: Record<string, { border: string; glow: string; bg: string; label: string }> = {
  common: {
    border: 'hsl(0 0% 70%)',
    glow: '0 0 12px hsl(0 0% 70% / 0.3)',
    bg: 'linear-gradient(135deg, hsl(0 0% 15%), hsl(0 0% 10%))',
    label: 'Common',
  },
  rare: {
    border: 'hsl(210 80% 55%)',
    glow: '0 0 16px hsl(210 80% 55% / 0.5)',
    bg: 'linear-gradient(135deg, hsl(210 30% 15%), hsl(210 20% 10%))',
    label: 'Rare',
  },
  epic: {
    border: 'hsl(270 60% 55%)',
    glow: '0 0 20px hsl(270 60% 55% / 0.5)',
    bg: 'linear-gradient(135deg, hsl(270 25% 15%), hsl(270 15% 10%))',
    label: 'Epic',
  },
  legendary: {
    border: 'hsl(43 74% 49%)',
    glow: '0 0 24px hsl(43 74% 49% / 0.6), 0 0 48px hsl(43 74% 49% / 0.2)',
    bg: 'linear-gradient(135deg, hsl(43 30% 15%), hsl(43 20% 10%))',
    label: 'Legendary',
  },
};

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
}

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  const rarity = RARITY_STYLES[achievement.rarity] ?? RARITY_STYLES.common;
  const IconComp = ICON_MAP[achievement.icon] ?? Trophy;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 animate-fade-in pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 52px)',
        zIndex: 200,
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl min-w-[220px] max-w-[300px]"
        style={{
          background: rarity.bg,
          border: `1.5px solid ${rarity.border}`,
          boxShadow: rarity.glow,
        }}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: `${rarity.border}22`,
            border: `1px solid ${rarity.border}55`,
          }}
        >
          <IconComp className="h-4.5 w-4.5" style={{ color: rarity.border }} />
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: rarity.border }}>
            {rarity.label} Achievement
          </span>
          <span className="text-xs font-bold text-foreground truncate">{achievement.title}</span>
          <span className="text-[10px] text-foreground/60 truncate">{achievement.description}</span>
        </div>

        {/* Legendary shimmer */}
        {achievement.rarity === 'legendary' && (
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, hsl(43 74% 49% / 0.4) 50%, transparent 100%)',
                animation: 'shimmer-sweep 2s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
