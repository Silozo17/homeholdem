import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useClubCurrency } from '@/hooks/useClubCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Download } from 'lucide-react';
import { exportLeaderboardToCSV } from '@/lib/csv-export';

interface PlayerStats {
  player_key: string; // canonical key (linked_user_id or placeholder_player_id or user_id)
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  wins: number;
  second_places: number;
  total_winnings: number;
  // For CSV export compatibility
  user_id: string;
  total_buy_ins: number;
  net_profit: number;
}

interface LeaderboardProps {
  clubId: string;
  clubName: string;
}

export function Leaderboard({ clubId, clubName }: LeaderboardProps) {
  const { t } = useTranslation();
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
      setStats([]);
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
      setStats([]);
      setLoading(false);
      return;
    }

    const sessionIds = sessions.map(s => s.id);

    // Get all players with placeholder_player_id
    const { data: players } = await supabase
      .from('game_players')
      .select('id, user_id, placeholder_player_id, display_name, finish_position, game_session_id')
      .in('game_session_id', sessionIds);

    if (!players) {
      setStats([]);
      setLoading(false);
      return;
    }

    // Get all placeholder players with their linked user_ids
    const placeholderIds = [...new Set(players.map(p => p.placeholder_player_id).filter(Boolean))];
    const { data: placeholders } = await supabase
      .from('placeholder_players')
      .select('id, display_name, linked_user_id')
      .in('id', placeholderIds);

    const placeholderMap = new Map(placeholders?.map(p => [p.id, p]) || []);

    // Get profiles for linked users AND direct users
    const linkedUserIds = placeholders?.map(p => p.linked_user_id).filter(Boolean) as string[] || [];
    const directUserIds = players.map(p => p.user_id).filter(Boolean) as string[];
    const allUserIds = [...new Set([...linkedUserIds, ...directUserIds])];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', allUserIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Get payouts
    const { data: payouts } = await supabase
      .from('payout_structures')
      .select('player_id, amount')
      .in('game_session_id', sessionIds)
      .not('player_id', 'is', null);

    // Create a map from game_player.id to payout amount
    const payoutMap = new Map<string, number>();
    payouts?.forEach(p => {
      if (p.player_id && p.amount) {
        payoutMap.set(p.player_id, (payoutMap.get(p.player_id) || 0) + p.amount);
      }
    });

    // Aggregate stats per unique player
    // KEY LOGIC: Use linked_user_id if placeholder has one, otherwise use placeholder_player_id, otherwise user_id
    const statsMap = new Map<string, PlayerStats>();

    players.forEach(player => {
      let playerKey: string;
      let displayName = player.display_name;
      let avatarUrl: string | null = null;

      if (player.placeholder_player_id) {
        const placeholder = placeholderMap.get(player.placeholder_player_id);
        if (placeholder) {
          // If placeholder is linked to a real user, use that user_id as the key
          if (placeholder.linked_user_id) {
            playerKey = placeholder.linked_user_id;
            const profile = profileMap.get(placeholder.linked_user_id);
            if (profile) {
              displayName = profile.display_name;
              avatarUrl = profile.avatar_url;
            }
          } else {
            // Placeholder not linked, use placeholder_player_id as key
            playerKey = player.placeholder_player_id;
            displayName = placeholder.display_name;
          }
        } else {
          playerKey = player.placeholder_player_id;
        }
      } else if (player.user_id) {
        playerKey = player.user_id;
        const profile = profileMap.get(player.user_id);
        if (profile) {
          displayName = profile.display_name;
          avatarUrl = profile.avatar_url;
        }
      } else {
        return; // Skip if no identifier
      }

      if (!statsMap.has(playerKey)) {
        statsMap.set(playerKey, {
          player_key: playerKey,
          user_id: playerKey,
          display_name: displayName,
          avatar_url: avatarUrl,
          games_played: 0,
          wins: 0,
          second_places: 0,
          total_buy_ins: 0,
          total_winnings: 0,
          net_profit: 0,
        });
      }

      const stat = statsMap.get(playerKey)!;
      // Update display name/avatar if better data available
      if (avatarUrl && !stat.avatar_url) {
        stat.avatar_url = avatarUrl;
        stat.display_name = displayName;
      }

      stat.games_played++;
      
      if (player.finish_position === 1) {
        stat.wins++;
      } else if (player.finish_position === 2) {
        stat.second_places++;
      }

      // Add winnings from payout
      const payout = payoutMap.get(player.id);
      if (payout) {
        stat.total_winnings += payout;
      }
    });

    // Calculate net profit (winnings only, no buy-in data for historical games)
    statsMap.forEach(stat => {
      stat.net_profit = stat.total_winnings;
    });

    // Sort by wins, then total winnings
    const sortedStats = Array.from(statsMap.values())
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.total_winnings - a.total_winnings;
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
          <div className="animate-pulse text-center text-muted-foreground">{t('leaderboard.loading')}</div>
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
            {t('leaderboard.all_time')}
          </CardTitle>
          {stats.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              {t('common.export')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2 opacity-30">🏆</div>
            <p className="text-sm text-muted-foreground">
              {t('leaderboard.no_games')}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.map((player, index) => (
              <div 
                key={player.player_key}
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
                    <span>{player.games_played} {t('leaderboard.games')}</span>
                    <span>•</span>
                    <span>{player.wins} 🥇</span>
                    {player.second_places > 0 && (
                      <>
                        <span>•</span>
                        <span>{player.second_places} 🥈</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant="default"
                    className="font-mono"
                  >
                    {symbol}{player.total_winnings}
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
