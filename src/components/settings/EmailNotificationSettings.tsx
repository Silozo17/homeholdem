import { Mail, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';

interface SettingRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SettingRow({ id, label, description, checked, onCheckedChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="space-y-0.5 flex-1 pr-4">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function EmailNotificationSettings() {
  const { t } = useTranslation();
  const { preferences, loading, updatePreference } = useUserPreferences();

  const handleToggle = async (key: keyof typeof preferences & string, value: boolean) => {
    const success = await updatePreference(key as any, value);
    if (success) {
      toast.success(value ? t('common.success') : t('common.success'));
    } else {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings.email_notifications')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('settings.email_notifications')}</CardTitle>
        </div>
        <CardDescription>
          {t('settings.email_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <SettingRow
          id="email_event_created"
          label={t('settings.new_events')}
          description={t('settings.new_events_description')}
          checked={preferences.email_event_created}
          onCheckedChange={(v) => handleToggle('email_event_created', v)}
        />
        <SettingRow
          id="email_event_reminder"
          label={t('settings.event_reminders')}
          description={t('settings.reminders_description')}
          checked={preferences.email_event_reminder}
          onCheckedChange={(v) => handleToggle('email_event_reminder', v)}
        />
        <SettingRow
          id="email_rsvp_confirmation"
          label={t('settings.rsvp_confirmations')}
          description={t('settings.rsvp_confirm_description')}
          checked={preferences.email_rsvp_confirmation}
          onCheckedChange={(v) => handleToggle('email_rsvp_confirmation', v)}
        />
        <SettingRow
          id="email_waitlist_promotion"
          label={t('settings.waitlist_promotions')}
          description={t('settings.waitlist_description')}
          checked={preferences.email_waitlist_promotion}
          onCheckedChange={(v) => handleToggle('email_waitlist_promotion', v)}
        />
        <SettingRow
          id="email_game_results"
          label={t('settings.game_results')}
          description={t('settings.results_description')}
          checked={preferences.email_game_results}
          onCheckedChange={(v) => handleToggle('email_game_results', v)}
        />
        <SettingRow
          id="email_club_invites"
          label={t('settings.club_invites')}
          description={t('settings.invites_description')}
          checked={preferences.email_club_invites}
          onCheckedChange={(v) => handleToggle('email_club_invites', v)}
        />
      </CardContent>
    </Card>
  );
}
