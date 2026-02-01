import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  loading: boolean;
  error: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper to convert ArrayBuffer to base64url (not standard base64)
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert to base64, then to base64url
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Detect iOS and Safari
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
const isIOSNonSafari = isIOS && !isSafari;

// Cache for VAPID public key
let vapidPublicKeyCache: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (vapidPublicKeyCache) return vapidPublicKeyCache;
  
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    if (error) {
      console.error('Failed to fetch VAPID public key:', error);
      return null;
    }
    vapidPublicKeyCache = data?.publicKey || null;
    return vapidPublicKeyCache;
  } catch (err) {
    console.error('Error fetching VAPID public key:', err);
    return null;
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const vapidKeyRef = useRef<string | null>(null);
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    // iOS non-Safari browsers don't support Web Push
    if (isIOSNonSafari) {
      setState(prev => ({ 
        ...prev, 
        isSupported: false, 
        loading: false,
        error: 'ios_non_safari'
      }));
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState(prev => ({ ...prev, isSupported: false, loading: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setState(prev => ({
        ...prev,
        isSupported: true,
        isSubscribed: !!subscription,
        permission: Notification.permission,
        loading: false,
      }));
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState(prev => ({ ...prev, loading: false, error: 'Failed to check subscription' }));
    }
  }, []);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => {
          checkSubscription();
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
          setState(prev => ({ ...prev, loading: false, error: 'Service Worker registration failed' }));
        });
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [checkSubscription]);

  const subscribe = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch VAPID public key if not cached
      const vapidKey = vapidKeyRef.current || await getVapidPublicKey();
      if (!vapidKey) {
        setState(prev => ({ ...prev, loading: false, error: 'Push notifications not configured' }));
        return false;
      }
      vapidKeyRef.current = vapidKey;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, permission, loading: false, error: 'Permission denied' }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // Extract keys
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get push subscription keys');
      }

      // Convert to base64url (required by webpush library)
      const p256dhBase64 = arrayBufferToBase64Url(p256dh);
      const authBase64 = arrayBufferToBase64Url(auth);

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: p256dhBase64,
        auth_key: authBase64,
      }, {
        onConflict: 'user_id,endpoint'
      });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        loading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        loading: false,
      }));

      return true;
    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return false;
    }
  }, [user]);

  // Silent subscribe for auto-prompt - doesn't show errors to users
  const subscribeQuietly = useCallback(async () => {
    if (!user || !state.isSupported) {
      return false;
    }

    // Don't even try if already subscribed or permission denied
    if (state.permission === 'denied' || state.isSubscribed) {
      return false;
    }

    try {
      // Request permission - this shows the browser's native prompt
      const permissionResult = await Notification.requestPermission();
      
      if (permissionResult !== 'granted') {
        setState(prev => ({ ...prev, permission: permissionResult }));
        return false;
      }

      // If granted, proceed with subscription
      return await subscribe();
    } catch (error) {
      console.error('Auto push subscription failed:', error);
      return false;
    }
  }, [user, state.isSupported, state.permission, state.isSubscribed, subscribe]);

  return {
    ...state,
    subscribe,
    subscribeQuietly,
    unsubscribe,
  };
}
