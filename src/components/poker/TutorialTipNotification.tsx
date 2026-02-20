import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface TutorialTipNotificationProps {
  message: string;
  onDismiss: () => void;
}

export function TutorialTipNotification({ message, onDismiss }: TutorialTipNotificationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Reset timer whenever message changes
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, 10000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message, onDismiss]);

  return (
    <div
      className="fixed z-50 animate-in slide-in-from-right-full duration-300"
      style={{
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        maxWidth: '280px',
      }}
    >
      <div
        className="relative bg-card/90 border border-primary/20 rounded-2xl p-3 pr-8 backdrop-blur-md"
        style={{
          boxShadow: '0 4px 24px -4px hsl(var(--primary) / 0.2)',
        }}
      >
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
        <p className="text-xs text-foreground leading-relaxed">💡 {message}</p>
      </div>
    </div>
  );
}
