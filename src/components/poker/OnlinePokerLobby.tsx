import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, RefreshCw, ArrowLeft, Globe, Lock, Search, Hash, UserPlus } from 'lucide-react';
import { InvitePlayersDialog } from './InvitePlayersDialog';
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

interface TableSummary {
  id: string;
  name: string;
  table_type: string;
  max_seats: number;
  small_blind: number;
  big_blind: number;
  status: string;
  player_count: number;
  created_by: string;
  club_id: string | null;
  invite_code: string | null;
}

interface OnlinePokerLobbyProps {
  onJoinTable: (tableId: string) => void;
  clubId?: string;
}

export function OnlinePokerLobby({ onJoinTable, clubId }: OnlinePokerLobbyProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>(clubId ? 'club' : 'all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [lastCreatedTable, setLastCreatedTable] = useState<{ id: string; name: string } | null>(null);

  const [tableName, setTableName] = useState('');
  const [tableType, setTableType] = useState<'public' | 'friends' | 'club'>(clubId ? 'club' : 'friends');
  const [maxSeats, setMaxSeats] = useState(6);
  const [bigBlind, setBigBlind] = useState(100);
  const [maxBuyIn, setMaxBuyIn] = useState(10000);

  const fetchTables = useCallback(async () => {
    try {
      let query = supabase
        .from('poker_tables')
        .select('id, name, table_type, max_seats, small_blind, big_blind, status, created_by, club_id, invite_code')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (clubId) {
        query = query.eq('club_id', clubId);
      }

      const { data: allTables } = await query;

      if (!allTables) { setTables([]); return; }
      const tableIds = allTables.map(t => t.id);
      const { data: seats } = await supabase
        .from('poker_seats')
        .select('table_id')
        .in('table_id', tableIds.length > 0 ? tableIds : ['none']);

      const countMap = new Map<string, number>();
      (seats || []).forEach(s => { countMap.set(s.table_id, (countMap.get(s.table_id) || 0) + 1); });

      setTables(allTables.map(t => ({ ...t, player_count: countMap.get(t.id) || 0 })));
    } catch { /* RLS filter */ } finally { setLoading(false); }
  }, [clubId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleCreate = async () => {
    if (!tableName.trim()) { toast({ title: 'Enter a table name', variant: 'destructive' }); return; }
    setCreating(true);
    try {
      const data = await callEdge('poker-create-table', {
        name: tableName.trim(),
        table_type: clubId ? 'club' : tableType,
        max_seats: maxSeats,
        small_blind: bigBlind / 2,
        big_blind: bigBlind,
        min_buy_in: Math.round(maxBuyIn / 10),
        max_buy_in: maxBuyIn,
        club_id: clubId || null,
      });
      setCreateOpen(false);
      setTableName('');
      setLastCreatedTable({ id: data.table.id, name: tableName.trim() });
      setInviteOpen(true); // Auto-open invite dialog after creating
      onJoinTable(data.table.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const handleJoinByCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) { toast({ title: 'Enter a valid invite code', variant: 'destructive' }); return; }
    setJoiningByCode(true);
    try {
      const { data: table } = await supabase
        .from('poker_tables')
        .select('id')
        .eq('invite_code', code)
        .neq('status', 'closed')
        .single();

      if (!table) {
        toast({ title: 'Table not found', description: 'Check the invite code and try again', variant: 'destructive' });
        return;
      }
      setJoinCodeOpen(false);
      setInviteCode('');
      onJoinTable(table.id);
    } catch {
      toast({ title: 'Table not found', variant: 'destructive' });
    } finally { setJoiningByCode(false); }
  };

  const filteredTables = tables.filter(t => {
    if (clubId) return true; // Club view shows all club tables
    if (activeFilter === 'all') return true;
    if (activeFilter === 'public') return t.table_type === 'public';
    if (activeFilter === 'friends') return t.table_type === 'friends';
    if (activeFilter === 'mine') return t.created_by === user?.id;
    return true;
  });

  function SeatDots({ filled, total }: { filled: number; total: number }) {
    return (
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={cn(
            'w-2 h-2 rounded-full transition-colors',
            i < filled ? 'bg-primary' : 'bg-border/40'
          )} />
        ))}
      </div>
    );
  }

  const typeIcon = (type: string) => {
    if (type === 'public') return <Globe className="h-3 w-3 text-emerald-400" />;
    if (type === 'club') return <Users className="h-3 w-3 text-blue-400" />;
    return <Lock className="h-3 w-3 text-amber-400" />;
  };

  const typeLabel = (type: string) => {
    if (type === 'public') return 'Public';
    if (type === 'club') return 'Club';
    return 'Invite Only';
  };

  return (
    <div className="flex flex-col min-h-[100dvh] poker-felt-bg card-suit-pattern safe-area-bottom overflow-x-hidden">
      {/* Standard fixed header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(clubId ? `/club/${clubId}` : '/poker')} className="absolute left-4 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="absolute right-4 flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => { setLoading(true); fetchTables(); }}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>
      <div className="h-14 safe-area-top shrink-0" />

      <div className="flex-1 px-4 pt-4 space-y-5">
        {/* Hero */}
        <div className="text-center space-y-2 animate-slide-up-fade">
          <h1 className="text-2xl font-black text-shimmer">
            {clubId ? 'Club Tables' : 'Online Tables'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {clubId ? 'Play poker with your club members' : "Play Texas Hold'em with friends — real-time multiplayer"}
          </p>
        </div>

        {/* Action row */}
        <div className="flex gap-2 animate-slide-up-fade stagger-1">
          {/* Create table */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="flex-1 glass-card rounded-2xl p-4 flex items-center gap-3 text-left group active:scale-[0.98] transition-all animate-glow-pulse">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">Create Table</p>
                  <p className="text-[10px] text-muted-foreground truncate">Set up a new game</p>
                </div>
              </button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
              <DialogHeader><DialogTitle>Create Table</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input placeholder="Table name" value={tableName} onChange={(e) => setTableName(e.target.value)} />
                {!clubId && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Type</label>
                    <Select value={tableType} onValueChange={(v) => setTableType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friends">Friends (Invite Only)</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Seats</span>
                    <span className="font-bold text-primary">{maxSeats}</span>
                  </div>
                  <Slider value={[maxSeats]} min={2} max={9} step={1} onValueChange={([v]) => setMaxSeats(v)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Blinds</span>
                    <span className="font-bold text-primary">{bigBlind / 2}/{bigBlind}</span>
                  </div>
                  <Slider value={[bigBlind]} min={20} max={1000} step={20} onValueChange={([v]) => setBigBlind(v)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Buy-in</span>
                    <span className="font-bold text-primary">{maxBuyIn.toLocaleString()}</span>
                  </div>
                  <Slider value={[maxBuyIn]} min={1000} max={100000} step={1000} onValueChange={([v]) => setMaxBuyIn(v)} />
                </div>
                <Button className="w-full shimmer-btn text-primary-foreground font-bold" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create & Sit Down'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Join by code */}
          {!clubId && (
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
                <DialogHeader><DialogTitle>Join Table by Code</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="Enter 6-character invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-[0.3em]"
                  />
                  <Button className="w-full shimmer-btn text-primary-foreground font-bold" onClick={handleJoinByCode} disabled={joiningByCode || inviteCode.length < 4}>
                    {joiningByCode ? 'Joining...' : 'Join Table'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Invite Friends button */}
        <div className="flex gap-2 animate-slide-up-fade stagger-2">
          <button
            onClick={() => {
              setLastCreatedTable(null);
              setInviteOpen(true);
            }}
            className="flex-1 glass-card rounded-2xl p-4 flex items-center gap-3 text-left group active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">Invite Friends</p>
              <p className="text-[10px] text-muted-foreground truncate">Send push invite to club members</p>
            </div>
          </button>
        </div>

        {/* Filter tabs (not for club view) */}
        {!clubId && (
          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="animate-slide-up-fade stagger-2">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-[10px] py-1">All</TabsTrigger>
              <TabsTrigger value="public" className="text-[10px] py-1">Public</TabsTrigger>
              <TabsTrigger value="friends" className="text-[10px] py-1">Friends</TabsTrigger>
              <TabsTrigger value="mine" className="text-[10px] py-1">My Tables</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Table list */}
        <div className="space-y-3 animate-slide-up-fade stagger-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {filteredTables.length} {filteredTables.length === 1 ? 'Table' : 'Tables'}
          </h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading tables...</div>
          ) : filteredTables.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center space-y-4">
              <CardFan />
              <p className="text-muted-foreground text-sm">No tables yet — be the first to deal!</p>
            </div>
          ) : (
            filteredTables.map(t => (
              <button
                key={t.id}
                className="w-full glass-card rounded-xl p-4 flex items-center justify-between text-left group active:scale-[0.98] transition-all hover:shadow-lg"
                onClick={() => onJoinTable(t.id)}
              >
                <div className="space-y-1.5">
                  <p className="font-bold text-foreground text-sm">{t.name}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {typeIcon(t.table_type)}
                    <span>{typeLabel(t.table_type)}</span>
                    <span>•</span>
                    <span>{t.small_blind}/{t.big_blind}</span>
                  </div>
                  <SeatDots filled={t.player_count} total={t.max_seats} />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-medium',
                    t.status === 'playing' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'
                  )}>
                    {t.status === 'playing' ? 'In Game' : 'Open'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{t.player_count}/{t.max_seats}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Invite dialog */}
      <InvitePlayersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tableId={lastCreatedTable?.id || ''}
        tableName={lastCreatedTable?.name || 'Poker Table'}
        clubId={clubId}
      />
    </div>
  );
}
