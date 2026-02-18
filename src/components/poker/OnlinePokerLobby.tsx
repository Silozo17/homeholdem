import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, RefreshCw, ArrowLeft, Globe, Lock, Search, Hash, UserPlus, Trash2, Shield, Globe2, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { InvitePlayersDialog } from './InvitePlayersDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CardFan } from './CardFan';
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';

import { callEdge } from '@/lib/poker/callEdge';

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
  description: string | null;
  is_persistent: boolean;
  closing_at: string | null;
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [tableName, setTableName] = useState('');
  const [tableType, setTableType] = useState<'public' | 'friends' | 'club' | 'private' | 'community'>(clubId ? 'club' : 'friends');
  const [tableDescription, setTableDescription] = useState('');
  const [bigBlind, setBigBlind] = useState(100);
  const [maxBuyIn, setMaxBuyIn] = useState(10000);
  const [blindTimer, setBlindTimer] = useState(0);

  const fetchTables = useCallback(async () => {
    try {
      let query = supabase
        .from('poker_tables')
        .select('id, name, table_type, max_seats, small_blind, big_blind, status, created_by, club_id, invite_code, description, is_persistent, closing_at')
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

      setTables(allTables.map(t => ({
        ...t,
        player_count: countMap.get(t.id) || 0,
        description: (t as any).description ?? null,
        is_persistent: (t as any).is_persistent ?? false,
        closing_at: (t as any).closing_at ?? null,
      })));
    } catch { /* RLS filter */ } finally { setLoading(false); }
  }, [clubId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // Realtime subscription for auto-refresh when tables change
  useEffect(() => {
    const channel = supabase
      .channel('poker-tables-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_tables' }, () => {
        fetchTables();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_seats' }, () => {
        fetchTables();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTables]);

  const handleCreate = async () => {
    if (!tableName.trim()) { toast({ title: 'Enter a table name', variant: 'destructive' }); return; }
    setCreating(true);
    try {
      const data = await callEdge('poker-create-table', {
        name: tableName.trim(),
        table_type: clubId ? 'club' : tableType,
        max_seats: 9,
        small_blind: bigBlind / 2,
        big_blind: bigBlind,
        min_buy_in: Math.round(maxBuyIn / 10),
        max_buy_in: maxBuyIn,
        club_id: clubId || null,
        blind_timer_minutes: blindTimer,
        description: tableDescription.trim() || null,
      });
      setCreateOpen(false);
      setTableName('');
      setTableDescription('');
      setLastCreatedTable({ id: data.table.id, name: tableName.trim() });
      setInviteOpen(true);
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

  const handleDeleteTable = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await callEdge('poker-moderate-table', { table_id: deleteTarget.id, action: 'close' });
      toast({ title: 'Table deleted' });
      fetchTables();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredTables = tables.filter(t => {
    if (clubId) return true;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'public') return t.table_type === 'public';
    if (activeFilter === 'friends') return t.table_type === 'friends';
    if (activeFilter === 'private') return t.table_type === 'private';
    if (activeFilter === 'community') return t.table_type === 'community';
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
    if (type === 'private') return <Shield className="h-3 w-3 text-purple-400" />;
    if (type === 'community') return <Globe2 className="h-3 w-3 text-cyan-400" />;
    return <Lock className="h-3 w-3 text-amber-400" />;
  };

  const typeLabel = (type: string) => {
    if (type === 'public') return 'Public';
    if (type === 'club') return 'Club';
    if (type === 'private') return 'Private';
    if (type === 'community') return 'Community';
    return 'Invite Only';
  };

  return (
    <div className="fixed inset-0 flex flex-col poker-felt-bg card-suit-pattern safe-area-bottom z-10 overflow-y-auto overflow-x-hidden">
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
      <div className="shrink-0 safe-area-top">
        <div className="h-14" />
      </div>

      <div className="flex-1 px-4 pt-4 space-y-5" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
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
                        <SelectItem value="private">Private (Hidden)</SelectItem>
                        <SelectItem value="community">Community (Permanent)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Description (optional)</label>
                  <Textarea
                    placeholder="Short description for your table..."
                    value={tableDescription}
                    onChange={(e) => setTableDescription(e.target.value.slice(0, 200))}
                    maxLength={200}
                    className="min-h-[60px] resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{tableDescription.length}/200</p>
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
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Blind Timer</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {[{ label: 'Off', value: 0 }, { label: '5m', value: 5 }, { label: '10m', value: 10 }, { label: '15m', value: 15 }, { label: '30m', value: 30 }].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setBlindTimer(opt.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                          blindTimer === opt.value
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
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

        {/* Invite Friends button — only shown when a table was created this session */}
        {lastCreatedTable && (
          <div className="flex gap-2 animate-slide-up-fade stagger-2">
            <button
              onClick={() => setInviteOpen(true)}
              className="flex-1 glass-card rounded-2xl p-4 flex items-center gap-3 text-left group active:scale-[0.98] transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">Invite Friends</p>
                <p className="text-[10px] text-muted-foreground truncate">Invite to {lastCreatedTable.name}</p>
              </div>
            </button>
          </div>
        )}

        {/* Filter tabs (not for club view) */}
        {!clubId && (
          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="animate-slide-up-fade stagger-2">
            <TabsList className="grid w-full grid-cols-5 h-8">
              <TabsTrigger value="all" className="text-[10px] py-1">All</TabsTrigger>
              <TabsTrigger value="public" className="text-[10px] py-1">Public</TabsTrigger>
              <TabsTrigger value="community" className="text-[10px] py-1">Community</TabsTrigger>
              <TabsTrigger value="friends" className="text-[10px] py-1">Friends</TabsTrigger>
              <TabsTrigger value="mine" className="text-[10px] py-1">Mine</TabsTrigger>
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
              <div
                key={t.id}
                role="button"
                className="w-full glass-card rounded-xl p-4 flex items-center justify-between text-left group cursor-pointer transition-all hover:shadow-lg"
                onClick={() => onJoinTable(t.id)}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm truncate">{t.name}</p>
                    {t.is_persistent && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">Permanent</Badge>}
                    {t.closing_at && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">Closing</Badge>}
                  </div>
                  {t.description && (
                    <p className="text-[10px] text-muted-foreground truncate">{t.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {typeIcon(t.table_type)}
                    <span>{typeLabel(t.table_type)}</span>
                    <span>•</span>
                    <span>{t.small_blind}/{t.big_blind}</span>
                  </div>
                  <SeatDots filled={t.player_count} total={t.max_seats} />
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1">
                    {t.created_by === user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: t.id, name: t.name }); }}
                        className="p-1 rounded-md hover:bg-destructive/10 transition-colors"
                        aria-label="Delete table"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      t.status === 'playing' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'
                    )}>
                      {t.status === 'playing' ? 'In Game' : 'Open'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{t.player_count}/{t.max_seats}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete table?</AlertDialogTitle>
            <AlertDialogDescription>
              {tables.find(t => t.id === deleteTarget?.id)?.is_persistent
                ? `This will schedule "${deleteTarget?.name}" for closure in 4 hours if players are inside. No new players will be able to join during this time.`
                : `This will close "${deleteTarget?.name}" and remove all players. This cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
