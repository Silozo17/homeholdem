import { useState, useEffect, useCallback, useRef } from 'react';

interface WakeLockState {
  isSupported: boolean;
  isActive: boolean;
}

export function useWakeLock() {
  const [state, setState] = useState<WakeLockState>({
    isSupported: false,
    isActive: false,
  });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const shouldBeActive = useRef(false);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSupported: 'wakeLock' in navigator,
    }));
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return false;
    shouldBeActive.current = true;

    try {
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setState(prev => ({ ...prev, isActive: true }));

      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        setState(prev => ({ ...prev, isActive: false }));
      });

      return true;
    } catch (err) {
      console.error('Wake Lock request failed:', err);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    shouldBeActive.current = false;
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setState(prev => ({ ...prev, isActive: false }));
      } catch (err) {
        console.error('Wake Lock release failed:', err);
      }
    }
  }, []);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && shouldBeActive.current) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock]);

  // Periodic re-acquire safety net (every 30s)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (shouldBeActive.current && !wakeLockRef.current) {
        try {
          await requestWakeLock();
        } catch {}
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [requestWakeLock]);

  return {
    ...state,
    requestWakeLock,
    releaseWakeLock,
  };
}
