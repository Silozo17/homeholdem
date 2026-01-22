import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function NotificationSettings() {
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
        toast.success('Push notifications disabled');
      } else {
        toast.error('Failed to disable notifications');
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifications enabled!');
      } else if (permission === 'denied') {
        toast.error('Please enable notifications in your browser settings');
      } else {
        toast.error('Failed to enable notifications');
      }
    }
  };

  if (!isSupported) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Push Notifications</CardTitle>
          </div>
          <CardDescription>
            Push notifications are not supported in this browser.
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
            <CardTitle className="text-lg">Push Notifications</CardTitle>
          </div>
          <Badge variant={isSubscribed ? 'default' : 'secondary'}>
            {isSubscribed ? (
              <><Check className="h-3 w-3 mr-1" /> Enabled</>
            ) : (
              <><X className="h-3 w-3 mr-1" /> Disabled</>
            )}
          </Badge>
        </div>
        <CardDescription>
          Get instant alerts for RSVPs, chat messages, and game updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isSubscribed ? 'Notifications are active' : 'Enable notifications'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed 
                ? "You'll receive alerts even when the app is closed" 
                : 'Stay updated on poker night activity'}
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
                <BellOff className="h-4 w-4 mr-1" /> Disable
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-1" /> Enable
              </>
            )}
          </Button>
        </div>

        {permission === 'denied' && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        )}

        {error && !loading && (
          <p className="text-xs text-muted-foreground text-center">{error}</p>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">You'll be notified when:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Someone RSVPs to your event</li>
            <li>A date poll is finalized</li>
            <li>You're promoted from the waitlist</li>
            <li>New chat messages arrive</li>
            <li>Tournament blinds increase</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
