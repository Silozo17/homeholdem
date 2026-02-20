import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Lock, BookOpen, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PokerTablePro } from '@/components/poker/PokerTablePro';
import { CoachOverlay } from '@/components/poker/CoachOverlay';
import { LessonCompleteOverlay } from '@/components/poker/LessonCompleteOverlay';
import { TutorialTipNotification } from '@/components/poker/TutorialTipNotification';
import { useTutorialGame } from '@/hooks/useTutorialGame';
import { getTutorialLessons, TUTORIAL_LESSON_COUNT } from '@/lib/poker/tutorial-lessons';
import { cn } from '@/lib/utils';
import { useTutorialComplete } from '@/hooks/useTutorialComplete';
import { toast } from '@/hooks/use-toast';

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

export default function LearnPoker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [raiseSliderOpen, setRaiseSliderOpen] = useState(false);
  const [activeLessonIdx, setActiveLessonIdx] = useState<number>(0);
  const [completedLessons, setCompletedLessons] = useState<number[]>(getProgress);
  const [showComplete, setShowComplete] = useState(false);
  const { isComplete: tutorialAlreadyComplete, markComplete } = useTutorialComplete();

  const lessons = useMemo(() => getTutorialLessons(t), [t]);
  const activeLesson = lessons[activeLessonIdx] || null;
  const {
    state, startLesson, playerAction, nextHand, quitGame,
    isHumanTurn, humanPlayer, amountToCall, canCheck, maxBet,
    isPaused, currentStep, currentIntroStep, dismissCoach, allowedAction,
    stepIndex, totalSteps, stepPhase,
  } = useTutorialGame(activeLesson);

  const guardedAction = useCallback((action: import('@/lib/poker/types').GameAction) => {
    if (allowedAction) {
      const actionMatches = action.type === allowedAction || (allowedAction === 'raise' && action.type === 'all-in');
      if (!actionMatches) return;
    }
    playerAction(action);
  }, [allowedAction, playerAction]);

  useEffect(() => {
    if (isPlaying && !showComplete && stepPhase === 'done') {
      const timer = setTimeout(() => {
        setShowComplete(true);
        if (!completedLessons.includes(activeLessonIdx)) {
          const next = [...completedLessons, activeLessonIdx];
          setCompletedLessons(next);
          saveProgress(next);
          if (next.length === TUTORIAL_LESSON_COUNT && !tutorialAlreadyComplete) {
            markComplete(true);
            toast({
              title: t('tutorial.complete_toast_title', '🎉 Tutorial Complete!'),
              description: t('tutorial.complete_toast_desc', 'You earned 1600 XP and reached Level 5! All game modes are now unlocked.'),
            });
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [stepPhase, isPlaying, showComplete, activeLessonIdx, completedLessons, t]);

  useEffect(() => {
    if (isPlaying && !showComplete && stepPhase === 'done' && (state.phase === 'hand_complete' || state.phase === 'game_over')) {
      // Already handled above
    }
  }, [state.phase, isPlaying, showComplete, stepPhase]);

  const startLessonHandler = useCallback((idx: number) => {
    setActiveLessonIdx(idx);
    setShowComplete(false);
    const lesson = lessons[idx];
    if (lesson) {
      startLesson(lesson);
      setIsPlaying(true);
    }
  }, [startLesson, lessons]);

  const handleNextLesson = useCallback(() => {
    if (activeLessonIdx >= TUTORIAL_LESSON_COUNT - 1) {
      quitGame();
      setIsPlaying(false);
      setShowComplete(false);
    } else {
      startLessonHandler(activeLessonIdx + 1);
    }
  }, [activeLessonIdx, startLessonHandler, quitGame]);

  const handleBackToLessons = useCallback(() => {
    quitGame();
    setIsPlaying(false);
    setShowComplete(false);
  }, [quitGame]);

  const handleQuit = useCallback(() => {
    quitGame();
    setIsPlaying(false);
    setShowComplete(false);
  }, [quitGame]);

  const resetProgress = useCallback(() => {
    setCompletedLessons([]);
    saveProgress([]);
  }, []);

  const progressPercent = (completedLessons.length / TUTORIAL_LESSON_COUNT) * 100;

  if (isPlaying) {
    const isLastLesson = activeLessonIdx >= TUTORIAL_LESSON_COUNT - 1;
    const isLesson10 = activeLessonIdx === 9;
    const showCoach = isPaused && !currentIntroStep && currentStep;
    const showIntro = isPaused && currentIntroStep;

    // Lesson 10: coach_message steps use lightweight notification instead of full overlay
    const useNotification = isLesson10 && showCoach && !currentStep?.requiredAction;

    return (
      <>
        <div className="fixed inset-0 z-10 bg-background">
          <PokerTablePro
            state={state}
            isHumanTurn={isHumanTurn}
            amountToCall={amountToCall}
            canCheck={canCheck}
            maxBet={maxBet}
            onAction={guardedAction}
            onNextHand={nextHand}
            onQuit={handleQuit}
            tutorialAllowedAction={allowedAction}
            forceShowControls={
              (!!currentStep?.highlight && currentStep.highlight === 'actions') ||
              (!!currentIntroStep?.highlight && currentIntroStep.highlight === 'actions')
            }
            onRaiseSliderToggle={setRaiseSliderOpen}
          />
        </div>
        {showIntro && <CoachOverlay introStep={currentIntroStep} onDismiss={dismissCoach} raiseSliderOpen={raiseSliderOpen} />}
        {useNotification && (
          <TutorialTipNotification message={currentStep!.message} onDismiss={dismissCoach} />
        )}
        {showCoach && !useNotification && <CoachOverlay step={currentStep} onDismiss={dismissCoach} requiredAction={currentStep?.requiredAction} currentStepNum={stepIndex + 1} totalSteps={totalSteps} raiseSliderOpen={raiseSliderOpen} />}
        {showComplete && activeLesson && (
          <LessonCompleteOverlay
            lesson={activeLesson}
            isLastLesson={isLastLesson}
            onNextLesson={handleNextLesson}
            onBackToLessons={handleBackToLessons}
            customMessage={isLesson10 ? (
              humanPlayer && humanPlayer.chips > activeLesson.startingChips
                ? t('tutorial.result_good', "🏆 That was good! You're ready for the real thing.")
                : t('tutorial.result_ok', "👍 You've got the basics down! With practice, you'll get better.")
            ) : undefined}
          />
        )}
      </>
    );
  }

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
      <div className="shrink-0" style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }} />

      <div className="flex-1 overflow-auto px-4 py-6 space-y-5 pb-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground">{t('learn_poker.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('learn_poker.subtitle')}</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedLessons.length}/{TUTORIAL_LESSON_COUNT} {t('learn_poker.lessons')}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="space-y-2">
          {lessons.map((lesson, idx) => {
            const isCompleted = completedLessons.includes(idx);
            const isUnlocked = idx <= nextUnlocked || isCompleted;

            return (
              <button
                key={lesson.id}
                onClick={() => isUnlocked && startLessonHandler(idx)}
                disabled={!isUnlocked}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all',
                  isUnlocked ? 'glass-card active:scale-[0.98]' : 'bg-muted/30 opacity-50 cursor-not-allowed',
                  idx === nextUnlocked && !isCompleted && 'ring-1 ring-primary/50'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                  isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isUnlocked ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'
                )}>
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : !isUnlocked ? <Lock className="h-4 w-4" /> : <span>{idx + 1}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{lesson.subtitle}</p>
                </div>

                {isUnlocked && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            );
          })}
        </div>

        {completedLessons.length > 0 && (
          <Button variant="ghost" size="sm" onClick={resetProgress} className="w-full text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> {t('learn_poker.reset_progress')}
          </Button>
        )}
      </div>
    </div>
  );
}
