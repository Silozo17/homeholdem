import { useState, useCallback, useRef } from 'react';
import { Achievement, AchievementContext, checkAchievements } from '@/lib/poker/achievements';

const STORAGE_KEY = 'poker-achievements';
const PROGRESS_KEY = 'poker-achievement-progress';

interface StoredData {
  unlocked: string[];
}

interface UseAchievementsReturn {
  unlocked: string[];
  newAchievement: Achievement | null;
  clearNew: () => void;
  checkAndAward: (ctx: AchievementContext) => Achievement[];
}

function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: StoredData = JSON.parse(raw);
      return new Set(data.unlocked);
    }
  } catch {}
  return new Set();
}

function saveUnlocked(unlocked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked: Array.from(unlocked) }));
  } catch {}
}

function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveProgress(progress: Record<string, number>) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {}
}

export function useAchievements(): UseAchievementsReturn {
  const [unlocked, setUnlocked] = useState<string[]>(() => Array.from(loadUnlocked()));
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const progressRef = useRef(loadProgress());
  const queueRef = useRef<Achievement[]>([]);

  const clearNew = useCallback(() => {
    setNewAchievement(null);
    // Show next in queue if any
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setTimeout(() => setNewAchievement(next), 300);
    }
  }, []);

  const checkAndAward = useCallback((ctx: AchievementContext): Achievement[] => {
    const currentUnlocked = loadUnlocked();
    const { newlyUnlocked, updatedProgress } = checkAchievements(ctx, currentUnlocked, progressRef.current);

    if (newlyUnlocked.length > 0) {
      for (const ach of newlyUnlocked) {
        currentUnlocked.add(ach.id);
      }
      saveUnlocked(currentUnlocked);
      setUnlocked(Array.from(currentUnlocked));

      // Queue achievements for display
      const [first, ...rest] = newlyUnlocked;
      queueRef.current.push(...rest);
      setNewAchievement(first);
    }

    progressRef.current = updatedProgress;
    saveProgress(updatedProgress);

    return newlyUnlocked;
  }, []);

  return { unlocked, newAchievement, clearNew, checkAndAward };
}
