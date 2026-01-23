import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { sendEmail } from '@/lib/email';
import { clubInviteTemplate } from '@/lib/email-templates';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildAppUrl } from '@/lib/app-url';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteByEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubName: string;
  inviteCode: string;
}

export function InviteByEmailDialog({
  open,
  onOpenChange,
  clubName,
  inviteCode,
}: InviteByEmailDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    if (!user) return;

    setLoading(true);

    try {
      // Get inviter's name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const inviterName = profile?.display_name || 'A friend';
      const joinUrl = buildAppUrl(`/dashboard?join=${inviteCode}`);

      const html = clubInviteTemplate({
        clubName,
        inviterName,
        inviteCode,
        joinUrl,
      });

      await sendEmail({
        to: data.email,
        subject: `🃏 You're invited to join ${clubName} on Home Hold'em Club!`,
        html,
      });

      toast.success(t('club.invite_sent'));
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t('club.invite_by_email')}
          </DialogTitle>
          <DialogDescription>
            {t('club.join_club_description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="friend@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {t('club.send_invite')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
