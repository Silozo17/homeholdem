import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Calendar, Plus, Trophy, User, Crown, Gamepad2, BookOpen, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { QuickCreateDialog } from './QuickCreateDialog';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { useSubscription } from '@/hooks/useSubscription';

const POKER_ROUTES = ['/poker', '/play-poker', '/online-poker'];

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { isActive: hasActiveSubscription } = useSubscription();

  const isPokerMode = POKER_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(r + '/'));

  const defaultNav = [
    { icon: Home, label: t('nav.home'), path: '/dashboard' },
    { icon: Calendar, label: t('nav.events'), path: '/events' },
    { icon: Plus, label: t('nav.create'), path: null },
    { icon: Trophy, label: t('nav.stats'), path: '/stats' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
  ];

  const pokerNav = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Gamepad2, label: 'Games', path: '/poker' },
    { icon: Zap, label: 'Quick', path: null }, // Quick play
    { icon: Trophy, label: 'Stats', path: '/stats' },
    { icon: BookOpen, label: 'Rules', path: '/rules' },
  ];

  const navItems = isPokerMode ? pokerNav : defaultNav;

  const handleNavClick = (path: string | null) => {
    if (path === null) {
      if (isPokerMode) {
        // Quick play - navigate to play-poker with defaults
        navigate('/play-poker');
      } else {
        if (hasActiveSubscription) {
          setCreateDialogOpen(true);
        } else {
          setPaywallOpen(true);
        }
      }
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string | null) => {
    if (path === null) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom safe-area-x">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 pb-[5px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isCenterButton = item.path === null;

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                  isCenterButton
                    ? 'text-primary'
                    : active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isCenterButton ? (
                  <div className="relative -mt-6">
                    <div className="relative w-14 h-14">
                      <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full">
                        <circle cx="28" cy="28" r="26" className="fill-primary" />
                        {Array.from({ length: 12 }).map((_, i) => {
                          const angle = (i * 30) * (Math.PI / 180);
                          const x1 = 28 + 26 * Math.cos(angle);
                          const y1 = 28 + 26 * Math.sin(angle);
                          const x2 = 28 + 21 * Math.cos(angle);
                          const y2 = 28 + 21 * Math.sin(angle);
                          return (
                            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke="hsl(var(--background))" strokeWidth="3" strokeLinecap="round" />
                          );
                        })}
                        <circle cx="28" cy="28" r="18" fill="none" className="stroke-background" strokeWidth="2" />
                        <circle cx="28" cy="28" r="15" className="fill-background" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        {isPokerMode ? (
                          <Zap className="h-6 w-6 text-primary" strokeWidth={2.5} />
                        ) : hasActiveSubscription ? (
                          <Plus className="h-6 w-6 text-primary" strokeWidth={3} />
                        ) : (
                          <Crown className="h-5 w-5 text-primary" strokeWidth={2.5} />
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 w-14 h-14 rounded-full bg-primary/20 blur-md -z-10" />
                  </div>
                ) : (
                  <>
                    <Icon className={cn('h-5 w-5', active && 'glow-gold')} />
                    <span className={cn('text-xs mt-1 font-medium', active && 'text-gold-gradient')}>
                      {item.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <QuickCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
