import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, RefreshCw, ArrowLeft, Trophy, Clock, Hash, Copy, Check, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CardFan } from './CardFan';
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callEdge(fn: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Edge function error');
  return data;
}

interface BlindLevel {
  level: number;
  small?: number;
  big?: number;
  ante?: number;
  break?: boolean;
  duration_minutes: number;
}

interface TournamentSummary {
  id: string;
  name: string;
  status: string;
  max_players: number;
  starting_stack: number;
  player_count: number;
  created_by: string;
  invite_code: string | null;
  club_id: string | null;
}

interface TournamentDetail {
  tournament: any;
  blind_schedule: BlindLevel[];
  current_blinds: BlindLevel | null;
  time_remaining_seconds: number | null;
  players: any[];
  tables: any[];
  my_table_id: string | null;
  players_remaining: number;
  total_players: number;
}

interface TournamentLobbyProps {
  onJoinTable: (tableId: string) => void;
  clubId?: string;
}

export function TournamentLobby({ onJoinTable, clubId }: TournamentLobbyProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);

  // Detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(18);
  const [startingStack, setStartingStack] = useState(5000);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchTournaments = useCallback(async () => {
    try {
      let query = supabase
        .from('poker_tournaments')
        .select('id, name, status, max_players, starting_stack, created_by, invite_code, club_id')
        .in('status', ['registering', 'running'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (clubId) query = query.eq('club_id', clubId);

      const { data: allT } = await query;
      if (!allT) { setTournaments([]); return; }

      const tIds = allT.map(t => t.id);
      const { data: players } = await supabase
        .from('poker_tournament_players')
        .select('tournament_id')
        .in('tournament_id', tIds.length > 0 ? tIds : ['none']);

      const countMap = new Map<string, number>();
      (players || []).forEach(p => { countMap.set(p.tournament_id, (countMap.get(p.tournament_id) || 0) + 1); });

      setTournaments(allT.map(t => ({ ...t, player_count: countMap.get(t.id) || 0 })));
    } catch { /* */ } finally { setLoading(false); }
  }, [clubId]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const fetchDetail = useCallback(async (tid: string) => {
    setDetailLoading(true);
    try {
      const data = await callEdge('poker-tournament-state', { tournament_id: tid });
      setDetail(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  // Realtime subscription for tournament updates
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase.channel(`tournament:${selectedId}`)
      .on('broadcast', { event: 'elimination' }, () => fetchDetail(selectedId))
      .on('broadcast', { event: 'level_change' }, () => fetchDetail(selectedId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId, fetchDetail]);

  const handleCreate = async () => {
    if (!name.trim()) { toast({ title: 'Enter a tournament name', variant: 'destructive' }); return; }
    setCreating(true);
    try {
      const data = await callEdge('poker-create-tournament', {
        name: name.trim(),
        max_players: maxPlayers,
        starting_stack: startingStack,
        club_id: clubId || null,
      });
      setCreateOpen(false);
      setName('');
      setSelectedId(data.tournament.id);
      fetchTournaments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const handleRegister = async (tid: string) => {
    try {
      await callEdge('poker-register-tournament', { tournament_id: tid });
      toast({ title: 'Registered!' });
      if (selectedId === tid) fetchDetail(tid);
      fetchTournaments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleJoinByCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) return;
    setJoiningByCode(true);
    try {
      const data = await callEdge('poker-register-tournament', { invite_code: code });
      setJoinCodeOpen(false);
      setInviteCode('');
      setSelectedId(data.tournament.id);
      fetchTournaments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setJoiningByCode(false); }
  };

  const handleStart = async (tid: string) => {
    try {
      const data = await callEdge('poker-start-tournament', { tournament_id: tid });
      toast({ title: 'Tournament started!', description: `${data.player_count} players across ${data.table_count} tables` });
      fetchDetail(tid);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Detail view
  if (selectedId && detail) {
    const t = detail.tournament;
    const isCreator = t.created_by === user?.id;
    const isRegistered = detail.players.some((p: any) => p.player_id === user?.id);
    const isRunning = t.status === 'running';

    return (
      <div className="flex flex-col min-h-[100dvh] poker-felt-bg card-suit-pattern safe-area-bottom overflow-x-hidden">
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
          <div className="container relative flex items-center justify-center h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedId(null); setDetail(null); }} className="absolute left-4 text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
            <div className="absolute right-4 flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => fetchDetail(selectedId)}>
                <RefreshCw className={cn('h-4 w-4', detailLoading && 'animate-spin')} />
              </Button>
              <NotificationBell />
            </div>
          </div>
        </header>
        <div className="h-14 safe-area-top shrink-0" />

        <div className="flex-1 px-4 pt-4 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-black text-shimmer">{t.name}</h1>
            <Badge variant={isRunning ? 'default' : 'secondary'} className="text-[10px]">
              {t.status === 'registering' ? 'Registration Open' : isRunning ? 'In Progress' : t.status}
            </Badge>
          </div>

          {/* Invite code */}
          {t.invite_code && (
            <div className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Invite Code</p>
                <p className="text-xl font-mono font-bold tracking-[0.3em] text-primary">{t.invite_code}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyCode(t.invite_code)}>
                {copiedCode ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Tournament info */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Players</p>
              <p className="text-lg font-bold text-primary">{detail.players_remaining}/{detail.total_players}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Stack</p>
              <p className="text-lg font-bold text-primary">{t.starting_stack.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Tables</p>
              <p className="text-lg font-bold text-primary">{detail.tables.length || '-'}</p>
            </div>
          </div>

          {/* Current blinds (if running) */}
          {isRunning && detail.current_blinds && (
            <div className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">
                    {detail.current_blinds.break ? 'BREAK' : `Level ${detail.current_blinds.level}`}
                  </span>
                </div>
                {detail.time_remaining_seconds !== null && (
                  <span className="text-sm font-mono text-primary">
                    {Math.floor(detail.time_remaining_seconds / 60)}:{String(Math.floor(detail.time_remaining_seconds % 60)).padStart(2, '0')}
                  </span>
                )}
              </div>
              {!detail.current_blinds.break && (
                <p className="text-xs text-muted-foreground">
                  Blinds: {detail.current_blinds.small}/{detail.current_blinds.big}
                  {(detail.current_blinds.ante || 0) > 0 && ` • Ante: ${detail.current_blinds.ante}`}
                </p>
              )}
            </div>
          )}

          {/* Blind schedule */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Blind Schedule</h3>
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {detail.blind_schedule.map((l, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between text-xs py-1 px-2 rounded',
                    isRunning && l.level === detail.current_blinds?.level && !l.break && 'bg-primary/10 text-primary font-bold',
                    l.break && 'text-amber-400 italic'
                  )}>
                    <span>{l.break ? '☕ Break' : `Level ${l.level}`}</span>
                    {!l.break && <span>{l.small}/{l.big}{(l.ante || 0) > 0 && ` (${l.ante})`}</span>}
                    <span className="text-muted-foreground">{l.duration_minutes}m</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Players */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">
              Players ({detail.total_players})
            </h3>
            <div className="space-y-1">
              {detail.players.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      p.status === 'playing' ? 'bg-green-400' : p.status === 'eliminated' ? 'bg-red-400' : 'bg-amber-400'
                    )} />
                    <span className={cn(p.status === 'eliminated' && 'text-muted-foreground line-through')}>
                      {p.display_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {p.finish_position && <Badge variant="outline" className="text-[9px]">#{p.finish_position}</Badge>}
                    {p.status === 'playing' && <span>{p.stack?.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {t.status === 'registering' && !isRegistered && (
              <Button className="w-full shimmer-btn text-primary-foreground font-bold" onClick={() => handleRegister(t.id)}>
                Register
              </Button>
            )}
            {t.status === 'registering' && isCreator && detail.total_players >= 2 && (
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => handleStart(t.id)}>
                <Play className="h-4 w-4 mr-2" />
                Start Tournament ({detail.total_players} players)
              </Button>
            )}
            {isRunning && detail.my_table_id && (
              <Button className="w-full shimmer-btn text-primary-foreground font-bold" onClick={() => onJoinTable(detail.my_table_id!)}>
                <Trophy className="h-4 w-4 mr-2" />
                Go to My Table
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex flex-col min-h-[100dvh] poker-felt-bg card-suit-pattern safe-area-bottom overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(clubId ? `/club/${clubId}` : '/poker')} className="absolute left-4 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="absolute right-4 flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => { setLoading(true); fetchTournaments(); }}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>
      <div className="h-14 safe-area-top shrink-0" />

      <div className="flex-1 px-4 pt-4 space-y-5">
        <div className="text-center space-y-2 animate-slide-up-fade">
          <h1 className="text-2xl font-black text-shimmer">
            <Trophy className="inline h-6 w-6 mr-2 text-primary" />
            Tournaments
          </h1>
          <p className="text-sm text-muted-foreground">Compete in structured poker tournaments</p>
        </div>

        {/* Action row */}
        <div className="flex gap-2 animate-slide-up-fade stagger-1">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="flex-1 glass-card rounded-2xl p-4 flex items-center gap-3 text-left group active:scale-[0.98] transition-all animate-glow-pulse">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">Create Tournament</p>
                  <p className="text-[10px] text-muted-foreground truncate">Set up a new competition</p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader><DialogTitle>Create Tournament</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Tournament name" value={name} onChange={(e) => setName(e.target.value)} />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Players</span>
                    <span className="font-bold text-primary">{maxPlayers}</span>
                  </div>
                  <Slider value={[maxPlayers]} min={2} max={36} step={1} onValueChange={([v]) => setMaxPlayers(v)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Starting Stack</span>
                    <span className="font-bold text-primary">{startingStack.toLocaleString()}</span>
                  </div>
                  <Slider value={[startingStack]} min={1000} max={50000} step={1000} onValueChange={([v]) => setStartingStack(v)} />
                </div>
                <Button className="w-full shimmer-btn text-primary-foreground font-bold" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Tournament'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={joinCodeOpen} onOpenChange={setJoinCodeOpen}>
            <DialogTrigger asChild>
              <button className="flex-1 glass-card rounded-2xl p-4 flex items-center gap-3 text-left group active:scale-[0.98] transition-all">
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0">
                  <Hash className="h-5 w-5 text-foreground/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">Join by Code</p>
                  <p className="text-[10px] text-muted-foreground truncate">Enter invite code</p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader><DialogTitle>Join Tournament by Code</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input
                  placeholder="Enter 6-character code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.3em]"
                />
                <Button className="w-full shimmer-btn text-primary-foreground font-bold" onClick={handleJoinByCode} disabled={joiningByCode || inviteCode.length < 4}>
                  {joiningByCode ? 'Joining...' : 'Join Tournament'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tournament list */}
        <div className="space-y-3 animate-slide-up-fade stagger-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tournaments.length} {tournaments.length === 1 ? 'Tournament' : 'Tournaments'}
          </h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading tournaments...</div>
          ) : tournaments.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center space-y-4">
              <CardFan />
              <p className="text-muted-foreground text-sm">No tournaments yet — create one to get started!</p>
            </div>
          ) : (
            tournaments.map(t => (
              <button
                key={t.id}
                className="w-full glass-card rounded-xl p-4 flex items-center justify-between text-left group active:scale-[0.98] transition-all hover:shadow-lg"
                onClick={() => setSelectedId(t.id)}
              >
                <div className="space-y-1.5">
                  <p className="font-bold text-foreground text-sm">{t.name}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Trophy className="h-3 w-3 text-primary" />
                    <span>{t.starting_stack.toLocaleString()} chips</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={t.status === 'running' ? 'default' : 'secondary'} className="text-[10px]">
                    {t.status === 'registering' ? 'Open' : 'Live'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{t.player_count}/{t.max_players}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
