import { useState } from 'react';
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
}

export function EndGameDialog({
  open,
  onOpenChange,
  sessionId,
  eventId,
  clubId,
  players,
  transactions,
  onComplete,
}: EndGameDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ending, setEnding] = useState(false);

  const activePlayers = players.filter(p => p.status === 'active');
  const canEnd = activePlayers.length <= 1;

  const handleEndGame = async () => {
    if (!canEnd) {
      toast.error(t('game.eliminate_players_first'));
      return;
    }

    setEnding(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;

      // If there's exactly 1 active player, mark them as winner
      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        await supabase
          .from('game_players')
          .update({
            status: 'eliminated',
            finish_position: 1,
            eliminated_at: new Date().toISOString(),
          })
          .eq('id', winner.id);

        // Log activity
        await logGameActivity(sessionId, 'player_eliminated', winner.id, winner.display_name, {
          position: 1,
          isWinner: true,
        });
      }

      // Get all players with updated positions
      const { data: updatedPlayers } = await supabase
        .from('game_players')
        .select('id, user_id, display_name, status, finish_position')
        .eq('game_session_id', sessionId);

      if (!updatedPlayers) {
        throw new Error('Failed to fetch players');
      }

      // Calculate prize pool
      const prizePool = transactions
        .filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
        .reduce((sum, t) => sum + t.amount, 0);

      // Build payouts - winner takes all for simple end game
      const finishedPlayers = updatedPlayers
        .filter(p => p.finish_position !== null)
        .sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));

      // Simple payout: winner takes all if only 1 finisher, otherwise use standard 50/30/20
      const payouts = finishedPlayers.slice(0, 3).map((player, index) => {
        const position = index + 1;
        let percentage = 0;
        if (finishedPlayers.length === 1) {
          percentage = 100;
        } else if (finishedPlayers.length === 2) {
          percentage = position === 1 ? 65 : 35;
        } else {
          percentage = position === 1 ? 50 : position === 2 ? 30 : 20;
        }
        return {
          position,
          percentage,
          amount: Math.round((prizePool * percentage) / 100),
          playerId: player.id,
        };
      });

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

      // Finalize the game
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gold-gradient">
            {t('game.end_tournament')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {t('game.end_tournament_description')}
            </span>
            {!canEnd && (
              <span className="block text-destructive font-medium">
                {t('game.players_still_active', { count: activePlayers.length })}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={ending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEndGame}
            disabled={!canEnd || ending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {ending ? t('game.ending') : t('game.end_game')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
