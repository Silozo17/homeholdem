import { supabase } from '@/integrations/supabase/client';

interface GamePlayer {
  id: string;
  user_id: string;
  display_name: string;
  finish_position: number | null;
}

interface Transaction {
  game_player_id: string;
  transaction_type: string;
  amount: number;
}

interface PayoutData {
  position: number;
  percentage: number;
  amount: number;
  playerId: string | null;
}

/**
 * Finalizes a game session - calculates settlements and updates season standings
 */
export async function finalizeGame(
  sessionId: string,
  clubId: string,
  players: GamePlayer[],
  transactions: Transaction[],
  payouts: PayoutData[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Calculate net profit/loss for each player
    const playerBalances: Record<string, { userId: string; name: string; netAmount: number }> = {};

    // Add buy-ins (money put in)
    transactions
      .filter(t => ['buyin', 'rebuy', 'addon'].includes(t.transaction_type))
      .forEach(t => {
        const player = players.find(p => p.id === t.game_player_id);
        if (player) {
          if (!playerBalances[player.user_id]) {
            playerBalances[player.user_id] = {
              userId: player.user_id,
              name: player.display_name,
              netAmount: 0,
            };
          }
          playerBalances[player.user_id].netAmount -= t.amount; // Spent money
        }
      });

    // Add payouts (money received)
    payouts
      .filter(p => p.playerId)
      .forEach(p => {
        const player = players.find(pl => pl.id === p.playerId);
        if (player) {
          if (!playerBalances[player.user_id]) {
            playerBalances[player.user_id] = {
              userId: player.user_id,
              name: player.display_name,
              netAmount: 0,
            };
          }
          playerBalances[player.user_id].netAmount += p.amount; // Won money
        }
      });

    // 2. Create settlements (from losers to winners)
    const losers = Object.values(playerBalances).filter(b => b.netAmount < 0);
    const winners = Object.values(playerBalances).filter(b => b.netAmount > 0);

    const settlements: Array<{
      club_id: string;
      game_session_id: string;
      from_user_id: string;
      to_user_id: string;
      amount: number;
      notes: string;
    }> = [];

    // Simple settlement algorithm: match losers to winners
    let loserIdx = 0;
    let winnerIdx = 0;
    const loserAmounts = losers.map(l => Math.abs(l.netAmount));
    const winnerAmounts = winners.map(w => w.netAmount);

    while (loserIdx < losers.length && winnerIdx < winners.length) {
      const loserOwes = loserAmounts[loserIdx];
      const winnerOwed = winnerAmounts[winnerIdx];

      if (loserOwes <= 0) {
        loserIdx++;
        continue;
      }
      if (winnerOwed <= 0) {
        winnerIdx++;
        continue;
      }

      const transferAmount = Math.min(loserOwes, winnerOwed);

      settlements.push({
        club_id: clubId,
        game_session_id: sessionId,
        from_user_id: losers[loserIdx].userId,
        to_user_id: winners[winnerIdx].userId,
        amount: transferAmount,
        notes: `Auto-generated from game settlement`,
      });

      loserAmounts[loserIdx] -= transferAmount;
      winnerAmounts[winnerIdx] -= transferAmount;

      if (loserAmounts[loserIdx] <= 0) loserIdx++;
      if (winnerAmounts[winnerIdx] <= 0) winnerIdx++;
    }

    // Insert settlements
    if (settlements.length > 0) {
      const { error: settlementError } = await supabase
        .from('settlements')
        .insert(settlements);

      if (settlementError) {
        console.error('Failed to create settlements:', settlementError);
      }
    }

    // 3. Update season standings
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('*')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .single();

    if (activeSeason) {
      const updates = players.map(player => {
        const balance = playerBalances[player.user_id];
        const position = player.finish_position || 999;

        // Calculate points
        let points = activeSeason.points_per_participation;
        if (position === 1) points += activeSeason.points_for_win;
        else if (position === 2) points += activeSeason.points_for_second;
        else if (position === 3) points += activeSeason.points_for_third;
        else if (position === 4) points += activeSeason.points_for_fourth;

        return {
          seasonId: activeSeason.id,
          userId: player.user_id,
          points,
          isWin: position === 1,
          isSecond: position === 2,
          isThird: position === 3,
          winnings: Math.max(0, balance?.netAmount || 0),
        };
      });

      // Upsert standings
      for (const update of updates) {
        const { data: existing } = await supabase
          .from('season_standings')
          .select('*')
          .eq('season_id', update.seasonId)
          .eq('user_id', update.userId)
          .single();

        if (existing) {
          await supabase
            .from('season_standings')
            .update({
              total_points: existing.total_points + update.points,
              games_played: existing.games_played + 1,
              wins: existing.wins + (update.isWin ? 1 : 0),
              second_places: existing.second_places + (update.isSecond ? 1 : 0),
              third_places: existing.third_places + (update.isThird ? 1 : 0),
              total_winnings: existing.total_winnings + update.winnings,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('season_standings')
            .insert({
              season_id: update.seasonId,
              user_id: update.userId,
              total_points: update.points,
              games_played: 1,
              wins: update.isWin ? 1 : 0,
              second_places: update.isSecond ? 1 : 0,
              third_places: update.isThird ? 1 : 0,
              total_winnings: update.winnings,
            });
        }
      }
    }

    // 4. Mark session as completed
    await supabase
      .from('game_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    return { success: true };
  } catch (error) {
    console.error('Failed to finalize game:', error);
    return { success: false, error: 'Failed to finalize game' };
  }
}
