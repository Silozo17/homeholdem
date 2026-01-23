import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Plus, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { QuickCreateDialog } from './QuickCreateDialog';

const navItems = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Plus, label: 'Create', path: null }, // Opens modal
  { icon: Trophy, label: 'Stats', path: '/stats' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleNavClick = (path: string | null) => {
    if (path === null) {
      setCreateDialogOpen(true);
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-x">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5px)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isCreateButton = item.path === null;

            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                  isCreateButton
                    ? 'text-primary'
                    : active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isCreateButton ? (
                  <div className="relative -mt-6">
                    {/* Poker chip design */}
                    <div className="relative w-14 h-14">
                      {/* Outer ring with notches */}
                      <svg 
                        viewBox="0 0 56 56" 
                        className="absolute inset-0 w-full h-full"
                      >
                        {/* Background circle */}
                        <circle 
                          cx="28" cy="28" r="26" 
                          className="fill-primary"
                        />
                        {/* Notches around the edge */}
                        {Array.from({ length: 12 }).map((_, i) => {
                          const angle = (i * 30) * (Math.PI / 180);
                          const x1 = 28 + 26 * Math.cos(angle);
                          const y1 = 28 + 26 * Math.sin(angle);
                          const x2 = 28 + 21 * Math.cos(angle);
                          const y2 = 28 + 21 * Math.sin(angle);
                          return (
                            <line
                              key={i}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke="hsl(var(--background))"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          );
                        })}
                        {/* Inner ring */}
                        <circle 
                          cx="28" cy="28" r="18" 
                          fill="none"
                          className="stroke-background"
                          strokeWidth="2"
                        />
                        {/* Center circle */}
                        <circle 
                          cx="28" cy="28" r="15" 
                          className="fill-background"
                        />
                      </svg>
                      {/* Plus icon in center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" strokeWidth={3} />
                      </div>
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 w-14 h-14 rounded-full bg-primary/20 blur-md -z-10" />
                  </div>
                ) : (
                  <>
                    <Icon className={cn('h-5 w-5', active && 'glow-gold')} />
                    <span className={cn(
                      'text-xs mt-1 font-medium',
                      active && 'text-gold-gradient'
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <QuickCreateDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </>
  );
}
