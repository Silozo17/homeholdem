import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Target, Trophy, Clock, Flame, Download } from 'lucide-react';

interface CareerData {
  gamesPlayed: number;
  handsPlayed: number;
  handsWon: number;
  winRate: number;
  bestHand: string | null;
  biggestPot: number | null;
  totalSeconds: number;
}

export const PokerCareerStats = memo(function PokerCareerStats() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<CareerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('poker_play_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        setStats(null);
        setLoading(false);
        return;
      }

      const gamesPlayed = data.length;
      const handsPlayed = data.reduce((s, r) => s + (r.hands_played || 0), 0);
      const handsWon = data.reduce((s, r) => s + (r.hands_won || 0), 0);
      const totalSeconds = data.reduce((s, r) => s + (r.duration_seconds || 0), 0);
      const bestHandEntry = data.reduce((best, r) =>
        (r.best_hand_rank || 999) < (best?.best_hand_rank || 999) ? r : best, data[0]);
      const biggestPotEntry = data.reduce((best, r) =>
        (r.biggest_pot || 0) > (best?.biggest_pot || 0) ? r : best, data[0]);

      setStats({
        gamesPlayed,
        handsPlayed,
        handsWon,
        winRate: handsPlayed > 0 ? Math.round((handsWon / handsPlayed) * 100) : 0,
        bestHand: bestHandEntry?.best_hand_name || null,
        biggestPot: biggestPotEntry?.biggest_pot || null,
        totalSeconds,
      });
      setLoading(false);
    })();
  }, [user]);

  const exportCSV = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('poker_play_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!data || data.length === 0) return;

    const headers = ['Date', 'Mode', 'Bots', 'Starting Chips', 'Final Chips', 'Hands Played', 'Hands Won', 'Best Hand', 'Biggest Pot', 'Duration (min)'];
    const rows = data.map(r => [
      new Date(r.created_at).toLocaleDateString(),
      r.game_mode,
      r.bot_count,
      r.starting_chips,
      r.final_chips,
      r.hands_played,
      r.hands_won,
      r.best_hand_name || '',
      r.biggest_pot || '',
      r.duration_seconds ? Math.round(r.duration_seconds / 60) : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poker-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return null;
  if (!stats) return null;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            {t('poker_stats.career_stats')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={exportCSV} className="text-xs gap-1">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('poker_stats.practice_stats')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('poker_stats.games_played')}</p>
            <p className="text-xl font-bold">{stats.gamesPlayed}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{t('poker_stats.hands_played')}</p>
            <p className="text-xl font-bold">{stats.handsPlayed}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> {t('poker_stats.win_rate')}
            </p>
            <p className="text-xl font-bold text-primary">{stats.winRate}%</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3" /> {t('poker_stats.best_hand')}
            </p>
            <p className="text-sm font-bold text-primary truncate">{stats.bestHand || '-'}</p>
          </div>
          {stats.biggestPot && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3" /> {t('poker_stats.biggest_pot')}
              </p>
              <p className="text-xl font-bold">{stats.biggestPot.toLocaleString()}</p>
            </div>
          )}
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t('poker_stats.total_time')}
            </p>
            <p className="text-xl font-bold">{formatTime(stats.totalSeconds)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
