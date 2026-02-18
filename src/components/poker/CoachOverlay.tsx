import { TutorialStep } from '@/lib/poker/tutorial-lessons';
import { IntroStep } from '@/lib/poker/tutorial-lessons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import dealerImg from '@/assets/dealer/dealer-main.png';
import { useState } from 'react';

interface CoachOverlayProps {
  step?: TutorialStep | null;
  introStep?: IntroStep | null;
  onDismiss: () => void;
  requiredAction?: string;
}

const HIGHLIGHT_POSITIONS: Record<string, React.CSSProperties> = {
  actions: {
    right: 'calc(env(safe-area-inset-right, 0px) + 6px)',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
    width: '140px', height: '160px', borderRadius: '16px',
  },
  exit: {
    top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
    left: 'calc(env(safe-area-inset-left, 0px) + 8px)',
    width: '32px', height: '32px', borderRadius: '50%',
  },
  audio: {
    top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
    right: 'calc(env(safe-area-inset-right, 0px) + 8px)',
    width: '32px', height: '32px', borderRadius: '50%',
  },
  community: {
    top: '42%', left: '25%', right: '25%',
    height: '70px', borderRadius: '12px',
  },
  pot: {
    top: '25%', left: '38%', right: '38%',
    height: '30px', borderRadius: '8px',
  },
  cards: {
    bottom: '8%', left: '38%', right: '38%',
    height: '70px', borderRadius: '12px',
  },
  timer: {
    top: 'calc(env(safe-area-inset-top, 0px) + 6px)',
    left: 'calc(env(safe-area-inset-left, 0px) + 50px)',
    width: '120px', height: '24px', borderRadius: '8px',
  },
  table: {
    top: '12%', left: '10%', right: '22%',
    bottom: '10%', borderRadius: '50%',
  },
};

export function CoachOverlay({ step, introStep, onDismiss, requiredAction }: CoachOverlayProps) {
  const message = introStep?.message || step?.message || '';
  const fallbackPosition = introStep?.position || 'bottom';
  const arrowDirection = introStep?.arrowDirection || 'none';
  const highlight = introStep?.highlight;
  const isIntro = !!introStep;
  const [imgFailed, setImgFailed] = useState(false);

  const highlightStyle = highlight ? HIGHLIGHT_POSITIONS[highlight] : null;

  // Dynamic positioning: move dialog near the highlighted element
  const dialogPosition = (() => {
    if (!highlight) return fallbackPosition || 'center';
    switch (highlight) {
      case 'exit': case 'audio': case 'timer': return 'bottom';
      case 'actions': return 'center-left';
      case 'cards': return 'top';
      default: return 'bottom';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dim overlay — NO blur so table stays visible */}
      <div className="fixed inset-0 bg-black/25 pointer-events-auto" onClick={onDismiss} />

      {/* Highlight ring */}
      {highlightStyle && (
        <div
          className="fixed z-[51] pointer-events-none animate-pulse"
          style={{
            ...highlightStyle,
            boxShadow: '0 0 0 3px hsl(var(--primary) / 0.6), 0 0 20px 4px hsl(var(--primary) / 0.25)',
            border: '2px solid hsl(var(--primary) / 0.5)',
          }}
        />
      )}

      {/* Speech bubble */}
      <div
        className={cn(
          'fixed z-[52] flex px-4 pointer-events-none',
          dialogPosition === 'top' && 'top-0 left-0 right-0 pt-20',
          dialogPosition === 'center' && 'inset-0 items-center justify-center',
          dialogPosition === 'bottom' && 'bottom-0 left-0 right-0 pb-28',
          dialogPosition === 'center-left' && 'top-0 bottom-0 left-0 items-center',
        )}
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: dialogPosition === 'center-left' ? undefined : 'max(1rem, env(safe-area-inset-right, 0px))',
          maxWidth: dialogPosition === 'center-left' ? '55vw' : undefined,
        }}
      >
        <div className="w-full max-w-sm mx-auto pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
          {/* Up arrow */}
          {arrowDirection === 'up' && (
            <div className="flex justify-center mb-1">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-primary/40" />
            </div>
          )}

          <div className="bg-card/95 border border-primary/30 rounded-2xl p-3.5 shadow-xl shadow-primary/10 max-h-[45vh] overflow-y-auto backdrop-blur-sm">
            <div className="flex items-start gap-3">
              {/* Coach avatar */}
              <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden coach-bounce">
                {!imgFailed ? (
                  <img
                    src={dealerImg}
                    alt="Coach"
                    className="w-9 h-9 object-cover rounded-full"
                    draggable={false}
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <span className="text-primary text-lg font-bold">🎓</span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{message}</p>
                
                {!isIntro && step?.requiredAction ? (
                  <p className="text-xs text-primary font-medium">
                    👆 Tap below, then use the <span className="uppercase font-bold">{step.requiredAction}</span> button
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
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-primary/40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
