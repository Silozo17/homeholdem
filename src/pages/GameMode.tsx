import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveGame } from '@/contexts/ActiveGameContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/layout/Logo';
import { ArrowLeft, Tv, Settings, Coins } from 'lucide-react';
import { TournamentClock } from '@/components/game/TournamentClock';
import { TVDisplay } from '@/components/game/TVDisplay';
import { PlayerList } from '@/components/game/PlayerList';
import { SeatMap } from '@/components/game/SeatMap';
import { BuyInTracker } from '@/components/game/BuyInTracker';
import { PayoutCalculator } from '@/components/game/PayoutCalculator';
import { GameSettings } from '@/components/game/GameSettings';
import { ChipCounter } from '@/components/game/ChipCounter';
import { useGameSession } from '@/hooks/useGameSession';
import { useClubCurrency } from '@/hooks/useClubCurrency';
import { useChipToCashRatio } from '@/hooks/useChipToCashRatio';

export default function GameMode() {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading } = useAuth();
  const { setActiveGame, clearActiveGame } = useActiveGame();
  const navigate = useNavigate();
  const [tvMode, setTvMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    session,
    blindStructure,
    players,
    transactions,
    clubId,
    isAdmin,
    eventSettings,
    loading: sessionLoading,
    createSession,
    updateSession,
    refetch
  } = useGameSession(eventId || '');

  const { symbol: currencySymbol } = useClubCurrency(clubId || '');
  const chipToCashRatio = useChipToCashRatio(clubId);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Update active game context when session changes
  useEffect(() => {
    if (session && eventId && session.status !== 'completed') {
      const activePlayers = players.filter(p => p.status === 'active').length;
      const prizePool = transactions
        .filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
        .reduce((sum, t) => sum + t.amount, 0);
      
      setActiveGame({
        sessionId: session.id,
        eventId,
        status: session.status,
        currentLevel: session.current_level,
        timeRemainingSeconds: session.time_remaining_seconds,
        levelStartedAt: session.level_started_at,
        blindStructure,
        prizePool,
        playersRemaining: activePlayers,
        currencySymbol,
      });
    } else if (session?.status === 'completed') {
      clearActiveGame();
    }
  }, [session, eventId, blindStructure, players, transactions, currencySymbol, setActiveGame, clearActiveGame]);

  const handleStartGame = async () => {
    if (!session) {
      await createSession();
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container relative flex items-center justify-center h-14 px-4">
            <Skeleton className="h-8 w-8 absolute left-4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8 absolute right-4" />
          </div>
        </header>
        <main className="container px-4 py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  // Calculate stats (needed for TV mode)
  const totalBuyIns = transactions
    .filter(t => t.transaction_type === 'buyin')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalRebuys = transactions
    .filter(t => t.transaction_type === 'rebuy')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalAddons = transactions
    .filter(t => t.transaction_type === 'addon')
    .reduce((sum, t) => sum + t.amount, 0);
  const prizePool = totalBuyIns + totalRebuys + totalAddons;
  const activePlayers = players.filter(p => p.status === 'active').length;

  // TV Display Mode - fullscreen with table visualization
  if (tvMode && session) {
    return (
      <TVDisplay
        session={session}
        blindStructure={blindStructure}
        players={players}
        transactions={transactions}
        prizePool={prizePool}
        currencySymbol={currencySymbol}
        isAdmin={isAdmin}
        onExit={() => setTvMode(false)}
        onUpdateSession={updateSession}
        onRefresh={refetch}
        chipToCashRatio={chipToCashRatio}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container flex items-center justify-between h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/event/${eventId}`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex justify-center px-2 min-w-0">
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {session && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTvMode(true)}
                title={t('game.tv_display')}
              >
                <Tv className="h-5 w-5" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-14 safe-area-top" />

      {/* Main Content */}
      <main className="container px-4 py-4 space-y-4">
        {!session ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gold-gradient">{t('game.game_mode')}</h1>
              <p className="text-muted-foreground">{t('game.start_tournament')}</p>
            </div>
            {isAdmin ? (
              <Button 
                size="lg" 
                className="glow-gold"
                onClick={handleStartGame}
              >
                {t('game.start_tournament')}
              </Button>
            ) : (
              <p className="text-muted-foreground">{t('game.waiting_host')}</p>
            )}
          </div>
        ) : (
          <>
            {/* Tournament Clock */}
            <TournamentClock
              session={session}
              blindStructure={blindStructure}
              isAdmin={isAdmin}
              onUpdate={updateSession}
              currencySymbol={currencySymbol}
              chipToCashRatio={chipToCashRatio}
              displayBlindsAsCurrency={session.display_blinds_as_currency || false}
            />

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card/50 rounded-lg p-3 border border-border/30">
                <div className="text-xs text-muted-foreground">{t('game.players')}</div>
                <div className="text-lg font-bold text-primary">{activePlayers}/{players.length}</div>
              </div>
              <div className="bg-card/50 rounded-lg p-3 border border-border/30">
                <div className="text-xs text-muted-foreground">{t('game.prize_pool')}</div>
                <div className="text-lg font-bold text-gold-gradient">{currencySymbol}{prizePool}</div>
              </div>
              <div className="bg-card/50 rounded-lg p-3 border border-border/30">
                <div className="text-xs text-muted-foreground">{t('game.avg_stack')}</div>
                <div className="text-lg font-bold">
                  {activePlayers > 0 
                    ? Math.round((players.filter(p => p.status === 'active').length * (session.starting_chips || 10000)) / activePlayers).toLocaleString()
                    : 0
                  }
                </div>
              </div>
            </div>

            <Tabs defaultValue="players" className="space-y-4">
              <TabsList className="grid grid-cols-3 gap-1 h-auto p-1">
                <TabsTrigger value="players" className="text-xs px-2 py-2">{t('game.players')}</TabsTrigger>
                <TabsTrigger value="seats" className="text-xs px-2 py-2">{t('game.seats')}</TabsTrigger>
                <TabsTrigger value="buyins" className="text-xs px-2 py-2">{t('game.buyins')}</TabsTrigger>
                <TabsTrigger value="cashout" className="text-xs px-2 py-2 flex items-center justify-center gap-1">
                  <Coins className="h-3 w-3" />
                  {t('game.cash_out')}
                </TabsTrigger>
                <TabsTrigger value="payouts" className="col-span-2 text-xs px-2 py-2">{t('game.payouts')}</TabsTrigger>
              </TabsList>

              <TabsContent value="players">
                <PlayerList
                  players={players}
                  session={session}
                  clubId={clubId || ''}
                  maxTables={eventSettings.maxTables}
                  isAdmin={isAdmin}
                  onRefresh={refetch}
                />
              </TabsContent>

              <TabsContent value="seats">
                <SeatMap
                  players={players}
                  seatsPerTable={eventSettings.seatsPerTable}
                  maxTables={eventSettings.maxTables}
                  isAdmin={isAdmin}
                  onRefresh={refetch}
                />
              </TabsContent>

              <TabsContent value="buyins">
                <BuyInTracker
                  players={players}
                  transactions={transactions}
                  session={session}
                  currencySymbol={currencySymbol}
                  isAdmin={isAdmin}
                  onRefresh={refetch}
                />
              </TabsContent>

              <TabsContent value="cashout">
                <ChipCounter
                  clubId={clubId || ''}
                  sessionId={session.id}
                  players={players}
                  transactions={transactions}
                  isAdmin={isAdmin}
                  onComplete={() => {
                    refetch();
                  }}
                />
              </TabsContent>

              <TabsContent value="payouts">
                <PayoutCalculator
                  players={players}
                  prizePool={prizePool}
                  session={session}
                  transactions={transactions}
                  clubId={clubId || ''}
                  currencySymbol={currencySymbol}
                  isAdmin={isAdmin}
                  onRefresh={refetch}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Settings Dialog */}
      {showSettings && session && (
        <GameSettings
          session={session}
          blindStructure={blindStructure}
          currencySymbol={currencySymbol}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}
