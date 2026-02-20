import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LobbySettings } from '@/lib/poker/types';
import { CardFan } from './CardFan';
import { PlayerAvatar } from './PlayerAvatar';
import { ArrowLeft, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/layout/Logo';
import { HeaderSocialIcons } from '@/components/layout/HeaderSocialIcons';
import { BOT_PERSONAS } from '@/lib/poker/bot-personas';
import { useTutorialComplete } from '@/hooks/useTutorialComplete';
import { TutorialGateDialog } from './TutorialGateDialog';

interface PlayPokerLobbyProps {
  onStart: (settings: LobbySettings) => void;
}

export function PlayPokerLobby({ onStart }: PlayPokerLobbyProps) {
  const { t } = useTranslation();
  const [botCount, setBotCount] = useState(3);
  const [startingChips, setStartingChips] = useState(10000);
  const [bigBlind, setBigBlind] = useState(100);
  const [blindTimer, setBlindTimer] = useState(0);
  const navigate = useNavigate();
  const { isComplete: tutorialComplete, isLoading: tutLoading } = useTutorialComplete();
  const [gateOpen, setGateOpen] = useState(false);

  // Show gate if tutorial not completed
  if (!tutLoading && !tutorialComplete) {
    return <TutorialGateDialog open={!gateOpen ? true : gateOpen} onOpenChange={(open) => {
      setGateOpen(open);
      if (!open) navigate(-1);
    }} />;
  }

  const PRESETS = [
    { label: t('poker_lobby.casual'), bots: 2, desc: t('poker_lobby.casual_desc') },
    { label: t('poker_lobby.standard'), bots: 4, desc: t('poker_lobby.standard_desc') },
    { label: t('poker_lobby.full_ring'), bots: 8, desc: t('poker_lobby.full_ring_desc') },
  ];

  const handleStart = () => {
    onStart({ botCount, startingChips, smallBlind: bigBlind / 2, bigBlind, blindTimer });
  };

  return (
    <div className="fixed inset-0 flex flex-col poker-felt-bg card-suit-pattern safe-area-bottom z-10 overflow-y-auto">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/poker')} className="absolute left-4 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="absolute right-4 flex items-center gap-1">
            <HeaderSocialIcons />
          </div>
        </div>
      </header>
      <div className="shrink-0 safe-area-top">
        <div className="h-14" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-start pt-4 px-4 space-y-3" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        <CardFan compact />
        <div className="text-center space-y-1 relative z-10">
          <h1 className="text-3xl font-black text-shimmer">{t('poker_lobby.play_poker')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('poker_lobby.play_poker_desc')}
          </p>
        </div>

        <Button
          size="lg"
          className="w-full max-w-sm shimmer-btn text-primary-foreground font-black text-base tracking-wide gap-2"
          onClick={handleStart}
        >
          <Play className="h-5 w-5" />
          {t('poker_lobby.start_game')}
        </Button>

        <div className="w-full max-w-sm glass-card rounded-2xl p-5 space-y-5 shadow-2xl">
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

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{t('poker_lobby.opponents')}</span>
              <span className="text-primary font-bold">{botCount}</span>
            </div>
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => {
                const persona = BOT_PERSONAS[i];
                return (
                  <div key={i} className={cn(i < botCount ? 'opacity-100' : 'opacity-20', 'transition-opacity')}>
                    <PlayerAvatar name={persona.name} index={i + 1} status={i < botCount ? 'active' : 'eliminated'} isCurrentPlayer={false} size="sm" avatarUrl={persona.avatarUrl} />
                  </div>
                );
              })}
            </div>
            <Slider value={[botCount]} min={1} max={8} step={1} onValueChange={([v]) => setBotCount(v)} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{t('poker_lobby.starting_chips')}</span>
              <span className="text-primary font-bold">{startingChips.toLocaleString()}</span>
            </div>
            <Slider value={[startingChips]} min={1000} max={50000} step={1000} onValueChange={([v]) => setStartingChips(v)} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{t('poker_lobby.blinds')}</span>
              <span className="text-primary font-bold">{bigBlind / 2} / {bigBlind}</span>
            </div>
            <Slider value={[bigBlind]} min={20} max={500} step={20} onValueChange={([v]) => setBigBlind(v)} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-medium">{t('poker_lobby.blind_timer')}</span>
              <span className="text-primary font-bold">{blindTimer === 0 ? t('poker_lobby.off') : `${blindTimer} min`}</span>
            </div>
            <div className="flex gap-2">
              {[0, 5, 10, 15, 30].map((tm) => (
                <button
                  key={tm}
                  onClick={() => setBlindTimer(tm)}
                  className={cn(
                    'flex-1 rounded-xl py-1.5 text-center transition-all border text-xs font-bold',
                    blindTimer === tm
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-card/30 border-border/30 text-muted-foreground hover:border-border/60'
                  )}
                >
                  {tm === 0 ? t('poker_lobby.off') : `${tm}m`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
