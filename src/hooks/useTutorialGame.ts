import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import {
  Card, PokerPlayer, GameState, GamePhase, GameAction,
  HAND_RANK_NAMES, BotPersonality, PlayerAction,
} from '@/lib/poker/types';
import { deal } from '@/lib/poker/deck';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { calculateSidePots, distributeSidePots, PotContributor } from '@/lib/poker/side-pots';
import { getBotPersona } from '@/lib/poker/bot-personas';
import { TutorialLesson, IntroStep } from '@/lib/poker/tutorial-lessons';

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
        deck: lesson.presetDeck,
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
  const [introStepIdx, setIntroStepIdx] = useState<number>(-1);
  const [introComplete, setIntroComplete] = useState(false);
  const [postDismissDelay, setPostDismissDelay] = useState(false);
  const shownStepsRef = useRef<Set<string>>(new Set());
  const botActionCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, []);

  // Coach step management — show steps when the game reaches the right phase
  useEffect(() => {
    if (!lesson || isPaused || postDismissDelay) return;
    
    const steps = lesson.steps;
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
  }, [state.phase, state.dealAnimDone, lesson, isPaused, postDismissDelay]);

  // Auto-handle bot actions and phase transitions (respects pause + post-dismiss delay)
  useEffect(() => {
    if (isPaused || postDismissDelay) return;
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }

    if (state.phase === 'dealing' && lesson) {
      if (lesson.introSteps && lesson.introSteps.length > 0 && !introComplete) {
        if (introStepIdx === -1) {
          setIntroStepIdx(0);
          setIsPaused(true);
        }
        return;
      }
      botTimeoutRef.current = setTimeout(() => {
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

    // Bot's turn — fully scripted, no decideBotAction fallback
    if (
      (state.phase === 'preflop' || state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') &&
      state.dealAnimDone !== false &&
      state.players[state.currentPlayerIndex]?.isBot &&
      state.players[state.currentPlayerIndex]?.status === 'active'
    ) {
      const player = state.players[state.currentPlayerIndex];

      botTimeoutRef.current = setTimeout(() => {
        let botAction: GameAction;
        const scriptedActions = lesson?.botActions?.[player.id];
        const actionIdx = botActionCountRef.current[player.id] || 0;
        
        if (scriptedActions && actionIdx < scriptedActions.length) {
          botAction = { type: scriptedActions[actionIdx] };
          botActionCountRef.current[player.id] = actionIdx + 1;
        } else {
          // No free will — default to fold
          botAction = { type: 'fold' };
        }
        dispatch({ type: 'PLAYER_ACTION', action: botAction });
      }, 1200 + Math.random() * 400);
    }
  }, [state.phase, state.currentPlayerIndex, state.handNumber, isPaused, postDismissDelay, lesson, introComplete, introStepIdx, state.players.map(p => p.status).join()]);

  const startLesson = useCallback((l: TutorialLesson) => {
    shownStepsRef.current = new Set();
    botActionCountRef.current = {};
    setCoachStep(-1);
    setIsPaused(false);
    setPostDismissDelay(false);
    setIntroStepIdx(-1);
    setIntroComplete(!l.introSteps || l.introSteps.length === 0);
    dispatch({ type: 'RESET' });
    setTimeout(() => {
      dispatch({ type: 'START_GAME', lesson: l });
    }, 50);
  }, []);

  const dismissCoach = useCallback(() => {
    // If we're in intro phase, advance to next intro step
    if (introStepIdx >= 0 && lesson?.introSteps && introStepIdx < lesson.introSteps.length - 1) {
      setIntroStepIdx(prev => prev + 1);
      return;
    }
    // If finishing last intro step, mark intro complete and unpause with delay
    if (introStepIdx >= 0 && lesson?.introSteps && introStepIdx >= lesson.introSteps.length - 1) {
      setIntroStepIdx(-1);
      setIntroComplete(true);
      setIsPaused(false);
      // Add post-dismiss delay so bots don't immediately act
      setPostDismissDelay(true);
      setTimeout(() => setPostDismissDelay(false), 1200);
      return;
    }
    // Normal coach step dismiss — add delay before bots act
    setIsPaused(false);
    setCoachStep(-1);
    setPostDismissDelay(true);
    setTimeout(() => setPostDismissDelay(false), 1200);
  }, [introStepIdx, lesson]);

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
    !postDismissDelay &&
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
  const currentIntroStep = introStepIdx >= 0 && lesson?.introSteps ? lesson.introSteps[introStepIdx] : null;

  // Derive allowed action from the current coach step
  const allowedAction: PlayerAction | null = currentStep?.requiredAction || null;

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
    currentIntroStep,
    dismissCoach,
    coachStep,
    allowedAction,
  };
}
