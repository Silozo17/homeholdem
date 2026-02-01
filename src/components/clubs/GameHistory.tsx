import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useClubCurrency } from '@/hooks/useClubCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ChevronRight, Download, Trophy } from 'lucide-react';
import { exportGameHistoryToCSV } from '@/lib/csv-export';
import { CardSuit } from '@/components/common/CardSuits';

interface GameSession {
  id: string;
  event_id: string;
  event_title: string;
  final_date: string | null;
  status: string;
  player_count: number;
  prize_pool: number;
  winner_name: string | null;
}

interface GameHistoryProps {
  clubId: string;
  clubName: string;
}

export function GameHistory({ clubId, clubName }: GameHistoryProps) {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { symbol } = useClubCurrency(clubId);

  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  useEffect(() => {
    fetchSessions();
  }, [clubId]);

  const fetchSessions = async () => {
    setLoading(true);

    // Get all events for this club
    const { data: events } = await supabase
      .from('events')
      .select('id, title, final_date')
      .eq('club_id', clubId);

    if (!events || events.length === 0) {
      setLoading(false);
      return;
    }

    const eventIds = events.map(e => e.id);
    const eventMap = new Map(events.map(e => [e.id, e]));

    // Get all game sessions
    const { data: gameSessions } = await supabase
      .from('game_sessions')
      .select('id, event_id, status')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false });

    if (!gameSessions || gameSessions.length === 0) {
      setLoading(false);
      return;
    }

    // Get player counts and winners
    const sessionsWithData = await Promise.all(
      gameSessions.map(async (session) => {
        const event = eventMap.get(session.event_id);
        
        // Get player count
        const { count: playerCount } = await supabase
          .from('game_players')
          .select('*', { count: 'exact', head: true })
          .eq('game_session_id', session.id);

        // Get session details (including prize_pool_override)
        const { data: sessionDetails } = await supabase
          .from('game_sessions')
          .select('prize_pool_override')
          .eq('id', session.id)
          .single();

        // Get prize pool (sum of buy-in, rebuy, addon transactions only - not payouts)
        const { data: transactions } = await supabase
          .from('game_transactions')
          .select('amount, transaction_type')
          .eq('game_session_id', session.id);

        const calculatedPool = transactions
          ?.filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
          .reduce((sum, t) => sum + t.amount, 0) || 0;

        // Use prize_pool_override if set, otherwise use calculated pool
        const prizePool = sessionDetails?.prize_pool_override ?? calculatedPool;

        // Get winner (player with finish_position = 1)
        const { data: winner } = await supabase
          .from('game_players')
          .select('display_name')
          .eq('game_session_id', session.id)
          .eq('finish_position', 1)
          .single();

        return {
          id: session.id,
          event_id: session.event_id,
          event_title: event?.title || 'Unknown Event',
          final_date: event?.final_date || null,
          status: session.status,
          player_count: playerCount || 0,
          prize_pool: prizePool,
          winner_name: winner?.display_name || null,
        };
      })
    );

    // Sort by final_date descending (newest first)
    const sortedSessions = sessionsWithData.sort((a, b) => {
      if (!a.final_date && !b.final_date) return 0;
      if (!a.final_date) return 1;
      if (!b.final_date) return -1;
      return new Date(b.final_date).getTime() - new Date(a.final_date).getTime();
    });

    setSessions(sortedSessions);
    setLoading(false);
  };

  const handleExport = () => {
    const historyData = sessions.map(s => ({
      date: s.final_date ? format(new Date(s.final_date), 'yyyy-MM-dd') : 'TBD',
      event_title: s.event_title,
      players: s.player_count,
      prize_pool: s.prize_pool,
      winner: s.winner_name || 'In Progress',
    }));
    exportGameHistoryToCSV(historyData, clubName);
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return t('stats_section.completed');
    if (status === 'active') return t('stats_section.in_progress');
    if (status === 'paused') return t('stats_section.in_progress');
    return status;
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8">
          <div className="animate-pulse text-center text-muted-foreground">{t('stats_section.loading_history')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {t('stats_section.game_history')}
          </CardTitle>
          {sessions.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              {t('stats_section.export')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-6">
            <CardSuit suit="spade" size="xl" className="mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">
              {t('stats_section.no_history')}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {sessions.map((session) => (
              <div 
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/event/${session.event_id}/game`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{session.event_title}</p>
                    <Badge 
                      variant={session.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {getStatusLabel(session.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {session.final_date && (
                      <span>{format(new Date(session.final_date), 'MMM d, yyyy', { locale: dateLocale })}</span>
                    )}
                    <span>•</span>
                    <span>{session.player_count} {t('stats_section.players')}</span>
                    <span>•</span>
                    <span>{symbol}{session.prize_pool} {t('stats_section.pool')}</span>
                  </div>
                  {session.winner_name && (
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> {t('stats_section.winner')}: {session.winner_name}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
