import { Mail, Loader2 } from 'lucide-react';
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
  const { preferences, loading, updatePreference } = useUserPreferences();

  const handleToggle = async (key: keyof typeof preferences & string, value: boolean) => {
    const success = await updatePreference(key as any, value);
    if (success) {
      toast.success(value ? 'Email notification enabled' : 'Email notification disabled');
    } else {
      toast.error('Failed to update preference');
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Email Notifications</CardTitle>
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
          <CardTitle className="text-lg">Email Notifications</CardTitle>
        </div>
        <CardDescription>
          Choose which emails you'd like to receive.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <SettingRow
          id="email_event_created"
          label="New events"
          description="When a new poker night is scheduled in your clubs"
          checked={preferences.email_event_created}
          onCheckedChange={(v) => handleToggle('email_event_created', v)}
        />
        <SettingRow
          id="email_event_reminder"
          label="Event reminders"
          description="24 hour reminder before events you're attending"
          checked={preferences.email_event_reminder}
          onCheckedChange={(v) => handleToggle('email_event_reminder', v)}
        />
        <SettingRow
          id="email_rsvp_confirmation"
          label="RSVP confirmations"
          description="Confirmation when you RSVP to an event"
          checked={preferences.email_rsvp_confirmation}
          onCheckedChange={(v) => handleToggle('email_rsvp_confirmation', v)}
        />
        <SettingRow
          id="email_waitlist_promotion"
          label="Waitlist promotions"
          description="When you get off the waitlist for an event"
          checked={preferences.email_waitlist_promotion}
          onCheckedChange={(v) => handleToggle('email_waitlist_promotion', v)}
        />
        <SettingRow
          id="email_game_results"
          label="Game results"
          description="Summary of game results after each poker night"
          checked={preferences.email_game_results}
          onCheckedChange={(v) => handleToggle('email_game_results', v)}
        />
        <SettingRow
          id="email_club_invites"
          label="Club invitations"
          description="When you're invited to join a new club"
          checked={preferences.email_club_invites}
          onCheckedChange={(v) => handleToggle('email_club_invites', v)}
        />
      </CardContent>
    </Card>
  );
}
