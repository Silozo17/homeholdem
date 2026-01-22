import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

const themes = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium">Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.value;
            
            return (
              <Button
                key={t.value}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  'flex flex-col items-center gap-1 h-auto py-3',
                  isActive && 'glow-gold'
                )}
                onClick={() => setTheme(t.value)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{t.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
