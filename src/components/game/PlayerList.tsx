import { useState, useEffect, useCallback } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Users, UserMinus, UserPlus, Trophy, RotateCcw, ChevronsUpDown, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/common/UserAvatar';
import { getClubMemberIds, logGameActivity, getOrdinalSuffix } from '@/lib/club-members';
import { notifyPlayerEliminated } from '@/lib/push-notifications';
import { notifyPlayerEliminatedInApp } from '@/lib/in-app-notifications';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  table_number: number | null;
  seat_number: number | null;
  status: string;
  finish_position: number | null;
  eliminated_at: string | null;
  avatar_url?: string | null;
}

interface GameSession {
  id: string;
  max_tables?: number;
}

interface ClubMember {
  user_id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
}

interface PlayerListProps {
  players: GamePlayer[];
  session: GameSession;
  clubId: string;
  eventId: string;
  maxTables: number;
  isAdmin: boolean;
  currencySymbol: string;
  onRefresh: () => void;
}

export function PlayerList({ players, session, clubId, eventId, maxTables, isAdmin, currencySymbol, onRefresh }: PlayerListProps) {
  const { user } = useAuth();
  const [localPlayers, setLocalPlayers] = useState<GamePlayer[]>(players);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('1');
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Sync local state with props
  useEffect(() => {
    setLocalPlayers(players);
  }, [players]);

  const activePlayers = localPlayers.filter(p => p.status === 'active');
  const eliminatedPlayers = localPlayers.filter(p => p.status === 'eliminated')
    .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));

  // Fetch club members when dialog opens
  useEffect(() => {
    if (showAddPlayer && clubId) {
      fetchClubMembers();
    }
  }, [showAddPlayer, clubId]);

  const fetchClubMembers = async () => {
    setLoadingMembers(true);
    const { data: members } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId);

    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', userIds);

      if (profiles) {
        // Filter out players already in the game
        const existingUserIds = new Set(localPlayers.map(p => p.user_id));
        const availableMembers = profiles
          .filter(p => !existingUserIds.has(p.id))
          .map(p => ({
            user_id: p.id,
            display_name: p.display_name,
            email: p.email,
            avatar_url: p.avatar_url,
          }));
        setClubMembers(availableMembers);
      }
    }
    setLoadingMembers(false);
  };

  // Optimistic eliminate with instant UI update
  const handleEliminatePlayer = useCallback(async (player: GamePlayer) => {
    const activeCount = activePlayers.length;
    const finishPosition = activeCount;
    const remainingCount = activeCount - 1;

    // Optimistic update
    setLocalPlayers(prev => prev.map(p => 
      p.id === player.id 
        ? { ...p, status: 'eliminated', finish_position: finishPosition, eliminated_at: new Date().toISOString() }
        : p
    ));

    const { error } = await supabase
      .from('game_players')
      .update({
        status: 'eliminated',
        finish_position: finishPosition,
        eliminated_at: new Date().toISOString(),
      })
      .eq('id', player.id);

    if (error) {
      // Revert on error
      setLocalPlayers(prev => prev.map(p => 
        p.id === player.id 
          ? { ...p, status: 'active', finish_position: null, eliminated_at: null }
          : p
      ));
      toast.error('Failed to eliminate player');
      return;
    }

    toast.success(`${player.display_name} finished in ${finishPosition}${getOrdinalSuffix(finishPosition)} place`);
    
    // Send notifications in background (don't await to keep UI responsive)
    if (clubId && eventId) {
      getClubMemberIds(clubId).then(memberIds => {
        if (memberIds.length > 0) {
          Promise.all([
            notifyPlayerEliminated(memberIds, player.display_name, finishPosition, remainingCount, eventId),
            notifyPlayerEliminatedInApp(memberIds, player.display_name, finishPosition, remainingCount, eventId, clubId),
            logGameActivity(session.id, 'player_eliminated', player.id, player.display_name, {
              position: finishPosition,
              playersRemaining: remainingCount,
            }),
          ]).catch(console.error);
        }
      });
    }
  }, [activePlayers.length, clubId, eventId, session.id]);

  // Optimistic reinstate
  const handleReinstate = useCallback(async (player: GamePlayer) => {
    const previousState = { ...player };

    // Optimistic update
    setLocalPlayers(prev => prev.map(p => 
      p.id === player.id 
        ? { ...p, status: 'active', finish_position: null, eliminated_at: null }
        : p
    ));

    const { error } = await supabase
      .from('game_players')
      .update({
        status: 'active',
        finish_position: null,
        eliminated_at: null,
      })
      .eq('id', player.id);

    if (error) {
      // Revert on error
      setLocalPlayers(prev => prev.map(p => 
        p.id === player.id ? previousState : p
      ));
      toast.error('Failed to reinstate player');
      return;
    }

    toast.success(`${player.display_name} reinstated`);
  }, []);

  const handleAddClubMember = async (member: ClubMember) => {
    const { error } = await supabase
      .from('game_players')
      .insert({
        game_session_id: session.id,
        user_id: member.user_id,
        display_name: member.display_name,
        table_number: parseInt(selectedTable),
        is_guest: false,
      });

    if (error) {
      toast.error('Failed to add player');
      return;
    }

    toast.success(`${member.display_name} added`);
    setMemberSearchOpen(false);
    setShowAddPlayer(false);
    onRefresh();
  };

  const handleAddGuest = async () => {
    if (!guestName.trim() || !user) return;

    const { error } = await supabase
      .from('game_players')
      .insert({
        game_session_id: session.id,
        user_id: user.id, // Use current user as placeholder for guest
        display_name: guestName.trim(),
        table_number: parseInt(selectedTable),
        is_guest: true,
        email: guestEmail.trim() || null,
      });

    if (error) {
      toast.error('Failed to add guest');
      return;
    }

    toast.success(`Guest "${guestName}" added`);
    setGuestName('');
    setGuestEmail('');
    setShowGuestForm(false);
    setShowAddPlayer(false);
    onRefresh();
  };

  // Optimistic table assignment
  const handleAssignTable = useCallback(async (player: GamePlayer, tableNum: number) => {
    const previousTable = player.table_number;

    // Optimistic update
    setLocalPlayers(prev => prev.map(p => 
      p.id === player.id ? { ...p, table_number: tableNum } : p
    ));

    const { error } = await supabase
      .from('game_players')
      .update({ table_number: tableNum })
      .eq('id', player.id);

    if (error) {
      // Revert on error
      setLocalPlayers(prev => prev.map(p => 
        p.id === player.id ? { ...p, table_number: previousTable } : p
      ));
      toast.error('Failed to assign table');
    }
  }, []);

  const localGetOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  // Group players by table
  const table1Players = activePlayers.filter(p => p.table_number === 1 || !p.table_number);
  const table2Players = activePlayers.filter(p => p.table_number === 2);

  // Generate table options based on maxTables
  const tableOptions = Array.from({ length: Math.max(maxTables, 1) }, (_, i) => i + 1);

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
                  maxTables={maxTables}
                  onEliminate={() => handleEliminatePlayer(player)}
                  onAssignTable={(t) => handleAssignTable(player, t)}
                />
              ))}
              {table1Players.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">No players at this table</p>
              )}
            </div>
          </div>

          {/* Table 2 (if exists or players there) */}
          {(maxTables >= 2 || table2Players.length > 0) && (
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
                    maxTables={maxTables}
                    onEliminate={() => handleEliminatePlayer(player)}
                    onAssignTable={(t) => handleAssignTable(player, t)}
                  />
                ))}
                {table2Players.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No players at this table</p>
                )}
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
                        {player.finish_position}{localGetOrdinalSuffix(player.finish_position || 0)}
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
      <Dialog open={showAddPlayer} onOpenChange={(open) => {
        setShowAddPlayer(open);
        if (!open) {
          setShowGuestForm(false);
          setGuestName('');
          setGuestEmail('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
          </DialogHeader>
          
          {!showGuestForm ? (
            <div className="space-y-4 py-4">
              {/* Club member search */}
              <div className="space-y-2">
                <Label>Select Club Member</Label>
                <Popover open={memberSearchOpen} onOpenChange={setMemberSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={memberSearchOpen}
                      className="w-full justify-between"
                    >
                      {loadingMembers ? 'Loading...' : 'Search club members...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search members..." />
                      <CommandList>
                        <CommandEmpty>No members found.</CommandEmpty>
                        <CommandGroup heading="Club Members">
                          {clubMembers.map((member) => (
                            <CommandItem
                              key={member.user_id}
                              value={member.display_name}
                              onSelect={() => handleAddClubMember(member)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <UserAvatar 
                                  name={member.display_name} 
                                  avatarUrl={member.avatar_url}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-medium">{member.display_name}</p>
                                  {member.email && (
                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setMemberSearchOpen(false);
                              setShowGuestForm(true);
                            }}
                            className="cursor-pointer"
                          >
                            <UserCircle className="mr-2 h-4 w-4" />
                            Add Guest Player
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Table selection */}
              <div className="space-y-2">
                <Label>Assign to Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tableOptions.map((t) => (
                      <SelectItem key={t} value={t.toString()}>Table {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowGuestForm(true)}
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  Add Guest Player
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Guest Name *</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guestEmail">Email (optional)</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="To invite to club later"
                />
                <p className="text-xs text-muted-foreground">
                  If provided, you can invite this guest to join the club later
                </p>
              </div>
              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tableOptions.map((t) => (
                      <SelectItem key={t} value={t.toString()}>Table {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setShowGuestForm(false)}>
                  Back
                </Button>
                <Button onClick={handleAddGuest} disabled={!guestName.trim()}>
                  Add Guest
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PlayerRowProps {
  player: GamePlayer;
  isAdmin: boolean;
  maxTables: number;
  onEliminate: () => void;
  onAssignTable: (table: number) => void;
}

function PlayerRow({ player, isAdmin, maxTables, onEliminate, onAssignTable }: PlayerRowProps) {
  const tableOptions = Array.from({ length: Math.max(maxTables, 1) }, (_, i) => i + 1);
  
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
      <div className="flex items-center gap-3">
        <UserAvatar 
          name={player.display_name} 
          avatarUrl={player.avatar_url}
          size="sm"
        />
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
              {tableOptions.map((t) => (
                <SelectItem key={t} value={t.toString()}>T{t}</SelectItem>
              ))}
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
