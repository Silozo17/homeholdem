import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Users, ArrowRight, Crown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { useTutorialComplete } from '@/hooks/useTutorialComplete';
import { TutorialGateDialog } from '@/components/poker/TutorialGateDialog';

export function GameModesGrid() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isActive } = useSubscription();
  const { isComplete: tutorialComplete, isLoading: tutLoading } = useTutorialComplete();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const pendingPath = useRef<string | null>(null);

  const modes = [
    {
      title: t('home.mode_learn'),
      subtitle: t('home.mode_learn_sub'),
      description: t('home.mode_learn_desc'),
      icon: BookOpen,
      path: '/learn-poker',
      accentClass: 'from-sky-500/20 to-sky-500/5',
      iconColor: 'text-sky-400',
      premium: false,
      requiresTutorial: false,
    },
    {
      title: t('home.mode_bots'),
      subtitle: t('home.mode_bots_sub'),
      description: t('home.mode_bots_desc'),
      icon: Bot,
      path: '/play-poker',
      accentClass: 'from-primary/20 to-primary/5',
      iconColor: 'text-primary',
      premium: false,
      requiresTutorial: true,
    },
    {
      title: t('home.mode_multi'),
      subtitle: t('home.mode_multi_sub'),
      description: t('home.mode_multi_desc'),
      icon: Users,
      path: '/poker',
      accentClass: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'text-emerald-400',
      premium: true,
      requiresTutorial: true,
    },
  ];

  const handleClick = (mode: typeof modes[0]) => {
    if (mode.requiresTutorial && !tutLoading && !tutorialComplete) {
      pendingPath.current = mode.path;
      setGateOpen(true);
      return;
    }
    if (mode.premium && !isActive) {
      setPaywallOpen(true);
      return;
    }
    navigate(mode.path);
  };

  return (
    <>
    <div className="grid grid-cols-3 gap-2.5">
      {modes.map((mode) => {
        const Icon = mode.icon;
        return (
          <button
            key={mode.path}
            onClick={() => handleClick(mode)}
            className={cn(
              'relative overflow-hidden rounded-xl p-4 text-left transition-all',
              'active:scale-[0.97] hover:shadow-lg',
              'glass-card group'
            )}
          >
            <div className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-60',
              mode.accentClass,
            )} />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className={cn('w-10 h-10 rounded-full bg-card/80 flex items-center justify-center', mode.iconColor)}>
                  <Icon className="h-5 w-5" />
                </div>
                {mode.premium && !isActive && (
                  <Crown className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{mode.title}</p>
                <p className="text-[10px] text-muted-foreground">{mode.subtitle}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </button>
        );
      })}
    </div>
    <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
    <TutorialGateDialog
      open={gateOpen}
      onOpenChange={setGateOpen}
      onSkipped={() => { if (pendingPath.current) navigate(pendingPath.current); }}
    />
    </>
  );
}
