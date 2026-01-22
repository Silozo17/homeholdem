import { useState, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, RefreshCcw, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/common/UserAvatar';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  avatar_url?: string | null;
}

interface GameTransaction {
  id: string;
  game_player_id: string;
  transaction_type: string;
  amount: number;
  chips: number | null;
  notes: string | null;
  created_at: string;
}

interface GameSession {
  id: string;
  buy_in_amount: number;
  rebuy_amount: number;
  addon_amount: number;
  starting_chips: number;
  rebuy_chips: number;
  addon_chips: number;
  allow_rebuys: boolean;
  allow_addons: boolean;
  rebuy_until_level: number | null;
  current_level: number;
}

interface BuyInTrackerProps {
  players: GamePlayer[];
  transactions: GameTransaction[];
  session: GameSession;
  currencySymbol: string;
  isAdmin: boolean;
  onRefresh: () => void;
}

type TransactionType = 'buyin' | 'rebuy' | 'addon';

export function BuyInTracker({ 
  players, 
  transactions, 
  session, 
  currencySymbol,
  isAdmin, 
  onRefresh 
}: BuyInTrackerProps) {
  const { user } = useAuth();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [transactionType, setTransactionType] = useState<TransactionType>('buyin');
  const [pendingQuickAdd, setPendingQuickAdd] = useState<string | null>(null);

  const getPlayerTransactions = useCallback((playerId: string) => {
    return transactions.filter(t => t.game_player_id === playerId);
  }, [transactions]);

  const getPlayerTotals = useCallback((playerId: string) => {
    const playerTxns = getPlayerTransactions(playerId);
    return {
      buyins: playerTxns.filter(t => t.transaction_type === 'buyin').length,
      rebuys: playerTxns.filter(t => t.transaction_type === 'rebuy').length,
      addons: playerTxns.filter(t => t.transaction_type === 'addon').length,
      totalSpent: playerTxns.reduce((sum, t) => sum + t.amount, 0),
    };
  }, [getPlayerTransactions]);

  const handleAddTransaction = async () => {
    if (!selectedPlayer || !user) return;

    let amount = 0;
    let chips = 0;

    switch (transactionType) {
      case 'buyin':
        amount = session.buy_in_amount;
        chips = session.starting_chips;
        break;
      case 'rebuy':
        amount = session.rebuy_amount;
        chips = session.rebuy_chips;
        break;
      case 'addon':
        amount = session.addon_amount;
        chips = session.addon_chips;
        break;
    }

    const { error } = await supabase
      .from('game_transactions')
      .insert({
        game_session_id: session.id,
        game_player_id: selectedPlayer,
        transaction_type: transactionType,
        amount,
        chips,
        created_by: user.id,
      });

    if (error) {
      toast.error('Failed to add transaction');
      return;
    }

    const player = players.find(p => p.id === selectedPlayer);
    toast.success(`${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} added for ${player?.display_name}`);
    setShowAddTransaction(false);
    setSelectedPlayer('');
    onRefresh();
  };

  const handleQuickBuyIn = async (player: GamePlayer) => {
    if (!user) return;
    
    // Set pending state for visual feedback
    setPendingQuickAdd(player.id);

    const { error } = await supabase.from('game_transactions').insert({
      game_session_id: session.id,
      game_player_id: player.id,
      transaction_type: 'buyin',
      amount: session.buy_in_amount,
      chips: session.starting_chips,
      created_by: user.id,
    });

    setPendingQuickAdd(null);

    if (error) {
      toast.error('Failed to add buy-in');
      return;
    }

    toast.success(`Buy-in added for ${player.display_name}`);
    onRefresh();
  };

  const canRebuy = session.allow_rebuys && 
    (!session.rebuy_until_level || session.current_level <= session.rebuy_until_level);

  const totalBuyIns = transactions
    .filter(t => t.transaction_type === 'buyin')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalRebuys = transactions
    .filter(t => t.transaction_type === 'rebuy')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalAddons = transactions
    .filter(t => t.transaction_type === 'addon')
    .reduce((sum, t) => sum + t.amount, 0);

  const activePlayers = players.filter(p => p.status === 'active');

  return (
    <>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Buy-ins & Rebuys
            </CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddTransaction(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 text-center pb-4 border-b border-border/30">
            <div>
              <div className="text-xs text-muted-foreground">Buy-ins</div>
              <div className="font-bold text-primary">{currencySymbol}{totalBuyIns}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Rebuys</div>
              <div className="font-bold">{currencySymbol}{totalRebuys}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Add-ons</div>
              <div className="font-bold">{currencySymbol}{totalAddons}</div>
            </div>
          </div>

          {/* Rebuy status */}
          {!canRebuy && session.rebuy_until_level && (
            <div className="text-center text-sm text-muted-foreground py-2 bg-muted/30 rounded-lg">
              Rebuys closed after Level {session.rebuy_until_level}
            </div>
          )}

          {/* Player list */}
          <div className="space-y-2">
            {activePlayers.map((player) => {
              const totals = getPlayerTotals(player.id);
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      name={player.display_name} 
                      avatarUrl={player.avatar_url}
                      size="sm"
                    />
                    <span className="font-medium">{player.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {totals.buyins > 0 && (
                      <Badge variant="default" className="text-xs">
                        {currencySymbol}{totals.totalSpent}
                      </Badge>
                    )}
                    <div className="flex gap-1 text-xs text-muted-foreground">
                      {totals.rebuys > 0 && (
                        <span className="flex items-center gap-0.5">
                          <RefreshCcw className="h-3 w-3" />
                          {totals.rebuys}
                        </span>
                      )}
                      {totals.addons > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Gift className="h-3 w-3" />
                          {totals.addons}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick actions for admin */}
          {isAdmin && activePlayers.length > 0 && (
            <div className="pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Quick Add</p>
              <div className="flex flex-wrap gap-2">
                {activePlayers.slice(0, 6).map((player) => {
                  const hasBuyin = transactions.some(
                    t => t.game_player_id === player.id && t.transaction_type === 'buyin'
                  );
                  if (!hasBuyin) {
                    return (
                      <Button
                        key={player.id}
                        variant="outline"
                        size="sm"
                        disabled={pendingQuickAdd === player.id}
                        onClick={() => handleQuickBuyIn(player)}
                        className="transition-all"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {player.display_name.split(' ')[0]}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Player</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {activePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={transactionType} 
                onValueChange={(v) => setTransactionType(v as TransactionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyin">
                    Buy-in ({currencySymbol}{session.buy_in_amount} → {session.starting_chips.toLocaleString()} chips)
                  </SelectItem>
                  {session.allow_rebuys && canRebuy && (
                    <SelectItem value="rebuy">
                      Rebuy ({currencySymbol}{session.rebuy_amount} → {session.rebuy_chips.toLocaleString()} chips)
                    </SelectItem>
                  )}
                  {session.allow_addons && (
                    <SelectItem value="addon">
                      Add-on ({currencySymbol}{session.addon_amount} → {session.addon_chips.toLocaleString()} chips)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTransaction(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTransaction} disabled={!selectedPlayer}>
              Add Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
