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
import { DollarSign, Plus, RefreshCcw, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/common/UserAvatar';
import { getClubMemberIds, logGameActivity } from '@/lib/club-members';
import { notifyRebuyAddon } from '@/lib/push-notifications';
import { notifyRebuyAddonInApp } from '@/lib/in-app-notifications';
import { CustomTransactionDialog } from './CustomTransactionDialog';
import { DisplayMode } from '@/hooks/useDisplayMode';

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
  eventId: string;
  clubId: string;
  currencySymbol: string;
  isAdmin: boolean;
  onRefresh: () => void;
  displayMode?: DisplayMode;
  chipToCashRatio?: number;
}

type TransactionType = 'buyin' | 'rebuy' | 'addon';

export function BuyInTracker({ 
  players, 
  transactions, 
  session, 
  eventId,
  clubId,
  currencySymbol,
  isAdmin, 
  onRefresh,
  displayMode = 'cash',
  chipToCashRatio = 0,
}: BuyInTrackerProps) {
  const { user } = useAuth();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [transactionType, setTransactionType] = useState<TransactionType>('buyin');
  const [pendingQuickAdd, setPendingQuickAdd] = useState<string | null>(null);
  const [showBulkBuyIn, setShowBulkBuyIn] = useState(false);
  const [bulkBuyInPending, setBulkBuyInPending] = useState(false);
  const [showCustomTransaction, setShowCustomTransaction] = useState(false);
  const [customTransactionPlayer, setCustomTransactionPlayer] = useState<GamePlayer | null>(null);
  const [customTransactionType, setCustomTransactionType] = useState<TransactionType>('buyin');

  // Format value based on display mode
  const formatValue = useCallback((amount: number, chips: number) => {
    if (displayMode === 'chips') {
      return `${chips.toLocaleString()} chips`;
    }
    return `${currencySymbol}${amount}`;
  }, [displayMode, currencySymbol]);

  // Format total chips to value based on display mode  
  const formatChipsTotal = useCallback((chips: number) => {
    if (displayMode === 'cash' && chipToCashRatio > 0) {
      const cashValue = chips * chipToCashRatio;
      return `${currencySymbol}${cashValue.toFixed(2).replace(/\.00$/, '')}`;
    }
    return chips.toLocaleString();
  }, [displayMode, chipToCashRatio, currencySymbol]);

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
      totalChips: playerTxns.reduce((sum, t) => sum + (t.chips || 0), 0),
    };
  }, [getPlayerTransactions]);

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

  const totalBuyInsChips = transactions
    .filter(t => t.transaction_type === 'buyin')
    .reduce((sum, t) => sum + (t.chips || 0), 0);
  const totalRebuysChips = transactions
    .filter(t => t.transaction_type === 'rebuy')
    .reduce((sum, t) => sum + (t.chips || 0), 0);
  const totalAddonsChips = transactions
    .filter(t => t.transaction_type === 'addon')
    .reduce((sum, t) => sum + (t.chips || 0), 0);

  const handleAddTransaction = async () => {
    if (!selectedPlayer || !user) return;

    // Open custom dialog for all transaction types
    const player = players.find(p => p.id === selectedPlayer);
    if (player) {
      setCustomTransactionPlayer(player);
      setCustomTransactionType(transactionType);
      setShowAddTransaction(false);
      setShowCustomTransaction(true);
    }
  };

  // Get default amount and chips based on transaction type
  const getDefaultsForType = (type: TransactionType) => {
    switch (type) {
      case 'buyin':
        return { amount: session.buy_in_amount, chips: session.starting_chips };
      case 'rebuy':
        return { amount: session.rebuy_amount, chips: session.rebuy_chips };
      case 'addon':
        return { amount: session.addon_amount, chips: session.addon_chips };
    }
  };

  // Handle custom transaction with manual amount/chips input
  const handleCustomTransaction = async (amount: number, chips: number) => {
    if (!customTransactionPlayer || !user) return;

    const { error } = await supabase
      .from('game_transactions')
      .insert({
        game_session_id: session.id,
        game_player_id: customTransactionPlayer.id,
        transaction_type: customTransactionType,
        amount,
        chips,
        created_by: user.id,
      });

    if (error) {
      toast.error('Failed to add transaction');
      throw error;
    }

    toast.success(`${customTransactionType.charAt(0).toUpperCase() + customTransactionType.slice(1)} (${currencySymbol}${amount}) added for ${customTransactionPlayer.display_name}`);
    
    // Send notifications for rebuys/addons
    if ((customTransactionType === 'rebuy' || customTransactionType === 'addon') && clubId && eventId) {
      const newPrizePool = totalBuyIns + totalRebuys + totalAddons + amount;
      getClubMemberIds(clubId).then(memberIds => {
        if (memberIds.length > 0) {
          Promise.all([
            notifyRebuyAddon(memberIds, customTransactionPlayer.display_name, customTransactionType, newPrizePool, currencySymbol, eventId),
            notifyRebuyAddonInApp(memberIds, customTransactionPlayer.display_name, customTransactionType, newPrizePool, currencySymbol, eventId, clubId),
            logGameActivity(session.id, customTransactionType, customTransactionPlayer.id, customTransactionPlayer.display_name, {
              amount,
              chips,
              prizePool: newPrizePool,
            }),
          ]).catch(console.error);
        }
      });
    }
    
    setShowCustomTransaction(false);
    setCustomTransactionPlayer(null);
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

  const activePlayers = players.filter(p => p.status === 'active');

  // Get players who need buy-in (for bulk buy-in feature)
  const playersWithoutBuyIn = activePlayers.filter(player => {
    return !transactions.some(
      t => t.game_player_id === player.id && t.transaction_type === 'buyin'
    );
  });

  const handleBulkBuyIn = async () => {
    if (!user || playersWithoutBuyIn.length === 0) return;
    
    setBulkBuyInPending(true);
    
    const transactionsToInsert = playersWithoutBuyIn.map(player => ({
      game_session_id: session.id,
      game_player_id: player.id,
      transaction_type: 'buyin',
      amount: session.buy_in_amount,
      chips: session.starting_chips,
      created_by: user.id,
    }));
    
    const { error } = await supabase
      .from('game_transactions')
      .insert(transactionsToInsert);
    
    setBulkBuyInPending(false);
    
    if (error) {
      toast.error('Failed to add buy-ins');
      return;
    }
    
    toast.success(`Buy-in added for ${playersWithoutBuyIn.length} players`);
    setShowBulkBuyIn(false);
    onRefresh();
  };

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
              <div className="flex items-center gap-2">
                {playersWithoutBuyIn.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowBulkBuyIn(true)}
                    className="glow-gold"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Buy-In All ({playersWithoutBuyIn.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddTransaction(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary - respects display mode */}
          <div className="grid grid-cols-3 gap-2 text-center pb-4 border-b border-border/30">
            <div>
              <div className="text-xs text-muted-foreground">Buy-ins</div>
              <div className="font-bold text-primary">
                {displayMode === 'chips' ? `${totalBuyInsChips.toLocaleString()}` : `${currencySymbol}${totalBuyIns}`}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Rebuys</div>
              <div className="font-bold">
                {displayMode === 'chips' ? `${totalRebuysChips.toLocaleString()}` : `${currencySymbol}${totalRebuys}`}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Add-ons</div>
              <div className="font-bold">
                {displayMode === 'chips' ? `${totalAddonsChips.toLocaleString()}` : `${currencySymbol}${totalAddons}`}
              </div>
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
                        {displayMode === 'chips' 
                          ? `${totals.totalChips.toLocaleString()}`
                          : `${currencySymbol}${totals.totalSpent}`
                        }
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
                    Buy-in ({formatValue(session.buy_in_amount, session.starting_chips)})
                  </SelectItem>
                  {session.allow_rebuys && canRebuy && (
                    <SelectItem value="rebuy">
                      Rebuy ({formatValue(session.rebuy_amount, session.rebuy_chips)})
                    </SelectItem>
                  )}
                  {session.allow_addons && (
                    <SelectItem value="addon">
                      Add-on ({formatValue(session.addon_amount, session.addon_chips)})
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

      {/* Bulk Buy-In Confirmation Dialog */}
      <Dialog open={showBulkBuyIn} onOpenChange={setShowBulkBuyIn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy-In All Players</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground">
              Add buy-in for <span className="font-bold text-foreground">{playersWithoutBuyIn.length} players</span>?
            </p>
            <div className="bg-primary/10 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span>Per player:</span>
                <span className="font-bold">{formatValue(session.buy_in_amount, session.starting_chips)}</span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-primary">
                  {displayMode === 'chips' 
                    ? `${(session.starting_chips * playersWithoutBuyIn.length).toLocaleString()} chips`
                    : `${currencySymbol}${session.buy_in_amount * playersWithoutBuyIn.length}`
                  }
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Players to buy-in:
              <div className="flex flex-wrap gap-1 mt-1">
                {playersWithoutBuyIn.map(p => (
                  <Badge key={p.id} variant="secondary">{p.display_name}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkBuyIn(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkBuyIn} 
              disabled={bulkBuyInPending}
              className="glow-gold"
            >
              {bulkBuyInPending ? 'Processing...' : `Buy-In ${playersWithoutBuyIn.length} Players`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Transaction Dialog */}
      <CustomTransactionDialog
        isOpen={showCustomTransaction}
        onClose={() => {
          setShowCustomTransaction(false);
          setCustomTransactionPlayer(null);
        }}
        player={customTransactionPlayer}
        defaultAmount={getDefaultsForType(customTransactionType).amount}
        defaultChips={getDefaultsForType(customTransactionType).chips}
        currencySymbol={currencySymbol}
        transactionType={customTransactionType}
        onConfirm={handleCustomTransaction}
      />
    </>
  );
}
