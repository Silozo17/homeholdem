import { describe, it, expect } from 'vitest';
import { calculateSidePots, distributeSidePots, PotContributor } from './side-pots';

describe('calculateSidePots', () => {
  it('returns single pot when no all-ins', () => {
    const contributors: PotContributor[] = [
      { playerId: 'A', totalBet: 100, status: 'active' },
      { playerId: 'B', totalBet: 100, status: 'active' },
      { playerId: 'C', totalBet: 100, status: 'folded' },
    ];
    const pots = calculateSidePots(contributors);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligiblePlayerIds).toEqual(['A', 'B']);
  });

  it('handles 2-way all-in (short stack)', () => {
    const contributors: PotContributor[] = [
      { playerId: 'A', totalBet: 50, status: 'all-in' },
      { playerId: 'B', totalBet: 100, status: 'active' },
      { playerId: 'C', totalBet: 100, status: 'active' },
    ];
    const pots = calculateSidePots(contributors);
    expect(pots).toHaveLength(2);
    // Side pot: 50*3 = 150, eligible: A, B, C
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligiblePlayerIds).toContain('A');
    expect(pots[0].eligiblePlayerIds).toContain('B');
    expect(pots[0].eligiblePlayerIds).toContain('C');
    // Main pot: 50*2 = 100, eligible: B, C
    expect(pots[1].amount).toBe(100);
    expect(pots[1].eligiblePlayerIds).toEqual(['B', 'C']);
  });

  it('handles 3-way all-in at different levels', () => {
    const contributors: PotContributor[] = [
      { playerId: 'A', totalBet: 30, status: 'all-in' },
      { playerId: 'B', totalBet: 80, status: 'all-in' },
      { playerId: 'C', totalBet: 200, status: 'active' },
    ];
    const pots = calculateSidePots(contributors);
    expect(pots).toHaveLength(3);
    // Pot 1: 30*3=90 (A,B,C)
    expect(pots[0].amount).toBe(90);
    // Pot 2: 50*2=100 (B,C)
    expect(pots[1].amount).toBe(100);
    // Pot 3: 120 (C only)
    expect(pots[2].amount).toBe(120);
  });

  it('handles folded player contributions going to pot', () => {
    const contributors: PotContributor[] = [
      { playerId: 'A', totalBet: 50, status: 'all-in' },
      { playerId: 'B', totalBet: 50, status: 'folded' },
      { playerId: 'C', totalBet: 100, status: 'active' },
    ];
    const pots = calculateSidePots(contributors);
    expect(pots).toHaveLength(2);
    // Side pot: 50*3=150, eligible: A, C (B folded)
    expect(pots[0].amount).toBe(150);
    expect(pots[0].eligiblePlayerIds).toContain('A');
    expect(pots[0].eligiblePlayerIds).toContain('C');
    expect(pots[0].eligiblePlayerIds).not.toContain('B');
    // Main pot: 50 (C only)
    expect(pots[1].amount).toBe(50);
  });

  it('returns empty for no contributions', () => {
    expect(calculateSidePots([])).toEqual([]);
  });

  it('handles equal all-ins', () => {
    const contributors: PotContributor[] = [
      { playerId: 'A', totalBet: 100, status: 'all-in' },
      { playerId: 'B', totalBet: 100, status: 'all-in' },
    ];
    const pots = calculateSidePots(contributors);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(200);
  });
});

describe('distributeSidePots', () => {
  it('awards full pot to single winner', () => {
    const pots = [{ amount: 300, eligiblePlayerIds: ['A', 'B', 'C'] }];
    const rankings = [
      { playerId: 'A', score: 1000 },
      { playerId: 'B', score: 500 },
      { playerId: 'C', score: 200 },
    ];
    const result = distributeSidePots(pots, rankings);
    expect(result['A']).toBe(300);
    expect(result['B']).toBeUndefined();
  });

  it('splits pot equally between tied winners', () => {
    const pots = [{ amount: 300, eligiblePlayerIds: ['A', 'B', 'C'] }];
    const rankings = [
      { playerId: 'A', score: 1000 },
      { playerId: 'B', score: 1000 },
      { playerId: 'C', score: 200 },
    ];
    const result = distributeSidePots(pots, rankings);
    expect(result['A']).toBe(150);
    expect(result['B']).toBe(150);
  });

  it('gives odd chip to first winner', () => {
    const pots = [{ amount: 301, eligiblePlayerIds: ['A', 'B'] }];
    const rankings = [
      { playerId: 'A', score: 1000 },
      { playerId: 'B', score: 1000 },
    ];
    const result = distributeSidePots(pots, rankings);
    expect(result['A']).toBe(151);
    expect(result['B']).toBe(150);
  });

  it('distributes multi-way side pots correctly', () => {
    const pots = [
      { amount: 150, eligiblePlayerIds: ['A', 'B', 'C'] },
      { amount: 100, eligiblePlayerIds: ['B', 'C'] },
    ];
    // A wins side pot, B wins main pot
    const rankings = [
      { playerId: 'A', score: 2000 },
      { playerId: 'B', score: 1500 },
      { playerId: 'C', score: 500 },
    ];
    const result = distributeSidePots(pots, rankings);
    expect(result['A']).toBe(150); // wins side pot
    expect(result['B']).toBe(100); // wins main pot (A not eligible)
  });
});
