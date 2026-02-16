import { useState, useEffect, useRef } from 'react';

/** Detect landscape vs portrait orientation reactively. */
export function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  useEffect(() => {
    const handler = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  return isLandscape;
}

/** Lock screen to landscape while mounted (requests fullscreen first for Android). */
export function useLockLandscape() {
  const lockedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function lock() {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
        const so = screen.orientation;
        if (so?.lock) {
          await so.lock('landscape');
          if (!cancelled) lockedRef.current = true;
        }
      } catch {
        // Not all devices support orientation lock
      }
    }
    lock();
    return () => {
      cancelled = true;
      if (lockedRef.current) {
        try { screen.orientation?.unlock(); } catch {}
      }
      if (document.fullscreenElement) {
        try { document.exitFullscreen(); } catch {}
      }
    };
  }, []);
}
