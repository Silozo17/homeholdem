import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useClubCurrency } from '@/hooks/useClubCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Download } from 'lucide-react';
import { exportLeaderboardToCSV } from '@/lib/csv-export';
import { TappablePlayer } from '@/components/common/TappablePlayer';

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

    // Get all players from game sessions
    const { data: players } = await supabase
      .from('game_players')
      .select('id, user_id, placeholder_player_id, display_name, finish_position, game_session_id')
      .in('game_session_id', sessionIds);

    if (!players) {
      setStats([]);
      setLoading(false);
      return;
    }

    // Get ALL placeholder players for this club (not just those with games)
    const { data: allPlaceholders } = await supabase
      .from('placeholder_players')
      .select('id, display_name, linked_user_id')
      .eq('club_id', clubId);

    const placeholderMap = new Map(allPlaceholders?.map(p => [p.id, p]) || []);

    // Get profiles for linked users AND direct users
    const linkedUserIds = allPlaceholders?.map(p => p.linked_user_id).filter(Boolean) as string[] || [];
    const directUserIds = players.map(p => p.user_id).filter(Boolean) as string[];
    const allUserIds = [...new Set([...linkedUserIds, ...directUserIds])];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', allUserIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Get payouts from payout_structures (historical data)
    const { data: payouts } = await supabase
      .from('payout_structures')
      .select('player_id, amount')
      .in('game_session_id', sessionIds)
      .not('player_id', 'is', null);

    // ALSO get payouts from game_transactions (live games)
    const { data: transactionPayouts } = await supabase
      .from('game_transactions')
      .select('game_player_id, amount')
      .in('game_session_id', sessionIds)
      .eq('transaction_type', 'payout');

    // Create a map from game_player.id to payout amount
    const payoutMap = new Map<string, number>();
    
    // Add from payout_structures (historical)
    payouts?.forEach(p => {
      if (p.player_id && p.amount) {
        payoutMap.set(p.player_id, (payoutMap.get(p.player_id) || 0) + p.amount);
      }
    });

    // Add from game_transactions (live games) - amounts are negative
    transactionPayouts?.forEach(t => {
      if (t.game_player_id && t.amount) {
        const payoutAmount = Math.abs(t.amount);
        payoutMap.set(t.game_player_id, (payoutMap.get(t.game_player_id) || 0) + payoutAmount);
      }
    });

    // Initialize stats for ALL placeholder players (so everyone appears)
    const statsMap = new Map<string, PlayerStats>();
    
    allPlaceholders?.forEach(placeholder => {
      let playerKey: string;
      let displayName = placeholder.display_name;
      let avatarUrl: string | null = null;
      
      if (placeholder.linked_user_id) {
        playerKey = placeholder.linked_user_id;
        const profile = profileMap.get(placeholder.linked_user_id);
        if (profile) {
          displayName = profile.display_name;
          avatarUrl = profile.avatar_url;
        }
      } else {
        playerKey = placeholder.id;
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
    });

    // Aggregate stats from actual game records
    players.forEach(player => {
      let playerKey: string;
      let displayName = player.display_name;
      let avatarUrl: string | null = null;

      if (player.placeholder_player_id) {
        const placeholder = placeholderMap.get(player.placeholder_player_id);
        if (placeholder) {
          if (placeholder.linked_user_id) {
            playerKey = placeholder.linked_user_id;
            const profile = profileMap.get(placeholder.linked_user_id);
            if (profile) {
              displayName = profile.display_name;
              avatarUrl = profile.avatar_url;
            }
          } else {
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
      if (avatarUrl && !stat.avatar_url) {
        stat.avatar_url = avatarUrl;
        stat.display_name = displayName;
      }

      stat.games_played++;
      
      // Filter out unreasonable finish positions (>20 indicates bad/placeholder data)
      const MAX_REASONABLE_POSITION = 20;
      if (player.finish_position && player.finish_position <= MAX_REASONABLE_POSITION) {
        if (player.finish_position === 1) {
          stat.wins++;
        } else if (player.finish_position === 2) {
          stat.second_places++;
        }
      }

      const payout = payoutMap.get(player.id);
      if (payout) {
        stat.total_winnings += payout;
      }
    });

    statsMap.forEach(stat => {
      stat.net_profit = stat.total_winnings;
    });

    // Sort by wins, then second places, then total winnings
    const sortedStats = Array.from(statsMap.values())
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.second_places !== a.second_places) return b.second_places - a.second_places;
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
          <div className="animate-pulse text-center text-muted-foreground">{t('stats_section.loading_stats')}</div>
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
            {t('stats_section.all_time_leaderboard')}
          </CardTitle>
          {stats.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              {t('stats_section.export')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <div className="text-center py-6">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">
              {t('stats_section.no_games')}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.map((player, index) => (
              <TappablePlayer key={player.player_key} userId={player.player_key} disabled={!player.player_key || player.player_key.length !== 36}>
                <div 
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
                      <span>{player.games_played} {t('stats_section.games_suffix')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">{player.wins} <Trophy className="h-3 w-3 text-yellow-500" /></span>
                      {player.second_places > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">{player.second_places} <Medal className="h-3 w-3 text-gray-400" /></span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="default"
                      className="font-mono"
                    >
                      {symbol}{Math.round(player.total_winnings / 10) * 10}
                    </Badge>
                  </div>
                </div>
              </TappablePlayer>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
