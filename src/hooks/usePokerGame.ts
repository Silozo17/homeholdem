import { useReducer, useCallback, useRef, useEffect } from 'react';
import {
  Card, PokerPlayer, GameState, GamePhase, GameAction, LobbySettings,
  HAND_RANK_NAMES, BotPersonality, BLIND_LEVELS,
} from '@/lib/poker/types';
import { createDeck, shuffle, deal } from '@/lib/poker/deck';
import { evaluateHand, compareHands } from '@/lib/poker/hand-evaluator';
import { decideBotAction } from '@/lib/poker/bot-ai';
import { calculateSidePots, distributeSidePots, PotContributor } from '@/lib/poker/side-pots';
import { getBotPersona } from '@/lib/poker/bot-personas';

const ALL_PERSONALITIES: BotPersonality[] = ['shark', 'maniac', 'rock', 'fish', 'pro'];

// --- Action types ---
type Action =
  | { type: 'START_GAME'; settings: LobbySettings }
  | { type: 'DEAL_HAND' }
  | { type: 'PLAYER_ACTION'; action: GameAction }
  | { type: 'BOT_ACTION' }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'SHOWDOWN' }
  | { type: 'NEXT_HAND' }
  | { type: 'QUIT' }
  | { type: 'RESET' };

// Bot names now come from bot-personas.ts

function createInitialState(): GameState {
  return {
    phase: 'idle',
    players: [],
    communityCards: [],
    deck: [],
    pot: 0,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlind: 50,
    bigBlind: 100,
    minRaise: 100,
    handNumber: 0,
    lastRaiserIndex: null,
    handsPlayed: 0,
    handsWon: 0,
    biggestPot: 0,
    bestHandRank: 0,
    bestHandName: '',
    startTime: Date.now(),
    startingChips: 10000,
    blindLevel: 0,
    blindTimer: 0,
    lastBlindIncrease: Date.now(),
    lastHandWinners: [],
  };
}

function getActivePlayers(players: PokerPlayer[]): PokerPlayer[] {
  return players.filter(p => p.status === 'active' || p.status === 'all-in');
}

function getActionablePlayers(players: PokerPlayer[]): PokerPlayer[] {
  return players.filter(p => p.status === 'active');
}

function nextActivePlayerIndex(players: PokerPlayer[], fromIndex: number): number {
  let idx = (fromIndex + 1) % players.length;
  let attempts = 0;
  while (attempts < players.length) {
    if (players[idx].status === 'active') return idx;
    idx = (idx + 1) % players.length;
    attempts++;
  }
  return -1;
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const { botCount, startingChips, smallBlind, bigBlind, blindTimer } = action.settings;
      const players: PokerPlayer[] = [];

      // Human player at seat 0
      players.push({
        id: 'human',
        name: 'You',
        chips: startingChips,
        holeCards: [],
        status: 'active',
        currentBet: 0,
        totalBetThisHand: 0,
        isBot: false,
        isDealer: false,
        seatIndex: 0,
      });

      for (let i = 0; i < botCount; i++) {
        const personality = ALL_PERSONALITIES[i % ALL_PERSONALITIES.length];
        const persona = getBotPersona(i);
        players.push({
          id: `bot-${i}`,
          name: persona.name,
          chips: startingChips,
          holeCards: [],
          status: 'active',
          currentBet: 0,
          totalBetThisHand: 0,
          isBot: true,
          isDealer: false,
          seatIndex: i + 1,
          personality,
        });
      }

      players[0].isDealer = true;

      // Find starting blind level
      const startLevel = BLIND_LEVELS.findIndex(l => l.big >= bigBlind);
      const blindLevel = startLevel >= 0 ? startLevel : 0;

      return {
        ...state,
        phase: 'dealing',
        players,
        dealerIndex: 0,
        smallBlind,
        bigBlind,
        minRaise: bigBlind,
        startingChips: startingChips,
        startTime: Date.now(),
        handsPlayed: 0,
        handsWon: 0,
        biggestPot: 0,
        bestHandRank: 0,
        bestHandName: '',
        blindLevel,
        blindTimer: blindTimer || 0,
        lastBlindIncrease: Date.now(),
      };
    }

    case 'DEAL_HAND': {
      // Check blind level progression
      let currentSmallBlind = state.smallBlind;
      let currentBigBlind = state.bigBlind;
      let blindLevel = state.blindLevel;
      let lastBlindIncrease = state.lastBlindIncrease;

      if (state.blindTimer > 0 && Date.now() - state.lastBlindIncrease >= state.blindTimer * 60000) {
        const nextLevel = Math.min(blindLevel + 1, BLIND_LEVELS.length - 1);
        if (nextLevel !== blindLevel) {
          blindLevel = nextLevel;
          currentSmallBlind = BLIND_LEVELS[nextLevel].small;
          currentBigBlind = BLIND_LEVELS[nextLevel].big;
          lastBlindIncrease = Date.now();
        }
      }

      // Reset for new hand
      let deck = shuffle(createDeck());
      const players: PokerPlayer[] = state.players.map(p => ({
        ...p,
        holeCards: [] as Card[],
        status: (p.chips > 0 ? 'active' : 'eliminated') as PokerPlayer['status'],
        currentBet: 0,
        totalBetThisHand: 0,
        lastAction: undefined,
      }));

      // Deal 2 cards to each active player
      for (const p of players) {
        if (p.status === 'active') {
          const [cards, remaining] = deal(deck, 2);
          p.holeCards = cards;
          deck = remaining;
        }
      }

      // Post blinds
      const activePlayers = players.filter(p => p.status === 'active');
      if (activePlayers.length < 2) {
        return { ...state, phase: 'game_over', players };
      }

      const sbIndex = nextActivePlayerIndex(players, state.dealerIndex);
      const bbIndex = nextActivePlayerIndex(players, sbIndex);

      const sbAmount = Math.min(currentSmallBlind, players[sbIndex].chips);
      players[sbIndex].chips -= sbAmount;
      players[sbIndex].currentBet = sbAmount;
      players[sbIndex].totalBetThisHand = sbAmount;

      const bbAmount = Math.min(currentBigBlind, players[bbIndex].chips);
      players[bbIndex].chips -= bbAmount;
      players[bbIndex].currentBet = bbAmount;
      players[bbIndex].totalBetThisHand = bbAmount;

      // Check if SB/BB went all-in
      if (players[sbIndex].chips === 0) (players[sbIndex] as any).status = 'all-in';
      if (players[bbIndex].chips === 0) (players[bbIndex] as any).status = 'all-in';

      const pot = sbAmount + bbAmount;
      const firstToAct = nextActivePlayerIndex(players, bbIndex);

      return {
        ...state,
        phase: 'preflop',
        players,
        deck,
        communityCards: [],
        pot,
        currentPlayerIndex: firstToAct === -1 ? 0 : firstToAct,
        minRaise: currentBigBlind,
        handNumber: state.handNumber + 1,
        lastRaiserIndex: bbIndex,
        smallBlind: currentSmallBlind,
        bigBlind: currentBigBlind,
        blindLevel,
        lastBlindIncrease,
      };
    }

    case 'PLAYER_ACTION': {
      const { action: gameAction } = action;
      const players = [...state.players.map(p => ({ ...p }))];
      const player = players[state.currentPlayerIndex];
      let pot = state.pot;
      let minRaise = state.minRaise;
      let lastRaiserIndex = state.lastRaiserIndex;

      const maxBet = Math.max(...players.map(p => p.currentBet));
      const amountToCall = maxBet - player.currentBet;

      switch (gameAction.type) {
        case 'fold':
          player.status = 'folded';
          player.lastAction = 'Fold';
          break;

        case 'check':
          player.lastAction = 'Check';
          break;

        case 'call': {
          const callAmount = Math.min(amountToCall, player.chips);
          player.chips -= callAmount;
          player.currentBet += callAmount;
          player.totalBetThisHand += callAmount;
          pot += callAmount;
          if (player.chips === 0) player.status = 'all-in';
          player.lastAction = `Call ${callAmount}`;
          break;
        }

        case 'raise': {
          const raiseTotal = gameAction.amount || (maxBet + minRaise);
          const raiseAmount = Math.min(raiseTotal - player.currentBet, player.chips);
          player.chips -= raiseAmount;
          player.currentBet += raiseAmount;
          player.totalBetThisHand += raiseAmount;
          pot += raiseAmount;
          minRaise = Math.max(minRaise, player.currentBet - maxBet);
          lastRaiserIndex = state.currentPlayerIndex;
          if (player.chips === 0) player.status = 'all-in';
          player.lastAction = `Raise ${raiseAmount}`;
          break;
        }

        case 'all-in': {
          const allInAmount = player.chips;
          player.currentBet += allInAmount;
          player.totalBetThisHand += allInAmount;
          pot += allInAmount;
          player.chips = 0;
          player.status = 'all-in';
          if (player.currentBet > maxBet) {
            minRaise = Math.max(minRaise, player.currentBet - maxBet);
            lastRaiserIndex = state.currentPlayerIndex;
          }
          player.lastAction = `All-in ${allInAmount}`;
          break;
        }
      }

      // Check if betting round is over
      const actionable = getActionablePlayers(players);
      const nextIdx = nextActivePlayerIndex(players, state.currentPlayerIndex);

      // Round ends when we've gone around to the last raiser or all players have acted
      const currentMaxBet = Math.max(...players.map(p => p.currentBet));
      const allEqualBets = getActivePlayers(players).every(
        p => p.currentBet === currentMaxBet || p.status === 'all-in' || p.status === 'folded'
      );

      const foldedOut = players.filter(p => p.status !== 'folded' && p.status !== 'eliminated').length <= 1;

      if (foldedOut) {
        // Everyone folded except one
        return { ...state, phase: 'showdown', players, pot, deck: state.deck, minRaise, lastRaiserIndex };
      }

      // Round complete check
      const raiserIsAllIn = lastRaiserIndex !== null 
        && players[lastRaiserIndex]?.status === 'all-in';
      const allActiveActed = getActionablePlayers(players)
        .every(p => p.lastAction !== undefined);

      const roundComplete = allEqualBets && (
        // Standard: we've come back to the raiser
        (lastRaiserIndex !== null 
          && players[lastRaiserIndex]?.status === 'active' 
          && nextIdx === lastRaiserIndex) ||
        // Raiser went all-in: round done when all remaining active players have acted and matched
        (raiserIsAllIn && allActiveActed) ||
        // No raiser (check-around): everyone acted
        (lastRaiserIndex === null && allActiveActed)
      );

      if (actionable.length === 0 || roundComplete) {
        // Advance to next phase
        return advancePhase({ ...state, players, pot, minRaise, lastRaiserIndex });
      }

      return {
        ...state,
        players,
        pot,
        currentPlayerIndex: nextIdx === -1 ? 0 : nextIdx,
        minRaise,
        lastRaiserIndex,
      };
    }

    case 'ADVANCE_PHASE':
      return advancePhase(state);

    case 'SHOWDOWN': {
      const players = [...state.players.map(p => ({ ...p }))];
      const pot = state.pot;
      const remaining = players.filter(p => p.status === 'active' || p.status === 'all-in');
      let handsWon = state.handsWon;
      let biggestPot = Math.max(state.biggestPot, pot);
      let bestHandRank = state.bestHandRank;
      let bestHandName = state.bestHandName;

      const lastHandWinners: GameState['lastHandWinners'] = [];

      if (remaining.length === 1) {
        // Everyone else folded
        remaining[0].chips += pot;
        remaining[0].lastAction = 'Winner!';
        if (remaining[0].id === 'human') handsWon++;
        lastHandWinners.push({
          playerId: remaining[0].id,
          name: remaining[0].name,
          handName: 'N/A',
          chipsWon: pot,
        });
      } else {
        // Build contributors for side pot calculation
        const contributors: PotContributor[] = players.map(p => ({
          playerId: p.id,
          totalBet: p.totalBetThisHand,
          status: p.status,
        }));

        const sidePots = calculateSidePots(contributors);

        // Evaluate all remaining players' hands
        const results = remaining.map(p => ({
          playerId: p.id,
          hand: evaluateHand([...p.holeCards, ...state.communityCards]),
        }));

        // Build rankings sorted best to worst
        const rankings = [...results].sort((a, b) => b.hand.score - a.hand.score)
          .map(r => ({ playerId: r.playerId, score: r.hand.score }));

        // Distribute winnings across all side pots
        const winnings = distributeSidePots(sidePots, rankings);

        // Apply winnings to players
        for (const p of players) {
          const won = winnings[p.id] || 0;
          if (won > 0) {
            p.chips += won;
            const hand = results.find(r => r.playerId === p.id)?.hand;
            p.lastAction = hand ? `${hand.name}!` : 'Winner!';
            lastHandWinners.push({
              playerId: p.id,
              name: p.name,
              handName: hand?.name || 'N/A',
              chipsWon: won,
            });
            if (p.id === 'human') {
              handsWon++;
              if (hand && hand.rank > bestHandRank) {
                bestHandRank = hand.rank;
                bestHandName = hand.name;
              }
            }
          }
        }

        // Update human best hand even if they didn't win
        const humanResult = results.find(r => r.playerId === 'human');
        if (humanResult && humanResult.hand.rank > bestHandRank) {
          bestHandRank = humanResult.hand.rank;
          bestHandName = humanResult.hand.name;
        }
      }

      return {
        ...state,
        phase: 'hand_complete',
        players,
        pot: 0,
        handsPlayed: state.handsPlayed + 1,
        handsWon,
        biggestPot,
        bestHandRank,
        bestHandName,
        lastHandWinners,
      };
    }

    case 'NEXT_HAND': {
      const alivePlayers = state.players.filter(p => p.chips > 0);
      if (alivePlayers.length <= 1) {
        // Populate lastHandWinners so the game-over overlay shows the winner
        const gameOverWinners = alivePlayers.map(p => ({
          playerId: p.id,
          name: p.name,
          handName: state.lastHandWinners?.[0]?.handName || 'N/A',
          chipsWon: p.chips,
        }));
        return { ...state, phase: 'game_over', lastHandWinners: gameOverWinners };
      }

      // Rotate dealer
      let newDealerIndex = (state.dealerIndex + 1) % state.players.length;
      while (state.players[newDealerIndex].chips <= 0) {
        newDealerIndex = (newDealerIndex + 1) % state.players.length;
      }

      const players = state.players.map((p, i) => ({
        ...p,
        isDealer: i === newDealerIndex,
      }));

      return { ...state, phase: 'dealing', players, dealerIndex: newDealerIndex };
    }

    case 'QUIT': {
      const alivePlayers = state.players.filter(p => p.chips > 0);
      const gameOverWinners = alivePlayers.length > 0
        ? alivePlayers.map(p => ({
            playerId: p.id,
            name: p.name,
            handName: state.lastHandWinners?.[0]?.handName || 'N/A',
            chipsWon: p.chips,
          }))
        : state.lastHandWinners || [];
      return { ...state, phase: 'game_over', lastHandWinners: gameOverWinners };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

function advancePhase(state: GameState): GameState {
  let deck = [...state.deck];
  let communityCards = [...state.communityCards];
  let nextPhase: GamePhase;
  const players = state.players.map(p => ({
    ...p,
    currentBet: 0,
    lastAction: undefined,
  }));

  switch (state.phase) {
    case 'preflop': {
      const [flop, remaining] = deal(deck, 3);
      communityCards = flop;
      deck = remaining;
      nextPhase = 'flop';
      break;
    }
    case 'flop': {
      const [turn, remaining] = deal(deck, 1);
      communityCards = [...communityCards, ...turn];
      deck = remaining;
      nextPhase = 'turn';
      break;
    }
    case 'turn': {
      const [river, remaining] = deal(deck, 1);
      communityCards = [...communityCards, ...river];
      deck = remaining;
      nextPhase = 'river';
      break;
    }
    case 'river':
      nextPhase = 'showdown';
      return { ...state, phase: nextPhase, players, deck, communityCards };
    default:
      return state;
  }

  // Always advance phase-by-phase (even during all-in runouts)
  // The useEffect auto-advance handles moving through phases with dramatic pauses
  const firstToAct = nextActivePlayerIndex(players, state.dealerIndex);

  return {
    ...state,
    phase: nextPhase,
    players,
    deck,
    communityCards,
    currentPlayerIndex: firstToAct === -1 ? 0 : firstToAct,
    minRaise: state.bigBlind,
    lastRaiserIndex: null,
  };
}

// --- Hook ---
export function usePokerGame() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  // Auto-handle bot actions and phase transitions
  useEffect(() => {
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }

    // Auto-deal on 'dealing' phase — pause for card shuffle feel
    if (state.phase === 'dealing') {
      botTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'DEAL_HAND' });
      }, 1800);
      return;
    }

    // Auto-showdown — dramatic pause
    if (state.phase === 'showdown') {
      botTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'SHOWDOWN' });
      }, 2500);
      return;
    }

    // Auto-advance after hand_complete — longer pause to admire results
    if (state.phase === 'hand_complete') {
      botTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'NEXT_HAND' });
      }, 4500);
      return;
    }

    // All-in runout: auto-advance through phases when no one can act
    if (
      (state.phase === 'preflop' || state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') &&
      getActionablePlayers(state.players).length <= 1
    ) {
      // No one can bet — dramatic pause then advance to next phase
      const delay = state.phase === 'flop' ? 2200 : 1800;
      botTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'ADVANCE_PHASE' });
      }, delay);
      return;
    }

    // Bot's turn — realistic thinking delay
    if (
      (state.phase === 'preflop' || state.phase === 'flop' ||
       state.phase === 'turn' || state.phase === 'river') &&
      state.players[state.currentPlayerIndex]?.isBot &&
      state.players[state.currentPlayerIndex]?.status === 'active'
    ) {
      const player = state.players[state.currentPlayerIndex];
      const maxBet = Math.max(...state.players.map(p => p.currentBet));

      botTimeoutRef.current = setTimeout(() => {
        const botAction = decideBotAction(
          player,
          state.communityCards,
          state.pot,
          maxBet,
          state.minRaise,
          state.bigBlind,
          state.dealerIndex,
          state.players.filter(p => p.status !== 'eliminated').length,
        );
        dispatch({ type: 'PLAYER_ACTION', action: botAction });
      }, 1500 + Math.random() * 1500); // 1.5-3.0s delay for realistic pacing
    }
  }, [state.phase, state.currentPlayerIndex, state.handNumber, state.players.map(p => p.status).join()]);

  const startGame = useCallback((settings: LobbySettings) => {
    dispatch({ type: 'START_GAME', settings });
  }, []);

  const playerAction = useCallback((action: GameAction) => {
    dispatch({ type: 'PLAYER_ACTION', action });
  }, []);

  const nextHand = useCallback(() => {
    dispatch({ type: 'NEXT_HAND' });
  }, []);

  const quitGame = useCallback(() => {
    dispatch({ type: 'QUIT' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const isHumanTurn = 
    (state.phase === 'preflop' || state.phase === 'flop' ||
     state.phase === 'turn' || state.phase === 'river') &&
    !state.players[state.currentPlayerIndex]?.isBot &&
    state.players[state.currentPlayerIndex]?.status === 'active';

  const humanPlayer = state.players.find(p => p.id === 'human');
  const maxBet = Math.max(0, ...state.players.map(p => p.currentBet));
  const amountToCall = humanPlayer ? maxBet - humanPlayer.currentBet : 0;
  const canCheck = amountToCall === 0;

  return {
    state,
    startGame,
    playerAction,
    nextHand,
    quitGame,
    resetGame,
    isHumanTurn,
    humanPlayer,
    amountToCall,
    canCheck,
    maxBet,
  };
}
