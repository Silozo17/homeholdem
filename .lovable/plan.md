
## Plan: TV Display Mode Enhancement - Mobile Landscape, Wake Lock & Live Updates Widget

### Overview
This plan addresses three key improvements for the TV display feature:
1. **Mobile Landscape Mode**: Force landscape orientation when entering TV mode on mobile, with responsive design
2. **Screen Wake Lock**: Prevent phone from locking while in TV mode
3. **Live Updates Widget**: Uber-style persistent floating notification showing timer and blinds when not in TV mode

---

### Part 1: Mobile Landscape Orientation for TV Mode

#### Problem
Currently, when opening TV mode on a phone, the view displays in portrait mode and looks cramped. The timer and blinds are designed for landscape/TV screens.

#### Solution
When entering TV mode:
1. Request fullscreen (already implemented)
2. Lock screen orientation to landscape using the Screen Orientation API
3. Add responsive CSS for mobile landscape view
4. On exit, unlock orientation

**Update `src/components/game/TVDisplay.tsx`:**

```typescript
// Add orientation lock on mount
useEffect(() => {
  const lockOrientation = async () => {
    try {
      // First enter fullscreen (required for orientation lock on most browsers)
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      
      // Then lock to landscape
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (err) {
      console.log('Orientation lock not supported:', err);
    }
  };
  
  lockOrientation();

  return () => {
    // Unlock orientation on exit
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };
}, []);
```

**Add mobile-responsive styling to TV display modes:**

The classic timer mode needs responsive font sizes:
```css
/* Mobile landscape adjustments */
.tv-timer {
  font-size: clamp(4rem, 15vw, 12rem);
}
.tv-blinds {
  font-size: clamp(2rem, 8vw, 6rem);
}
```

---

### Part 2: Screen Wake Lock - Prevent Phone from Locking

#### Solution
Use the Screen Wake Lock API to prevent the device from sleeping while in TV mode.

**Create new hook `src/hooks/useWakeLock.ts`:**

```typescript
import { useState, useEffect, useCallback } from 'react';

interface WakeLockState {
  isSupported: boolean;
  isActive: boolean;
}

export function useWakeLock() {
  const [state, setState] = useState<WakeLockState>({
    isSupported: false,
    isActive: false,
  });
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

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
      setWakeLock(lock);
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
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setState(prev => ({ ...prev, isActive: false }));
    }
  }, [wakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wakeLock, requestWakeLock]);

  return {
    ...state,
    requestWakeLock,
    releaseWakeLock,
  };
}
```

**Integrate into TVDisplay.tsx:**

```typescript
import { useWakeLock } from '@/hooks/useWakeLock';

// Inside component:
const { requestWakeLock, releaseWakeLock, isActive: wakeLockActive } = useWakeLock();

useEffect(() => {
  requestWakeLock();
  return () => {
    releaseWakeLock();
  };
}, [requestWakeLock, releaseWakeLock]);
```

**Add visual indicator** (optional):
Show a small icon in the TV display header indicating wake lock is active.

---

### Part 3: Live Updates Widget (Uber-style Persistent Notification)

#### Solution
Create a floating "mini player" widget that appears when the user navigates away from Game Mode. This uses the **Document Picture-in-Picture API** (Chrome 116+) with a fallback to a **persistent in-app mini widget**.

#### 3a. Document Picture-in-Picture Widget (Modern Browsers)

**New Component: `src/components/game/LiveTournamentWidget.tsx`**

This component creates a floating window with:
- Current blind level timer countdown
- Small/Big blind values
- Players remaining
- Tap to return to full game mode

```typescript
import { useEffect, useState, useRef } from 'react';

interface LiveTournamentWidgetProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  playersRemaining: number;
  currencySymbol: string;
  onReturnToGame: () => void;
}

export function LiveTournamentWidget({ ... }) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const openPipWindow = async () => {
    if (!('documentPictureInPicture' in window)) {
      return false;
    }

    try {
      // Close existing PiP window if any
      if ((window as any).documentPictureInPicture.window) {
        (window as any).documentPictureInPicture.window.close();
      }

      const pip = await (window as any).documentPictureInPicture.requestWindow({
        width: 320,
        height: 180,
      });

      // Copy styles to PiP window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules]
            .map((rule) => rule.cssText)
            .join('');
          const style = pip.document.createElement('style');
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch (e) {
          // External stylesheets may fail
        }
      });

      // Move widget content to PiP
      if (containerRef.current) {
        pip.document.body.appendChild(containerRef.current);
      }

      setPipWindow(pip);
      return true;
    } catch (err) {
      console.error('PiP failed:', err);
      return false;
    }
  };

  // Render widget content
  return (
    <div ref={containerRef} className="pip-widget bg-slate-900 p-4 rounded-lg">
      <div className="text-3xl font-mono font-bold text-white">
        {formatTime(timeRemaining)}
      </div>
      <div className="text-sm text-amber-400">
        {currentLevel.small_blind}/{currentLevel.big_blind}
      </div>
      <div className="text-xs text-white/60">
        {playersRemaining} players
      </div>
      <button onClick={onReturnToGame}>Return to Game</button>
    </div>
  );
}
```

#### 3b. Fallback: Persistent In-App Mini Widget

For browsers without Document PiP support, show a fixed mini-bar at the bottom of the screen (above bottom nav):

**New Component: `src/components/game/TournamentMiniBar.tsx`**

```typescript
// Displays when:
// 1. There's an active game session
// 2. User navigates away from GameMode page
// 3. Game status is 'active' or 'paused'

export function TournamentMiniBar({ 
  session, 
  blindStructure, 
  eventId,
  onNavigate 
}) {
  // Shows:
  // [▶ 15:42] [100/200] [8 players] [Tap to view]
  
  return (
    <div className="fixed bottom-20 left-2 right-2 z-40 bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-full px-4 py-2 shadow-2xl shadow-emerald-500/20">
      <button onClick={() => onNavigate(`/game/${eventId}`)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              session.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            )} />
            <span className="font-mono text-lg text-white font-bold">
              {formatTime(timeRemaining)}
            </span>
            <span className="text-amber-400 text-sm font-medium">
              {currentLevel.small_blind}/{currentLevel.big_blind}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </div>
      </button>
    </div>
  );
}
```

#### 3c. Active Game Session Context

Create a context to track active game sessions globally:

**New File: `src/contexts/ActiveGameContext.tsx`**

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ActiveGame {
  sessionId: string;
  eventId: string;
  status: string;
  currentLevel: number;
  timeRemainingSeconds: number;
  blindStructure: BlindLevel[];
}

interface ActiveGameContextType {
  activeGame: ActiveGame | null;
  setActiveGame: (game: ActiveGame | null) => void;
}

const ActiveGameContext = createContext<ActiveGameContextType>({
  activeGame: null,
  setActiveGame: () => {},
});

export function ActiveGameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);

  // Subscribe to realtime updates for active game
  useEffect(() => {
    if (!activeGame) return;

    const channel = supabase
      .channel(`game-${activeGame.sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${activeGame.sessionId}`,
      }, (payload) => {
        setActiveGame(prev => prev ? {
          ...prev,
          status: payload.new.status,
          currentLevel: payload.new.current_level,
          timeRemainingSeconds: payload.new.time_remaining_seconds,
        } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGame?.sessionId]);

  return (
    <ActiveGameContext.Provider value={{ activeGame, setActiveGame }}>
      {children}
    </ActiveGameContext.Provider>
  );
}

export const useActiveGame = () => useContext(ActiveGameContext);
```

#### 3d. Integrate Mini Bar into App Layout

**Update `src/components/layout/AppLayout.tsx`:**

```typescript
import { TournamentMiniBar } from '@/components/game/TournamentMiniBar';
import { useActiveGame } from '@/contexts/ActiveGameContext';

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { activeGame } = useActiveGame();
  
  // Don't show mini bar on game mode page itself
  const showMiniBar = activeGame && 
    activeGame.status !== 'completed' &&
    !location.pathname.includes('/game');

  return (
    <div className="min-h-screen safe-area-top">
      <div className={showBottomNav ? 'pb-20' : ''}>
        {children}
      </div>
      {showMiniBar && (
        <TournamentMiniBar 
          session={activeGame}
          eventId={activeGame.eventId}
        />
      )}
      {showBottomNav && <BottomNav />}
    </div>
  );
}
```

---

### Part 4: Responsive TV Display for Mobile

Update the classic timer mode with responsive styling:

**Update `src/components/game/tv/ClassicTimerMode.tsx`:**

```typescript
// Replace fixed font sizes with responsive classes

// Timer: text-[12rem] → use clamp for mobile
<div className={cn(
  "font-mono font-black tracking-tight leading-none drop-shadow-2xl",
  "text-[clamp(4rem,20vw,12rem)]", // Scales based on viewport
  getTimerColor()
)}>
  {formatTime(timeRemaining)}
</div>

// Blinds: text-6xl → responsive
<div className="text-[clamp(1.5rem,6vw,3.75rem)] font-bold text-blue-400">
  {formatBlind(currentLevel.small_blind)}
</div>

// Stats bar - stack on mobile landscape
<div className="flex flex-wrap items-center justify-between pl-4 pr-4 py-2 
  md:pl-16 md:pr-16 md:py-3 gap-2">
  ...
</div>
```

---

### Part 5: TypeScript Type Declaration for Wake Lock API

**Update `src/vite-env.d.ts`:**

```typescript
/// <reference types="vite/client" />

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: 'screen';
  release(): Promise<void>;
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface Navigator {
  wakeLock: WakeLock;
}

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}
```

---

### Part 6: Translation Updates

**English (`src/i18n/locales/en.json`):**
```json
{
  "game": {
    "wake_lock_active": "Screen will stay on",
    "wake_lock_failed": "Could not prevent screen lock",
    "live_tournament": "Live Tournament",
    "return_to_game": "Return to Game",
    "tap_to_view": "Tap to view",
    "landscape_required": "Rotate to landscape for best view"
  }
}
```

**Polish (`src/i18n/locales/pl.json`):**
```json
{
  "game": {
    "wake_lock_active": "Ekran pozostanie włączony",
    "wake_lock_failed": "Nie można zapobiec blokowaniu ekranu",
    "live_tournament": "Turniej na żywo",
    "return_to_game": "Wróć do gry",
    "tap_to_view": "Dotknij, aby zobaczyć",
    "landscape_required": "Obróć do pozycji poziomej dla lepszego widoku"
  }
}
```

---

### Summary of Changes

| Category | File | Change |
|----------|------|--------|
| **Orientation** | `TVDisplay.tsx` | Add landscape lock on mount, unlock on exit |
| **Wake Lock** | `useWakeLock.ts` (new) | Hook for Screen Wake Lock API |
| **Wake Lock** | `TVDisplay.tsx` | Integrate wake lock |
| **Live Widget** | `ActiveGameContext.tsx` (new) | Context for tracking active game globally |
| **Live Widget** | `TournamentMiniBar.tsx` (new) | Floating mini bar component |
| **Live Widget** | `AppLayout.tsx` | Show mini bar when game is active |
| **Responsive** | `ClassicTimerMode.tsx` | Responsive font sizes for mobile |
| **Responsive** | All TV modes | Mobile landscape optimizations |
| **Types** | `vite-env.d.ts` | Wake Lock + PiP type declarations |
| **i18n** | `en.json`, `pl.json` | New translation keys |

---

### Browser Support

| Feature | Chrome | Safari | Firefox |
|---------|--------|--------|---------|
| Screen Orientation Lock | Yes (fullscreen) | Yes (fullscreen) | Yes (fullscreen) |
| Wake Lock API | Yes (84+) | Yes (16.4+) | No |
| Document PiP | Yes (116+) | No | No |
| Fallback Mini Bar | All | All | All |

---

### User Experience Flow

```text
User taps TV button on phone
        │
        ▼
  Enter fullscreen + lock to landscape
        │
        ▼
  Request wake lock (phone won't sleep)
        │
        ├── User watches on phone in landscape
        │
        ├── User connects to TV via Chromecast/AirPlay
        │   └── Large view displays on TV
        │
        └── User exits TV mode
                │
                ▼
          Unlock orientation + release wake lock
                │
                ▼
          Mini bar appears at bottom showing live timer
                │
                ├── Tap mini bar → Return to game
                │
                └── Game completes → Mini bar disappears
```
