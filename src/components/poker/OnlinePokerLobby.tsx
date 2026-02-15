import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { CardFan } from './CardFan';

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
}

interface OnlinePokerLobbyProps {
  onJoinTable: (tableId: string) => void;
}

export function OnlinePokerLobby({ onJoinTable }: OnlinePokerLobbyProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [tableName, setTableName] = useState('');
  const [tableType, setTableType] = useState<'public' | 'friends'>('friends');
  const [maxSeats, setMaxSeats] = useState(6);
  const [bigBlind, setBigBlind] = useState(100);
  const [maxBuyIn, setMaxBuyIn] = useState(10000);

  const fetchTables = useCallback(async () => {
    try {
      const { data: allTables } = await supabase
        .from('poker_tables')
        .select('id, name, table_type, max_seats, small_blind, big_blind, status, created_by')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(50);

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
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleCreate = async () => {
    if (!tableName.trim()) { toast({ title: 'Enter a table name', variant: 'destructive' }); return; }
    setCreating(true);
    try {
      const data = await callEdge('poker-create-table', {
        name: tableName.trim(), table_type: tableType, max_seats: maxSeats,
        small_blind: bigBlind / 2, big_blind: bigBlind, min_buy_in: Math.round(maxBuyIn / 10), max_buy_in: maxBuyIn,
      });
      setCreateOpen(false);
      setTableName('');
      onJoinTable(data.table.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  // Seat dots
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

  return (
    <div className="flex flex-col min-h-[100dvh] poker-felt-bg card-suit-pattern safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/poker')} className="text-foreground/70">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setLoading(true); fetchTables(); }}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-4 pb-24 space-y-5">
        {/* Hero */}
        <div className="text-center space-y-2 animate-slide-up-fade">
          <h1 className="text-2xl font-black text-shimmer">Online Tables</h1>
          <p className="text-sm text-muted-foreground">Play Texas Hold'em with friends — real-time multiplayer</p>
        </div>

        {/* Create table card */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <button className="w-full glass-card rounded-2xl p-5 flex items-center gap-4 text-left group active:scale-[0.98] transition-all animate-slide-up-fade stagger-1 animate-glow-pulse">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">Create Table</p>
                <p className="text-xs text-muted-foreground">Set up a new game for your friends</p>
              </div>
            </button>
          </DialogTrigger>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle>Create Table</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Table name" value={tableName} onChange={(e) => setTableName(e.target.value)} />
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

        {/* Table list */}
        <div className="space-y-3 animate-slide-up-fade stagger-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Tables</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading tables...</div>
          ) : tables.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center space-y-4">
              <CardFan />
              <p className="text-muted-foreground text-sm">No tables yet — be the first to deal!</p>
            </div>
          ) : (
            tables.map(t => (
              <button
                key={t.id}
                className="w-full glass-card rounded-xl p-4 flex items-center justify-between text-left group active:scale-[0.98] transition-all hover:shadow-lg"
                onClick={() => onJoinTable(t.id)}
              >
                <div className="space-y-1.5">
                  <p className="font-bold text-foreground text-sm">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.small_blind}/{t.big_blind} • {t.table_type === 'friends' ? 'Invite Only' : 'Public'}
                  </p>
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
    </div>
  );
}
