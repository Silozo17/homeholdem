import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubCurrency } from '@/hooks/useClubCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Download } from 'lucide-react';
import { exportLeaderboardToCSV } from '@/lib/csv-export';

interface PlayerStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  wins: number;
  total_buy_ins: number;
  total_winnings: number;
  net_profit: number;
}

interface LeaderboardProps {
  clubId: string;
  clubName: string;
}

export function Leaderboard({ clubId, clubName }: LeaderboardProps) {
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { symbol } = useClubCurrency(clubId);

  useEffect(() => {
    fetchStats();
  }, [clubId]);

  const fetchStats = async () => {
    setLoading(true);

    // Get all game sessions for this club
    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('club_id', clubId);

    if (!events || events.length === 0) {
      setLoading(false);
      return;
    }

    const eventIds = events.map(e => e.id);

    // Get all game sessions
    const { data: sessions } = await supabase
      .from('game_sessions')
      .select('id')
      .in('event_id', eventIds);

    if (!sessions || sessions.length === 0) {
      setLoading(false);
      return;
    }

    const sessionIds = sessions.map(s => s.id);

    // Get all players and their transactions
    const { data: players } = await supabase
      .from('game_players')
      .select('user_id, display_name, finish_position, game_session_id')
      .in('game_session_id', sessionIds);

    const { data: transactions } = await supabase
      .from('game_transactions')
      .select('game_player_id, transaction_type, amount')
      .in('game_session_id', sessionIds);

    const { data: payouts } = await supabase
      .from('payout_structures')
      .select('player_id, amount')
      .in('game_session_id', sessionIds)
      .not('player_id', 'is', null);

    if (!players) {
      setLoading(false);
      return;
    }

    // Get unique user IDs and fetch profiles
    const userIds = [...new Set(players.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Aggregate stats per user
    const statsMap = new Map<string, PlayerStats>();

    players.forEach(player => {
      const userId = player.user_id;
      if (!statsMap.has(userId)) {
        const profile = profileMap.get(userId);
        statsMap.set(userId, {
          user_id: userId,
          display_name: profile?.display_name || player.display_name,
          avatar_url: profile?.avatar_url || null,
          games_played: 0,
          wins: 0,
          total_buy_ins: 0,
          total_winnings: 0,
          net_profit: 0,
        });
      }

      const stat = statsMap.get(userId)!;
      stat.games_played++;
      
      if (player.finish_position === 1) {
        stat.wins++;
      }
    });

    // Create a map from game_player.id to user_id
    const { data: allPlayers } = await supabase
      .from('game_players')
      .select('id, user_id')
      .in('game_session_id', sessionIds);
    
    const gamePlayerToUser = new Map(allPlayers?.map(p => [p.id, p.user_id]) || []);

    transactions?.forEach(tx => {
      const userId = gamePlayerToUser.get(tx.game_player_id);
      if (userId && statsMap.has(userId)) {
        const stat = statsMap.get(userId)!;
        if (tx.transaction_type === 'buy_in' || tx.transaction_type === 'rebuy' || tx.transaction_type === 'addon') {
          stat.total_buy_ins += tx.amount;
        }
      }
    });

    payouts?.forEach(payout => {
      if (payout.player_id && payout.amount) {
        const userId = gamePlayerToUser.get(payout.player_id);
        if (userId && statsMap.has(userId)) {
          statsMap.get(userId)!.total_winnings += payout.amount;
        }
      }
    });

    // Calculate net profit
    statsMap.forEach(stat => {
      stat.net_profit = stat.total_winnings - stat.total_buy_ins;
    });

    // Sort by wins, then net profit
    const sortedStats = Array.from(statsMap.values())
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.net_profit - a.net_profit;
      });

    setStats(sortedStats);
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1: return <Medal className="h-5 w-5 text-gray-400" />;
      case 2: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="w-5 text-center text-muted-foreground font-medium">{index + 1}</span>;
    }
  };

  const handleExport = () => {
    exportLeaderboardToCSV(stats, clubName);
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8">
          <div className="animate-pulse text-center text-muted-foreground">Loading stats...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
          {stats.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2 opacity-30">🏆</div>
            <p className="text-sm text-muted-foreground">
              No games played yet. Complete a game to see stats!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.map((player, index) => (
              <div 
                key={player.user_id}
                className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0"
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                  {player.avatar_url ? (
                    <img 
                      src={player.avatar_url} 
                      alt={player.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {player.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{player.display_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{player.games_played} games</span>
                    <span>•</span>
                    <span>{player.wins} wins</span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={player.net_profit >= 0 ? 'default' : 'destructive'}
                    className="font-mono"
                  >
                    {player.net_profit >= 0 ? '+' : ''}{symbol}{Math.abs(player.net_profit)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
