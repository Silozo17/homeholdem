import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LayoutGrid, User, Shuffle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  table_number: number | null;
  seat_number: number | null;
  status: string;
  finish_position: number | null;
  avatar_url?: string | null;
}

interface SeatMapProps {
  players: GamePlayer[];
  seatsPerTable: number;
  maxTables: number;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function SeatMap({ players, seatsPerTable, maxTables, isAdmin, onRefresh }: SeatMapProps) {
  const [selectedSeat, setSelectedSeat] = useState<{ table: number; seat: number } | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [currentTables, setCurrentTables] = useState(maxTables);

  const activePlayers = players.filter(p => p.status === 'active');
  const unassignedPlayers = activePlayers.filter(p => !p.seat_number);

  const getPlayerAtSeat = (tableNum: number, seatNum: number) => {
    return activePlayers.find(
      p => p.table_number === tableNum && p.seat_number === seatNum
    );
  };

  const handleSeatClick = (tableNum: number, seatNum: number) => {
    if (!isAdmin) return;
    setSelectedSeat({ table: tableNum, seat: seatNum });
    setShowAssign(true);
  };

  const handleAssignPlayer = async (playerId: string) => {
    if (!selectedSeat) return;

    // First, clear any existing player from this seat
    const existingPlayer = getPlayerAtSeat(selectedSeat.table, selectedSeat.seat);
    if (existingPlayer && existingPlayer.id !== playerId) {
      await supabase
        .from('game_players')
        .update({ seat_number: null })
        .eq('id', existingPlayer.id);
    }

    // Assign the new player
    const { error } = await supabase
      .from('game_players')
      .update({ 
        table_number: selectedSeat.table,
        seat_number: selectedSeat.seat 
      })
      .eq('id', playerId);

    if (error) {
      toast.error('Failed to assign seat');
      return;
    }

    toast.success('Seat assigned');
    setShowAssign(false);
    setSelectedSeat(null);
    onRefresh();
  };

  const handleClearSeat = async () => {
    if (!selectedSeat) return;

    const player = getPlayerAtSeat(selectedSeat.table, selectedSeat.seat);
    if (!player) {
      setShowAssign(false);
      return;
    }

    const { error } = await supabase
      .from('game_players')
      .update({ seat_number: null })
      .eq('id', player.id);

    if (error) {
      toast.error('Failed to clear seat');
      return;
    }

    toast.success('Seat cleared');
    setShowAssign(false);
    setSelectedSeat(null);
    onRefresh();
  };

  const handleAddTable = () => {
    if (currentTables < 2) {
      setCurrentTables(2);
      toast.success('Table 2 added');
    }
  };

  const handleRandomizeSeats = async () => {
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    
    let tableNum = 1;
    let seatNum = 1;
    
    for (const player of shuffled) {
      const { error } = await supabase
        .from('game_players')
        .update({ 
          table_number: tableNum, 
          seat_number: seatNum 
        })
        .eq('id', player.id);

      if (error) {
        toast.error('Failed to randomize seats');
        return;
      }
      
      seatNum++;
      if (seatNum > seatsPerTable) {
        seatNum = 1;
        tableNum++;
        if (tableNum > currentTables) break;
      }
    }
    
    toast.success('Seats randomized!');
    onRefresh();
  };

  // Fixed seat positions: 2 on each end, 3 on top, 3 on bottom (same as TV display)
  const seatPositionsBySeat: Record<number, { x: number; y: number }> = {
    // Bottom row (3 seats)
    1:  { x: 30, y: 95 },
    10: { x: 50, y: 95 },
    9:  { x: 70, y: 95 },
    // Left end (2 seats stacked)
    2:  { x: 5, y: 65 },
    3:  { x: 5, y: 35 },
    // Top row (3 seats)
    4:  { x: 30, y: 5 },
    5:  { x: 50, y: 5 },
    6:  { x: 70, y: 5 },
    // Right end (2 seats stacked)
    7:  { x: 95, y: 35 },
    8:  { x: 95, y: 65 },
  };

  const seatPositions = Array.from({ length: seatsPerTable }, (_, i) => {
    const seatNum = i + 1;
    const pos = seatPositionsBySeat[seatNum] || { x: 50, y: 50 };
    return { x: pos.x, y: pos.y, seatNum };
  });

  return (
    <>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Seat Map
              {unassignedPlayers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unassignedPlayers.length} unassigned
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isAdmin && activePlayers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRandomizeSeats}
                  title="Randomize all seats"
                  className="w-full sm:w-auto"
                >
                  <Shuffle className="h-4 w-4 mr-1" />
                  Randomize
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: currentTables }, (_, i) => i + 1).map((tableNum) => (
            <div key={tableNum} className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium text-center">
                Table {tableNum}
              </div>
              <div className="relative aspect-[2.5/1] w-full max-w-md sm:max-w-lg mx-auto">
                {/* Outer Rail - Pill Shape (same as TV display) */}
                <div className="absolute inset-[6%] rounded-full bg-gradient-to-b from-amber-900 via-amber-800 to-amber-900 shadow-lg">
                  {/* Inner Rail */}
                  <div className="absolute inset-[4%] rounded-full bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700" />
                  {/* Felt Surface */}
                  <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-800 shadow-inner" />
                </div>
                
                {/* Dealer button position indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-background/80 border border-primary/50 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary">
                  D
                </div>

                {/* Seats */}
                {seatPositions.map((pos) => {
                  const seatNum = pos.seatNum;
                  const player = getPlayerAtSeat(tableNum, seatNum);
                  const isOccupied = !!player;

                  return (
                    <button
                      key={seatNum}
                      onClick={() => handleSeatClick(tableNum, seatNum)}
                      disabled={!isAdmin}
                      className={cn(
                        "absolute w-7 h-7 sm:w-10 sm:h-10 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all",
                        "border sm:border-2 text-[10px] sm:text-xs font-medium",
                        isOccupied
                          ? "bg-primary border-primary text-primary-foreground shadow-md"
                          : "bg-muted/50 border-border/50 text-muted-foreground hover:border-primary/50",
                        isAdmin && "cursor-pointer hover:scale-110"
                      )}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                      }}
                      title={player ? player.display_name : `Seat ${seatNum}`}
                    >
                      {isOccupied ? (
                        <UserAvatar 
                          name={player.display_name} 
                          avatarUrl={player.avatar_url}
                          size="xs"
                          className="w-full h-full"
                        />
                      ) : (
                        <span className="opacity-50">{seatNum}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend for this table */}
              <div className="flex flex-wrap gap-1 justify-center text-xs">
                {activePlayers
                  .filter(p => p.table_number === tableNum && p.seat_number)
                  .sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0))
                  .map(p => (
                    <Badge key={p.id} variant="outline" className="font-normal">
                      S{p.seat_number}: {p.display_name}
                    </Badge>
                  ))}
              </div>
            </div>
          ))}

          {/* Add Table 2 button */}
          {isAdmin && currentTables < 2 && activePlayers.length > seatsPerTable && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleAddTable}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Table 2
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Seat Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Table {selectedSeat?.table}, Seat {selectedSeat?.seat}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {getPlayerAtSeat(selectedSeat?.table || 0, selectedSeat?.seat || 0) && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Currently seated:</p>
                <p className="font-medium">
                  {getPlayerAtSeat(selectedSeat?.table || 0, selectedSeat?.seat || 0)?.display_name}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleClearSeat}
                >
                  Clear Seat
                </Button>
              </div>
            )}

            {activePlayers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Assign player:</p>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {activePlayers.map(player => (
                    <Button
                      key={player.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleAssignPlayer(player.id)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {player.display_name}
                      {player.seat_number && (
                        <Badge variant="secondary" className="ml-auto">
                          T{player.table_number}S{player.seat_number}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
