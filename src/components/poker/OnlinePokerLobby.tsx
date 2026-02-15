import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, RefreshCw, Spade } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callEdge(fn: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
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
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [tableName, setTableName] = useState('');
  const [tableType, setTableType] = useState<'public' | 'friends'>('friends');
  const [maxSeats, setMaxSeats] = useState(6);
  const [bigBlind, setBigBlind] = useState(100);
  const [maxBuyIn, setMaxBuyIn] = useState(10000);

  const fetchTables = useCallback(async () => {
    try {
      // Fetch tables where user is seated or public tables
      const { data: allTables } = await supabase
        .from('poker_tables')
        .select('id, name, table_type, max_seats, small_blind, big_blind, status, created_by')
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!allTables) { setTables([]); return; }

      // Fetch seat counts
      const tableIds = allTables.map(t => t.id);
      const { data: seats } = await supabase
        .from('poker_seats')
        .select('table_id')
        .in('table_id', tableIds.length > 0 ? tableIds : ['none']);

      const countMap = new Map<string, number>();
      (seats || []).forEach(s => {
        countMap.set(s.table_id, (countMap.get(s.table_id) || 0) + 1);
      });

      setTables(allTables.map(t => ({
        ...t,
        player_count: countMap.get(t.id) || 0,
      })));
    } catch {
      // RLS may filter some tables
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const handleCreate = async () => {
    if (!tableName.trim()) {
      toast({ title: 'Enter a table name', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const data = await callEdge('poker-create-table', {
        name: tableName.trim(),
        table_type: tableType,
        max_seats: maxSeats,
        small_blind: bigBlind / 2,
        big_blind: bigBlind,
        min_buy_in: Math.round(maxBuyIn / 10),
        max_buy_in: maxBuyIn,
      });
      setCreateOpen(false);
      setTableName('');
      onJoinTable(data.table.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[60vh] p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Spade className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Online Poker</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Play Texas Hold'em with friends — real-time multiplayer
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-center">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Create Table
            </Button>
          </DialogTrigger>
          <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Create Table</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Table name"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
              />

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

              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create & Sit Down'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="icon" onClick={() => { setLoading(true); fetchTables(); }}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Table list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available Tables</h2>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading tables...</div>
        ) : tables.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <p className="text-muted-foreground">No tables yet</p>
            <p className="text-xs text-muted-foreground">Create one to get started!</p>
          </Card>
        ) : (
          tables.map(t => (
            <Card
              key={t.id}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => onJoinTable(t.id)}
            >
              <div>
                <p className="font-bold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.small_blind}/{t.big_blind} • {t.table_type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{t.player_count}/{t.max_seats}</span>
                </div>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  t.status === 'playing' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'
                )}>
                  {t.status === 'playing' ? 'In Game' : 'Open'}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
