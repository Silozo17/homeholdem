import { useEffect, useRef } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Auto-prompts users for push notification permission when they open the PWA.
 * - Only prompts logged-in users
 * - Only prompts once per session
 * - Respects denied permissions (won't prompt again)
 * - Automatically subscribes if permission is granted
 */
export function PushNotificationPrompt() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, loading, subscribeQuietly } = usePushNotifications();
  const hasPrompted = useRef(false);

  useEffect(() => {
    // Don't prompt if:
    // - Still loading
    // - Not supported
    // - Already subscribed
    // - Permission already denied (user can't change this programmatically)
    // - Already prompted this session
    // - No user logged in
    if (loading || !isSupported || isSubscribed || permission === 'denied' || hasPrompted.current || !user) {
      return;
    }

    // Check if we've already prompted this session
    const sessionPrompted = sessionStorage.getItem('push-notification-prompted');
    if (sessionPrompted) return;

    // Small delay to let the app stabilize after login
    const timer = setTimeout(async () => {
      hasPrompted.current = true;
      sessionStorage.setItem('push-notification-prompted', 'true');
      
      // This will trigger the browser's native permission dialog
      await subscribeQuietly();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isSupported, isSubscribed, permission, loading, subscribeQuietly]);

  // This component renders nothing - it just triggers the prompt
  return null;
}
