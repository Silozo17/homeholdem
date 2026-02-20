import { Card } from '@/lib/poker/types';

export interface HandRankingExample {
  rank: number;
  key: string;
  cards: Card[];
  /** Indices of the cards that form the hand (non-highlighted cards are kickers, shown faded) */
  highlighted: number[];
}

export const HAND_RANKING_EXAMPLES: HandRankingExample[] = [
  { rank: 1, key: 'royal_flush', cards: [
    { rank: 14, suit: 'spades' }, { rank: 13, suit: 'spades' }, { rank: 12, suit: 'spades' }, { rank: 11, suit: 'spades' }, { rank: 10, suit: 'spades' },
  ], highlighted: [0, 1, 2, 3, 4] },
  { rank: 2, key: 'straight_flush', cards: [
    { rank: 9, suit: 'hearts' }, { rank: 8, suit: 'hearts' }, { rank: 7, suit: 'hearts' }, { rank: 6, suit: 'hearts' }, { rank: 5, suit: 'hearts' },
  ], highlighted: [0, 1, 2, 3, 4] },
  { rank: 3, key: 'four_of_kind', cards: [
    { rank: 13, suit: 'spades' }, { rank: 13, suit: 'hearts' }, { rank: 13, suit: 'diamonds' }, { rank: 13, suit: 'clubs' }, { rank: 3, suit: 'spades' },
  ], highlighted: [0, 1, 2, 3] },
  { rank: 4, key: 'full_house', cards: [
    { rank: 12, suit: 'spades' }, { rank: 12, suit: 'hearts' }, { rank: 12, suit: 'diamonds' }, { rank: 9, suit: 'clubs' }, { rank: 9, suit: 'spades' },
  ], highlighted: [0, 1, 2, 3, 4] },
  { rank: 5, key: 'flush', cards: [
    { rank: 14, suit: 'diamonds' }, { rank: 11, suit: 'diamonds' }, { rank: 8, suit: 'diamonds' }, { rank: 6, suit: 'diamonds' }, { rank: 2, suit: 'diamonds' },
  ], highlighted: [0, 1, 2, 3, 4] },
  { rank: 6, key: 'straight', cards: [
    { rank: 10, suit: 'spades' }, { rank: 9, suit: 'hearts' }, { rank: 8, suit: 'diamonds' }, { rank: 7, suit: 'clubs' }, { rank: 6, suit: 'spades' },
  ], highlighted: [0, 1, 2, 3, 4] },
  { rank: 7, key: 'three_of_kind', cards: [
    { rank: 7, suit: 'spades' }, { rank: 7, suit: 'hearts' }, { rank: 7, suit: 'diamonds' }, { rank: 13, suit: 'clubs' }, { rank: 2, suit: 'spades' },
  ], highlighted: [0, 1, 2] },
  { rank: 8, key: 'two_pair', cards: [
    { rank: 11, suit: 'spades' }, { rank: 11, suit: 'hearts' }, { rank: 4, suit: 'diamonds' }, { rank: 4, suit: 'clubs' }, { rank: 14, suit: 'spades' },
  ], highlighted: [0, 1, 2, 3] },
  { rank: 9, key: 'one_pair', cards: [
    { rank: 10, suit: 'spades' }, { rank: 10, suit: 'hearts' }, { rank: 13, suit: 'diamonds' }, { rank: 7, suit: 'clubs' }, { rank: 4, suit: 'spades' },
  ], highlighted: [0, 1] },
  { rank: 10, key: 'high_card', cards: [
    { rank: 14, suit: 'spades' }, { rank: 11, suit: 'hearts' }, { rank: 8, suit: 'diamonds' }, { rank: 6, suit: 'clubs' }, { rank: 2, suit: 'spades' },
  ], highlighted: [0] },
];
