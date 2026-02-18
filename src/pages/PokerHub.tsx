import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Users, ArrowLeft, Crown, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardFan } from '@/components/poker/CardFan';
import { GameModeCard } from '@/components/poker/GameModeCard';
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { Badge } from '@/components/ui/badge';

export default function PokerHub() {
  const navigate = useNavigate();
  const { isActive } = useSubscription();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const handlePremiumMode = (path: string) => {
    if (!isActive) { setPaywallOpen(true); return; }
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
          <NotificationBell className="absolute right-4" />
        </div>
      </header>
      <div className="h-14 safe-area-top shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-start pt-6 px-4 space-y-3 overflow-auto" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Hero */}
        <CardFan compact className="h-14" />
        <div className="text-center space-y-0.5">
          <h1 className="text-2xl font-black text-shimmer">Poker</h1>
          <p className="text-xs text-muted-foreground">Choose your game mode</p>
        </div>

        {/* Game mode cards */}
        <div className="w-full max-w-md space-y-2.5">
          <GameModeCard
            icon={Bot}
            title="Play with Bots"
            description="Choose opponents, chips, and blinds"
            hint="1-8 bots • Customizable"
            accentClass="bg-amber-500/15"
            ctaLabel="Configure & Play"
            onClick={() => navigate('/play-poker')}
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
              title="Online Multiplayer"
              description="Create or join a table with real players"
              hint="Real-time • Invite friends"
              accentClass="bg-emerald-500/15"
              ctaLabel="Find Table"
              onClick={() => handlePremiumMode('/online-poker')}
              compact
            />
          </div>
          <GameModeCard
            icon={Coins}
            title="Paid Tournaments"
            description="Compete for real cash prizes"
            hint="Entry fee • Prize pool"
            accentClass="bg-yellow-500/15"
            ctaLabel="View Tournaments"
            onClick={() => navigate('/tournaments')}
            compact
          />
        </div>
      </div>

      <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}
