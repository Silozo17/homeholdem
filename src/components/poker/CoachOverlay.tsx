import { TutorialStep } from '@/lib/poker/tutorial-lessons';
import { IntroStep } from '@/lib/poker/tutorial-lessons';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachOverlayProps {
  step?: TutorialStep | null;
  introStep?: IntroStep | null;
  onDismiss: () => void;
  requiredAction?: string;
}

export function CoachOverlay({ step, introStep, onDismiss, requiredAction }: CoachOverlayProps) {
  const message = introStep?.message || step?.message || '';
  const position = introStep?.position || 'bottom';
  const arrowDirection = introStep?.arrowDirection || 'none';
  const isIntro = !!introStep;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex px-4 pointer-events-none',
        position === 'top' && 'items-start pt-20',
        position === 'center' && 'items-center justify-center',
        position === 'bottom' && 'items-end justify-center pb-36',
      )}
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/40 backdrop-blur-[2px] pointer-events-auto" onClick={onDismiss} />

      {/* Speech bubble */}
      <div className="relative z-10 w-full max-w-md pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Up arrow */}
        {arrowDirection === 'up' && (
          <div className="flex justify-center mb-1">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-primary/30" />
          </div>
        )}

        <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-xl shadow-primary/10 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">{message}</p>
              
              {!isIntro && step?.requiredAction ? (
                <p className="text-xs text-primary font-medium">
                  👆 Tap &quot;Got it&quot; then use the <span className="uppercase font-bold">{step.requiredAction}</span> button
                </p>
              ) : null}

              <Button
                size="sm"
                onClick={onDismiss}
                className="w-full"
              >
                {isIntro ? 'Continue →' : 'Got it →'}
              </Button>
            </div>
          </div>
        </div>

        {/* Down arrow */}
        {arrowDirection === 'down' && (
          <div className="flex justify-center mt-1">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary/30" />
          </div>
        )}
      </div>
    </div>
  );
}
