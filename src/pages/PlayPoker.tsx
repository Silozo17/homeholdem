import { useEffect, useRef } from 'react';
import { usePokerGame } from '@/hooks/usePokerGame';
import { PlayPokerLobby } from '@/components/poker/PlayPokerLobby';
import { PokerTablePro } from '@/components/poker/PokerTablePro';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function PlayPoker() {
  const { user } = useAuth();
  const {
    state,
    startGame,
    playerAction,
    nextHand,
    quitGame,
    resetGame,
    isHumanTurn,
    amountToCall,
    canCheck,
    maxBet,
  } = usePokerGame();

  // Save results & award XP on game over
  const savedRef = useRef(false);
  useEffect(() => {
    if (state.phase !== 'game_over' || !user?.id || savedRef.current) return;
    if (state.handsPlayed === 0) return; // No XP for instant quit
    savedRef.current = true;
    const humanPlayer = state.players.find(p => p.id === 'human');
    const duration = Math.round((Date.now() - state.startTime) / 1000);
    const isWinner = humanPlayer && humanPlayer.chips > 0 &&
      state.players.filter(p => p.chips > 0).length <= 1;

    supabase.from('poker_play_results').insert({
      user_id: user.id,
      game_mode: 'practice',
      bot_count: state.players.filter(p => p.isBot).length,
      starting_chips: state.startingChips,
      final_chips: humanPlayer?.chips ?? 0,
      hands_played: state.handsPlayed,
      hands_won: state.handsWon,
      best_hand_name: state.bestHandName || null,
      best_hand_rank: state.bestHandRank || null,
      biggest_pot: state.biggestPot || null,
      duration_seconds: duration,
    }).then(() => {});

    // Award XP
    const xpEvents: Array<{ user_id: string; reason: string; xp_amount: number }> = [];
    xpEvents.push({ user_id: user.id, reason: 'game_complete', xp_amount: 25 });
    if (isWinner) xpEvents.push({ user_id: user.id, reason: 'game_win', xp_amount: 100 });
    if (state.handsWon > 0) xpEvents.push({ user_id: user.id, reason: 'hands_won', xp_amount: state.handsWon * 10 });
    supabase.from('xp_events').insert(xpEvents).then(() => {});
  }, [state.phase, user?.id]);

  // Reset saved flag when returning to lobby
  useEffect(() => {
    if (state.phase === 'idle') savedRef.current = false;
  }, [state.phase]);

  if (state.phase === 'idle') {
    return <PlayPokerLobby onStart={startGame} />;
  }

  return (
    <PokerTablePro
      state={state}
      isHumanTurn={isHumanTurn}
      amountToCall={amountToCall}
      canCheck={canCheck}
      maxBet={maxBet}
      onAction={playerAction}
      onNextHand={nextHand}
      onQuit={resetGame}
    />
  );
}
