import { Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle using crypto.getRandomValues() for fairness.
 * Returns a new shuffled array (does not mutate input).
 */
export function shuffle(deck: Card[]): Card[] {
  const cards = [...deck];
  const randomValues = new Uint32Array(cards.length);
  crypto.getRandomValues(randomValues);

  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * Deal cards from the top of the deck.
 * Returns [dealtCards, remainingDeck].
 */
export function deal(deck: Card[], count: number): [Card[], Card[]] {
  return [deck.slice(0, count), deck.slice(count)];
}
