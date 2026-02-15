import { Card, HandResult, HAND_RANK_NAMES } from './types';

/**
 * Evaluate the best 5-card poker hand from up to 7 cards.
 */
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  const combos = getCombinations(cards, 5);
  let best: HandResult | null = null;

  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || result.score > best.score) {
      best = result;
    }
  }

  return best!;
}

/**
 * Compare two HandResults. Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareHands(a: HandResult, b: HandResult): number {
  return a.score - b.score;
}

/**
 * Evaluate exactly 5 cards.
 */
function evaluate5(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(ranks);
  const isAceLowStraight = checkAceLowStraight(ranks);
  const straightHigh = isAceLowStraight ? 5 : (isStraight ? ranks[0] : 0);

  // Count ranks
  const counts = new Map<number, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) || 0) + 1);
  }

  const groups = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // by count desc
    return b[0] - a[0]; // by rank desc
  });

  const pattern = groups.map(g => g[1]).join('');

  // Determine hand rank and score
  if ((isStraight || isAceLowStraight) && isFlush) {
    if (ranks[0] === 14 && ranks[1] === 13 && isStraight) {
      // Royal Flush
      return makeResult(9, [14], sorted);
    }
    // Straight Flush
    return makeResult(8, [straightHigh], sorted);
  }

  if (pattern === '41') {
    // Four of a Kind
    return makeResult(7, [groups[0][0], groups[1][0]], sorted);
  }

  if (pattern === '32') {
    // Full House
    return makeResult(6, [groups[0][0], groups[1][0]], sorted);
  }

  if (isFlush) {
    return makeResult(5, ranks, sorted);
  }

  if (isStraight || isAceLowStraight) {
    return makeResult(4, [straightHigh], sorted);
  }

  if (pattern === '311') {
    // Three of a Kind
    const kickers = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a, b) => b - a);
    return makeResult(3, [groups[0][0], ...kickers], sorted);
  }

  if (pattern === '221') {
    // Two Pair
    const pairs = groups.filter(g => g[1] === 2).map(g => g[0]).sort((a, b) => b - a);
    const kicker = groups.find(g => g[1] === 1)![0];
    return makeResult(2, [...pairs, kicker], sorted);
  }

  if (pattern === '2111') {
    // One Pair
    const kickers = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a, b) => b - a);
    return makeResult(1, [groups[0][0], ...kickers], sorted);
  }

  // High Card
  return makeResult(0, ranks, sorted);
}

function checkStraight(sortedRanks: number[]): boolean {
  for (let i = 0; i < sortedRanks.length - 1; i++) {
    if (sortedRanks[i] - sortedRanks[i + 1] !== 1) return false;
  }
  return true;
}

function checkAceLowStraight(sortedRanks: number[]): boolean {
  // A-2-3-4-5 → sorted as [14, 5, 4, 3, 2]
  return (
    sortedRanks[0] === 14 &&
    sortedRanks[1] === 5 &&
    sortedRanks[2] === 4 &&
    sortedRanks[3] === 3 &&
    sortedRanks[4] === 2
  );
}

function makeResult(rank: number, tiebreakers: number[], bestCards: Card[]): HandResult {
  // Score: rank * 10^10 + tiebreaker values packed
  let score = rank * 1e10;
  for (let i = 0; i < tiebreakers.length; i++) {
    score += tiebreakers[i] * Math.pow(15, 4 - i);
  }
  return {
    rank,
    name: HAND_RANK_NAMES[rank],
    score,
    bestCards,
  };
}

/**
 * Get all k-combinations from an array.
 */
function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}
