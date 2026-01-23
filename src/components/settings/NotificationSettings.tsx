import { Bell, BellOff, Check, X, Loader2, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PushNotificationPreferences } from '@/components/settings/PushNotificationPreferences';
import { toast } from 'sonner';

export function NotificationSettings() {
  const { t } = useTranslation();
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success(t('settings.disable_notifications'));
      } else {
        toast.error(t('common.error'));
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t('settings.notifications_enabled'));
      } else if (permission === 'denied') {
        toast.error(t('settings.notifications_blocked'));
      } else {
        toast.error(t('common.error'));
      }
    }
  };

  // iOS non-Safari specific message
  if (!isSupported && error === 'ios_non_safari') {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings.push_notifications')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">{t('settings.ios_safari_required_title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('settings.ios_safari_required_desc')}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-left space-y-2">
              <p className="text-xs font-medium">{t('settings.ios_safari_steps_title')}:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>{t('settings.ios_safari_step_1')}</li>
                <li>{t('settings.ios_safari_step_2')}</li>
                <li>{t('settings.ios_safari_step_3')}</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t('settings.push_notifications')}</CardTitle>
          </div>
          <CardDescription>
            {t('settings.notifications_not_supported')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('settings.push_notifications')}</CardTitle>
          </div>
          <Badge variant={isSubscribed ? 'default' : 'secondary'}>
            {isSubscribed ? (
              <><Check className="h-3 w-3 mr-1" /> {t('settings.notifications_enabled').split(' ')[0]}</>
            ) : (
              <><X className="h-3 w-3 mr-1" /> {t('settings.notifications_disabled').split(' ')[0]}</>
            )}
          </Badge>
        </div>
        <CardDescription>
          {t('settings.notifications_supported')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isSubscribed ? t('settings.notifications_enabled') : t('settings.enable_notifications')}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed 
                ? t('settings.notifications_supported')
                : t('settings.notifications_supported')}
            </p>
          </div>
          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            size="sm"
            onClick={handleToggle}
            disabled={loading || permission === 'denied'}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              <>
                <BellOff className="h-4 w-4 mr-1" /> {t('settings.disable_notifications').split(' ')[0]}
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-1" /> {t('settings.enable_notifications').split(' ')[0]}
              </>
            )}
          </Button>
        </div>

        {permission === 'denied' && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              {t('settings.notifications_blocked')}
            </p>
          </div>
        )}

        {error && !loading && (
          <p className="text-xs text-muted-foreground text-center">{error}</p>
        )}

        {/* Granular push notification preferences */}
        <PushNotificationPreferences isEnabled={isSubscribed} />

        {!isSubscribed && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">{t('settings.notification_types')}:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>{t('settings.rsvp_description')}</li>
              <li>{t('settings.date_description')}</li>
              <li>{t('settings.waitlist_description')}</li>
              <li>{t('settings.chat_description')}</li>
              <li>{t('settings.blinds_description')}</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
