import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Megaphone, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sendBroadcastPush } from '@/lib/push-notifications';
import { sendBroadcastInApp } from '@/lib/in-app-notifications';

interface BroadcastMessageDialogProps {
  clubId: string;
  clubName: string;
  members: Array<{ user_id: string; role: string }>;
  currentUserId: string;
}

const MAX_TITLE_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 280;

export function BroadcastMessageDialog({
  clubId,
  clubName,
  members,
  currentUserId,
}: BroadcastMessageDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const recipientIds = members
    .filter((m) => m.user_id !== currentUserId)
    .map((m) => m.user_id);

  const recipientCount = recipientIds.length;
  const canSend = title.trim().length > 0 && message.trim().length > 0 && recipientCount > 0;

  const handleSendClick = () => {
    if (!canSend) return;
    setConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    setSending(true);
    try {
      await Promise.all([
        sendBroadcastPush(recipientIds, title.trim(), message.trim(), clubId),
        sendBroadcastInApp(recipientIds, title.trim(), message.trim(), clubId),
      ]);
      toast.success(t('club.broadcast_sent'));
      setTitle('');
      setMessage('');
      setConfirmOpen(false);
      setOpen(false);
    } catch (error) {
      console.error('Broadcast failed:', error);
      toast.error(t('club.broadcast_error'));
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            {t('club.broadcast')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {t('club.broadcast')}
            </DialogTitle>
            <DialogDescription>
              {t('club.broadcast_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="broadcast-title">{t('club.broadcast_title')}</Label>
                <span className="text-xs text-muted-foreground">
                  {title.length}/{MAX_TITLE_LENGTH}
                </span>
              </div>
              <Input
                id="broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                placeholder={t('club.broadcast_title_placeholder')}
                maxLength={MAX_TITLE_LENGTH}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="broadcast-message">{t('club.broadcast_message')}</Label>
                <span className="text-xs text-muted-foreground">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </span>
              </div>
              <Textarea
                id="broadcast-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                placeholder={t('club.broadcast_message_placeholder')}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="sm:flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSendClick}
              disabled={!canSend || sending}
              className="sm:flex-1"
            >
              {t('club.broadcast_send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('club.broadcast_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('club.broadcast_confirm_description', { count: recipientCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.sending')}
                </>
              ) : (
                t('common.confirm')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
