import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChipDenomination {
  id: string;
  denomination: number;
  color: string;
  cash_value: number;
  display_order: number;
}

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
}

interface Transaction {
  game_player_id: string;
  transaction_type: string;
  amount: number;
}

interface PlayerChipCount {
  playerId: string;
  chips: Record<string, number>; // denomination id -> quantity
  totalValue: number;
  confirmed: boolean;
}

interface ChipCounterProps {
  clubId: string;
  sessionId: string;
  players: GamePlayer[];
  transactions: Transaction[];
  isAdmin: boolean;
  onComplete: (playerTotals: { playerId: string; cashOut: number }[]) => void;
}

const CHIP_COLOR_MAP: Record<string, { hex: string; border?: boolean }> = {
  white: { hex: '#E5E7EB', border: true },
  red: { hex: '#DC2626' },
  orange: { hex: '#F97316' },
  yellow: { hex: '#EAB308', border: true },
  green: { hex: '#84CC16' },
  blue: { hex: '#2563EB' },
  purple: { hex: '#7C3AED' },
  pink: { hex: '#EC4899' },
  black: { hex: '#1F2937' },
  grey: { hex: '#6B7280' },
};

export function ChipCounter({ 
  clubId, 
  sessionId, 
  players, 
  transactions, 
  isAdmin, 
  onComplete 
}: ChipCounterProps) {
  const [denominations, setDenominations] = useState<ChipDenomination[]>([]);
  const [currency, setCurrency] = useState('GBP');
  const [playerCounts, setPlayerCounts] = useState<Record<string, PlayerChipCount>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetchChipTemplate();
  }, [clubId]);

  useEffect(() => {
    // Initialize player counts
    const counts: Record<string, PlayerChipCount> = {};
    players.forEach(p => {
      if (!playerCounts[p.id]) {
        counts[p.id] = {
          playerId: p.id,
          chips: {},
          totalValue: 0,
          confirmed: false,
        };
      } else {
        counts[p.id] = playerCounts[p.id];
      }
    });
    setPlayerCounts(counts);
  }, [players]);

  const fetchChipTemplate = async () => {
    const { data: templateData } = await supabase
      .from('chip_templates')
      .select('*')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .single();

    if (templateData) {
      setCurrency(templateData.currency);
      
      const { data: denomData } = await supabase
        .from('chip_denominations')
        .select('*')
        .eq('template_id', templateData.id)
        .order('display_order');

      if (denomData) {
        setDenominations(denomData.map(d => ({
          ...d,
          cash_value: Number(d.cash_value)
        })));
      }
    }
    setLoading(false);
  };

  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' };
    return symbols[currency] || '£';
  };

  const getPlayerBuyIn = (playerId: string) => {
    return transactions
      .filter(t => t.game_player_id === playerId && ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateTotal = (chips: Record<string, number>) => {
    return denominations.reduce((total, denom) => {
      const qty = chips[denom.id] || 0;
      return total + (qty * denom.cash_value);
    }, 0);
  };

  const handleChipChange = (playerId: string, denomId: string, quantity: number) => {
    setPlayerCounts(prev => {
      const playerCount = prev[playerId] || { playerId, chips: {}, totalValue: 0, confirmed: false };
      const newChips = { ...playerCount.chips, [denomId]: Math.max(0, quantity) };
      const newTotal = calculateTotal(newChips);
      
      return {
        ...prev,
        [playerId]: {
          ...playerCount,
          chips: newChips,
          totalValue: newTotal,
          confirmed: false, // Reset confirmation on change
        },
      };
    });
  };

  const handleConfirmPlayer = (playerId: string) => {
    setPlayerCounts(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        confirmed: true,
      },
    }));
    setSelectedPlayer(null);
    toast.success('Stack confirmed');
  };

  const handleCompleteAllCounts = () => {
    const unconfirmed = players.filter(p => !playerCounts[p.id]?.confirmed);
    if (unconfirmed.length > 0) {
      toast.error(`${unconfirmed.length} player(s) still need chip counts confirmed`);
      return;
    }

    const totals = players.map(p => ({
      playerId: p.id,
      cashOut: playerCounts[p.id]?.totalValue || 0,
    }));

    onComplete(totals);
  };

  const confirmedCount = players.filter(p => playerCounts[p.id]?.confirmed).length;
  const allConfirmed = confirmedCount === players.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (denominations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No chip template configured for this club. Please set up chip values in club settings.
        </CardContent>
      </Card>
    );
  }

  // Chip counting view for selected player
  if (selectedPlayer && isAdmin) {
    const player = players.find(p => p.id === selectedPlayer);
    const playerCount = playerCounts[selectedPlayer] || { chips: {}, totalValue: 0 };
    const buyIn = getPlayerBuyIn(selectedPlayer);
    const profitLoss = playerCount.totalValue - buyIn;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Count Chips - {player?.display_name}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedPlayer(null)}>
              Cancel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chip inputs */}
          <div className="space-y-2">
            {denominations.map(denom => {
              const colorInfo = CHIP_COLOR_MAP[denom.color] || CHIP_COLOR_MAP.white;
              const qty = playerCount.chips[denom.id] || 0;
              const value = qty * denom.cash_value;
              
              return (
                <div key={denom.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <div
                    className="poker-chip w-10 h-10 shrink-0"
                    style={{ '--chip-color': colorInfo.hex } as React.CSSProperties}
                  >
                    <span className="poker-chip-value">{denom.denomination}</span>
                  </div>
                  
                  <span className="text-sm text-muted-foreground w-20">
                    × {getCurrencySymbol()}{denom.cash_value.toFixed(2)}
                  </span>
                  
                  <Input
                    type="number"
                    value={qty || ''}
                    onChange={(e) => handleChipChange(selectedPlayer, denom.id, parseInt(e.target.value) || 0)}
                    className="w-20 text-center"
                    min={0}
                  />
                  
                  <span className="text-sm font-medium ml-auto">
                    = {getCurrencySymbol()}{value.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Stack:</span>
              <span>{getCurrencySymbol()}{playerCount.totalValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Bought In:</span>
              <span>{getCurrencySymbol()}{buyIn.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between text-sm font-medium ${
              profitLoss > 0 ? 'text-green-500' : profitLoss < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              <span>Profit/Loss:</span>
              <span className="flex items-center gap-1">
                {profitLoss > 0 ? <TrendingUp className="h-4 w-4" /> : 
                 profitLoss < 0 ? <TrendingDown className="h-4 w-4" /> : 
                 <Minus className="h-4 w-4" />}
                {profitLoss >= 0 ? '+' : ''}{getCurrencySymbol()}{profitLoss.toFixed(2)}
              </span>
            </div>
          </div>

          <Button 
            className="w-full gap-2" 
            onClick={() => handleConfirmPlayer(selectedPlayer)}
          >
            <Check className="h-4 w-4" />
            Confirm Stack
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Player list view
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Cash Out ({confirmedCount}/{players.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {players.map(player => {
          const count = playerCounts[player.id];
          const buyIn = getPlayerBuyIn(player.id);
          const profitLoss = (count?.totalValue || 0) - buyIn;
          
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                count?.confirmed ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'
              }`}
            >
              <div>
                <div className="font-medium flex items-center gap-2">
                  {player.display_name}
                  {count?.confirmed && (
                    <Badge variant="outline" className="text-green-500 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}
                </div>
                {count?.confirmed && (
                  <div className="text-sm text-muted-foreground">
                    Stack: {getCurrencySymbol()}{count.totalValue.toFixed(2)}
                    <span className={`ml-2 ${
                      profitLoss > 0 ? 'text-green-500' : profitLoss < 0 ? 'text-red-500' : ''
                    }`}>
                      ({profitLoss >= 0 ? '+' : ''}{getCurrencySymbol()}{profitLoss.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <Button
                  variant={count?.confirmed ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => setSelectedPlayer(player.id)}
                >
                  {count?.confirmed ? 'Edit' : 'Count Chips'}
                </Button>
              )}
            </div>
          );
        })}

        {isAdmin && players.length > 0 && (
          <Button
            className="w-full mt-4"
            disabled={!allConfirmed}
            onClick={handleCompleteAllCounts}
          >
            {allConfirmed 
              ? 'Complete Cash Out & Generate Settlements' 
              : `Count remaining ${players.length - confirmedCount} player(s)`
            }
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
