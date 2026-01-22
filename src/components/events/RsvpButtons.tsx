import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RsvpButtonsProps {
  currentStatus: 'going' | 'maybe' | 'not_going' | null;
  onRsvp: (status: 'going' | 'maybe' | 'not_going') => void;
}

export function RsvpButtons({ currentStatus, onRsvp }: RsvpButtonsProps) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleClick = async (status: 'going' | 'maybe' | 'not_going') => {
    setPendingStatus(status);
    await onRsvp(status);
    setPendingStatus(null);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant={currentStatus === 'going' ? 'default' : 'outline'}
        className={cn(
          "flex-col h-auto py-3 gap-1 transition-all active:scale-95",
          currentStatus === 'going' && "glow-gold",
          pendingStatus === 'going' && "opacity-70"
        )}
        onClick={() => handleClick('going')}
        disabled={pendingStatus !== null}
      >
        <Check className="h-5 w-5" />
        <span className="text-xs">Going</span>
      </Button>
      
      <Button
        variant={currentStatus === 'maybe' ? 'secondary' : 'outline'}
        className={cn(
          "flex-col h-auto py-3 gap-1 transition-all active:scale-95",
          pendingStatus === 'maybe' && "opacity-70"
        )}
        onClick={() => handleClick('maybe')}
        disabled={pendingStatus !== null}
      >
        <HelpCircle className="h-5 w-5" />
        <span className="text-xs">Maybe</span>
      </Button>
      
      <Button
        variant={currentStatus === 'not_going' ? 'destructive' : 'outline'}
        className={cn(
          "flex-col h-auto py-3 gap-1 transition-all active:scale-95",
          pendingStatus === 'not_going' && "opacity-70"
        )}
        onClick={() => handleClick('not_going')}
        disabled={pendingStatus !== null}
      >
        <X className="h-5 w-5" />
        <span className="text-xs">Can't Go</span>
      </Button>
    </div>
  );
}
