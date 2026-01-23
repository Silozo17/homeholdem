import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// VAPID public key - this should be generated and stored properly
// For demo purposes, using a placeholder. In production, generate with web-push library.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

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

// Detect iOS and Safari
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = typeof navigator !== 'undefined' && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
const isIOSNonSafari = isIOS && !isSafari;

export function usePushNotifications() {
  const { user } = useAuth();
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
    if (!user || !VAPID_PUBLIC_KEY) {
      setState(prev => ({ ...prev, error: 'Push notifications not configured' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, permission, loading: false, error: 'Permission denied' }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
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

      // Convert to base64
      const p256dhBase64 = btoa(String.fromCharCode(...new Uint8Array(p256dh)));
      const authBase64 = btoa(String.fromCharCode(...new Uint8Array(auth)));

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

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
