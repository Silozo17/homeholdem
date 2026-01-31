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

  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSupported: 'wakeLock' in navigator,
    }));
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return false;

    try {
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setState(prev => ({ ...prev, isActive: true }));

      lock.addEventListener('release', () => {
        setState(prev => ({ ...prev, isActive: false }));
      });

      return true;
    } catch (err) {
      console.error('Wake Lock request failed:', err);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
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
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock]);

  return {
    ...state,
    requestWakeLock,
    releaseWakeLock,
  };
}
