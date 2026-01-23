import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmail } from '@/lib/email';
import { welcomeToClubTemplate } from '@/lib/email-templates';
import { buildAppUrl } from '@/lib/app-url';

interface JoinClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function JoinClubDialog({ open, onOpenChange, onSuccess }: JoinClubDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const joinClubSchema = z.object({
    inviteCode: z.string().length(6, t('validation.invite_code_length')).toUpperCase(),
  });

  type JoinClubFormData = z.infer<typeof joinClubSchema>;

  const form = useForm<JoinClubFormData>({
    resolver: zodResolver(joinClubSchema),
    defaultValues: { inviteCode: '' },
  });

  const onSubmit = async (data: JoinClubFormData) => {
    if (!user) return;
    
    setIsLoading(true);
    
    // Use secure RPC function to lookup club by invite code
    const { data: clubData, error: clubError } = await supabase
      .rpc('lookup_club_by_invite_code', { _invite_code: data.inviteCode })
      .single();

    if (clubError || !clubData) {
      setIsLoading(false);
      toast.error(t('club.invalid_code'));
      return;
    }

    const club = clubData as { id: string; name: string };

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('club_members')
      .select('id')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      setIsLoading(false);
      toast.error(t('club.already_member_error'));
      return;
    }

    // Join the club
    const { error: joinError } = await supabase
      .from('club_members')
      .insert({
        club_id: club.id,
        user_id: user.id,
        role: 'member',
      });

    setIsLoading(false);

    if (joinError) {
      toast.error(t('club.join_failed') + ': ' + joinError.message);
      return;
    }

    // Send welcome email (fire and forget)
    sendWelcomeEmail(club.id, club.name, data.inviteCode.toUpperCase());

    toast.success(t('club.welcome', { name: club.name }));
    form.reset();
    onOpenChange(false);
    onSuccess();
  };

  const sendWelcomeEmail = async (clubId: string, clubName: string, inviteCode: string) => {
    if (!user) return;

    try {
      // Get user's email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!profile?.email) return;

      // Get member count
      const { count } = await supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId);

      const clubUrl = buildAppUrl(`/club/${clubId}`);

      const html = welcomeToClubTemplate({
        clubName,
        inviteCode,
        memberCount: count || 1,
        clubUrl,
      });

      await sendEmail({
        to: profile.email,
        subject: `🎉 Welcome to ${clubName}!`,
        html,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-gold-gradient">{t('club.join')}</DialogTitle>
          <DialogDescription>
            {t('club.join_description')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('club.invite_code')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABC123"
                      className="bg-input/50 border-border/50 text-center text-2xl tracking-[0.5em] uppercase font-mono"
                      maxLength={6}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                className="flex-1 glow-gold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.joining')}</>
                ) : (
                  t('club.join')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
