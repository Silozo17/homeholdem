import { usePokerGame } from '@/hooks/usePokerGame';
import { PlayPokerLobby } from '@/components/poker/PlayPokerLobby';
import { PokerTable } from '@/components/poker/PokerTable';

export default function PlayPoker() {
  const {
    state,
    startGame,
    playerAction,
    nextHand,
    quitGame,
    isHumanTurn,
    amountToCall,
    canCheck,
    maxBet,
  } = usePokerGame();

  if (state.phase === 'idle' || state.phase === 'game_over') {
    return <PlayPokerLobby onStart={startGame} />;
  }

  return (
    <PokerTable
      state={state}
      isHumanTurn={isHumanTurn}
      amountToCall={amountToCall}
      canCheck={canCheck}
      maxBet={maxBet}
      onAction={playerAction}
      onNextHand={nextHand}
      onQuit={quitGame}
    />
  );
}
