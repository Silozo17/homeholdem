import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LobbySettings } from '@/lib/poker/types';
import { CardFan } from './CardFan';
import { PlayerAvatar } from './PlayerAvatar';
import { ArrowLeft, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PlayPokerLobbyProps {
  onStart: (settings: LobbySettings) => void;
}

const BOT_NAMES = ['Alex', 'Blake', 'Casey', 'Drew', 'Ellis', 'Frankie', 'Gray', 'Harper'];
const PRESETS = [
  { label: 'Casual', bots: 2, desc: 'Quick heads-up' },
  { label: 'Standard', bots: 4, desc: 'Classic table' },
  { label: 'Full Ring', bots: 8, desc: 'Tight play' },
];

export function PlayPokerLobby({ onStart }: PlayPokerLobbyProps) {
  const [botCount, setBotCount] = useState(3);
  const [startingChips, setStartingChips] = useState(10000);
  const [bigBlind, setBigBlind] = useState(100);
  const navigate = useNavigate();

  const handleStart = () => {
    onStart({ botCount, startingChips, smallBlind: bigBlind / 2, bigBlind });
  };

  return (
    <div className="flex flex-col min-h-[100dvh] poker-felt-bg card-suit-pattern safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/poker')} className="text-foreground/70">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-5">
        {/* Hero */}
        <CardFan />
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-shimmer">Play Poker</h1>
          <p className="text-sm text-muted-foreground">
            Texas Hold'em vs AI &mdash; no real money
          </p>
        </div>

        {/* Start Game */}
        <Button
          size="lg"
          className="w-full max-w-sm shimmer-btn text-primary-foreground font-black text-base tracking-wide gap-2"
          onClick={handleStart}
        >
          <Play className="h-5 w-5" />
          Start Game
        </Button>

        {/* Settings card */}
        <div className="w-full max-w-sm glass-card rounded-2xl p-5 space-y-5 shadow-2xl">
          {/* Difficulty presets */}
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setBotCount(p.bots)}
                className={cn(
                  'flex-1 rounded-xl py-2 px-2 text-center transition-all border',
                  botCount === p.bots
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-card/30 border-border/30 text-muted-foreground hover:border-border/60'
                )}
              >
                <p className="text-xs font-bold">{p.label}</p>
                <p className="text-[10px]">{p.bots} bots</p>
              </button>
            ))}
          </div>

          {/* Opponents */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">Opponents</span>
              <span className="text-primary font-bold">{botCount}</span>
            </div>
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={cn(i < botCount ? 'opacity-100' : 'opacity-20', 'transition-opacity')}>
                  <PlayerAvatar name={BOT_NAMES[i]} index={i + 1} status={i < botCount ? 'active' : 'eliminated'} isCurrentPlayer={false} size="sm" />
                </div>
              ))}
            </div>
            <Slider value={[botCount]} min={1} max={8} step={1} onValueChange={([v]) => setBotCount(v)} />
          </div>

          {/* Starting chips */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">Starting Chips</span>
              <span className="text-primary font-bold">{startingChips.toLocaleString()}</span>
            </div>
            <Slider value={[startingChips]} min={1000} max={50000} step={1000} onValueChange={([v]) => setStartingChips(v)} />
          </div>

          {/* Blinds */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">Blinds</span>
              <span className="text-primary font-bold">{bigBlind / 2} / {bigBlind}</span>
            </div>
            <Slider value={[bigBlind]} min={20} max={500} step={20} onValueChange={([v]) => setBigBlind(v)} />
          </div>

        </div>
      </div>
    </div>
  );
}
