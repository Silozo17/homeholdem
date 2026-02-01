import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/Logo';
import { Trophy, TrendingUp, TrendingDown, Target, Calendar, Crown, Medal, DollarSign, Percent, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';

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
  const { t } = useTranslation();
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
  const [paywallOpen, setPaywallOpen] = useState(false);

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

    // Step 1: Find any placeholder_players linked to this user
    const { data: linkedPlaceholders } = await supabase
      .from('placeholder_players')
      .select('id')
      .eq('linked_user_id', user.id);

    const placeholderIds = linkedPlaceholders?.map(p => p.id) || [];

    // Step 2: Get game_players for BOTH user_id AND placeholder_player_id matches
    let query = supabase
      .from('game_players')
      .select(`
        id,
        finish_position,
        game_session_id,
        user_id,
        placeholder_player_id,
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
      `);

    // Build OR condition for user_id or any linked placeholder_player_id
    if (placeholderIds.length > 0) {
      query = query.or(`user_id.eq.${user.id},placeholder_player_id.in.(${placeholderIds.join(',')})`);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: gamePlayers } = await query;

    if (!gamePlayers || gamePlayers.length === 0) {
      setOverallStats({
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
      setClubStats([]);
      setLoadingData(false);
      return;
    }

    // Fetch all transactions for this user's game players
    const playerIds = gamePlayers.map(p => p.id);
    const { data: transactions } = await supabase
      .from('game_transactions')
      .select('amount, transaction_type, game_player_id')
      .in('game_player_id', playerIds);

    // Also fetch payouts from payout_structures
    const sessionIds = [...new Set(gamePlayers.map(p => p.game_session_id))];
    const { data: payouts } = await supabase
      .from('payout_structures')
      .select('player_id, amount')
      .in('game_session_id', sessionIds)
      .not('player_id', 'is', null);

    // Create payout map
    const payoutMap = new Map<string, number>();
    payouts?.forEach(p => {
      if (p.player_id && p.amount) {
        payoutMap.set(p.player_id, (payoutMap.get(p.player_id) || 0) + p.amount);
      }
    });

    // Calculate overall stats
    // Filter out unreasonable finish positions (>20 indicates bad/placeholder data)
    const MAX_REASONABLE_POSITION = 20;
    const totalGames = gamePlayers.length;
    const finishedGames = gamePlayers.filter(
      p => p.finish_position !== null && p.finish_position <= MAX_REASONABLE_POSITION
    );
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

    // Sum from transactions
    transactions?.forEach(t => {
      if (['buy_in', 'rebuy', 'addon'].includes(t.transaction_type)) {
        totalBuyIns += t.amount;
      } else if (t.transaction_type === 'payout') {
        totalWinnings += Math.abs(t.amount);
      }
    });

    // Also sum from payout_structures (for historical data)
    gamePlayers.forEach(gp => {
      const payout = payoutMap.get(gp.id);
      if (payout) {
        totalWinnings += payout;
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

      // Add from payout_structures
      const payout = payoutMap.get(gp.id);
      if (payout) {
        existing.totalWinnings += payout;
      }

      existing.netProfit = existing.totalWinnings - existing.totalBuyIns;

      clubStatsMap.set(club.id, existing);
    });

    setClubStats(Array.from(clubStatsMap.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed));

    setLoadingData(false);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaywallOpen(true)}
            className="absolute left-4 text-primary hover:text-primary/80"
          >
            <Crown className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <NotificationBell className="absolute right-4" />
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

      <main className="container px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gold-gradient flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            {t('stats.your_stats')}
          </h2>
          <p className="text-muted-foreground">
            {t('stats.performance_all_clubs')}
          </p>
        </div>

        {overallStats.totalGames === 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {t('stats.no_games')}
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
                    <span className="text-xs text-muted-foreground">{t('stats.games_played')}</span>
                  </div>
                  <div className="text-3xl font-bold">{overallStats.totalGames}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{t('stats.total_wins')}</span>
                  </div>
                  <div className="text-3xl font-bold text-gold-gradient">{overallStats.totalWins}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Medal className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{t('stats.itm')}</span>
                  </div>
                  <div className="text-3xl font-bold">{overallStats.totalCashes}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{t('stats.best_finish')}</span>
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
                  {t('stats.performance_rates')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('stats.win_rate')}</span>
                    <span className="font-medium">{overallStats.winRate}%</span>
                  </div>
                  <Progress value={overallStats.winRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('stats.cash_rate')}</span>
                    <span className="font-medium">{overallStats.cashRate}%</span>
                  </div>
                  <Progress value={overallStats.cashRate} className="h-2" />
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">{t('stats.avg_finish')}</span>
                  <span className="font-medium">{overallStats.avgFinishPosition || '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  {t('stats.financial_summary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('stats.total_buyins')}</span>
                  <span className="font-medium">£{Math.round(overallStats.totalBuyIns / 10) * 10}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('stats.total_winnings')}</span>
                  <span className="font-medium text-success">£{Math.round(overallStats.totalWinnings / 10) * 10}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="font-medium">{t('stats.net_profit')}</span>
                  <div className="flex items-center gap-2">
                    {overallStats.netProfit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={`font-bold text-lg ${overallStats.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {overallStats.netProfit >= 0 ? '+' : ''}£{Math.round(overallStats.netProfit / 10) * 10}
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
                    {t('stats.stats_by_club')}
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
                          {club.netProfit >= 0 ? '+' : ''}£{Math.round(club.netProfit / 10) * 10}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{t('stats.n_games', { count: club.gamesPlayed })}</span>
                        <span>{t('stats.n_wins', { count: club.wins })}</span>
                        <span>{t('stats.n_cashes', { count: club.cashes })}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}
