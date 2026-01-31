import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TournamentMiniBar } from '@/components/game/TournamentMiniBar';
import { useActiveGame } from '@/contexts/ActiveGameContext';

interface AppLayoutProps {
  children: ReactNode;
}

// Routes where bottom nav should be hidden
const hiddenNavRoutes = ['/', '/auth'];
// Routes where nav is conditionally hidden (e.g., TV display mode)
const conditionalNavRoutes = ['/game'];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { activeGame } = useActiveGame();

  const shouldShowNav = !hiddenNavRoutes.some(
    (route) => location.pathname === route
  );

  // Check if we're in game mode TV display (via query param or state)
  const isGameTVMode = location.pathname.includes('/game') && 
    new URLSearchParams(location.search).get('tv') === 'true';

  const showBottomNav = shouldShowNav && !isGameTVMode;

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
      <div className={showBottomNav ? 'pb-20' : ''}>
        {children}
      </div>
      {showMiniBar && <TournamentMiniBar />}
      {showBottomNav && <BottomNav />}
    </div>
  );
}
