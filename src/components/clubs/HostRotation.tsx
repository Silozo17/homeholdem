import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, User } from 'lucide-react';

interface HostStats {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  host_count: number;
  last_hosted: string | null;
}

interface HostRotationProps {
  clubId: string;
}

export function HostRotation({ clubId }: HostRotationProps) {
  const { t } = useTranslation();
  const [hostStats, setHostStats] = useState<HostStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHostStats();
  }, [clubId]);

  const fetchHostStats = async () => {
    setLoading(true);

    // Get all club members
    const { data: members } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId);

    if (!members || members.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = members.map(m => m.user_id);

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    // Get all events with hosts for this club
    const { data: events } = await supabase
      .from('events')
      .select('host_user_id, final_date')
      .eq('club_id', clubId)
      .not('host_user_id', 'is', null);

    // Calculate host counts
    const hostCounts = new Map<string, { count: number; lastHosted: string | null }>();
    
    userIds.forEach(userId => {
      hostCounts.set(userId, { count: 0, lastHosted: null });
    });

    events?.forEach(event => {
      if (event.host_user_id) {
        const current = hostCounts.get(event.host_user_id) || { count: 0, lastHosted: null };
        current.count++;
        if (!current.lastHosted || (event.final_date && event.final_date > current.lastHosted)) {
          current.lastHosted = event.final_date;
        }
        hostCounts.set(event.host_user_id, current);
      }
    });

    // Build stats array
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const stats: HostStats[] = userIds.map(userId => {
      const profile = profileMap.get(userId);
      const hostData = hostCounts.get(userId) || { count: 0, lastHosted: null };
      return {
        user_id: userId,
        display_name: profile?.display_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        host_count: hostData.count,
        last_hosted: hostData.lastHosted,
      };
    });

    // Sort by host count (ascending) - least hosts first as "suggested next"
    stats.sort((a, b) => {
      if (a.host_count !== b.host_count) return a.host_count - b.host_count;
      // If equal, sort by last hosted (oldest first)
      if (!a.last_hosted) return -1;
      if (!b.last_hosted) return 1;
      return new Date(a.last_hosted).getTime() - new Date(b.last_hosted).getTime();
    });

    setHostStats(stats);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8">
          <div className="animate-pulse text-center text-muted-foreground">{t('host_section.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  const suggestedHost = hostStats[0];

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" />
          {t('host_section.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hostStats.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2 opacity-30">🏠</div>
            <p className="text-sm text-muted-foreground">
              {t('host_section.no_members')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Suggested Next Host */}
            {suggestedHost && (
              <div className="bg-primary/10 rounded-lg p-3 mb-4">
                <p className="text-xs text-primary font-medium mb-2">{t('host_section.suggested_next')}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {suggestedHost.avatar_url ? (
                      <img 
                        src={suggestedHost.avatar_url} 
                        alt={suggestedHost.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{suggestedHost.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestedHost.host_count === 0 
                        ? t('host_section.hasnt_hosted')
                        : t('host_section.hosted_times', { count: suggestedHost.host_count })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* All Members */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('host_section.all_members')}</p>
              {hostStats.map((member, index) => (
                <div 
                  key={member.user_id}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {member.display_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm">{member.display_name}</span>
                    {index === 0 && <Badge variant="outline" className="text-xs">{t('host_section.next')}</Badge>}
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-mono">
                      {member.host_count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
