import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Users, ArrowLeft, Crown, Coins, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardFan } from '@/components/poker/CardFan';
import { GameModeCard } from '@/components/poker/GameModeCard';
import { Logo } from '@/components/layout/Logo';
import { HeaderSocialIcons } from '@/components/layout/HeaderSocialIcons';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { Badge } from '@/components/ui/badge';
import { useTutorialComplete } from '@/hooks/useTutorialComplete';
import { TutorialGateDialog } from '@/components/poker/TutorialGateDialog';

export default function PokerHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isActive } = useSubscription();
  const { isComplete: tutorialComplete, isLoading: tutLoading } = useTutorialComplete();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const pendingPath = useRef<string | null>(null);

  const handlePremiumMode = (path: string) => {
    if (!isActive) { setPaywallOpen(true); return; }
    navigate(path);
  };

  const handleGatedMode = (path: string, premium = false) => {
    if (!tutLoading && !tutorialComplete) {
      pendingPath.current = path;
      setGateOpen(true);
      return;
    }
    if (premium) { handlePremiumMode(path); return; }
    navigate(path);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden safe-area-bottom z-10 bg-background">
      {/* Standard fixed header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="absolute left-4 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="absolute right-4 flex items-center gap-1">
            <HeaderSocialIcons />
          </div>
        </div>
      </header>
      <div className="h-14 safe-area-top shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-start pt-6 px-4 space-y-3 overflow-auto" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Hero */}
        <CardFan compact className="h-14" />
        <div className="text-center space-y-0.5">
          <h1 className="text-2xl font-black text-shimmer">{t('poker_hub.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('poker_hub.subtitle')}</p>
        </div>

        {/* Game mode cards */}
        <div className="w-full max-w-md space-y-2.5">
          <GameModeCard
            icon={BookOpen}
            title={t('poker_hub.learn_title')}
            description={t('poker_hub.learn_desc')}
            hint={t('poker_hub.learn_hint')}
            accentClass="bg-sky-500/15"
            ctaLabel={t('poker_hub.learn_cta')}
            onClick={() => navigate('/learn-poker')}
            compact
          />
          <GameModeCard
            icon={Bot}
            title={t('poker_hub.bots_title')}
            description={t('poker_hub.bots_desc')}
            hint={t('poker_hub.bots_hint')}
            accentClass="bg-amber-500/15"
            ctaLabel={t('poker_hub.bots_cta')}
            onClick={() => handleGatedMode('/play-poker')}
            compact
          />
          <div className="relative">
            {!isActive && (
              <Badge className="absolute -top-1 -right-1 z-10 bg-primary/90 text-primary-foreground text-[9px] px-1.5 py-0 gap-0.5">
                <Crown className="h-2.5 w-2.5" /> PRO
              </Badge>
            )}
            <GameModeCard
              icon={Users}
              title={t('poker_hub.multi_title')}
              description={t('poker_hub.multi_desc')}
              hint={t('poker_hub.multi_hint')}
              accentClass="bg-emerald-500/15"
              ctaLabel={t('poker_hub.multi_cta')}
              onClick={() => handleGatedMode('/online-poker', true)}
              compact
            />
          </div>
          <GameModeCard
            icon={Coins}
            title={t('poker_hub.tournaments_title')}
            description={t('poker_hub.tournaments_desc')}
            hint={t('poker_hub.tournaments_hint')}
            accentClass="bg-yellow-500/15"
            ctaLabel={t('poker_hub.tournaments_cta')}
            onClick={() => handleGatedMode('/tournaments')}
            compact
          />
        </div>
      </div>

      <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
      <TutorialGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        onSkipped={() => { if (pendingPath.current) navigate(pendingPath.current); }}
      />
    </div>
  );
}
