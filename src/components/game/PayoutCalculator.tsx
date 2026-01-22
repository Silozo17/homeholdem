import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calculator, Check, DollarSign, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { finalizeGame } from '@/lib/game-finalization';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  finish_position: number | null;
}

interface GameSession {
  id: string;
  status?: string;
}

interface Transaction {
  game_player_id: string;
  transaction_type: string;
  amount: number;
}

interface PayoutCalculatorProps {
  players: GamePlayer[];
  prizePool: number;
  session: GameSession;
  transactions: Transaction[];
  clubId: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

// Payout presets (percentages)
const PAYOUT_PRESETS = {
  'top2': [65, 35],
  'top3': [50, 30, 20],
  'top4': [45, 27, 18, 10],
  'top5': [40, 25, 17, 12, 6],
};

export function PayoutCalculator({ 
  players, 
  prizePool, 
  session,
  transactions,
  clubId,
  isAdmin, 
  onRefresh 
}: PayoutCalculatorProps) {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PAYOUT_PRESETS>('top3');
  const [customPayouts, setCustomPayouts] = useState<number[]>([50, 30, 20]);
  const [useCustom, setUseCustom] = useState(false);
  const [paidPositions, setPaidPositions] = useState<number[]>([]);
  const [finalizing, setFinalizing] = useState(false);

  // Get finished players sorted by position
  const finishedPlayers = players
    .filter(p => p.finish_position !== null)
    .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));

  const currentPayouts = useCustom ? customPayouts : PAYOUT_PRESETS[selectedPreset];
  
  const calculatePayout = (position: number) => {
    if (position > currentPayouts.length) return 0;
    const percentage = currentPayouts[position - 1];
    return Math.round((prizePool * percentage) / 100);
  };

  const handleUpdateCustom = (index: number, value: string) => {
    const newPayouts = [...customPayouts];
    newPayouts[index] = parseInt(value) || 0;
    setCustomPayouts(newPayouts);
  };

  const handleAddCustomPosition = () => {
    setCustomPayouts([...customPayouts, 0]);
  };

  const handleRemoveCustomPosition = () => {
    if (customPayouts.length > 2) {
      setCustomPayouts(customPayouts.slice(0, -1));
    }
  };

  const handleMarkPaid = async (player: GamePlayer) => {
    // In a real app, this would record the payout transaction
    const payout = calculatePayout(player.finish_position || 0);
    
    await supabase.from('game_transactions').insert({
      game_session_id: session.id,
      game_player_id: player.id,
      transaction_type: 'payout',
      amount: -payout, // Negative amount for payouts
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    setPaidPositions([...paidPositions, player.finish_position || 0]);
    toast.success(`Paid ${player.display_name}: $${payout}`);
    onRefresh();
  };

  const handleFinalizeGame = async () => {
    const activePlayers = players.filter(p => p.status === 'active');
    if (activePlayers.length > 1) {
      toast.error('Cannot finalize: more than 1 player still active');
      return;
    }

    setFinalizing(true);
    
    // Build payouts data
    const payoutsData = currentPayouts.map((percentage, index) => {
      const position = index + 1;
      const player = finishedPlayers.find(p => p.finish_position === position);
      return {
        position,
        percentage,
        amount: calculatePayout(position),
        playerId: player?.id || null,
      };
    });

    const result = await finalizeGame(
      session.id,
      clubId,
      players,
      transactions,
      payoutsData
    );

    setFinalizing(false);

    if (result.success) {
      toast.success('Game finalized! Settlements created and season points updated.');
      onRefresh();
    } else {
      toast.error(result.error || 'Failed to finalize game');
    }
  };

  const totalPercentage = currentPayouts.reduce((sum, p) => sum + p, 0);
  const isValidPercentage = totalPercentage === 100;

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Payouts
          </CardTitle>
          <Badge variant="outline" className="text-gold-gradient font-bold">
            Prize Pool: ${prizePool}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payout Structure Selection */}
        <Tabs 
          defaultValue="presets" 
          onValueChange={(v) => setUseCustom(v === 'custom')}
        >
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PAYOUT_PRESETS).map(([key, values]) => (
                <Button
                  key={key}
                  variant={selectedPreset === key && !useCustom ? 'default' : 'outline'}
                  className="h-auto py-2 flex flex-col"
                  onClick={() => setSelectedPreset(key as keyof typeof PAYOUT_PRESETS)}
                >
                  <span className="font-bold">Top {values.length}</span>
                  <span className="text-xs text-muted-foreground">
                    {values.join('/')}%
                  </span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-3">
            {customPayouts.map((payout, index) => (
              <div key={index} className="flex items-center gap-2">
                <Label className="w-16 text-sm">{index + 1}{getOrdinalSuffix(index + 1)}</Label>
                <Input
                  type="number"
                  value={payout}
                  onChange={(e) => handleUpdateCustom(index, e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCustomPosition}
                disabled={customPayouts.length >= 10}
              >
                Add Position
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveCustomPosition}
                disabled={customPayouts.length <= 2}
              >
                Remove
              </Button>
            </div>
            {!isValidPercentage && (
              <p className="text-sm text-destructive">
                Total must equal 100% (currently {totalPercentage}%)
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Payout Preview */}
        <div className="space-y-2 pt-4 border-t border-border/30">
          <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Payout Structure
          </div>
          <div className="space-y-1">
            {currentPayouts.map((percentage, index) => {
              const position = index + 1;
              const payout = calculatePayout(position);
              const player = finishedPlayers.find(p => p.finish_position === position);
              const isPaid = paidPositions.includes(position);

              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between py-2 px-3 rounded-lg",
                    position === 1 ? "bg-yellow-500/10 border border-yellow-500/30" :
                    position === 2 ? "bg-slate-400/10 border border-slate-400/30" :
                    position === 3 ? "bg-amber-700/10 border border-amber-700/30" :
                    "bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "font-mono",
                        position === 1 && "border-yellow-500 text-yellow-500",
                        position === 2 && "border-slate-400 text-slate-400",
                        position === 3 && "border-amber-700 text-amber-700"
                      )}
                    >
                      {position}{getOrdinalSuffix(position)}
                    </Badge>
                    <span className="text-muted-foreground">{percentage}%</span>
                    {player && (
                      <span className="font-medium">{player.display_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gold-gradient">${payout}</span>
                    {isAdmin && player && !isPaid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkPaid(player)}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    )}
                    {isPaid && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Remaining players notice */}
        {players.filter(p => p.status === 'active').length > 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {players.filter(p => p.status === 'active').length} player(s) still in the game
          </p>
        ) : session.status !== 'completed' && isAdmin ? (
          <Button 
            className="w-full glow-gold mt-4" 
            onClick={handleFinalizeGame}
            disabled={finalizing}
          >
            <Flag className="h-4 w-4 mr-2" />
            {finalizing ? 'Finalizing...' : 'Finalize Game & Create Settlements'}
          </Button>
        ) : session.status === 'completed' ? (
          <div className="text-center py-4">
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              Game Completed
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
