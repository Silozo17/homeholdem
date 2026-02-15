import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands } from './hand-evaluator';
import { Card } from './types';

const c = (rank: number, suit: string): Card => ({ rank: rank as any, suit: suit as any });

describe('Hand Evaluator', () => {
  // 1. Royal flush (spades)
  it('1: Royal flush', () => {
    const cards = [c(14,'spades'),c(13,'spades'),c(12,'spades'),c(11,'spades'),c(10,'spades')];
    expect(evaluateHand(cards).rank).toBe(9);
  });

  // 2. Straight flush 5-9 hearts
  it('2: Straight flush', () => {
    const cards = [c(9,'hearts'),c(8,'hearts'),c(7,'hearts'),c(6,'hearts'),c(5,'hearts')];
    expect(evaluateHand(cards).rank).toBe(8);
  });

  // 3. Ace-low straight flush
  it('3: Ace-low straight flush', () => {
    const cards = [c(14,'hearts'),c(2,'hearts'),c(3,'hearts'),c(4,'hearts'),c(5,'hearts')];
    const r = evaluateHand(cards);
    expect(r.rank).toBe(8);
    expect(r.score).toBeLessThan(evaluateHand([c(6,'hearts'),c(2,'hearts'),c(3,'hearts'),c(4,'hearts'),c(5,'hearts')]).score);
  });

  // 4. Four of a kind (aces)
  it('4: Four of a kind aces', () => {
    const cards = [c(14,'spades'),c(14,'hearts'),c(14,'diamonds'),c(14,'clubs'),c(13,'spades')];
    expect(evaluateHand(cards).rank).toBe(7);
  });

  // 5. Four of a kind: threes beat twos
  it('5: Four of a kind threes > twos', () => {
    const twos = evaluateHand([c(2,'spades'),c(2,'hearts'),c(2,'diamonds'),c(2,'clubs'),c(14,'spades')]);
    const threes = evaluateHand([c(3,'spades'),c(3,'hearts'),c(3,'diamonds'),c(3,'clubs'),c(14,'spades')]);
    expect(compareHands(threes, twos)).toBeGreaterThan(0);
  });

  // 6. Full house K-K-K-3-3
  it('6: Full house', () => {
    const cards = [c(13,'spades'),c(13,'hearts'),c(13,'diamonds'),c(3,'clubs'),c(3,'spades')];
    expect(evaluateHand(cards).rank).toBe(6);
  });

  // 7. Full house: K-K-K-2-2 beats Q-Q-Q-A-A
  it('7: Full house trips rank decides', () => {
    const kings = evaluateHand([c(13,'spades'),c(13,'hearts'),c(13,'diamonds'),c(2,'clubs'),c(2,'spades')]);
    const queens = evaluateHand([c(12,'spades'),c(12,'hearts'),c(12,'diamonds'),c(14,'clubs'),c(14,'spades')]);
    expect(compareHands(kings, queens)).toBeGreaterThan(0);
  });

  // 8. Flush ace high
  it('8: Flush ace high', () => {
    const cards = [c(14,'hearts'),c(9,'hearts'),c(7,'hearts'),c(4,'hearts'),c(2,'hearts')];
    expect(evaluateHand(cards).rank).toBe(5);
  });

  // 9. Flush tie-break
  it('9: Flush tie-break on 5th card', () => {
    const a = evaluateHand([c(14,'hearts'),c(13,'hearts'),c(10,'hearts'),c(8,'hearts'),c(6,'hearts')]);
    const b = evaluateHand([c(14,'hearts'),c(13,'hearts'),c(10,'hearts'),c(8,'hearts'),c(5,'hearts')]);
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  // 10. Straight ace high
  it('10: Straight ace high', () => {
    const cards = [c(14,'spades'),c(13,'hearts'),c(12,'diamonds'),c(11,'clubs'),c(10,'spades')];
    expect(evaluateHand(cards).rank).toBe(4);
  });

  // 11. Ace-low straight (wheel)
  it('11: Ace-low straight', () => {
    const cards = [c(14,'spades'),c(2,'hearts'),c(3,'diamonds'),c(4,'clubs'),c(5,'spades')];
    const r = evaluateHand(cards);
    expect(r.rank).toBe(4);
  });

  // 12. Straight 6-T
  it('12: Straight 6-T', () => {
    const cards = [c(10,'spades'),c(9,'hearts'),c(8,'diamonds'),c(7,'clubs'),c(6,'spades')];
    expect(evaluateHand(cards).rank).toBe(4);
  });

  // 13. Three of a kind kicker
  it('13: Three of a kind kicker comparison', () => {
    const a = evaluateHand([c(8,'spades'),c(8,'hearts'),c(8,'diamonds'),c(14,'clubs'),c(3,'spades')]);
    const b = evaluateHand([c(8,'spades'),c(8,'hearts'),c(8,'diamonds'),c(13,'clubs'),c(3,'spades')]);
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  // 14. Two pair: A-A-K-K vs A-A-Q-Q
  it('14: Two pair second pair decides', () => {
    const kk = evaluateHand([c(14,'spades'),c(14,'hearts'),c(13,'diamonds'),c(13,'clubs'),c(2,'spades')]);
    const qq = evaluateHand([c(14,'spades'),c(14,'hearts'),c(12,'diamonds'),c(12,'clubs'),c(2,'spades')]);
    expect(compareHands(kk, qq)).toBeGreaterThan(0);
  });

  // 15. Two pair same pairs, kicker
  it('15: Two pair same pairs kicker decides', () => {
    const a = evaluateHand([c(14,'spades'),c(14,'hearts'),c(13,'diamonds'),c(13,'clubs'),c(10,'spades')]);
    const b = evaluateHand([c(14,'spades'),c(14,'hearts'),c(13,'diamonds'),c(13,'clubs'),c(9,'spades')]);
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  // 16. One pair aces vs kings
  it('16: One pair aces > kings', () => {
    const aces = evaluateHand([c(14,'spades'),c(14,'hearts'),c(8,'diamonds'),c(5,'clubs'),c(3,'spades')]);
    const kings = evaluateHand([c(13,'spades'),c(13,'hearts'),c(8,'diamonds'),c(5,'clubs'),c(3,'spades')]);
    expect(compareHands(aces, kings)).toBeGreaterThan(0);
  });

  // 17. One pair same rank kicker
  it('17: One pair same rank kicker decides', () => {
    const a = evaluateHand([c(10,'spades'),c(10,'hearts'),c(14,'diamonds'),c(5,'clubs'),c(3,'spades')]);
    const b = evaluateHand([c(10,'spades'),c(10,'hearts'),c(13,'diamonds'),c(5,'clubs'),c(3,'spades')]);
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  // 18. High card
  it('18: High card comparison', () => {
    const a = evaluateHand([c(14,'spades'),c(13,'hearts'),c(12,'diamonds'),c(11,'clubs'),c(9,'spades')]);
    const b = evaluateHand([c(14,'spades'),c(13,'hearts'),c(12,'diamonds'),c(11,'clubs'),c(8,'spades')]);
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  // 19. Best 5 from 7
  it('19: Best 5 from 7 cards', () => {
    const cards = [c(14,'spades'),c(14,'hearts'),c(14,'diamonds'),c(13,'clubs'),c(13,'spades'),c(2,'hearts'),c(3,'diamonds')];
    const r = evaluateHand(cards);
    expect(r.rank).toBe(6); // Full house A-A-A-K-K
  });

  // 20. Split pot (identical hands)
  it('20: Identical hands score equal', () => {
    const a = evaluateHand([c(14,'spades'),c(13,'hearts'),c(12,'diamonds'),c(11,'clubs'),c(9,'spades')]);
    const b = evaluateHand([c(14,'hearts'),c(13,'diamonds'),c(12,'clubs'),c(11,'spades'),c(9,'hearts')]);
    expect(compareHands(a, b)).toBe(0);
  });

  // 21. Flush beats straight
  it('21: Flush > straight', () => {
    const flush = evaluateHand([c(14,'hearts'),c(9,'hearts'),c(7,'hearts'),c(4,'hearts'),c(2,'hearts')]);
    const straight = evaluateHand([c(10,'spades'),c(9,'hearts'),c(8,'diamonds'),c(7,'clubs'),c(6,'spades')]);
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });

  // 22. Full house beats flush
  it('22: Full house > flush', () => {
    const fh = evaluateHand([c(8,'spades'),c(8,'hearts'),c(8,'diamonds'),c(3,'clubs'),c(3,'spades')]);
    const flush = evaluateHand([c(14,'hearts'),c(9,'hearts'),c(7,'hearts'),c(4,'hearts'),c(2,'hearts')]);
    expect(compareHands(fh, flush)).toBeGreaterThan(0);
  });

  // 23. Ace-low straight beats pair of aces
  it('23: Straight > pair', () => {
    const straight = evaluateHand([c(14,'spades'),c(2,'hearts'),c(3,'diamonds'),c(4,'clubs'),c(5,'spades')]);
    const pair = evaluateHand([c(14,'spades'),c(14,'hearts'),c(13,'diamonds'),c(12,'clubs'),c(10,'spades')]);
    expect(compareHands(straight, pair)).toBeGreaterThan(0);
  });

  // 24. Three community pairs, best kicker from 7
  it('24: Best two pair + kicker from 7 cards', () => {
    // Board: AA KK QQ + player has J, 2 → best = AA KK J
    const cards = [c(14,'spades'),c(14,'hearts'),c(13,'diamonds'),c(13,'clubs'),c(12,'spades'),c(12,'hearts'),c(11,'diamonds')];
    const r = evaluateHand(cards);
    expect(r.rank).toBe(2); // Two pair (best is AA KK with J kicker)
  });

  // 25. Seven cards all same suit → best 5-card flush
  it('25: Seven suited cards → best flush', () => {
    const cards = [c(14,'hearts'),c(13,'hearts'),c(10,'hearts'),c(8,'hearts'),c(6,'hearts'),c(4,'hearts'),c(2,'hearts')];
    const r = evaluateHand(cards);
    expect(r.rank).toBe(5);
  });

  // 26. Wheel straight unsuited
  it('26: Wheel straight unsuited', () => {
    const cards = [c(14,'spades'),c(2,'hearts'),c(3,'diamonds'),c(4,'clubs'),c(5,'hearts')];
    const r = evaluateHand(cards);
    expect(r.rank).toBe(4);
  });
});
