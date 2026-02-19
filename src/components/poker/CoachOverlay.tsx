import { IntroStep } from '@/lib/poker/tutorial-lessons';
import { PlayerAction } from '@/lib/poker/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import dealerImg from '@/assets/dealer/dealer-main.png';
import { useState } from 'react';

/** Generic coach step info (not tied to ScriptedStep type) */
export interface CoachStepInfo {
  message: string;
  highlightElement?: string;
  requiredAction?: PlayerAction;
  highlight?: string;
}

interface CoachOverlayProps {
  step?: CoachStepInfo | null;
  introStep?: IntroStep | null;
  onDismiss: () => void;
  requiredAction?: string;
  /** Current step number (1-based) */
  currentStepNum?: number;
  /** Total steps in this lesson */
  totalSteps?: number;
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

/** Map highlight target → pointer hand emoji + offset style */
const POINTER_HANDS: Record<string, { emoji: string; style: React.CSSProperties }> = {
  actions: {
    emoji: '👇',
    style: { right: 'calc(env(safe-area-inset-right, 0px) + 80px)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 170px)' },
  },
  cards: {
    emoji: '👇',
    style: { left: '50%', bottom: 'calc(8% + 75px)', transform: 'translateX(-50%)' },
  },
  community: {
    emoji: '👆',
    style: { left: '50%', top: 'calc(42% - 28px)', transform: 'translateX(-50%)' },
  },
  pot: {
    emoji: '👆',
    style: { left: '50%', top: 'calc(25% - 28px)', transform: 'translateX(-50%)' },
  },
  exit: {
    emoji: '👈',
    style: { top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 'calc(env(safe-area-inset-left, 0px) + 44px)' },
  },
  audio: {
    emoji: '👉',
    style: { top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: 'calc(env(safe-area-inset-right, 0px) + 44px)' },
  },
  timer: {
    emoji: '👆',
    style: { top: 'calc(env(safe-area-inset-top, 0px) + 32px)', left: 'calc(env(safe-area-inset-left, 0px) + 90px)' },
  },
};

export function CoachOverlay({ step, introStep, onDismiss, requiredAction, currentStepNum, totalSteps }: CoachOverlayProps) {
  const message = introStep?.message || step?.message || '';
  const fallbackPosition = introStep?.position || 'bottom';
  const arrowDirection = introStep?.arrowDirection || 'none';
  const highlight = introStep?.highlight || step?.highlightElement || step?.highlight;
  const isIntro = !!introStep;
  const isRequireAction = !!step?.requiredAction;
  const [imgFailed, setImgFailed] = useState(false);

  // Only show highlight ring during intro steps (table tour), not during gameplay
  const showHighlightRing = isIntro && !!highlight;
  const highlightStyle = showHighlightRing ? HIGHLIGHT_POSITIONS[highlight!] : null;

  // Always show pointer hands when a highlight target is set
  const pointerHand = highlight ? POINTER_HANDS[highlight] : null;

  const dialogPosition = (() => {
    if (!highlight) return fallbackPosition || 'center';
    switch (highlight) {
      case 'exit': case 'audio': case 'timer': return 'bottom';
      case 'actions': return 'center-left';
      case 'cards': return 'top';
      default: return 'bottom';
    }
  })();

  // Button text depends on step type
  const buttonText = isIntro
    ? 'Continue →'
    : isRequireAction
      ? `Tap ${step!.requiredAction!.charAt(0).toUpperCase() + step!.requiredAction!.slice(1)} below 👇`
      : 'Got it →';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dim overlay */}
      <div
        className={cn("fixed inset-0 bg-black/25", isRequireAction ? "pointer-events-none" : "pointer-events-auto")}
        onClick={isRequireAction ? undefined : onDismiss}
      />

      {/* Highlight ring — only during intro tour */}
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

      {/* Floating pointer hand near highlighted element */}
      {pointerHand && (
        <div
          className="fixed z-[51] pointer-events-none text-2xl animate-bounce"
          style={pointerHand.style}
        >
          {pointerHand.emoji}
        </div>
      )}

      {/* Coach bubble area */}
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

          {/* Coach avatar + speech bubble — separated */}
          <div className="flex items-start gap-2.5">
            {/* Standalone coach avatar circle */}
            <div className="shrink-0 w-12 h-12 rounded-full bg-card/95 border-2 border-primary/30 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/10 coach-bounce">
              {!imgFailed ? (
                <img
                  src={dealerImg}
                  alt="Coach"
                  className="w-10 h-10 object-cover rounded-full"
                  draggable={false}
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span className="text-primary text-lg font-bold">🎓</span>
              )}
            </div>

            {/* Speech bubble */}
            <div className="flex-1 min-w-0">
              <div className="bg-card/95 border border-primary/30 rounded-2xl p-3 shadow-xl shadow-primary/10 max-h-[45vh] overflow-y-auto backdrop-blur-sm relative">
                {/* Speech bubble tail */}
                <div
                  className="absolute left-[-6px] top-4 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-primary/30"
                />

                {/* Step progress indicator */}
                {!isIntro && currentStepNum != null && totalSteps != null && totalSteps > 0 && (
                  <div className="flex justify-end mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                      Step {currentStepNum}/{totalSteps}
                    </span>
                  </div>
                )}

                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{message}</p>

                {/* For require_action: don't show a button, user must tap the game action */}
                {isRequireAction ? (
                  <p className="text-xs text-primary font-medium animate-pulse mt-2">
                    👆 {buttonText}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    onClick={onDismiss}
                    className="w-full mt-2"
                  >
                    {buttonText}
                  </Button>
                )}
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
