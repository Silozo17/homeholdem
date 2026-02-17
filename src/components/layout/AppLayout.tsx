import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TournamentMiniBar } from '@/components/game/TournamentMiniBar';
import { useActiveGame } from '@/contexts/ActiveGameContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

// Routes where bottom nav should be hidden
const hiddenNavRoutes = ['/', '/auth'];
// Routes where nav should always be hidden (active gameplay)
const gameplayRoutes = ['/event/'];
const conditionalNavRoutes = ['/game'];
// Routes where bottom nav is hidden for fullscreen gameplay
const fullscreenRoutes: string[] = [];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { activeGame } = useActiveGame();

  const shouldShowNav = !hiddenNavRoutes.some(
    (route) => location.pathname === route
  );

  // Check if we're in game mode TV display (via query param or state)
  const isGameTVMode = location.pathname.includes('/game') && 
    new URLSearchParams(location.search).get('tv') === 'true';

  const isFullscreenGameplay = fullscreenRoutes.some(
    (route) => location.pathname.startsWith(route)
  );

  const showBottomNav = shouldShowNav && !isGameTVMode && !isFullscreenGameplay;

  // Show mini bar when:
  // 1. There's an active game
  // 2. Game is not completed
  // 3. User is NOT on the game page
  const isOnGamePage = location.pathname.includes('/game');
  const showMiniBar = activeGame && 
    activeGame.status !== 'completed' && 
    !isOnGamePage && 
    showBottomNav;

  return (
    <div className="min-h-screen safe-area-top">
      {/* Mini bar at top when there's an active game */}
      {showMiniBar && <TournamentMiniBar />}
      
      {/* Main content with padding for mini bar and bottom nav */}
      <div
        className={cn(
          showMiniBar ? 'pt-16' : ''
        )}
        style={showBottomNav ? { paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' } : undefined}
      >
        {children}
      </div>
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}
