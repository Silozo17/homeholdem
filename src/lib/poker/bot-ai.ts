import { Card, PokerPlayer, GameAction, PlayerAction } from './types';
import { evaluateHand } from './hand-evaluator';

/**
 * Bot AI decision making.
 * Uses preflop hand scoring when no community cards are dealt,
 * and hand evaluation when community cards are available.
 */
export function decideBotAction(
  player: PokerPlayer,
  communityCards: Card[],
  pot: number,
  currentBetToCall: number,
  minRaise: number,
  bigBlind: number,
): GameAction {
  const amountToCall = currentBetToCall - player.currentBet;

  // If no chips left, can't do anything
  if (player.chips <= 0) {
    return { type: 'check' };
  }

  // Calculate hand strength
  const strength = communityCards.length === 0
    ? getPreflopStrength(player.holeCards)
    : getPostflopStrength(player.holeCards, communityCards);

  // Random bluff factor (0-1)
  const bluffRoll = Math.random();
  const bluffChance = communityCards.length === 0 ? 0.10 : 0.08;

  // No bet to call
  if (amountToCall <= 0) {
    // Can check or bet
    if (strength > 75 || bluffRoll < bluffChance) {
      const raiseAmount = Math.min(
        Math.max(minRaise, bigBlind * 2),
        player.chips
      );
      return raiseAmount >= player.chips
        ? { type: 'all-in' }
        : { type: 'raise', amount: raiseAmount };
    }
    return { type: 'check' };
  }

  // There's a bet to call
  if (strength > 75) {
    // Strong hand: raise
    const raiseAmount = Math.min(
      Math.max(minRaise, amountToCall + bigBlind * 2),
      player.chips
    );
    if (raiseAmount >= player.chips) {
      return { type: 'all-in' };
    }
    return bluffRoll < 0.5
      ? { type: 'raise', amount: raiseAmount }
      : { type: 'call' };
  }

  if (strength > 40) {
    // Medium hand: call
    if (amountToCall >= player.chips) {
      // Big decision: only go all-in with decent strength
      return strength > 60 ? { type: 'all-in' } : { type: 'fold' };
    }
    return { type: 'call' };
  }

  // Weak hand: fold (with bluff chance)
  if (bluffRoll < bluffChance && amountToCall <= bigBlind * 2) {
    return { type: 'call' };
  }
  return { type: 'fold' };
}

/**
 * Preflop hand strength scoring (0-100).
 * Based on pair bonus, high card value, suited bonus, connectedness.
 */
function getPreflopStrength(holeCards: Card[]): number {
  const [a, b] = holeCards;
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  const isPair = a.rank === b.rank;
  const isSuited = a.suit === b.suit;
  const gap = high - low;

  let score = 0;

  if (isPair) {
    // Pairs: 22=40, ... AA=92
    score = 28 + (a.rank * 4.6);
  } else {
    // Base score from high card (2=4, A=28)
    score = high * 2;
    // Low card adds some value
    score += low * 0.8;
  }

  // Suited bonus
  if (isSuited && !isPair) score += 4;

  // Connectedness bonus
  if (gap === 1) score += 3;
  else if (gap === 2) score += 1;
  else if (gap > 3) score -= (gap - 3); // gap penalty

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Postflop hand strength using the hand evaluator (0-100).
 */
function getPostflopStrength(holeCards: Card[], communityCards: Card[]): number {
  const allCards = [...holeCards, ...communityCards];
  const result = evaluateHand(allCards);

  // Map hand rank (0-9) to a strength score
  const baseScores: Record<number, number> = {
    0: 15,  // High Card
    1: 35,  // One Pair
    2: 55,  // Two Pair
    3: 65,  // Three of a Kind
    4: 72,  // Straight
    5: 78,  // Flush
    6: 85,  // Full House
    7: 92,  // Four of a Kind
    8: 97,  // Straight Flush
    9: 100, // Royal Flush
  };

  let strength = baseScores[result.rank] || 15;

  // Adjust one-pair strength: top pair is stronger
  if (result.rank === 1) {
    // Check if pair uses at least one hole card and is high
    const pairRank = result.bestCards[0].rank === result.bestCards[1].rank
      ? result.bestCards[0].rank
      : result.bestCards[2].rank;
    if (pairRank >= 10) strength += 8; // top pair bonus
  }

  return Math.min(100, strength);
}
