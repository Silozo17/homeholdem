import { Button } from '@/components/ui/button';
import { Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RsvpButtonsProps {
  currentStatus: 'going' | 'maybe' | 'not_going' | null;
  onRsvp: (status: 'going' | 'maybe' | 'not_going') => void;
}

export function RsvpButtons({ currentStatus, onRsvp }: RsvpButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant={currentStatus === 'going' ? 'default' : 'outline'}
        className={cn(
          "flex-col h-auto py-3 gap-1",
          currentStatus === 'going' && "glow-gold"
        )}
        onClick={() => onRsvp('going')}
      >
        <Check className="h-5 w-5" />
        <span className="text-xs">Going</span>
      </Button>
      
      <Button
        variant={currentStatus === 'maybe' ? 'secondary' : 'outline'}
        className="flex-col h-auto py-3 gap-1"
        onClick={() => onRsvp('maybe')}
      >
        <HelpCircle className="h-5 w-5" />
        <span className="text-xs">Maybe</span>
      </Button>
      
      <Button
        variant={currentStatus === 'not_going' ? 'destructive' : 'outline'}
        className="flex-col h-auto py-3 gap-1"
        onClick={() => onRsvp('not_going')}
      >
        <X className="h-5 w-5" />
        <span className="text-xs">Can't Go</span>
      </Button>
    </div>
  );
}
