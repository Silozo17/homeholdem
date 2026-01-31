import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlertTriangle, Check, Trophy, Medal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { finalizeGame } from '@/lib/game-finalization';
import { logGameActivity } from '@/lib/club-members';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  status: string;
  finish_position: number | null;
}

interface Transaction {
  game_player_id: string;
  transaction_type: string;
  amount: number;
}

interface EndGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  eventId: string;
  clubId: string;
  players: GamePlayer[];
  transactions: Transaction[];
  onComplete: () => void;
  currencySymbol?: string;
}

// Default payout presets by position count
const PAYOUT_PRESETS: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [45, 27, 18, 10],
  5: [40, 25, 17, 11, 7],
};

const POSITION_ICONS = [
  { icon: Trophy, color: 'text-yellow-500' },
  { icon: Medal, color: 'text-gray-400' },
  { icon: Medal, color: 'text-amber-700' },
  { icon: null, color: 'text-muted-foreground' },
  { icon: null, color: 'text-muted-foreground' },
];

export function EndGameDialog({
  open,
  onOpenChange,
  sessionId,
  eventId,
  clubId,
  players,
  transactions,
  onComplete,
  currencySymbol = '£',
}: EndGameDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ending, setEnding] = useState(false);

  // Calculate prize pool from transactions
  const calculatedPrizePool = useMemo(() => {
    return transactions
      .filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // State for prize pool override
  const [overridePrizePool, setOverridePrizePool] = useState(false);
  const [customPrizePool, setCustomPrizePool] = useState(calculatedPrizePool);

  // State for payout configuration
  const [paidPositions, setPaidPositions] = useState(3);
  const [inputMode, setInputMode] = useState<'percentage' | 'currency'>('percentage');
  const [percentagePayouts, setPercentagePayouts] = useState<number[]>([50, 30, 20, 0, 0]);
  const [currencyPayouts, setCurrencyPayouts] = useState<number[]>([0, 0, 0, 0, 0]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setOverridePrizePool(false);
      setCustomPrizePool(calculatedPrizePool);
      setInputMode('percentage');
      
      // Determine default paid positions based on player count
      const eliminatedCount = players.filter(p => p.finish_position !== null).length;
      const activeCount = players.filter(p => p.status === 'active').length;
      const totalFinishing = eliminatedCount + activeCount;
      const defaultPositions = Math.min(Math.max(1, Math.min(totalFinishing, 3)), 5);
      setPaidPositions(defaultPositions);
      
      // Set default percentage payouts
      const preset = PAYOUT_PRESETS[defaultPositions] || [100];
      const paddedPreset = [...preset, 0, 0, 0, 0, 0].slice(0, 5);
      setPercentagePayouts(paddedPreset);
    }
  }, [open, calculatedPrizePool, players]);

  // Update currency payouts when percentage or prize pool changes
  useEffect(() => {
    const effectivePool = overridePrizePool ? customPrizePool : calculatedPrizePool;
    const newCurrencyPayouts = percentagePayouts.map(pct => 
      Math.round((effectivePool * pct) / 100)
    );
    setCurrencyPayouts(newCurrencyPayouts);
  }, [percentagePayouts, customPrizePool, overridePrizePool, calculatedPrizePool]);

  const effectivePrizePool = overridePrizePool ? customPrizePool : calculatedPrizePool;

  // Get players sorted by finish position (eliminated first, then active)
  const finishedPlayers = useMemo(() => {
    const eliminated = players
      .filter(p => p.finish_position !== null)
      .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));
    
    const active = players.filter(p => p.status === 'active');
    
    // Active players will be assigned positions starting from 1
    // (or next available if some are already eliminated)
    return [...active, ...eliminated];
  }, [players]);

  const activePlayers = players.filter(p => p.status === 'active');

  // Validation
  const totalPercentage = percentagePayouts.slice(0, paidPositions).reduce((a, b) => a + b, 0);
  const totalCurrency = currencyPayouts.slice(0, paidPositions).reduce((a, b) => a + b, 0);
  const isPercentageValid = totalPercentage === 100;
  const isCurrencyValid = totalCurrency === effectivePrizePool;
  const isValid = inputMode === 'percentage' ? isPercentageValid : isCurrencyValid;

  const handlePaidPositionsChange = (count: number) => {
    setPaidPositions(count);
    const preset = PAYOUT_PRESETS[count] || [100];
    const paddedPreset = [...preset, 0, 0, 0, 0, 0].slice(0, 5);
    setPercentagePayouts(paddedPreset);
  };

  const handlePercentageChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const newPayouts = [...percentagePayouts];
    newPayouts[index] = numValue;
    setPercentagePayouts(newPayouts);
  };

  const handleCurrencyChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const newPayouts = [...currencyPayouts];
    newPayouts[index] = numValue;
    setCurrencyPayouts(newPayouts);
    
    // Update percentages based on currency
    if (effectivePrizePool > 0) {
      const newPercentages = newPayouts.map(amt => 
        Math.round((amt / effectivePrizePool) * 100)
      );
      setPercentagePayouts(newPercentages);
    }
  };

  const handleEndGame = async () => {
    if (!isValid) {
      if (inputMode === 'percentage') {
        toast.error(t('game.percentage_must_equal_100'));
      } else {
        toast.error(t('game.currency_must_equal_pool'));
      }
      return;
    }

    setEnding(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;

      // Auto-assign finish positions to active players
      const highestPosition = Math.max(
        ...players.filter(p => p.finish_position !== null).map(p => p.finish_position || 0),
        0
      );

      // Update active players with finish positions
      for (let i = 0; i < activePlayers.length; i++) {
        const player = activePlayers[i];
        // First active player gets position 1, or next available if multiple
        const position = activePlayers.length === 1 
          ? 1 
          : (activePlayers.length - i);
        
        await supabase
          .from('game_players')
          .update({
            status: 'eliminated',
            finish_position: position,
            eliminated_at: new Date().toISOString(),
          })
          .eq('id', player.id);

        // Log activity
        await logGameActivity(sessionId, 'player_eliminated', player.id, player.display_name, {
          position,
          isWinner: position === 1,
        });
      }

      // Fetch updated players with positions
      const { data: updatedPlayers } = await supabase
        .from('game_players')
        .select('id, user_id, display_name, status, finish_position')
        .eq('game_session_id', sessionId);

      if (!updatedPlayers) {
        throw new Error('Failed to fetch players');
      }

      // Sort by finish position for payout assignment
      const sortedPlayers = updatedPlayers
        .filter(p => p.finish_position !== null)
        .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));

      // Build payouts using user-configured values
      const payouts = [];
      for (let i = 0; i < paidPositions; i++) {
        const player = sortedPlayers[i];
        const amount = inputMode === 'currency'
          ? currencyPayouts[i]
          : Math.round((effectivePrizePool * percentagePayouts[i]) / 100);
        const percentage = inputMode === 'percentage'
          ? percentagePayouts[i]
          : effectivePrizePool > 0 ? Math.round((currencyPayouts[i] / effectivePrizePool) * 100) : 0;

        payouts.push({
          position: i + 1,
          percentage,
          amount,
          playerId: player?.id || null,
        });
      }

      // Record payout transactions
      for (const payout of payouts) {
        if (payout.playerId && payout.amount > 0) {
          await supabase.from('game_transactions').insert({
            game_session_id: sessionId,
            game_player_id: payout.playerId,
            transaction_type: 'payout',
            amount: -payout.amount,
            created_by: user?.id,
          });
        }
      }

      // Finalize the game - payouts already contain amounts calculated from effective prize pool
      const result = await finalizeGame(
        sessionId,
        clubId,
        updatedPlayers,
        transactions,
        payouts
      );

      if (result.success) {
        toast.success(t('game.game_ended_success'));
        onOpenChange(false);
        onComplete();
        navigate(`/event/${eventId}`);
      } else {
        toast.error(result.error || t('game.end_game_failed'));
      }
    } catch (error) {
      console.error('Failed to end game:', error);
      toast.error(t('game.end_game_failed'));
    } finally {
      setEnding(false);
    }
  };

  const getPositionLabel = (index: number) => {
    const labels = ['1st', '2nd', '3rd', '4th', '5th'];
    return labels[index];
  };

  const getPlayerForPosition = (index: number) => {
    // If there are active players, they'll be assigned positions starting from 1
    if (activePlayers.length > 0 && index < activePlayers.length) {
      return activePlayers[activePlayers.length - 1 - index]?.display_name;
    }
    
    // Otherwise, use eliminated players by finish position
    const eliminated = players
      .filter(p => p.finish_position !== null)
      .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));
    
    return eliminated[index]?.display_name;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gold-gradient flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('game.end_tournament')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              {/* Prize Pool Section */}
              <div className="space-y-3 bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{t('game.calculated_prize_pool')}</Label>
                  <span className="text-lg font-bold text-gold-gradient">
                    {currencySymbol}{calculatedPrizePool}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="override-pool"
                    checked={overridePrizePool}
                    onCheckedChange={(checked) => setOverridePrizePool(checked === true)}
                  />
                  <Label htmlFor="override-pool" className="text-sm cursor-pointer">
                    {t('game.override_prize_pool')}
                  </Label>
                </div>
                
                {overridePrizePool && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{currencySymbol}</span>
                    <Input
                      type="number"
                      value={customPrizePool}
                      onChange={(e) => setCustomPrizePool(parseInt(e.target.value) || 0)}
                      className="w-32"
                    />
                    <span className="text-xs text-muted-foreground">
                      {t('game.prize_pool_override_hint')}
                    </span>
                  </div>
                )}
              </div>

              {/* Paid Positions Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('game.paid_positions')}</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Button
                      key={num}
                      variant={paidPositions === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePaidPositionsChange(num)}
                      className="w-10 h-10"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Input Mode Toggle */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('game.input_mode')}</Label>
                <ToggleGroup
                  type="single"
                  value={inputMode}
                  onValueChange={(value) => value && setInputMode(value as 'percentage' | 'currency')}
                  className="justify-start"
                >
                  <ToggleGroupItem value="percentage" className="px-4">
                    %
                  </ToggleGroupItem>
                  <ToggleGroupItem value="currency" className="px-4">
                    {currencySymbol}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Payout Structure */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('game.payout_structure')}</Label>
                <div className="space-y-2">
                  {Array.from({ length: paidPositions }).map((_, index) => {
                    const IconComponent = POSITION_ICONS[index]?.icon;
                    const iconColor = POSITION_ICONS[index]?.color || 'text-muted-foreground';
                    const playerName = getPlayerForPosition(index);
                    const amount = inputMode === 'currency'
                      ? currencyPayouts[index]
                      : Math.round((effectivePrizePool * percentagePayouts[index]) / 100);

                    return (
                      <div key={index} className="flex items-center gap-2 bg-muted/20 rounded-lg p-2">
                        <div className="w-8 flex justify-center">
                          {IconComponent ? (
                            <IconComponent className={`h-5 w-5 ${iconColor}`} />
                          ) : (
                            <span className={`text-sm font-medium ${iconColor}`}>{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {getPositionLabel(index)}
                            {playerName && (
                              <span className="text-muted-foreground ml-1">({playerName})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {inputMode === 'percentage' ? (
                            <>
                              <Input
                                type="number"
                                value={percentagePayouts[index]}
                                onChange={(e) => handlePercentageChange(index, e.target.value)}
                                className="w-16 h-8 text-center"
                                min={0}
                                max={100}
                              />
                              <span className="text-muted-foreground">%</span>
                              <span className="text-sm text-muted-foreground w-20 text-right">
                                = {currencySymbol}{amount}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-muted-foreground">{currencySymbol}</span>
                              <Input
                                type="number"
                                value={currencyPayouts[index]}
                                onChange={(e) => handleCurrencyChange(index, e.target.value)}
                                className="w-20 h-8 text-center"
                                min={0}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total and Validation */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-sm font-medium">{t('game.total_payout')}</span>
                  <div className="flex items-center gap-2">
                    {inputMode === 'percentage' ? (
                      <span className={`text-sm font-bold ${isPercentageValid ? 'text-green-500' : 'text-destructive'}`}>
                        {totalPercentage}%
                      </span>
                    ) : (
                      <span className={`text-sm font-bold ${isCurrencyValid ? 'text-green-500' : 'text-destructive'}`}>
                        {currencySymbol}{totalCurrency}
                      </span>
                    )}
                    {isValid ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>

                {!isValid && (
                  <p className="text-xs text-destructive">
                    {inputMode === 'percentage'
                      ? t('game.total_must_equal_100', { total: totalPercentage })
                      : t('game.total_must_equal_pool', { symbol: currencySymbol, pool: effectivePrizePool, total: totalCurrency })
                    }
                  </p>
                )}
              </div>

              {/* Active Players Warning */}
              {activePlayers.length > 0 && (
                <div className="flex items-start gap-2 text-amber-500 bg-amber-500/10 rounded-lg p-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">
                    {t('game.auto_assign_note', { count: activePlayers.length })}
                  </span>
                </div>
              )}

              {/* Zero prize pool warning */}
              {effectivePrizePool === 0 && !overridePrizePool && (
                <div className="flex items-start gap-2 text-amber-500 bg-amber-500/10 rounded-lg p-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span className="text-sm">
                    {t('game.prize_pool_zero_hint')}
                  </span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={ending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEndGame}
            disabled={!isValid || ending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {ending ? t('game.ending') : t('game.end_game')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
