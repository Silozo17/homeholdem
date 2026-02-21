export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface AchievementContext {
  /** Did the hero win this hand? */
  heroWon: boolean;
  /** Current consecutive win streak */
  winStreak: number;
  /** Best hand name from showdown (e.g. "Royal Flush") */
  handName: string | null;
  /** Total pot won this hand */
  potWon: number;
  /** Big blind amount */
  bigBlind: number;
  /** Hero's current stack */
  heroStack: number;
  /** Hero's starting stack when they sat down */
  startingStack: number;
  /** Average stack at the table */
  averageStack: number;
  /** Was the hero all-in and won? */
  allInWin: boolean;
  /** Number of players at the table */
  playerCount: number;
  /** Is the hero the chip leader? */
  isChipLeader: boolean;
  /** Total hands played this session */
  handsPlayed: number;
  /** Total chat messages sent this session */
  chatMessagesSent: number;
  /** Did hero win from big blind position? */
  wonFromBB: boolean;
  /** Is this a heads-up (2-player) situation? */
  isHeadsUp: boolean;
  /** Is the hero the last player standing (everyone else busted)? */
  lastPlayerStanding: boolean;
  /** Was hero below 10% of average stack before winning? */
  wasDesperate: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'First Blood', description: 'Win your first hand', icon: 'Swords', rarity: 'common' },
  { id: 'three_streak', title: 'Hot Streak', description: 'Win 3 hands in a row', icon: 'Flame', rarity: 'common' },
  { id: 'five_streak', title: 'On Fire', description: 'Win 5 hands in a row', icon: 'Zap', rarity: 'rare' },
  { id: 'ten_streak', title: 'Unstoppable', description: 'Win 10 hands in a row', icon: 'Crown', rarity: 'epic' },
  { id: 'all_in_win', title: 'All-In Hero', description: 'Win an all-in showdown', icon: 'Shield', rarity: 'common' },
  { id: 'double_up', title: 'Double Up', description: 'Double your starting stack', icon: 'TrendingUp', rarity: 'common' },
  { id: 'comeback_king', title: 'Comeback King', description: 'Win after being below 10% of average stack', icon: 'RotateCcw', rarity: 'epic' },
  { id: 'royal_flush', title: 'Royal Flush!', description: 'Hit a Royal Flush', icon: 'Sparkles', rarity: 'legendary' },
  { id: 'straight_flush', title: 'Straight Flush', description: 'Hit a Straight Flush', icon: 'Stars', rarity: 'epic' },
  { id: 'four_of_a_kind', title: 'Quads!', description: 'Hit Four of a Kind', icon: 'Grid2x2', rarity: 'rare' },
  { id: 'full_house', title: 'Full House', description: 'Hit a Full House', icon: 'Home', rarity: 'common' },
  { id: 'pot_monster', title: 'Pot Monster', description: 'Win a pot over 50× the big blind', icon: 'Coins', rarity: 'rare' },
  { id: 'iron_man', title: 'Iron Man', description: 'Play 100 hands in a single session', icon: 'Dumbbell', rarity: 'rare' },
  { id: 'social_butterfly', title: 'Social Butterfly', description: 'Send 10 chat messages in a game', icon: 'MessageCircle', rarity: 'common' },
  { id: 'survivor', title: 'Survivor', description: 'Be the last player standing', icon: 'Trophy', rarity: 'epic' },
  { id: 'big_blind_defender', title: 'Blind Defense', description: 'Win from the big blind 5 times', icon: 'ShieldCheck', rarity: 'rare' },
  { id: 'heads_up_hero', title: 'Heads Up Hero', description: 'Win a heads-up game', icon: 'Sword', rarity: 'rare' },
  { id: 'chip_leader', title: 'Chip Leader', description: 'Have the highest stack at a 4+ player table', icon: 'Medal', rarity: 'common' },
  { id: 'flush_hit', title: 'Suited Up', description: 'Hit a Flush', icon: 'Droplets', rarity: 'common' },
  { id: 'straight_hit', title: 'Five in a Row', description: 'Hit a Straight', icon: 'ArrowRight', rarity: 'common' },
];

const HAND_NAME_MAP: Record<string, string> = {
  'royal flush': 'royal_flush',
  'straight flush': 'straight_flush',
  'four of a kind': 'four_of_a_kind',
  'full house': 'full_house',
  'flush': 'flush_hit',
  'straight': 'straight_hit',
};

/** XP bonus per achievement (awarded in multiplayer only) */
export const ACHIEVEMENT_XP: Record<string, number> = {
  royal_flush: 100_000,
  straight_flush: 25_000,
  four_of_a_kind: 10_000,
  full_house: 2_000,
  flush_hit: 1_000,
  straight_hit: 500,
  all_in_win: 1_500,
  comeback_king: 5_000,
  survivor: 10_000,
  heads_up_hero: 3_000,
  ten_streak: 5_000,
  five_streak: 2_000,
  three_streak: 500,
  first_win: 100,
  double_up: 500,
  pot_monster: 2_000,
  iron_man: 3_000,
  chip_leader: 500,
  big_blind_defender: 1_500,
  social_butterfly: 200,
};

export function checkAchievements(
  ctx: AchievementContext,
  unlocked: Set<string>,
  progress: Record<string, number>,
): { newlyUnlocked: Achievement[]; updatedProgress: Record<string, number> } {
  const newlyUnlocked: Achievement[] = [];
  const updatedProgress = { ...progress };

  const unlock = (id: string) => {
    if (unlocked.has(id)) return;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) {
      newlyUnlocked.push(ach);
    }
  };

  if (ctx.heroWon) {
    // First win
    if (!unlocked.has('first_win')) unlock('first_win');

    // Streaks
    if (ctx.winStreak >= 3) unlock('three_streak');
    if (ctx.winStreak >= 5) unlock('five_streak');
    if (ctx.winStreak >= 10) unlock('ten_streak');

    // All-in win
    if (ctx.allInWin) unlock('all_in_win');

    // Pot monster
    if (ctx.bigBlind > 0 && ctx.potWon >= ctx.bigBlind * 50) unlock('pot_monster');

    // Big blind defender
    if (ctx.wonFromBB) {
      updatedProgress.bb_wins = (updatedProgress.bb_wins ?? 0) + 1;
      if (updatedProgress.bb_wins >= 5) unlock('big_blind_defender');
    }

    // Heads up hero
    if (ctx.isHeadsUp) unlock('heads_up_hero');

    // Comeback king
    if (ctx.wasDesperate) unlock('comeback_king');

    // Hand-based achievements
    if (ctx.handName) {
      const lower = ctx.handName.toLowerCase();
      const mapped = HAND_NAME_MAP[lower];
      if (mapped) unlock(mapped);
    }
  }

  // Double up (doesn't require winning this specific hand)
  if (ctx.heroStack >= ctx.startingStack * 2) unlock('double_up');

  // Chip leader
  if (ctx.isChipLeader && ctx.playerCount >= 4) unlock('chip_leader');

  // Iron man
  if (ctx.handsPlayed >= 100) unlock('iron_man');

  // Social butterfly
  if (ctx.chatMessagesSent >= 10) unlock('social_butterfly');

  // Survivor
  if (ctx.lastPlayerStanding) unlock('survivor');

  return { newlyUnlocked, updatedProgress };
}
