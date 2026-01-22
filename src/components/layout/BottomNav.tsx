import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, PlusCircle, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { QuickCreateDialog } from './QuickCreateDialog';

const navItems = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: PlusCircle, label: 'Create', path: null }, // Opens modal
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
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
                  <div className="flex items-center justify-center w-12 h-12 -mt-4 rounded-full bg-primary text-primary-foreground shadow-lg glow-gold">
                    <Icon className="h-6 w-6" />
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
