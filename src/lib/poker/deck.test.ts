import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from './deck';

describe('Deck', () => {
  it('creates a 52-card deck', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('has no duplicate cards', () => {
    const deck = createDeck();
    const keys = deck.map(c => `${c.rank}-${c.suit}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('shuffle returns all 52 cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(52);
    const keys = shuffled.map(c => `${c.rank}-${c.suit}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('shuffle does not mutate original', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });

  it('deal splits correctly', () => {
    const deck = createDeck();
    const [dealt, remaining] = deal(deck, 5);
    expect(dealt).toHaveLength(5);
    expect(remaining).toHaveLength(47);
  });
});
