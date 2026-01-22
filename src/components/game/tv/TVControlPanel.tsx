import { useState } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Plus, UserMinus, Volume2, VolumeX, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTournamentSounds } from '@/hooks/useTournamentSounds';

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
}

interface GameSession {
  id: string;
  status: string;
  current_level: number;
  level_started_at: string | null;
  time_remaining_seconds: number | null;
  buy_in_amount: number;
  rebuy_amount: number;
  addon_amount: number;
  starting_chips: number;
  rebuy_chips: number;
  addon_chips: number;
  allow_rebuys: boolean;
  allow_addons: boolean;
}

interface GamePlayer {
  id: string;
  display_name: string;
  status: string;
  finish_position: number | null;
}

type DisplayMode = 'classic' | 'dashboard' | 'table';

interface TVControlPanelProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  players: GamePlayer[];
  currencySymbol: string;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onUpdateSession: (updates: Partial<GameSession>) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export function TVControlPanel({
  session,
  blindStructure,
  players,
  currencySymbol,
  displayMode,
  onDisplayModeChange,
  onUpdateSession,
  onClose,
  onRefresh
}: TVControlPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { soundEnabled, setSoundEnabled } = useTournamentSounds();
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const activePlayers = players.filter(p => p.status === 'active');
  const currentLevel = blindStructure.find(b => b.level === session.current_level);

  const handlePlayPause = () => {
    onUpdateSession({
      status: session.status === 'active' ? 'paused' : 'active',
      level_started_at: session.status !== 'active' ? new Date().toISOString() : session.level_started_at
    });
  };

  const handlePrevLevel = () => {
    if (session.current_level > 1) {
      const prevLevel = blindStructure.find(b => b.level === session.current_level - 1);
      onUpdateSession({
        current_level: session.current_level - 1,
        time_remaining_seconds: prevLevel ? prevLevel.duration_minutes * 60 : null,
        level_started_at: new Date().toISOString()
      });
    }
  };

  const handleNextLevel = () => {
    const nextLevel = blindStructure.find(b => b.level === session.current_level + 1);
    if (nextLevel) {
      onUpdateSession({
        current_level: session.current_level + 1,
        time_remaining_seconds: nextLevel.duration_minutes * 60,
        level_started_at: new Date().toISOString()
      });
    }
  };

  const handleAddTime = () => {
    onUpdateSession({
      time_remaining_seconds: (session.time_remaining_seconds || 0) + 300
    });
    toast({ title: 'Added 5 minutes' });
  };

  const handleAddTransaction = async (type: 'buyin' | 'rebuy' | 'addon') => {
    if (!selectedPlayer || !user) return;

    const amounts = {
      buyin: { amount: session.buy_in_amount, chips: session.starting_chips },
      rebuy: { amount: session.rebuy_amount, chips: session.rebuy_chips },
      addon: { amount: session.addon_amount, chips: session.addon_chips }
    };

    setLoading(true);
    try {
      const { error } = await supabase.from('game_transactions').insert({
        game_session_id: session.id,
        game_player_id: selectedPlayer,
        transaction_type: type,
        amount: amounts[type].amount,
        chips: amounts[type].chips,
        created_by: user.id
      });

      if (error) throw error;
      
      toast({ 
        title: 'Transaction added',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} recorded for player`
      });
      setSelectedPlayer('');
      onRefresh();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({ title: 'Error', description: 'Failed to add transaction', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleBustOut = async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    try {
      const finishPosition = activePlayers.length;
      
      const { error } = await supabase
        .from('game_players')
        .update({ 
          status: 'eliminated',
          finish_position: finishPosition,
          eliminated_at: new Date().toISOString()
        })
        .eq('id', selectedPlayer);

      if (error) throw error;
      
      const player = players.find(p => p.id === selectedPlayer);
      toast({ 
        title: 'Player eliminated',
        description: `${player?.display_name} finished in position ${finishPosition}`
      });
      setSelectedPlayer('');
      onRefresh();
    } catch (error) {
      console.error('Error eliminating player:', error);
      toast({ title: 'Error', description: 'Failed to eliminate player', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-in-right">
      <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Tournament Controls</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Timer Controls */}
          <div>
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Timer</h3>
            <div className="flex items-center gap-3">
              <Button 
                size="lg" 
                onClick={handlePlayPause}
                className={session.status === 'active' 
                  ? 'bg-amber-600 hover:bg-amber-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
                }
              >
                {session.status === 'active' ? (
                  <><Pause className="w-5 h-5 mr-2" /> Pause</>
                ) : (
                  <><Play className="w-5 h-5 mr-2" /> Play</>
                )}
              </Button>
              <Button variant="outline" size="lg" onClick={handlePrevLevel} disabled={session.current_level <= 1}>
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={handleNextLevel} disabled={!blindStructure.find(b => b.level === session.current_level + 1)}>
                <SkipForward className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={handleAddTime}>
                <Plus className="w-5 h-5 mr-1" /> 5 min
              </Button>
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-white/60"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Buy-in/Rebuy/Add-on */}
            <div>
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Quick Transaction</h3>
              <div className="flex items-center gap-2">
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger className="flex-1 bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlayers.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleAddTransaction('buyin')}
                  disabled={!selectedPlayer || loading}
                  className="flex-1"
                >
                  Buy-in {currencySymbol}{session.buy_in_amount}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleAddTransaction('rebuy')}
                  disabled={!selectedPlayer || loading || !session.allow_rebuys}
                  className="flex-1"
                >
                  Rebuy {currencySymbol}{session.rebuy_amount}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => handleAddTransaction('addon')}
                  disabled={!selectedPlayer || loading || !session.allow_addons}
                  className="flex-1"
                >
                  Add-on {currencySymbol}{session.addon_amount}
                </Button>
              </div>
            </div>

            {/* Bust Out */}
            <div>
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Eliminate Player</h3>
              <div className="flex items-center gap-2">
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger className="flex-1 bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlayers.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="destructive"
                  onClick={handleBustOut}
                  disabled={!selectedPlayer || loading}
                >
                  <UserMinus className="w-4 h-4 mr-2" /> Bust Out
                </Button>
              </div>
            </div>
          </div>

          {/* Display Mode Selector */}
          <div>
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Display Mode</h3>
            <div className="flex gap-2">
              {(['classic', 'dashboard', 'table'] as DisplayMode[]).map(mode => (
                <Button
                  key={mode}
                  variant={displayMode === mode ? 'default' : 'outline'}
                  onClick={() => onDisplayModeChange(mode)}
                  className="flex-1 capitalize"
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {mode === 'classic' ? 'Classic Timer' : mode === 'dashboard' ? 'Dashboard' : 'Table View'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
