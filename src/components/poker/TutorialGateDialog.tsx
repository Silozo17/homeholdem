import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useTutorialComplete } from '@/hooks/useTutorialComplete';

interface TutorialGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after skip completes so the caller can proceed with navigation */
  onSkipped?: () => void;
}

export function TutorialGateDialog({ open, onOpenChange, onSkipped }: TutorialGateDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { skipTutorial } = useTutorialComplete();

  const handleSkip = async () => {
    await skipTutorial();
    onOpenChange(false);
    onSkipped?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-2">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle>{t('tutorial_gate.title')}</DialogTitle>
          <DialogDescription>{t('tutorial_gate.message')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button className="w-full gap-2" onClick={() => { onOpenChange(false); navigate('/learn-poker'); }}>
            <BookOpen className="h-4 w-4" />
            {t('tutorial_gate.go_to_tutorial')}
          </Button>
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={handleSkip}>
            <SkipForward className="h-4 w-4" />
            {t('tutorial_gate.skip_tutorial')}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            {t('tutorial_gate.skip_description')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
