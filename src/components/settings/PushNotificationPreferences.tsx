import { Loader2 } from 'lucide-react';
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
  const { preferences, loading, updatePreference } = useUserPreferences();

  const handleToggle = async (key: keyof typeof preferences & string, value: boolean) => {
    const success = await updatePreference(key as any, value);
    if (success) {
      toast.success(value ? 'Notification enabled' : 'Notification disabled');
    } else {
      toast.error('Failed to update preference');
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
        Notification Types
      </p>
      <SettingRow
        id="push_rsvp_updates"
        label="RSVP updates"
        description="When players RSVP to your events"
        checked={preferences.push_rsvp_updates}
        onCheckedChange={(v) => handleToggle('push_rsvp_updates', v)}
      />
      <SettingRow
        id="push_date_finalized"
        label="Date confirmed"
        description="When event dates are finalized"
        checked={preferences.push_date_finalized}
        onCheckedChange={(v) => handleToggle('push_date_finalized', v)}
      />
      <SettingRow
        id="push_waitlist_promotion"
        label="Waitlist promotions"
        description="When you get a spot at an event"
        checked={preferences.push_waitlist_promotion}
        onCheckedChange={(v) => handleToggle('push_waitlist_promotion', v)}
      />
      <SettingRow
        id="push_chat_messages"
        label="Chat messages"
        description="New messages in club and event chats"
        checked={preferences.push_chat_messages}
        onCheckedChange={(v) => handleToggle('push_chat_messages', v)}
      />
      <SettingRow
        id="push_blinds_up"
        label="Blinds up"
        description="During tournaments when blinds increase"
        checked={preferences.push_blinds_up}
        onCheckedChange={(v) => handleToggle('push_blinds_up', v)}
      />
    </div>
  );
}
