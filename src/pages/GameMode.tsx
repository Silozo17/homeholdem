import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function GameMode() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading } = useAuth();
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleStartGame = async () => {
    if (!session) {
      await createSession();
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
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
        prizePool={prizePool}
        currencySymbol={currencySymbol}
        onExit={() => setTvMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(`/event/${eventId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTvMode(true)}
                title="TV Display Mode"
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

      {/* Main Content */}
      <main className="container px-4 py-4 space-y-4">
        {!session ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gold-gradient">Game Mode</h1>
              <p className="text-muted-foreground">Start your poker tournament</p>
            </div>
            {isAdmin ? (
              <Button 
                size="lg" 
                className="glow-gold"
                onClick={handleStartGame}
              >
                Start Tournament
              </Button>
            ) : (
              <p className="text-muted-foreground">Waiting for host to start the game...</p>
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
            />

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card/50 rounded-lg p-3 border border-border/30">
                <div className="text-xs text-muted-foreground">Players</div>
                <div className="text-lg font-bold text-primary">{activePlayers}/{players.length}</div>
              </div>
              <div className="bg-card/50 rounded-lg p-3 border border-border/30">
                <div className="text-xs text-muted-foreground">Prize Pool</div>
                <div className="text-lg font-bold text-gold-gradient">{currencySymbol}{prizePool}</div>
              </div>
              <div className="bg-card/50 rounded-lg p-3 border border-border/30">
                <div className="text-xs text-muted-foreground">Avg Stack</div>
                <div className="text-lg font-bold">
                  {activePlayers > 0 
                    ? Math.round((players.filter(p => p.status === 'active').length * (session.starting_chips || 10000)) / activePlayers).toLocaleString()
                    : 0
                  }
                </div>
              </div>
            </div>

            <Tabs defaultValue="players" className="space-y-4">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="seats">Seats</TabsTrigger>
                <TabsTrigger value="buyins">Buy-ins</TabsTrigger>
                <TabsTrigger value="cashout" className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  Cash Out
                </TabsTrigger>
                <TabsTrigger value="payouts">Payouts</TabsTrigger>
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
                  onComplete={(totals) => {
                    console.log('Cash out complete:', totals);
                    // Totals will be used for settlement calculations
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
