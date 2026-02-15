/**
 * Multi-way side pot calculator.
 * Pure function — works in both client (Vite) and server (Deno).
 */

export interface PotContributor {
  playerId: string;
  totalBet: number; // total amount bet in this hand
  status: 'active' | 'all-in' | 'folded' | 'eliminated';
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

/**
 * Calculate side pots from player contributions.
 *
 * Algorithm:
 * 1. Collect all unique all-in bet levels.
 * 2. For each level (ascending), create a pot containing contributions
 *    from all non-folded players up to that level.
 * 3. Remaining contributions form the main pot.
 *
 * @param contributors - array of player bet info
 * @returns array of SidePot from smallest (first side pot) to largest (main pot)
 */
export function calculateSidePots(contributors: PotContributor[]): SidePot[] {
  // Only players who contributed something
  const active = contributors.filter(c => c.totalBet > 0);
  if (active.length === 0) return [];

  // Get unique bet levels from all-in players, sorted ascending
  const allInLevels = [...new Set(
    active
      .filter(c => c.status === 'all-in')
      .map(c => c.totalBet)
  )].sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let prevLevel = 0;

  for (const level of allInLevels) {
    const increment = level - prevLevel;
    if (increment <= 0) continue;

    let potAmount = 0;
    const eligible: string[] = [];

    for (const c of active) {
      const contribution = Math.min(c.totalBet, level) - Math.min(c.totalBet, prevLevel);
      if (contribution > 0) {
        potAmount += contribution;
      }
      // Eligible if not folded and their bet reaches this level
      if (c.status !== 'folded' && c.totalBet >= level) {
        eligible.push(c.playerId);
      }
      // Also eligible if they went all-in at exactly this level
      if (c.status === 'all-in' && c.totalBet === level) {
        if (!eligible.includes(c.playerId)) {
          eligible.push(c.playerId);
        }
      }
    }

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({ amount: potAmount, eligiblePlayerIds: eligible });
    }
    prevLevel = level;
  }

  // Main pot: remaining contributions above the highest all-in level
  let mainPotAmount = 0;
  const mainEligible: string[] = [];

  for (const c of active) {
    const contribution = c.totalBet - Math.min(c.totalBet, prevLevel);
    if (contribution > 0) {
      mainPotAmount += contribution;
    }
    if (c.status !== 'folded' && c.totalBet > prevLevel) {
      mainEligible.push(c.playerId);
    }
  }

  if (mainPotAmount > 0 && mainEligible.length > 0) {
    pots.push({ amount: mainPotAmount, eligiblePlayerIds: mainEligible });
  }

  // If no all-in players, just one main pot
  if (pots.length === 0) {
    let total = 0;
    const eligible: string[] = [];
    for (const c of active) {
      total += c.totalBet;
      if (c.status !== 'folded') {
        eligible.push(c.playerId);
      }
    }
    if (total > 0 && eligible.length > 0) {
      pots.push({ amount: total, eligiblePlayerIds: eligible });
    }
  }

  return pots;
}

/**
 * Distribute winnings across side pots.
 *
 * @param pots - side pots from calculateSidePots
 * @param playerRankings - players sorted from best hand to worst (first = best)
 * @returns map of playerId -> chips won
 */
export function distributeSidePots(
  pots: SidePot[],
  playerRankings: { playerId: string; score: number }[],
): Record<string, number> {
  const winnings: Record<string, number> = {};

  for (const pot of pots) {
    // Find the best score among eligible players
    const eligibleRanked = playerRankings.filter(r =>
      pot.eligiblePlayerIds.includes(r.playerId)
    );

    if (eligibleRanked.length === 0) continue;

    const bestScore = eligibleRanked[0].score;
    const winners = eligibleRanked.filter(r => r.score === bestScore);

    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;

    for (let i = 0; i < winners.length; i++) {
      const id = winners[i].playerId;
      winnings[id] = (winnings[id] || 0) + share + (i === 0 ? remainder : 0);
    }
  }

  return winnings;
}
