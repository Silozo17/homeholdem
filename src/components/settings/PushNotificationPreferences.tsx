import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    <div className="flex items-center justify-between py-2.5">
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

interface PushNotificationPreferencesProps {
  isEnabled: boolean;
}

export function PushNotificationPreferences({ isEnabled }: PushNotificationPreferencesProps) {
  const { t } = useTranslation();
  const { preferences, loading, updatePreference } = useUserPreferences();

  const handleToggle = async (key: keyof typeof preferences & string, value: boolean) => {
    const success = await updatePreference(key as any, value);
    if (success) {
      toast.success(t('common.success'));
    } else {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!preferences || !isEnabled) {
    return null;
  }

  return (
    <div className="space-y-1 pt-2 border-t border-border/30">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">
        {t('settings.notification_types')}
      </p>
      <SettingRow
        id="push_rsvp_updates"
        label={t('settings.rsvp_updates')}
        description={t('settings.rsvp_description')}
        checked={preferences.push_rsvp_updates}
        onCheckedChange={(v) => handleToggle('push_rsvp_updates', v)}
      />
      <SettingRow
        id="push_date_finalized"
        label={t('settings.date_confirmed')}
        description={t('settings.date_description')}
        checked={preferences.push_date_finalized}
        onCheckedChange={(v) => handleToggle('push_date_finalized', v)}
      />
      <SettingRow
        id="push_waitlist_promotion"
        label={t('settings.waitlist_promotions')}
        description={t('settings.waitlist_description')}
        checked={preferences.push_waitlist_promotion}
        onCheckedChange={(v) => handleToggle('push_waitlist_promotion', v)}
      />
      <SettingRow
        id="push_chat_messages"
        label={t('settings.chat_messages')}
        description={t('settings.chat_description')}
        checked={preferences.push_chat_messages}
        onCheckedChange={(v) => handleToggle('push_chat_messages', v)}
      />
      <SettingRow
        id="push_blinds_up"
        label={t('settings.blinds_up')}
        description={t('settings.blinds_description')}
        checked={preferences.push_blinds_up}
        onCheckedChange={(v) => handleToggle('push_blinds_up', v)}
      />
      <SettingRow
        id="push_game_started"
        label={t('settings.game_started')}
        description={t('settings.game_started_description')}
        checked={preferences.push_game_started ?? true}
        onCheckedChange={(v) => handleToggle('push_game_started', v)}
      />
      <SettingRow
        id="push_player_eliminated"
        label={t('settings.player_eliminated')}
        description={t('settings.player_eliminated_description')}
        checked={preferences.push_player_eliminated ?? true}
        onCheckedChange={(v) => handleToggle('push_player_eliminated', v)}
      />
      <SettingRow
        id="push_rebuy_addon"
        label={t('settings.rebuy_addon')}
        description={t('settings.rebuy_addon_description')}
        checked={preferences.push_rebuy_addon ?? true}
        onCheckedChange={(v) => handleToggle('push_rebuy_addon', v)}
      />
    </div>
  );
}
