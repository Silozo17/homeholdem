import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  PlayCircle, 
  UserMinus, 
  RefreshCcw, 
  Gift, 
  TrendingUp, 
  Coffee, 
  Trophy 
} from 'lucide-react';
import { format } from 'date-fns';

interface GameActivity {
  id: string;
  activity_type: string;
  player_name: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface ActivityFeedProps {
  sessionId: string;
  currencySymbol?: string;
}

export function ActivityFeed({ sessionId, currencySymbol = '£' }: ActivityFeedProps) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<GameActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial activities
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_activity_log')
        .select('*')
        .eq('game_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setActivities(data as GameActivity[]);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [sessionId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`activity-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_activity_log',
        filter: `game_session_id=eq.${sessionId}`,
      }, (payload) => {
        setActivities(prev => [payload.new as GameActivity, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'game_started':
        return <PlayCircle className="h-4 w-4 text-green-500" />;
      case 'player_eliminated':
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'rebuy':
        return <RefreshCcw className="h-4 w-4 text-blue-500" />;
      case 'addon':
        return <Gift className="h-4 w-4 text-purple-500" />;
      case 'blinds_up':
        return <TrendingUp className="h-4 w-4 text-amber-500" />;
      case 'break_start':
      case 'break_end':
        return <Coffee className="h-4 w-4 text-yellow-500" />;
      case 'game_completed':
        return <Trophy className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: GameActivity): string => {
    const { activity_type, player_name, metadata } = activity;

    switch (activity_type) {
      case 'game_started':
        return 'Tournament started';
      case 'player_eliminated':
        return `${player_name} finished ${metadata?.position}${getOrdinalSuffix(metadata?.position || 0)} (${metadata?.playersRemaining} remaining)`;
      case 'rebuy':
        return `${player_name} rebought${metadata?.prizePool ? ` • Pool: ${currencySymbol}${metadata.prizePool}` : ''}`;
      case 'addon':
        return `${player_name} added on${metadata?.prizePool ? ` • Pool: ${currencySymbol}${metadata.prizePool}` : ''}`;
      case 'blinds_up':
        return `Level ${metadata?.level}: ${metadata?.smallBlind}/${metadata?.bigBlind}${metadata?.ante ? ` (ante ${metadata.ante})` : ''}`;
      case 'break_start':
        return `Break started`;
      case 'break_end':
        return `Break ended`;
      case 'game_completed':
        return metadata?.winner ? `${metadata.winner} wins!` : 'Tournament complete';
      default:
        return activity_type;
    }
  };

  const getOrdinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const getActivityBadgeColor = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'player_eliminated':
        return 'destructive';
      case 'game_started':
      case 'game_completed':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading activity...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {t('game.live_activity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No activity yet
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{getActivityText(activity)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'HH:mm')}
                    </p>
                  </div>
                  <Badge 
                    variant={getActivityBadgeColor(activity.activity_type)}
                    className="flex-shrink-0 text-xs"
                  >
                    {activity.activity_type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
