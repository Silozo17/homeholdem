import { useNavigate } from 'react-router-dom';
import { Zap, Settings2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardFan } from '@/components/poker/CardFan';
import { GameModeCard } from '@/components/poker/GameModeCard';
import { usePokerGame } from '@/hooks/usePokerGame';

export default function PokerHub() {
  const navigate = useNavigate();
  const { startGame } = usePokerGame();

  const handleQuickPlay = () => {
    startGame({ botCount: 3, startingChips: 10000, smallBlind: 50, bigBlind: 100 });
    navigate('/play-poker');
  };

  return (
    <div className="flex flex-col min-h-[100dvh] poker-felt-bg card-suit-pattern safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-foreground/70">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-24 space-y-6">
        {/* Hero */}
        <CardFan />
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-shimmer">Poker</h1>
          <p className="text-sm text-muted-foreground">Choose your game mode</p>
        </div>

        {/* Game mode cards */}
        <div className="w-full max-w-md space-y-3">
          <GameModeCard
            icon={Zap}
            title="Quick Play"
            description="Jump straight in with 3 bots and default settings"
            hint="~5 min • No setup required"
            accentClass="bg-amber-500/15"
            ctaLabel="Deal Me In"
            onClick={handleQuickPlay}
          />
          <GameModeCard
            icon={Settings2}
            title="Custom Game"
            description="Choose opponents, chips, and blinds"
            hint="1-8 bots • Customizable"
            ctaLabel="Configure"
            onClick={() => navigate('/play-poker')}
          />
          <GameModeCard
            icon={Users}
            title="Multiplayer"
            description="Create or join a table with real players"
            hint="Real-time • Invite friends"
            accentClass="bg-emerald-500/15"
            ctaLabel="Find Table"
            onClick={() => navigate('/online-poker')}
          />
        </div>
      </div>
    </div>
  );
}
