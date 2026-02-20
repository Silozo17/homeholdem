import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import {
  Card, PokerPlayer, GameState, GamePhase, GameAction, PlayerAction,
} from '@/lib/poker/types';
import { deal } from '@/lib/poker/deck';
import { evaluateHand } from '@/lib/poker/hand-evaluator';
import { calculateSidePots, distributeSidePots, PotContributor } from '@/lib/poker/side-pots';
import { getBotPersona } from '@/lib/poker/bot-personas';
import { TutorialLesson, IntroStep, ScriptedStep } from '@/lib/poker/tutorial-lessons';

type Action =
  | { type: 'START_GAME'; lesson: TutorialLesson }
  | { type: 'DEAL_HAND' }
  | { type: 'DEAL_ANIM_DONE' }
  | { type: 'PLAYER_ACTION'; action: GameAction }
  | { type: 'BOT_ACTION'; botId: string; action: GameAction }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'SHOWDOWN' }
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
        id: 'human', name: 'You', chips: lesson.startingChips,
        holeCards: [], status: 'active', currentBet: 0, totalBetThisHand: 0,
        isBot: false, isDealer: false, seatIndex: 0,
      });
      for (let i = 0; i < lesson.botCount; i++) {
        const persona = getBotPersona(i);
        players.push({
          id: `bot-${i}`, name: persona.name, chips: lesson.startingChips,
          holeCards: [], status: 'active', currentBet: 0, totalBetThisHand: 0,
          isBot: true, isDealer: false, seatIndex: i + 1, personality: 'rock',
        });
      }
      players[0].isDealer = true;
      return {
        ...state, phase: 'dealing', players, deck: lesson.presetDeck,
        dealerIndex: 0, smallBlind: lesson.smallBlind, bigBlind: lesson.bigBlind,
        minRaise: lesson.bigBlind, startingChips: lesson.startingChips,
        startTime: Date.now(), blindLevel: 0, blindTimer: 0, lastBlindIncrease: Date.now(),
      };
    }

    case 'DEAL_HAND': {
      let deck = [...state.deck];
      const players: PokerPlayer[] = state.players.map(p => ({
        ...p, holeCards: [] as Card[], status: (p.chips > 0 ? 'active' : 'eliminated') as PokerPlayer['status'],
        currentBet: 0, totalBetThisHand: 0, lastAction: undefined,
      }));
      for (const p of players) {
        if (p.status === 'active') {
          const [cards, remaining] = deal(deck, 2);
          p.holeCards = cards;
          deck = remaining;
        }
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
        ...state, phase: 'preflop', dealAnimDone: false, players, deck,
        communityCards: [], pot, currentPlayerIndex: firstToAct === -1 ? 0 : firstToAct,
        minRaise: state.bigBlind, handNumber: state.handNumber + 1, lastRaiserIndex: bbIndex,
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

      // In tutorial mode, we don't auto-advance phases — the step controller handles it
      // Just move the current player index forward for tracking
      const nextIdx = nextActivePlayerIndex(players, state.currentPlayerIndex);
      return { ...state, players, pot, currentPlayerIndex: nextIdx === -1 ? 0 : nextIdx, minRaise, lastRaiserIndex };
    }

    case 'BOT_ACTION': {
      const { botId, action: gameAction } = action;
      const botIdx = state.players.findIndex(p => p.id === botId);
      if (botIdx === -1) return state;
      // Temporarily set currentPlayerIndex to the bot, then process like PLAYER_ACTION
      const stateWithBot = { ...state, currentPlayerIndex: botIdx };
      return reducer(stateWithBot, { type: 'PLAYER_ACTION', action: gameAction });
    }

    case 'ADVANCE_PHASE': {
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
        default:
          return state;
      }

      const firstToAct = nextActivePlayerIndex(players, state.dealerIndex);
      return {
        ...state, phase: nextPhase, players, deck, communityCards,
        currentPlayerIndex: firstToAct === -1 ? 0 : firstToAct,
        minRaise: state.bigBlind, lastRaiserIndex: null,
      };
    }

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
      } else if (state.communityCards.length < 3) {
        // Pre-flop fold scenario: not enough cards to evaluate hands
        // Award pot to the first remaining player (highest position)
        const winner = remaining[0];
        winner.chips += pot;
        winner.lastAction = 'Winner!';
        if (winner.id === 'human') handsWon++;
        lastHandWinners.push({ playerId: winner.id, name: winner.name, handName: 'N/A', chipsWon: pot });
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

// ──────────────────────────────────────────────
// Step-Driven Tutorial Controller
// ──────────────────────────────────────────────

type StepPhase = 'idle' | 'delay' | 'animating' | 'showing_coach' | 'waiting_action' | 'done';

export function useTutorialGame(lesson: TutorialLesson | null) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intro steps (table tour)
  const [introStepIdx, setIntroStepIdx] = useState<number>(-1);
  const [introComplete, setIntroComplete] = useState(false);

  // Scripted step state
  const [stepIndex, setStepIndex] = useState(-1);
  const [stepPhase, setStepPhase] = useState<StepPhase>('idle');
  const [coachMessage, setCoachMessage] = useState('');
  const [coachHighlight, setCoachHighlight] = useState<string | undefined>();
  const [requiredAction, setRequiredAction] = useState<PlayerAction | null>(null);

  const lessonRef = useRef<TutorialLesson | null>(null);

  // Cleanup
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const currentScriptedStep: ScriptedStep | null =
    lesson?.scriptedSteps && stepIndex >= 0 && stepIndex < lesson.scriptedSteps.length
      ? lesson.scriptedSteps[stepIndex]
      : null;

  const totalSteps = lesson?.scriptedSteps?.length ?? 0;

  // ──── Execute a scripted step ────
  const executeStep = useCallback((idx: number) => {
    const l = lessonRef.current;
    if (!l?.scriptedSteps || idx >= l.scriptedSteps.length) {
      // All steps done — go to hand_complete for LessonCompleteOverlay
      setStepPhase('done');
      return;
    }

    const step = l.scriptedSteps[idx];
    setStepIndex(idx);

    switch (step.type) {
      case 'coach_message': {
        setCoachMessage(step.message);
        setCoachHighlight(step.highlight);
        setRequiredAction(null);
        setStepPhase('showing_coach');
        break;
      }

      case 'deal_hole_cards': {
        setStepPhase('animating');
        setCoachMessage('');
        // Dispatch deal
        dispatch({ type: 'DEAL_HAND' });
        // Wait for deal animation, then show coach
        const animDelay = step.delay ?? 1800;
        timerRef.current = setTimeout(() => {
          dispatch({ type: 'DEAL_ANIM_DONE' });
          setCoachMessage(step.message);
          setCoachHighlight(step.highlight);
          setRequiredAction(null);
          setStepPhase('showing_coach');
        }, animDelay);
        break;
      }

      case 'deal_community': {
        setStepPhase('animating');
        setCoachMessage('');
        // Advance the phase in the reducer to deal community cards
        dispatch({ type: 'ADVANCE_PHASE' });
        const animDelay = step.delay ?? 1200;
        timerRef.current = setTimeout(() => {
          setCoachMessage(step.message);
          setCoachHighlight(step.highlight);
          setRequiredAction(null);
          setStepPhase('showing_coach');
        }, animDelay);
        break;
      }

      case 'bot_action': {
        setStepPhase('delay');
        setCoachMessage('');
        const delay = step.delay ?? 1500;
        timerRef.current = setTimeout(() => {
          // Find bot player index and set currentPlayerIndex to it, then dispatch action
          if (step.botId && step.botAction) {
            dispatch({ type: 'BOT_ACTION', botId: step.botId, action: step.botAction });
          }
          // Show coach after bot acts
          timerRef.current = setTimeout(() => {
            setCoachMessage(step.message);
            setCoachHighlight(step.highlight);
            setRequiredAction(null);
            setStepPhase('showing_coach');
          }, 500);
        }, delay);
        break;
      }

      case 'require_action': {
        setCoachMessage(step.message);
        setCoachHighlight(step.highlight);
        setRequiredAction(step.requiredAction || null);
        setStepPhase('waiting_action');
        break;
      }

      case 'show_result': {
        setStepPhase('animating');
        setCoachMessage('');
        // Trigger showdown
        dispatch({ type: 'SHOWDOWN' });
        timerRef.current = setTimeout(() => {
          setCoachMessage(step.message);
          setCoachHighlight(step.highlight);
          setRequiredAction(null);
          setStepPhase('showing_coach');
        }, 1500);
        break;
      }
    }
  }, []);

  // ──── Start lesson ────
  const startLesson = useCallback((l: TutorialLesson) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    lessonRef.current = l;
    setStepIndex(-1);
    setStepPhase('idle');
    setCoachMessage('');
    setCoachHighlight(undefined);
    setRequiredAction(null);
    setIntroStepIdx(-1);
    setIntroComplete(!l.introSteps || l.introSteps.length === 0);
    dispatch({ type: 'RESET' });
    setTimeout(() => {
      dispatch({ type: 'START_GAME', lesson: l });
    }, 50);
  }, []);

  // ──── After START_GAME dispatches (phase=dealing), begin intro or first step ────
  useEffect(() => {
    if (state.phase !== 'dealing' || !lesson) return;
    if (lesson.introSteps && lesson.introSteps.length > 0 && !introComplete) {
      if (introStepIdx === -1) {
        setIntroStepIdx(0);
      }
    } else if (stepPhase === 'idle') {
      // No intro, start first scripted step
      executeStep(0);
    }
  }, [state.phase, lesson, introComplete, introStepIdx, stepPhase, executeStep]);

  // ──── Dismiss coach / advance ────
  const dismissCoach = useCallback(() => {
    // If in intro phase
    if (introStepIdx >= 0 && lesson?.introSteps) {
      if (introStepIdx < lesson.introSteps.length - 1) {
        setIntroStepIdx(prev => prev + 1);
        return;
      }
      // Finishing last intro step
      setIntroStepIdx(-1);
      setIntroComplete(true);
      // Start first scripted step
      executeStep(0);
      return;
    }

    // In step-driven mode
    if (stepPhase === 'showing_coach') {
      // Advance to next step
      executeStep(stepIndex + 1);
    }
  }, [introStepIdx, lesson, stepPhase, stepIndex, executeStep]);

  // ──── Handle player action (for require_action steps) ────
  const playerAction = useCallback((action: GameAction) => {
    if (stepPhase !== 'waiting_action') return;
    if (requiredAction) {
      const matches = action.type === requiredAction ||
        (requiredAction === 'raise' && action.type === 'all-in');
      if (!matches) return; // Block wrong actions
    }
    // Dispatch the player's action to the reducer
    dispatch({ type: 'PLAYER_ACTION', action });
    // Advance to next step after a brief delay
    setRequiredAction(null);
    setStepPhase('animating');
    setCoachMessage('');
    timerRef.current = setTimeout(() => {
      executeStep(stepIndex + 1);
    }, 600);
  }, [stepPhase, requiredAction, stepIndex, executeStep]);

  const nextHand = useCallback(() => {
    // In tutorial, this triggers game_over for LessonCompleteOverlay
    dispatch({ type: 'QUIT' });
  }, []);

  const quitGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dispatch({ type: 'QUIT' });
  }, []);

  // ──── Derived values ────
  const isPaused = stepPhase === 'showing_coach' || stepPhase === 'waiting_action' || introStepIdx >= 0;
  const isHumanTurn = stepPhase === 'waiting_action';

  const humanPlayer = state.players.find(p => p.id === 'human');
  const maxBet = Math.max(0, ...state.players.map(p => p.currentBet));
  const amountToCall = humanPlayer ? maxBet - humanPlayer.currentBet : 0;
  const canCheck = amountToCall === 0;

  const currentIntroStep: IntroStep | null =
    introStepIdx >= 0 && lesson?.introSteps ? lesson.introSteps[introStepIdx] : null;

  // Build a "currentStep" object for CoachOverlay compatibility
  const currentStep = (stepPhase === 'showing_coach' || stepPhase === 'waiting_action') && coachMessage
    ? { phase: state.phase, message: coachMessage, highlight: coachHighlight, requiredAction: requiredAction || undefined }
    : null;

  const allowedAction: PlayerAction | null = stepPhase === 'waiting_action' ? requiredAction : null;

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
    allowedAction,
    // New: step progress info
    stepIndex,
    totalSteps,
    stepPhase,
  };
}
