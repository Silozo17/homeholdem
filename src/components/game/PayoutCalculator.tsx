import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy, Calculator, Check, DollarSign, Flag, Handshake, Users } from 'lucide-react';
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
  currencySymbol: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

// Payout presets by number of paid positions
const PAYOUT_PRESETS: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [45, 27, 18, 10],
  5: [40, 25, 17, 12, 6],
};

export function PayoutCalculator({ 
  players, 
  prizePool, 
  session,
  transactions,
  clubId,
  currencySymbol,
  isAdmin, 
  onRefresh 
}: PayoutCalculatorProps) {
  const [paidPositions, setPaidPositions] = useState(3);
  const [customPayouts, setCustomPayouts] = useState<number[]>([50, 30, 20]);
  const [useCustom, setUseCustom] = useState(false);
  const [markedPaid, setMarkedPaid] = useState<number[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  
  // Chop deal state
  const [showChopDialog, setShowChopDialog] = useState(false);
  const [chopAmounts, setChopAmounts] = useState<Record<string, number>>({});

  // Get finished players sorted by position
  const finishedPlayers = players
    .filter(p => p.finish_position !== null)
    .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));

  const activePlayers = players.filter(p => p.status === 'active');

  const currentPayouts = useCustom ? customPayouts : PAYOUT_PRESETS[paidPositions];
  
  const calculatePayout = (position: number) => {
    if (position > currentPayouts.length) return 0;
    const percentage = currentPayouts[position - 1];
    return Math.round((prizePool * percentage) / 100);
  };

  const handlePositionChange = (positions: number) => {
    setPaidPositions(positions);
    if (!useCustom) {
      setCustomPayouts([...PAYOUT_PRESETS[positions]]);
    }
  };

  const handleUpdateCustom = (index: number, value: string) => {
    const newPayouts = [...customPayouts];
    newPayouts[index] = parseInt(value) || 0;
    setCustomPayouts(newPayouts);
  };

  const handleMarkPaid = async (player: GamePlayer) => {
    const payout = calculatePayout(player.finish_position || 0);
    
    await supabase.from('game_transactions').insert({
      game_session_id: session.id,
      game_player_id: player.id,
      transaction_type: 'payout',
      amount: -payout,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    setMarkedPaid([...markedPaid, player.finish_position || 0]);
    toast.success(`Paid ${player.display_name}: ${currencySymbol}${payout}`);
    onRefresh();
  };

  // Chop deal handlers
  const handleOpenChopDeal = () => {
    const initialAmounts: Record<string, number> = {};
    activePlayers.forEach(p => {
      initialAmounts[p.id] = Math.floor(prizePool / activePlayers.length);
    });
    setChopAmounts(initialAmounts);
    setShowChopDialog(true);
  };

  const handleChopAmountChange = (playerId: string, value: string) => {
    setChopAmounts(prev => ({
      ...prev,
      [playerId]: parseInt(value) || 0,
    }));
  };

  const chopTotal = Object.values(chopAmounts).reduce((sum, v) => sum + v, 0);
  const isChopValid = chopTotal === prizePool;

  const handleConfirmChop = async () => {
    if (!isChopValid) {
      toast.error('Chop amounts must equal prize pool');
      return;
    }

    setFinalizing(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Mark all active players as eliminated with 1st place (shared win)
      for (const player of activePlayers) {
        await supabase
          .from('game_players')
          .update({
            status: 'eliminated',
            finish_position: 1,
            eliminated_at: new Date().toISOString(),
          })
          .eq('id', player.id);

        // Record payout transaction
        await supabase.from('game_transactions').insert({
          game_session_id: session.id,
          game_player_id: player.id,
          transaction_type: 'payout',
          amount: -chopAmounts[player.id],
          notes: 'Chop deal',
          created_by: user?.id,
        });
      }

      // Build payouts data for finalization
      const payoutsData = activePlayers.map((player, index) => ({
        position: 1,
        percentage: Math.round((chopAmounts[player.id] / prizePool) * 100),
        amount: chopAmounts[player.id],
        playerId: player.id,
      }));

      const result = await finalizeGame(
        session.id,
        clubId,
        [...players.filter(p => p.status !== 'active'), ...activePlayers.map(p => ({ ...p, status: 'eliminated', finish_position: 1 }))],
        transactions,
        payoutsData
      );

      if (result.success) {
        toast.success('Chop deal confirmed! Game finalized.');
        setShowChopDialog(false);
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to finalize chop deal');
      }
    } catch (error) {
      toast.error('Failed to process chop deal');
    }

    setFinalizing(false);
  };

  const handleFinalizeGame = async () => {
    if (activePlayers.length > 1) {
      toast.error('Cannot finalize: more than 1 player still active');
      return;
    }

    setFinalizing(true);
    
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
    <>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Payouts
            </CardTitle>
            <Badge variant="outline" className="text-gold-gradient font-bold">
              Prize Pool: {currencySymbol}{prizePool}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paid Positions Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Paid Positions</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <Button
                  key={num}
                  variant={paidPositions === num && !useCustom ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    "flex-1",
                    paidPositions === num && !useCustom && "glow-gold"
                  )}
                  onClick={() => handlePositionChange(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          {/* Payout Structure Selection */}
          <Tabs 
            defaultValue="preset" 
            onValueChange={(v) => setUseCustom(v === 'custom')}
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="preset">Preset</TabsTrigger>
              <TabsTrigger value="custom">Custom %</TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-4">
              <div className="text-sm text-muted-foreground text-center py-2">
                Using {PAYOUT_PRESETS[paidPositions].join('/')}% split
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-4 space-y-3">
              {customPayouts.slice(0, paidPositions).map((payout, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Label className="w-16 text-sm">{index + 1}{getOrdinalSuffix(index + 1)}</Label>
                  <Input
                    type="number"
                    value={payout}
                    onChange={(e) => handleUpdateCustom(index, e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-12">
                    {currencySymbol}{Math.round((prizePool * payout) / 100)}
                  </span>
                </div>
              ))}
              {!isValidPercentage && (
                <p className="text-sm text-destructive">
                  Total must equal 100% (currently {totalPercentage}%)
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Chop Deal Button */}
          {isAdmin && activePlayers.length >= 2 && activePlayers.length <= 4 && (
            <Button
              variant="outline"
              className="w-full border-primary/50 text-primary hover:bg-primary/10"
              onClick={handleOpenChopDeal}
            >
              <Handshake className="h-4 w-4 mr-2" />
              Make a Deal ({activePlayers.length} players remaining)
            </Button>
          )}

          {/* Payout Preview */}
          <div className="space-y-2 pt-4 border-t border-border/30">
            <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Payout Structure
            </div>
            <div className="space-y-1">
              {currentPayouts.slice(0, paidPositions).map((percentage, index) => {
                const position = index + 1;
                const payout = calculatePayout(position);
                const player = finishedPlayers.find(p => p.finish_position === position);
                const isPaid = markedPaid.includes(position);

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
                      <span className="font-bold text-gold-gradient">{currencySymbol}{payout}</span>
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
          {activePlayers.length > 0 ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {activePlayers.length} player(s) still in the game
            </div>
          ) : session.status !== 'completed' && isAdmin ? (
            <Button 
              className="w-full glow-gold mt-4" 
              onClick={handleFinalizeGame}
              disabled={finalizing || !isValidPercentage}
            >
              <Flag className="h-4 w-4 mr-2" />
              {finalizing ? 'Finalizing...' : 'Finalize Game & Create Settlements'}
            </Button>
          ) : session.status === 'completed' ? (
            <div className="text-center py-4">
              <Badge variant="default" className="bg-success">
                <Check className="h-3 w-3 mr-1" />
                Game Completed
              </Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Chop Deal Dialog */}
      <Dialog open={showChopDialog} onOpenChange={setShowChopDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-gradient">
              <Handshake className="h-5 w-5" />
              Make a Deal
            </DialogTitle>
            <DialogDescription>
              Split the remaining {currencySymbol}{prizePool} prize pool between {activePlayers.length} players.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {activePlayers.map((player) => (
              <div key={player.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="font-medium">{player.display_name}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{currencySymbol}</span>
                  <Input
                    type="number"
                    value={chopAmounts[player.id] || 0}
                    onChange={(e) => handleChopAmountChange(player.id, e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>
            ))}

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className={cn(
                  "font-bold text-lg",
                  isChopValid ? "text-success" : "text-destructive"
                )}>
                  {currencySymbol}{chopTotal} / {currencySymbol}{prizePool}
                </span>
              </div>
              {!isChopValid && (
                <p className="text-sm text-destructive mt-2">
                  Amounts must equal the prize pool
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowChopDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 glow-gold"
                onClick={handleConfirmChop}
                disabled={!isChopValid || finalizing}
              >
                {finalizing ? 'Processing...' : 'Confirm Deal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
