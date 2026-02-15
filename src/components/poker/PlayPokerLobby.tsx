import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { LobbySettings } from '@/lib/poker/types';

interface PlayPokerLobbyProps {
  onStart: (settings: LobbySettings) => void;
}

export function PlayPokerLobby({ onStart }: PlayPokerLobbyProps) {
  const [botCount, setBotCount] = useState(3);
  const [startingChips, setStartingChips] = useState(10000);
  const [bigBlind, setBigBlind] = useState(100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">♠ Play Poker</h1>
        <p className="text-muted-foreground text-sm">
          Texas Hold'em vs AI Bots — for fun, not real money
        </p>
      </div>

      <Card className="w-full max-w-sm p-6 space-y-6 bg-card border-border">
        {/* Bot count */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground font-medium">Opponents</span>
            <span className="text-primary font-bold">{botCount}</span>
          </div>
          <Slider
            value={[botCount]}
            min={1}
            max={8}
            step={1}
            onValueChange={([v]) => setBotCount(v)}
          />
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

        {/* House rule note */}
        <p className="text-xs text-muted-foreground text-center">
          ⚡ Simplified rules: All-in bets are capped at the shortest stack. No side pots.
        </p>

        <Button
          size="lg"
          className="w-full"
          onClick={() => onStart({ botCount, startingChips, smallBlind: bigBlind / 2, bigBlind })}
        >
          Deal Me In 🃏
        </Button>
      </Card>
    </div>
  );
}
