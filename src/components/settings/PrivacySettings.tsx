import { Shield, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';

export function PrivacySettings() {
  const { t } = useTranslation();
  const { preferences, loading, updatePreference } = useUserPreferences();

  const handleToggle = async (value: boolean) => {
    const success = await updatePreference('show_stats_publicly', value);
    if (success) {
      toast.success(t('common.success'));
    } else {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings.privacy')}</CardTitle>
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
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('settings.privacy')}</CardTitle>
        </div>
        <CardDescription>
          {t('settings.privacy_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5 flex-1 pr-4">
            <Label htmlFor="show_stats" className="text-sm font-medium cursor-pointer">
              {t('settings.show_stats')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('settings.show_stats_description')}
            </p>
          </div>
          <Switch
            id="show_stats"
            checked={preferences.show_stats_publicly}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
