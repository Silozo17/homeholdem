import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
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
}

interface Standing {
  user_id: string;
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
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      setSeasons(data);
      // Select active season or most recent
      const activeSeason = data.find(s => s.is_active) || data[0];
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
      // Get profiles
      const userIds = standingsData.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      setStandings(standingsData.map(s => ({
        ...s,
        display_name: profileMap.get(s.user_id) || 'Unknown',
      })));
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeasonName || !startDate || !endDate) {
      toast.error('Please fill in all fields');
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
      toast.error('Failed to create season');
      return;
    }

    toast.success('Season created!');
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
          <div className="animate-pulse text-center text-muted-foreground">Loading seasons...</div>
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
              Season Standings
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Season
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {seasons.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2 opacity-30">🏆</div>
              <p className="text-sm text-muted-foreground">
                No seasons yet. Create one to start tracking points!
              </p>
            </div>
          ) : (
            <>
              {/* Season Selector */}
              <div className="flex items-center gap-2">
                <Select value={selectedSeasonId || ''} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map(season => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name} {season.is_active && '(Active)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Season Info */}
              {selectedSeason && (
                <div className="text-xs text-muted-foreground text-center">
                  {format(new Date(selectedSeason.start_date), 'MMM d, yyyy')} - {format(new Date(selectedSeason.end_date), 'MMM d, yyyy')}
                  {selectedSeason.is_active && (
                    <Badge variant="default" className="ml-2">Active</Badge>
                  )}
                </div>
              )}

              {/* Standings */}
              {standings.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    No standings yet. Complete a game to see points!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {standings.map((player, index) => (
                    <div 
                      key={player.user_id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        index < 3 ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 flex justify-center">
                          {getPositionIcon(index)}
                        </div>
                        <div>
                          <p className="font-medium">{player.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.games_played} games • {player.wins}W
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{player.total_points} pts</p>
                        <p className="text-xs text-muted-foreground">
                          ${player.total_winnings} won
                        </p>
                      </div>
                    </div>
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
            <DialogTitle>Create New Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Season Name</Label>
              <Input
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="e.g., 2026 Spring Season"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">Default Points:</p>
              <p>1st: 10 pts • 2nd: 7 pts • 3rd: 5 pts • 4th: 3 pts • Participation: 1 pt</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateSeason}>Create Season</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
