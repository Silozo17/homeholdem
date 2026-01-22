import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Users, UserMinus, UserPlus, Trophy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  table_number: number | null;
  seat_number: number | null;
  status: string;
  finish_position: number | null;
  eliminated_at: string | null;
}

interface GameSession {
  id: string;
  max_tables?: number;
}

interface PlayerListProps {
  players: GamePlayer[];
  session: GameSession;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function PlayerList({ players, session, isAdmin, onRefresh }: PlayerListProps) {
  const { user } = useAuth();
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('1');

  const activePlayers = players.filter(p => p.status === 'active');
  const eliminatedPlayers = players.filter(p => p.status === 'eliminated')
    .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));

  const handleEliminatePlayer = async (player: GamePlayer) => {
    const activeCount = activePlayers.length;
    const finishPosition = activeCount;

    const { error } = await supabase
      .from('game_players')
      .update({
        status: 'eliminated',
        finish_position: finishPosition,
        eliminated_at: new Date().toISOString(),
      })
      .eq('id', player.id);

    if (error) {
      toast.error('Failed to eliminate player');
      return;
    }

    toast.success(`${player.display_name} finished in ${finishPosition}${getOrdinalSuffix(finishPosition)} place`);
    onRefresh();
  };

  const handleReinstate = async (player: GamePlayer) => {
    const { error } = await supabase
      .from('game_players')
      .update({
        status: 'active',
        finish_position: null,
        eliminated_at: null,
      })
      .eq('id', player.id);

    if (error) {
      toast.error('Failed to reinstate player');
      return;
    }

    toast.success(`${player.display_name} reinstated`);
    onRefresh();
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim() || !user) return;

    const { error } = await supabase
      .from('game_players')
      .insert({
        game_session_id: session.id,
        user_id: user.id, // Use current user as placeholder
        display_name: newPlayerName.trim(),
        table_number: parseInt(selectedTable),
      });

    if (error) {
      toast.error('Failed to add player');
      return;
    }

    toast.success('Player added');
    setNewPlayerName('');
    setShowAddPlayer(false);
    onRefresh();
  };

  const handleAssignTable = async (player: GamePlayer, tableNum: number) => {
    const { error } = await supabase
      .from('game_players')
      .update({ table_number: tableNum })
      .eq('id', player.id);

    if (error) {
      toast.error('Failed to assign table');
      return;
    }

    onRefresh();
  };

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  // Group players by table
  const table1Players = activePlayers.filter(p => p.table_number === 1 || !p.table_number);
  const table2Players = activePlayers.filter(p => p.table_number === 2);

  return (
    <>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Players ({activePlayers.length} active)
            </CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddPlayer(true)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table 1 */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground font-medium">
              Table 1 ({table1Players.length})
            </div>
            <div className="space-y-1">
              {table1Players.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isAdmin={isAdmin}
                  onEliminate={() => handleEliminatePlayer(player)}
                  onAssignTable={(t) => handleAssignTable(player, t)}
                />
              ))}
              {table1Players.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No players at this table</p>
              )}
            </div>
          </div>

          {/* Table 2 (if players exist) */}
          {table2Players.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">
                Table 2 ({table2Players.length})
              </div>
              <div className="space-y-1">
                {table2Players.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    isAdmin={isAdmin}
                    onEliminate={() => handleEliminatePlayer(player)}
                    onAssignTable={(t) => handleAssignTable(player, t)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Eliminated Players */}
          {eliminatedPlayers.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-border/30">
              <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Finished ({eliminatedPlayers.length})
              </div>
              <div className="space-y-1">
                {eliminatedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {player.finish_position}{getOrdinalSuffix(player.finish_position || 0)}
                      </Badge>
                      <span className="text-muted-foreground">{player.display_name}</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReinstate(player)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Player Dialog */}
      <Dialog open={showAddPlayer} onOpenChange={setShowAddPlayer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Player Name</Label>
              <Input
                id="playerName"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
              />
            </div>
            <div className="space-y-2">
              <Label>Table</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Table 1</SelectItem>
                  <SelectItem value="2">Table 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPlayer(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPlayer} disabled={!newPlayerName.trim()}>
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PlayerRowProps {
  player: GamePlayer;
  isAdmin: boolean;
  onEliminate: () => void;
  onAssignTable: (table: number) => void;
}

function PlayerRow({ player, isAdmin, onEliminate, onAssignTable }: PlayerRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {player.display_name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="font-medium">{player.display_name}</span>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Select
            value={player.table_number?.toString() || '1'}
            onValueChange={(v) => onAssignTable(parseInt(v))}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">T1</SelectItem>
              <SelectItem value="2">T2</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onEliminate}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
