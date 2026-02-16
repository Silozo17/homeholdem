import { Card, PokerPlayer, GameAction, BotPersonality, BOT_PERSONALITIES, PersonalityProfile } from './types';
import { evaluateHand } from './hand-evaluator';

/**
 * Bot AI decision making with personality-driven behavior.
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
  dealerIndex?: number,
  totalPlayers?: number,
): GameAction {
  const amountToCall = currentBetToCall - player.currentBet;
  const profile = BOT_PERSONALITIES[player.personality || 'fish'];

  // If no chips left, can't do anything
  if (player.chips <= 0) {
    return { type: 'check' };
  }

  // Calculate hand strength
  let strength = communityCards.length === 0
    ? getPreflopStrength(player.holeCards)
    : getPostflopStrength(player.holeCards, communityCards);

  // Position bonus (Pro personality)
  if (profile.positionAware && dealerIndex !== undefined && totalPlayers) {
    const positionBonus = getPositionBonus(player.seatIndex, dealerIndex, totalPlayers);
    strength += positionBonus;
  }

  // Board texture adjustment — scary boards reduce effective strength
  if (communityCards.length >= 3) {
    const scaryPenalty = getBoardScaryPenalty(communityCards, player.holeCards);
    strength -= scaryPenalty;
  }

  strength = Math.max(0, Math.min(100, strength));

  // Random bluff factor
  const bluffRoll = Math.random();

  // Pot odds check (Pro personality)
  if (profile.usePotOdds && amountToCall > 0) {
    const potOdds = amountToCall / (pot + amountToCall);
    const handEquity = strength / 100;
    // If pot odds are favorable, lower the fold threshold
    if (handEquity > potOdds * 1.2) {
      // Good pot odds — more inclined to call
      return decideBetAction(player, strength, profile, pot, amountToCall, minRaise, bigBlind, bluffRoll, true);
    }
  }

  return decideBetAction(player, strength, profile, pot, amountToCall, minRaise, bigBlind, bluffRoll, false);
}

function decideBetAction(
  player: PokerPlayer,
  strength: number,
  profile: PersonalityProfile,
  pot: number,
  amountToCall: number,
  minRaise: number,
  bigBlind: number,
  bluffRoll: number,
  favorablePotOdds: boolean,
): GameAction {
  // No bet to call
  if (amountToCall <= 0) {
    if (strength > profile.raiseThreshold || bluffRoll < profile.bluffChance) {
      const raiseAmount = calculateRaiseSize(profile, pot, minRaise, bigBlind, player.chips);
      return raiseAmount >= player.chips
        ? { type: 'all-in' }
        : { type: 'raise', amount: raiseAmount };
    }
    return { type: 'check' };
  }

  // There's a bet to call
  if (strength > profile.raiseThreshold) {
    // Strong hand: raise
    const raiseAmount = calculateRaiseSize(profile, pot, minRaise, bigBlind, player.chips);
    if (raiseAmount >= player.chips) {
      return { type: 'all-in' };
    }
    return bluffRoll < 0.5
      ? { type: 'raise', amount: raiseAmount }
      : { type: 'call' };
  }

  if (strength > profile.foldThreshold || favorablePotOdds) {
    // Medium hand: call
    if (amountToCall >= player.chips) {
      // All-in decision: need stronger hand for bigger commitments
      const allInThreshold = profile.foldThreshold + 15;
      return strength > allInThreshold ? { type: 'all-in' } : { type: 'fold' };
    }
    return { type: 'call' };
  }

  // Weak hand: fold (with bluff chance)
  if (bluffRoll < profile.bluffChance && amountToCall <= bigBlind * 2) {
    return { type: 'call' };
  }
  return { type: 'fold' };
}

/**
 * Calculate raise size based on personality and pot size.
 */
function calculateRaiseSize(
  profile: PersonalityProfile,
  pot: number,
  minRaise: number,
  bigBlind: number,
  chips: number,
): number {
  // Base raise = fraction of pot based on personality
  const potBasedRaise = Math.round(pot * profile.raiseSizing);
  // Add some variance (±20%)
  const variance = 1 + (Math.random() * 0.4 - 0.2);
  const targetRaise = Math.round(potBasedRaise * variance);
  // Ensure at least minRaise
  return Math.min(Math.max(targetRaise, minRaise), chips);
}

/**
 * Position bonus: players acting later get a strength bonus.
 * Returns 0-10 bonus.
 */
function getPositionBonus(seatIndex: number, dealerIndex: number, totalPlayers: number): number {
  // Calculate how many seats after dealer
  const positionFromDealer = (seatIndex - dealerIndex + totalPlayers) % totalPlayers;
  const positionRatio = positionFromDealer / totalPlayers;
  // Later position = higher bonus (0 to 10)
  return Math.round(positionRatio * 10);
}

/**
 * Board texture analysis: detect scary boards and return a penalty.
 * Scary = flush draws, straight draws, paired boards.
 */
function getBoardScaryPenalty(communityCards: Card[], holeCards: Card[]): number {
  let penalty = 0;

  // Check for flush draw on board (3+ same suit)
  const suitCounts: Record<string, number> = {};
  for (const c of communityCards) {
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  }
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  if (maxSuitCount >= 4) {
    // 4 to a flush on board — very scary unless we have the suit
    const dominantSuit = Object.entries(suitCounts).find(([, v]) => v >= 4)?.[0];
    const weHaveSuit = holeCards.some(c => c.suit === dominantSuit);
    penalty += weHaveSuit ? 0 : 12;
  } else if (maxSuitCount >= 3) {
    const dominantSuit = Object.entries(suitCounts).find(([, v]) => v >= 3)?.[0];
    const weHaveSuit = holeCards.some(c => c.suit === dominantSuit);
    penalty += weHaveSuit ? 0 : 5;
  }

  // Check for straight-possible boards (3+ connected ranks)
  const boardRanks = communityCards.map(c => c.rank).sort((a, b) => a - b);
  const uniqueRanks = [...new Set(boardRanks)];
  if (uniqueRanks.length >= 3) {
    const gaps = uniqueRanks.slice(1).map((r, i) => r - uniqueRanks[i]);
    const connected = gaps.filter(g => g <= 2).length;
    if (connected >= 3) penalty += 5;
    else if (connected >= 2) penalty += 2;
  }

  // Paired board is slightly less scary (trips less likely)
  const rankCounts: Record<number, number> = {};
  for (const c of communityCards) {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  }
  if (Object.values(rankCounts).some(v => v >= 2)) penalty += 2;

  return penalty;
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
    const pairRank = result.bestCards[0].rank === result.bestCards[1].rank
      ? result.bestCards[0].rank
      : result.bestCards[2].rank;
    if (pairRank >= 10) strength += 8; // top pair bonus
  }

  return Math.min(100, strength);
}
