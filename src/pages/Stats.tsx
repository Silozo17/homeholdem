import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/Logo';
import { Trophy, TrendingUp, TrendingDown, Target, Calendar, Crown, Medal, DollarSign, Percent, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ClubStats {
  clubId: string;
  clubName: string;
  gamesPlayed: number;
  wins: number;
  cashes: number;
  totalBuyIns: number;
  totalWinnings: number;
  netProfit: number;
}

interface OverallStats {
  totalGames: number;
  totalWins: number;
  totalCashes: number;
  totalBuyIns: number;
  totalWinnings: number;
  netProfit: number;
  avgFinishPosition: number;
  bestFinish: number;
  winRate: number;
  cashRate: number;
}

export default function Stats() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalGames: 0,
    totalWins: 0,
    totalCashes: 0,
    totalBuyIns: 0,
    totalWinnings: 0,
    netProfit: 0,
    avgFinishPosition: 0,
    bestFinish: 0,
    winRate: 0,
    cashRate: 0,
  });
  const [clubStats, setClubStats] = useState<ClubStats[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    setLoadingData(true);

    // Fetch all game players data for this user
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select(`
        id,
        finish_position,
        game_session_id,
        game_sessions (
          id,
          event_id,
          events (
            id,
            club_id,
            clubs (
              id,
              name
            )
          )
        )
      `)
      .eq('user_id', user.id);

    // Fetch all transactions for this user's game players
    const playerIds = gamePlayers?.map(p => p.id) || [];
    const { data: transactions } = await supabase
      .from('game_transactions')
      .select('amount, transaction_type, game_player_id')
      .in('game_player_id', playerIds);

    if (gamePlayers) {
      // Calculate overall stats
      const totalGames = gamePlayers.length;
      const finishedGames = gamePlayers.filter(p => p.finish_position !== null);
      const totalWins = gamePlayers.filter(p => p.finish_position === 1).length;
      const totalCashes = gamePlayers.filter(p => p.finish_position && p.finish_position <= 3).length;
      const bestFinish = finishedGames.length > 0 
        ? Math.min(...finishedGames.map(p => p.finish_position!))
        : 0;
      const avgFinishPosition = finishedGames.length > 0
        ? finishedGames.reduce((sum, p) => sum + (p.finish_position || 0), 0) / finishedGames.length
        : 0;

      let totalBuyIns = 0;
      let totalWinnings = 0;

      transactions?.forEach(t => {
        if (['buy_in', 'rebuy', 'addon'].includes(t.transaction_type)) {
          totalBuyIns += t.amount;
        } else if (t.transaction_type === 'payout') {
          totalWinnings += Math.abs(t.amount);
        }
      });

      setOverallStats({
        totalGames,
        totalWins,
        totalCashes,
        totalBuyIns,
        totalWinnings,
        netProfit: totalWinnings - totalBuyIns,
        avgFinishPosition: Math.round(avgFinishPosition * 10) / 10,
        bestFinish,
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
        cashRate: totalGames > 0 ? Math.round((totalCashes / totalGames) * 100) : 0,
      });

      // Calculate per-club stats
      const clubStatsMap = new Map<string, ClubStats>();

      gamePlayers.forEach(gp => {
        const club = (gp.game_sessions as any)?.events?.clubs;
        if (!club) return;

        const existing = clubStatsMap.get(club.id) || {
          clubId: club.id,
          clubName: club.name,
          gamesPlayed: 0,
          wins: 0,
          cashes: 0,
          totalBuyIns: 0,
          totalWinnings: 0,
          netProfit: 0,
        };

        existing.gamesPlayed++;
        if (gp.finish_position === 1) existing.wins++;
        if (gp.finish_position && gp.finish_position <= 3) existing.cashes++;

        // Calculate buy-ins and winnings for this player
        const playerTransactions = transactions?.filter(t => t.game_player_id === gp.id) || [];
        playerTransactions.forEach(t => {
          if (['buy_in', 'rebuy', 'addon'].includes(t.transaction_type)) {
            existing.totalBuyIns += t.amount;
          } else if (t.transaction_type === 'payout') {
            existing.totalWinnings += Math.abs(t.amount);
          }
        });
        existing.netProfit = existing.totalWinnings - existing.totalBuyIns;

        clubStatsMap.set(club.id, existing);
      });

      setClubStats(Array.from(clubStatsMap.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed));
    }

    setLoadingData(false);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center h-16 px-4">
          <Logo size="sm" />
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gold-gradient flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Your Stats
          </h2>
          <p className="text-muted-foreground">
            Performance across all clubs
          </p>
        </div>

        {overallStats.totalGames === 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Play your first game to see stats here!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Games Played</span>
                  </div>
                  <div className="text-3xl font-bold">{overallStats.totalGames}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total Wins</span>
                  </div>
                  <div className="text-3xl font-bold text-gold-gradient">{overallStats.totalWins}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Medal className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">In The Money</span>
                  </div>
                  <div className="text-3xl font-bold">{overallStats.totalCashes}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Best Finish</span>
                  </div>
                  <div className="text-3xl font-bold">
                    {overallStats.bestFinish > 0 ? `#${overallStats.bestFinish}` : '-'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Win/Cash Rates */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5 text-primary" />
                  Performance Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="font-medium">{overallStats.winRate}%</span>
                  </div>
                  <Progress value={overallStats.winRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Cash Rate (Top 3)</span>
                    <span className="font-medium">{overallStats.cashRate}%</span>
                  </div>
                  <Progress value={overallStats.cashRate} className="h-2" />
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Avg Finish Position</span>
                  <span className="font-medium">{overallStats.avgFinishPosition || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Buy-ins</span>
                  <span className="font-medium">£{overallStats.totalBuyIns.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Winnings</span>
                  <span className="font-medium text-success">£{overallStats.totalWinnings.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="font-medium">Net Profit/Loss</span>
                  <div className="flex items-center gap-2">
                    {overallStats.netProfit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={`font-bold text-lg ${overallStats.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {overallStats.netProfit >= 0 ? '+' : ''}£{overallStats.netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Per-Club Breakdown */}
            {clubStats.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Stats by Club
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {clubStats.map((club) => (
                    <button
                      key={club.clubId}
                      onClick={() => navigate(`/club/${club.clubId}`)}
                      className="w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{club.clubName}</span>
                        <span className={`text-sm font-medium ${club.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {club.netProfit >= 0 ? '+' : ''}£{club.netProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{club.gamesPlayed} games</span>
                        <span>{club.wins} wins</span>
                        <span>{club.cashes} cashes</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
