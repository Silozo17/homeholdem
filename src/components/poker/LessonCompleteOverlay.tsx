import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TutorialLesson } from '@/lib/poker/tutorial-lessons';

interface LessonCompleteOverlayProps {
  lesson: TutorialLesson;
  isLastLesson: boolean;
  onNextLesson: () => void;
  onBackToLessons: () => void;
}

export function LessonCompleteOverlay({ lesson, isLastLesson, onNextLesson, onBackToLessons }: LessonCompleteOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm pointer-events-auto animate-in zoom-in-95 duration-300">
        <div className="bg-card/95 border border-primary/30 rounded-2xl p-5 shadow-2xl shadow-primary/10 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-wider">Lesson Complete</p>
              <p className="font-bold text-foreground text-sm">{lesson.title}</p>
            </div>
          </div>

          {/* Takeaways */}
          <div className="space-y-1.5">
            {lesson.summary.map((point, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-background/40">
                <span className="text-primary font-bold text-xs mt-0.5">•</span>
                <p className="text-xs text-foreground/90 leading-snug">{point}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" size="sm" onClick={onNextLesson}>
              {isLastLesson ? '🎓 Back to Lessons' : 'Next Lesson →'}
            </Button>
            {!isLastLesson && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onBackToLessons}>
                Back to Lesson List
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
