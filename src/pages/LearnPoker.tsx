import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock, BookOpen, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PokerTable } from '@/components/poker/PokerTable';
import { CoachOverlay } from '@/components/poker/CoachOverlay';
import { useTutorialGame } from '@/hooks/useTutorialGame';
import { TUTORIAL_LESSONS, TutorialLesson } from '@/lib/poker/tutorial-lessons';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'poker-tutorial-progress';

function getProgress(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProgress(completed: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
}

type View = 'select' | 'intro' | 'playing' | 'summary';

export default function LearnPoker() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('select');
  const [activeLessonIdx, setActiveLessonIdx] = useState<number>(0);
  const [completedLessons, setCompletedLessons] = useState<number[]>(getProgress);

  const activeLesson = TUTORIAL_LESSONS[activeLessonIdx] || null;
  const {
    state, startLesson, playerAction, nextHand, quitGame,
    isHumanTurn, humanPlayer, amountToCall, canCheck, maxBet,
    isPaused, currentStep, dismissCoach,
  } = useTutorialGame(activeLesson);

  // When hand completes in tutorial, show summary
  useEffect(() => {
    if (view === 'playing' && (state.phase === 'hand_complete' || state.phase === 'game_over')) {
      const timer = setTimeout(() => {
        setView('summary');
        // Mark lesson complete
        if (!completedLessons.includes(activeLessonIdx)) {
          const next = [...completedLessons, activeLessonIdx];
          setCompletedLessons(next);
          saveProgress(next);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, view, activeLessonIdx, completedLessons]);

  const startLessonHandler = useCallback((idx: number) => {
    setActiveLessonIdx(idx);
    setView('intro');
  }, []);

  const beginPlaying = useCallback(() => {
    if (activeLesson) {
      startLesson(activeLesson);
      setView('playing');
    }
  }, [activeLesson, startLesson]);

  const goToNextLesson = useCallback(() => {
    if (activeLessonIdx < TUTORIAL_LESSONS.length - 1) {
      startLessonHandler(activeLessonIdx + 1);
    } else {
      setView('select');
    }
  }, [activeLessonIdx, startLessonHandler]);

  const resetProgress = useCallback(() => {
    setCompletedLessons([]);
    saveProgress([]);
  }, []);

  const progressPercent = (completedLessons.length / TUTORIAL_LESSONS.length) * 100;

  // --- LESSON SELECT ---
  if (view === 'select') {
    const nextUnlocked = completedLessons.length;

    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden z-10 bg-background">
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
          <div className="container relative flex items-center justify-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="absolute left-4 text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
            <NotificationBell className="absolute right-4" />
          </div>
        </header>
        <div className="h-14 safe-area-top shrink-0" />

        <div className="flex-1 overflow-auto px-4 py-6 space-y-5" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Learn Poker</h1>
            <p className="text-sm text-muted-foreground">Master Texas Hold'em step by step</p>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedLessons.length}/{TUTORIAL_LESSONS.length} Lessons</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Lesson List */}
          <div className="space-y-2">
            {TUTORIAL_LESSONS.map((lesson, idx) => {
              const isCompleted = completedLessons.includes(idx);
              const isUnlocked = idx <= nextUnlocked || isCompleted;

              return (
                <button
                  key={lesson.id}
                  onClick={() => isUnlocked && startLessonHandler(idx)}
                  disabled={!isUnlocked}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all',
                    isUnlocked
                      ? 'glass-card active:scale-[0.98]'
                      : 'bg-muted/30 opacity-50 cursor-not-allowed',
                    idx === nextUnlocked && !isCompleted && 'ring-1 ring-primary/50'
                  )}
                >
                  {/* Status icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                    isCompleted ? 'bg-emerald-500/20 text-emerald-400' :
                    isUnlocked ? 'bg-primary/20 text-primary' :
                    'bg-muted/50 text-muted-foreground'
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> :
                     !isUnlocked ? <Lock className="h-4 w-4" /> :
                     <span>{idx + 1}</span>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{lesson.subtitle}</p>
                  </div>

                  {isUnlocked && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Reset button */}
          {completedLessons.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetProgress} className="w-full text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Progress
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- LESSON INTRO ---
  if (view === 'intro' && activeLesson) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-10 bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-wider">Lesson {activeLessonIdx + 1}</p>
            <h1 className="text-2xl font-black text-foreground mt-1">{activeLesson.title}</h1>
            <p className="text-sm text-muted-foreground mt-2">{activeLesson.description}</p>
          </div>
          <Button className="w-full" onClick={beginPlaying}>
            Start Lesson →
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView('select')}>
            ← Back to Lessons
          </Button>
        </div>
      </div>
    );
  }

  // --- PLAYING ---
  if (view === 'playing') {
    return (
      <div className="fixed inset-0 z-10 bg-background">
        <PokerTable
          state={state}
          isHumanTurn={isHumanTurn}
          amountToCall={amountToCall}
          canCheck={canCheck}
          maxBet={maxBet}
          onAction={playerAction}
          onNextHand={nextHand}
          onQuit={() => { quitGame(); setView('select'); }}
        />
        {isPaused && currentStep && (
          <CoachOverlay
            step={currentStep}
            onDismiss={dismissCoach}
            requiredAction={currentStep.requiredAction}
          />
        )}
      </div>
    );
  }

  // --- SUMMARY ---
  if (view === 'summary' && activeLesson) {
    const isLastLesson = activeLessonIdx >= TUTORIAL_LESSONS.length - 1;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-10 bg-background px-6">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-black text-foreground">Lesson Complete!</h1>
            <p className="text-sm text-muted-foreground">{activeLesson.title}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Key Takeaways</p>
            {activeLesson.summary.map((point, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-card/50">
                <span className="text-primary font-bold text-xs mt-0.5">•</span>
                <p className="text-sm text-foreground/90 leading-snug">{point}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={goToNextLesson}>
              {isLastLesson ? '🎓 Back to Lessons' : 'Next Lesson →'}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setView('select')}>
              Back to Lesson List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
