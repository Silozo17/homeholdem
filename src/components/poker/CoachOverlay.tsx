import { TutorialStep } from '@/lib/poker/tutorial-lessons';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface CoachOverlayProps {
  step: TutorialStep;
  onDismiss: () => void;
  requiredAction?: string;
}

export function CoachOverlay({ step, onDismiss, requiredAction }: CoachOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-36 px-4 pointer-events-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/40 backdrop-blur-[2px] pointer-events-auto" onClick={onDismiss} />

      {/* Speech bubble */}
      <div className="relative z-10 w-full max-w-md pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-xl shadow-primary/10">
          {/* Coach icon */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">{step.message}</p>
              
              {step.requiredAction ? (
                <p className="text-xs text-primary font-medium">
                  👆 Tap &quot;Got it&quot; then use the <span className="uppercase font-bold">{step.requiredAction}</span> button
                </p>
              ) : null}

              <Button
                size="sm"
                onClick={onDismiss}
                className="w-full"
              >
                Got it →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
