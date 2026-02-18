import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import {
  Card, PokerPlayer, GameState, GamePhase, GameAction,
  HAND_RANK_NAMES, BotPersonality,
} from '@/lib/poker/types';
import { deal } from '@/lib/poker/deck';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { decideBotAction } from '@/lib/poker/bot-ai';
import { calculateSidePots, distributeSidePots, PotContributor } from '@/lib/poker/side-pots';
import { getBotPersona } from '@/lib/poker/bot-personas';
import { TutorialLesson } from '@/lib/poker/tutorial-lessons';

const ALL_PERSONALITIES: BotPersonality[] = ['rock', 'fish', 'rock'];

type Action =
  | { type: 'START_GAME'; lesson: TutorialLesson }
  | { type: 'DEAL_HAND' }
  | { type: 'DEAL_ANIM_DONE' }
  | { type: 'PLAYER_ACTION'; action: GameAction }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'SHOWDOWN' }
  | { type: 'NEXT_HAND' }
  | { type: 'QUIT' }
  | { type: 'RESET' };

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
      const lesson = action.lesson;
      const players: PokerPlayer[] = [];

      players.push({
        id: 'human',
        name: 'You',
        chips: lesson.startingChips,
        holeCards: [],
        status: 'active',
        currentBet: 0,
        totalBetThisHand: 0,
        isBot: false,
        isDealer: false,
        seatIndex: 0,
      });

      for (let i = 0; i < lesson.botCount; i++) {
        const personality = ALL_PERSONALITIES[i % ALL_PERSONALITIES.length];
        const persona = getBotPersona(i);
        players.push({
          id: `bot-${i}`,
          name: persona.name,
          chips: lesson.startingChips,
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

      return {
        ...state,
        phase: 'dealing',
        players,
        deck: lesson.presetDeck, // Inject preset deck
        dealerIndex: 0,
        smallBlind: lesson.smallBlind,
        bigBlind: lesson.bigBlind,
        minRaise: lesson.bigBlind,
        startingChips: lesson.startingChips,
        startTime: Date.now(),
        blindLevel: 0,
        blindTimer: 0,
        lastBlindIncrease: Date.now(),
      };
    }

    case 'DEAL_HAND': {
      // Use preset deck from lesson (stored externally, passed via state.deck)
      let deck = [...state.deck];
      const players: PokerPlayer[] = state.players.map(p => ({
        ...p,
        holeCards: [] as Card[],
        status: (p.chips > 0 ? 'active' : 'eliminated') as PokerPlayer['status'],
        currentBet: 0,
        totalBetThisHand: 0,
        lastAction: undefined,
      }));

      for (const p of players) {
        if (p.status === 'active') {
          const [cards, remaining] = deal(deck, 2);
          p.holeCards = cards;
          deck = remaining;
        }
      }

      const activePlayers = players.filter(p => p.status === 'active');
      if (activePlayers.length < 2) {
        return { ...state, phase: 'game_over', players };
      }

      const sbIndex = nextActivePlayerIndex(players, state.dealerIndex);
      const bbIndex = nextActivePlayerIndex(players, sbIndex);

      const sbAmount = Math.min(state.smallBlind, players[sbIndex].chips);
      players[sbIndex].chips -= sbAmount;
      players[sbIndex].currentBet = sbAmount;
      players[sbIndex].totalBetThisHand = sbAmount;

      const bbAmount = Math.min(state.bigBlind, players[bbIndex].chips);
      players[bbIndex].chips -= bbAmount;
      players[bbIndex].currentBet = bbAmount;
      players[bbIndex].totalBetThisHand = bbAmount;

      if (players[sbIndex].chips === 0) (players[sbIndex] as any).status = 'all-in';
      if (players[bbIndex].chips === 0) (players[bbIndex] as any).status = 'all-in';

      const pot = sbAmount + bbAmount;
      const firstToAct = nextActivePlayerIndex(players, bbIndex);

      return {
        ...state,
        phase: 'preflop',
        dealAnimDone: false,
        players,
        deck,
        communityCards: [],
        pot,
        currentPlayerIndex: firstToAct === -1 ? 0 : firstToAct,
        minRaise: state.bigBlind,
        handNumber: state.handNumber + 1,
        lastRaiserIndex: bbIndex,
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

      const nextIdx = nextActivePlayerIndex(players, state.currentPlayerIndex);
      const currentMaxBet = Math.max(...players.map(p => p.currentBet));
      const allEqualBets = getActivePlayers(players).every(
        p => p.currentBet === currentMaxBet || p.status === 'all-in' || p.status === 'folded'
      );
      const foldedOut = players.filter(p => p.status !== 'folded' && p.status !== 'eliminated').length <= 1;

      if (foldedOut) {
        return { ...state, phase: 'showdown', players, pot, deck: state.deck, minRaise, lastRaiserIndex };
      }

      const raiserIsAllIn = lastRaiserIndex !== null && players[lastRaiserIndex]?.status === 'all-in';
      const allActiveActed = getActionablePlayers(players).every(p => p.lastAction !== undefined);

      const roundComplete = allEqualBets && (
        (lastRaiserIndex !== null && players[lastRaiserIndex]?.status === 'active' && nextIdx === lastRaiserIndex) ||
        (raiserIsAllIn && allActiveActed) ||
        (lastRaiserIndex === null && allActiveActed)
      );

      if (getActionablePlayers(players).length === 0 || roundComplete) {
        return advancePhase({ ...state, players, pot, minRaise, lastRaiserIndex });
      }

      return { ...state, players, pot, currentPlayerIndex: nextIdx === -1 ? 0 : nextIdx, minRaise, lastRaiserIndex };
    }

    case 'ADVANCE_PHASE':
      return advancePhase(state);

    case 'SHOWDOWN': {
      const players = [...state.players.map(p => ({ ...p }))];
      const pot = state.pot;
      const remaining = players.filter(p => p.status === 'active' || p.status === 'all-in');
      let handsWon = state.handsWon;
      const lastHandWinners: GameState['lastHandWinners'] = [];

      if (remaining.length === 1) {
        remaining[0].chips += pot;
        remaining[0].lastAction = 'Winner!';
        if (remaining[0].id === 'human') handsWon++;
        lastHandWinners.push({ playerId: remaining[0].id, name: remaining[0].name, handName: 'N/A', chipsWon: pot });
      } else {
        const contributors: PotContributor[] = players.map(p => ({
          playerId: p.id, totalBet: p.totalBetThisHand, status: p.status,
        }));
        const sidePots = calculateSidePots(contributors);
        const results = remaining.map(p => ({
          playerId: p.id, hand: evaluateHand([...p.holeCards, ...state.communityCards]),
        }));
        const rankings = [...results].sort((a, b) => b.hand.score - a.hand.score)
          .map(r => ({ playerId: r.playerId, score: r.hand.score }));
        const winnings = distributeSidePots(sidePots, rankings);

        for (const p of players) {
          const won = winnings[p.id] || 0;
          if (won > 0) {
            p.chips += won;
            const hand = results.find(r => r.playerId === p.id)?.hand;
            p.lastAction = hand ? `${hand.name}!` : 'Winner!';
            lastHandWinners.push({ playerId: p.id, name: p.name, handName: hand?.name || 'N/A', chipsWon: won });
            if (p.id === 'human') handsWon++;
          }
        }
      }

      return { ...state, phase: 'hand_complete', players, pot: 0, handsPlayed: state.handsPlayed + 1, handsWon, lastHandWinners };
    }

    case 'NEXT_HAND':
      return { ...state, phase: 'game_over' };

    case 'QUIT':
      return { ...state, phase: 'game_over' };

    case 'DEAL_ANIM_DONE':
      return { ...state, dealAnimDone: true };

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
  const players = state.players.map(p => ({ ...p, currentBet: 0, lastAction: undefined }));

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

  const firstToAct = nextActivePlayerIndex(players, state.dealerIndex);
  return { ...state, phase: nextPhase, players, deck, communityCards, currentPlayerIndex: firstToAct === -1 ? 0 : firstToAct, minRaise: state.bigBlind, lastRaiserIndex: null };
}

export function useTutorialGame(lesson: TutorialLesson | null) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coachStep, setCoachStep] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState(false);
  const shownStepsRef = useRef<Set<string>>(new Set());
  const botActionCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  // Coach step management — show steps when the game reaches the right phase
  useEffect(() => {
    if (!lesson || isPaused) return;
    
    const steps = lesson.steps;
    // Find the next unshown step that matches the current phase
    for (let i = 0; i < steps.length; i++) {
      const stepKey = `${i}`;
      if (shownStepsRef.current.has(stepKey)) continue;
      const step = steps[i];
      if (step.phase === state.phase && state.dealAnimDone !== false) {
        shownStepsRef.current.add(stepKey);
        setCoachStep(i);
        setIsPaused(true);
        return;
      }
    }
  }, [state.phase, state.dealAnimDone, lesson, isPaused]);

  // Auto-handle bot actions and phase transitions (same as usePokerGame but respects pause)
  useEffect(() => {
    if (isPaused) return;
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }

    if (state.phase === 'dealing' && lesson) {
      botTimeoutRef.current = setTimeout(() => {
        // Inject preset deck before dealing
        // We dispatch DEAL_HAND — but we need the deck set first
        // Hack: set deck in state via a custom path
        dispatch({ type: 'DEAL_HAND' });
        const activePlayers = state.players.filter(p => p.status !== 'eliminated').length;
        const lastCardDelay = (1 * activePlayers + (activePlayers - 1)) * 0.18 + 0.4;
        setTimeout(() => dispatch({ type: 'DEAL_ANIM_DONE' }), lastCardDelay * 1000);
      }, 800);
      return;
    }

    if (state.phase === 'showdown') {
      botTimeoutRef.current = setTimeout(() => dispatch({ type: 'SHOWDOWN' }), 1500);
      return;
    }

    if (state.phase === 'hand_complete') {
      // Don't auto-advance in tutorial — wait for lesson complete screen
      return;
    }

    // All-in runout
    if (
      (state.phase === 'preflop' || state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') &&
      getActionablePlayers(state.players).length <= 1
    ) {
      const delay = state.phase === 'flop' ? 2200 : 1800;
      botTimeoutRef.current = setTimeout(() => dispatch({ type: 'ADVANCE_PHASE' }), delay);
      return;
    }

    // Bot's turn
    if (
      (state.phase === 'preflop' || state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') &&
      state.dealAnimDone !== false &&
      state.players[state.currentPlayerIndex]?.isBot &&
      state.players[state.currentPlayerIndex]?.status === 'active'
    ) {
      const player = state.players[state.currentPlayerIndex];
      const maxBet = Math.max(...state.players.map(p => p.currentBet));

      botTimeoutRef.current = setTimeout(() => {
        // Check for scripted bot actions
        let botAction: GameAction;
        const scriptedActions = lesson?.botActions?.[player.id];
        const actionIdx = botActionCountRef.current[player.id] || 0;
        
        if (scriptedActions && actionIdx < scriptedActions.length) {
          botAction = { type: scriptedActions[actionIdx] };
          botActionCountRef.current[player.id] = actionIdx + 1;
        } else {
          botAction = decideBotAction(
            player, state.communityCards, state.pot, maxBet,
            state.minRaise, state.bigBlind, state.dealerIndex,
            state.players.filter(p => p.status !== 'eliminated').length,
          );
        }
        dispatch({ type: 'PLAYER_ACTION', action: botAction });
      }, 600 + Math.random() * 400);
    }
  }, [state.phase, state.currentPlayerIndex, state.handNumber, isPaused, lesson, state.players.map(p => p.status).join()]);

  const startLesson = useCallback((l: TutorialLesson) => {
    shownStepsRef.current = new Set();
    botActionCountRef.current = {};
    setCoachStep(-1);
    setIsPaused(false);
    // We need to set the deck. The reducer's DEAL_HAND reads from state.deck.
    // So we first START_GAME to create players, then inject deck.
    dispatch({ type: 'RESET' });
    // Small delay to ensure reset completes
    setTimeout(() => {
      dispatch({ type: 'START_GAME', lesson: l });
    }, 50);
  }, []);


  const dismissCoach = useCallback(() => {
    setIsPaused(false);
    setCoachStep(-1);
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

  const isHumanTurn =
    !isPaused &&
    (state.phase === 'preflop' || state.phase === 'flop' ||
     state.phase === 'turn' || state.phase === 'river') &&
    state.dealAnimDone !== false &&
    !state.players[state.currentPlayerIndex]?.isBot &&
    state.players[state.currentPlayerIndex]?.status === 'active';

  const humanPlayer = state.players.find(p => p.id === 'human');
  const maxBet = Math.max(0, ...state.players.map(p => p.currentBet));
  const amountToCall = humanPlayer ? maxBet - humanPlayer.currentBet : 0;
  const canCheck = amountToCall === 0;

  const currentStep = coachStep >= 0 && lesson ? lesson.steps[coachStep] : null;

  return {
    state,
    startLesson,
    playerAction,
    nextHand,
    quitGame,
    isHumanTurn,
    humanPlayer,
    amountToCall,
    canCheck,
    maxBet,
    isPaused,
    currentStep,
    dismissCoach,
    coachStep,
  };
}
