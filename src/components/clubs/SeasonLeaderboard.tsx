import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useClubCurrency } from '@/hooks/useClubCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Trophy, Medal, Award, Star, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TappablePlayer } from '@/components/common/TappablePlayer';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  points_for_win: number;
  points_for_second: number;
  points_for_third: number;
  points_for_fourth: number;
  points_per_participation: number;
  // Computed status based on date
  computed_status?: 'active' | 'closed' | 'upcoming';
}

interface Standing {
  user_id: string | null;
  placeholder_player_id: string | null;
  display_name: string;
  total_points: number;
  games_played: number;
  wins: number;
  second_places: number;
  third_places: number;
  total_winnings: number;
}

interface SeasonLeaderboardProps {
  clubId: string;
  isAdmin: boolean;
}

export function SeasonLeaderboard({ clubId, isAdmin }: SeasonLeaderboardProps) {
  const { t, i18n } = useTranslation();
  const { symbol } = useClubCurrency(clubId);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  useEffect(() => {
    fetchSeasons();
  }, [clubId]);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchStandings(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async () => {
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .eq('club_id', clubId)
      .order('start_date', { ascending: false });

    if (data && data.length > 0) {
      // Compute status based on current date
      const today = new Date().toISOString().split('T')[0];
      const seasonsWithStatus = data.map(s => ({
        ...s,
        computed_status: 
          today >= s.start_date && today <= s.end_date ? 'active' as const :
          today > s.end_date ? 'closed' as const : 'upcoming' as const
      }));
      
      setSeasons(seasonsWithStatus);
      // Select currently active season (by date) or most recent
      const activeSeason = seasonsWithStatus.find(s => s.computed_status === 'active') || seasonsWithStatus[0];
      setSelectedSeasonId(activeSeason.id);
    }
    setLoading(false);
  };

  const fetchStandings = async (seasonId: string) => {
    const { data: standingsData } = await supabase
      .from('season_standings')
      .select('*')
      .eq('season_id', seasonId)
      .order('total_points', { ascending: false });

    if (standingsData) {
      // Get registered user profiles
      const userIds = standingsData.filter(s => s.user_id).map(s => s.user_id) as string[];
      const { data: profiles } = userIds.length > 0 
        ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
        : { data: [] };

      // Get placeholder player names
      const placeholderIds = standingsData.filter(s => s.placeholder_player_id).map(s => s.placeholder_player_id) as string[];
      const { data: placeholders } = placeholderIds.length > 0
        ? await supabase.from('placeholder_players').select('id, display_name').in('id', placeholderIds)
        : { data: [] };

      const profileMap = new Map<string, string>();
      profiles?.forEach(p => profileMap.set(p.id, p.display_name));
      const placeholderMap = new Map<string, string>();
      placeholders?.forEach(p => placeholderMap.set(p.id, p.display_name));

      setStandings(standingsData.map(s => ({
        user_id: s.user_id,
        placeholder_player_id: s.placeholder_player_id,
        total_points: s.total_points,
        games_played: s.games_played,
        wins: s.wins,
        second_places: s.second_places,
        third_places: s.third_places,
        total_winnings: s.total_winnings,
        display_name: s.user_id 
          ? profileMap.get(s.user_id) || 'Unknown'
          : placeholderMap.get(s.placeholder_player_id!) || 'Unknown',
      })));
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeasonName || !startDate || !endDate) {
      toast.error(t('stats_section.fill_all_fields'));
      return;
    }

    // Deactivate current active season
    await supabase
      .from('seasons')
      .update({ is_active: false })
      .eq('club_id', clubId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('seasons')
      .insert({
        club_id: clubId,
        name: newSeasonName,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error(t('stats_section.failed_create_season'));
      return;
    }

    toast.success(t('stats_section.season_created'));
    setShowCreate(false);
    setNewSeasonName('');
    setStartDate('');
    setEndDate('');
    fetchSeasons();
    if (data) {
      setSelectedSeasonId(data.id);
    }
  };

  const getPositionIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1: return <Medal className="h-5 w-5 text-gray-400" />;
      case 2: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <Star className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8">
          <div className="animate-pulse text-center text-muted-foreground">{t('stats_section.loading_seasons')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {t('stats_section.season_standings')}
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('stats_section.new_season')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {seasons.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2 opacity-30">🏆</div>
              <p className="text-sm text-muted-foreground">
                {t('stats_section.no_seasons')}
              </p>
            </div>
          ) : (
            <>
              {/* Season Selector */}
              <div className="flex items-center gap-2">
                <Select value={selectedSeasonId || ''} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('stats_section.select_season')} />
                  </SelectTrigger>
                <SelectContent>
                    {seasons.map(season => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name} ({season.computed_status === 'active' ? t('stats_section.active') : season.computed_status === 'closed' ? t('stats_section.closed') : t('stats_section.upcoming')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Season Info */}
              {selectedSeason && (
                <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2 flex-wrap">
                  <span>{format(new Date(selectedSeason.start_date), 'MMM d, yyyy', { locale: dateLocale })} - {format(new Date(selectedSeason.end_date), 'MMM d, yyyy', { locale: dateLocale })}</span>
                  {selectedSeason.computed_status === 'active' && (
                    <Badge variant="default" className="bg-green-600">{t('stats_section.active')}</Badge>
                  )}
                  {selectedSeason.computed_status === 'closed' && (
                    <Badge variant="secondary">{t('stats_section.closed')}</Badge>
                  )}
                  {selectedSeason.computed_status === 'upcoming' && (
                    <Badge variant="outline" className="border-blue-500 text-blue-500">{t('stats_section.upcoming')}</Badge>
                  )}
                </div>
              )}

              {/* Standings */}
              {standings.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('stats_section.no_standings')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {standings.map((player, index) => (
                    <TappablePlayer key={player.user_id || player.placeholder_player_id || index} userId={player.user_id || ''} disabled={!player.user_id}>
                      <div 
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          index < 3 ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 flex justify-center">
                            {getPositionIcon(index)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{player.display_name}</p>
                              {player.placeholder_player_id && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{t('stats_section.unlinked')}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {player.games_played} {t('stats_section.games_suffix')} • {player.wins}{t('stats_section.wins_label')} • {player.second_places}{t('stats_section.second_label')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{player.total_points} {t('stats_section.points_suffix')}</p>
                          <p className="text-xs text-muted-foreground">
                            {symbol}{player.total_winnings} {t('stats_section.won_suffix')}
                          </p>
                        </div>
                      </div>
                    </TappablePlayer>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Season Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stats_section.create_season')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('stats_section.season_name')}</Label>
              <Input
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder={t('stats_section.season_name_placeholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('club.start_date')}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('club.end_date')}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium">{t('stats_section.default_points')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreateSeason}>{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
