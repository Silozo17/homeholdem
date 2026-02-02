import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Check, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RsvpButtonsProps {
  currentStatus: 'going' | 'maybe' | 'not_going' | null;
  onRsvp: (status: 'going' | 'maybe' | 'not_going') => void;
  disabled?: boolean;
}

export function RsvpButtons({ currentStatus, onRsvp, disabled = false }: RsvpButtonsProps) {
  const { t } = useTranslation();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNewStatus, setPendingNewStatus] = useState<'going' | 'maybe' | 'not_going' | null>(null);

  const handleClick = async (status: 'going' | 'maybe' | 'not_going') => {
    // If user already has an RSVP and is clicking a DIFFERENT status, show confirmation
    if (currentStatus && currentStatus !== status) {
      setPendingNewStatus(status);
      setShowConfirmDialog(true);
      return;
    }
    
    // First RSVP or clicking same status - proceed immediately
    setPendingStatus(status);
    await onRsvp(status);
    setPendingStatus(null);
  };

  const confirmStatusChange = async () => {
    if (pendingNewStatus) {
      setPendingStatus(pendingNewStatus);
      setShowConfirmDialog(false);
      await onRsvp(pendingNewStatus);
      setPendingStatus(null);
      setPendingNewStatus(null);
    }
  };

  const cancelStatusChange = () => {
    setShowConfirmDialog(false);
    setPendingNewStatus(null);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={currentStatus === 'going' ? 'default' : 'outline'}
          className={cn(
            "flex-col h-auto py-3 gap-1 transition-all active:scale-95",
            currentStatus === 'going' && "glow-gold",
            pendingStatus === 'going' && "opacity-70"
          )}
          onClick={() => handleClick('going')}
          disabled={disabled || pendingStatus !== null}
        >
          <Check className="h-5 w-5" />
          <span className="text-xs">{t('event.going')}</span>
        </Button>
        
        <Button
          variant={currentStatus === 'maybe' ? 'secondary' : 'outline'}
          className={cn(
            "flex-col h-auto py-3 gap-1 transition-all active:scale-95",
            pendingStatus === 'maybe' && "opacity-70"
          )}
          onClick={() => handleClick('maybe')}
          disabled={disabled || pendingStatus !== null}
        >
          <HelpCircle className="h-5 w-5" />
          <span className="text-xs">{t('event.maybe')}</span>
        </Button>
        
        <Button
          variant={currentStatus === 'not_going' ? 'destructive' : 'outline'}
          className={cn(
            "flex-col h-auto py-3 gap-1 transition-all active:scale-95",
            pendingStatus === 'not_going' && "opacity-70"
          )}
          onClick={() => handleClick('not_going')}
          disabled={disabled || pendingStatus !== null}
        >
          <X className="h-5 w-5" />
          <span className="text-xs">{t('event.cant_go')}</span>
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('event.confirm_change_rsvp')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('event.change_rsvp_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelStatusChange}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
