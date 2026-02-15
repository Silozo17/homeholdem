import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LobbySettings } from '@/lib/poker/types';
import { CardFan } from './CardFan';
import { PlayerAvatar } from './PlayerAvatar';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlayPokerLobbyProps {
  onStart: (settings: LobbySettings) => void;
}

const BOT_NAMES = ['Alex', 'Blake', 'Casey', 'Drew', 'Ellis', 'Frankie', 'Gray', 'Harper'];

export function PlayPokerLobby({ onStart }: PlayPokerLobbyProps) {
  const [botCount, setBotCount] = useState(3);
  const [startingChips, setStartingChips] = useState(10000);
  const [bigBlind, setBigBlind] = useState(100);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-[100dvh] poker-felt-bg card-suit-pattern safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-foreground/70">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        {/* Hero */}
        <CardFan />
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-gold-gradient">Play Poker</h1>
          <p className="text-sm text-muted-foreground">
            Texas Hold'em vs AI &mdash; no real money
          </p>
        </div>

        {/* Settings card */}
        <div className="w-full max-w-sm bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 space-y-5 shadow-2xl">
          {/* Opponents */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">Opponents</span>
              <span className="text-primary font-bold">{botCount}</span>
            </div>
            {/* Visual avatars */}
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={i < botCount ? 'opacity-100' : 'opacity-20'}>
                  <PlayerAvatar
                    name={BOT_NAMES[i]}
                    index={i + 1}
                    status={i < botCount ? 'active' : 'eliminated'}
                    isCurrentPlayer={false}
                    size="sm"
                  />
                </div>
              ))}
            </div>
            <Slider
              value={[botCount]}
              min={1}
              max={8}
              step={1}
              onValueChange={([v]) => setBotCount(v)}
            />
            <p className="text-[10px] text-muted-foreground text-center">
              {botCount <= 2 ? 'Quick heads-up game' : botCount <= 5 ? 'Classic table size' : 'Full ring — tighter play'}
            </p>
          </div>

          {/* Starting chips */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">Starting Chips</span>
              <span className="text-primary font-bold">{startingChips.toLocaleString()}</span>
            </div>
            <Slider
              value={[startingChips]}
              min={1000}
              max={50000}
              step={1000}
              onValueChange={([v]) => setStartingChips(v)}
            />
          </div>

          {/* Blinds */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">Blinds</span>
              <span className="text-primary font-bold">{bigBlind / 2} / {bigBlind}</span>
            </div>
            <Slider
              value={[bigBlind]}
              min={20}
              max={500}
              step={20}
              onValueChange={([v]) => setBigBlind(v)}
            />
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Simplified: All-in caps at shortest stack. No side pots.
          </p>

          <Button
            size="lg"
            className="w-full shimmer-btn text-primary-foreground font-black text-base tracking-wide"
            onClick={() => onStart({ botCount, startingChips, smallBlind: bigBlind / 2, bigBlind })}
          >
            Deal Me In
          </Button>
        </div>
      </div>
    </div>
  );
}
