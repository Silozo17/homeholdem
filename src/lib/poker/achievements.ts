export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface AchievementContext {
  heroWon: boolean;
  winStreak: number;
  handName: string | null;
  potWon: number;
  bigBlind: number;
  heroStack: number;
  startingStack: number;
  averageStack: number;
  allInWin: boolean;
  playerCount: number;
  isChipLeader: boolean;
  handsPlayed: number;
  chatMessagesSent: number;
  wonFromBB: boolean;
  isHeadsUp: boolean;
  lastPlayerStanding: boolean;
  wasDesperate: boolean;
  // Extended context for new achievements
  totalCareerHands?: number;
  totalCareerWins?: number;
  totalCareerSessions?: number;
  foldStreak?: number;
  eliminatedPlayers?: number;
  wonFirstHand?: boolean;
  holeCards?: [string, string] | null; // e.g. ['7h','2d']
  survivedAllIns?: number;
  tablesPlayed?: number;
  wonWithoutShowdown?: boolean;
  shortStackWins?: number; // wins with < 10 BB
}

export const ACHIEVEMENTS: Achievement[] = [
  // === ORIGINAL 20 ===
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

  // === NEW 50 ACHIEVEMENTS ===

  // Career milestones – hands played
  { id: 'hands_10', title: 'Getting Started', description: 'Play 10 career hands', icon: 'Play', rarity: 'common' },
  { id: 'hands_25', title: 'Warming Up', description: 'Play 25 career hands', icon: 'Play', rarity: 'common' },
  { id: 'hands_50', title: 'Card Shark', description: 'Play 50 career hands', icon: 'Spade', rarity: 'common' },
  { id: 'hands_200', title: 'Grinder', description: 'Play 200 career hands', icon: 'Pickaxe', rarity: 'rare' },
  { id: 'hands_500', title: 'Marathon Player', description: 'Play 500 career hands', icon: 'Timer', rarity: 'epic' },
  { id: 'hands_1000', title: 'Poker Addict', description: 'Play 1,000 career hands', icon: 'Infinity', rarity: 'epic' },

  // Career milestones – wins
  { id: 'wins_5', title: 'Lucky Five', description: 'Win 5 career hands', icon: 'Star', rarity: 'common' },
  { id: 'wins_10', title: 'Double Digits', description: 'Win 10 career hands', icon: 'Star', rarity: 'common' },
  { id: 'wins_25', title: 'Quarter Century', description: 'Win 25 career hands', icon: 'Award', rarity: 'rare' },
  { id: 'wins_50', title: 'Half Ton', description: 'Win 50 career hands', icon: 'Award', rarity: 'rare' },
  { id: 'wins_100', title: 'Centurion', description: 'Win 100 career hands', icon: 'Gem', rarity: 'epic' },
  { id: 'wins_250', title: 'Win Machine', description: 'Win 250 career hands', icon: 'Gem', rarity: 'legendary' },

  // Session milestones
  { id: 'sessions_5', title: 'Regular', description: 'Play 5 sessions', icon: 'Calendar', rarity: 'common' },
  { id: 'sessions_10', title: 'Dedicated', description: 'Play 10 sessions', icon: 'Calendar', rarity: 'common' },
  { id: 'sessions_25', title: 'Veteran', description: 'Play 25 sessions', icon: 'CalendarCheck', rarity: 'rare' },
  { id: 'sessions_50', title: 'Old Guard', description: 'Play 50 sessions', icon: 'CalendarCheck', rarity: 'rare' },

  // Streak achievements
  { id: 'fifteen_streak', title: 'Dominator', description: 'Win 15 hands in a row', icon: 'Flame', rarity: 'epic' },
  { id: 'twenty_streak', title: 'God Mode', description: 'Win 20 hands in a row', icon: 'Flame', rarity: 'legendary' },
  { id: 'fold_5', title: 'Patient Player', description: 'Fold 5 hands in a row', icon: 'Clock', rarity: 'common' },
  { id: 'fold_10', title: 'Stone Cold', description: 'Fold 10 hands in a row', icon: 'Clock', rarity: 'rare' },
  { id: 'fold_20', title: 'Zen Master', description: 'Fold 20 hands in a row', icon: 'Eye', rarity: 'epic' },

  // Hand-based achievements
  { id: 'two_pair', title: 'Two Pair', description: 'Hit Two Pair', icon: 'Copy', rarity: 'common' },
  { id: 'three_of_kind', title: 'Trips', description: 'Hit Three of a Kind', icon: 'Boxes', rarity: 'common' },
  { id: 'pocket_aces_win', title: 'Pocket Rockets', description: 'Win with pocket Aces', icon: 'Sparkles', rarity: 'rare' },
  { id: 'pocket_kings_win', title: 'Cowboys', description: 'Win with pocket Kings', icon: 'Crown', rarity: 'rare' },
  { id: 'the_hammer', title: 'The Hammer', description: 'Win with 7-2 offsuit', icon: 'Hammer', rarity: 'legendary' },
  { id: 'suited_connectors', title: 'Suited Connectors', description: 'Win with suited connectors', icon: 'Link', rarity: 'rare' },

  // Stack achievements
  { id: 'triple_up', title: 'Triple Threat', description: 'Triple your starting stack', icon: 'TrendingUp', rarity: 'rare' },
  { id: 'quadruple_up', title: 'Quad Stack', description: 'Quadruple your starting stack', icon: 'TrendingUp', rarity: 'epic' },
  { id: 'five_x', title: 'Five-Bagger', description: '5× your starting stack', icon: 'Rocket', rarity: 'epic' },
  { id: 'ten_x', title: 'Ten-Bagger', description: '10× your starting stack', icon: 'Rocket', rarity: 'legendary' },

  // Big pot achievements
  { id: 'pot_100x', title: 'Mega Pot', description: 'Win a pot over 100× the big blind', icon: 'Coins', rarity: 'epic' },
  { id: 'pot_200x', title: 'Monster Pot', description: 'Win a pot over 200× the big blind', icon: 'Coins', rarity: 'legendary' },

  // All-in survival
  { id: 'allin_survive_3', title: 'All-In Survivor', description: 'Survive 3 all-ins in one session', icon: 'HeartPulse', rarity: 'rare' },
  { id: 'allin_survive_5', title: 'Cat with 9 Lives', description: 'Survive 5 all-ins in one session', icon: 'HeartPulse', rarity: 'epic' },

  // Social achievements
  { id: 'chat_25', title: 'Chatty', description: 'Send 25 chat messages in a game', icon: 'MessageCircle', rarity: 'common' },
  { id: 'chat_50', title: 'Motor Mouth', description: 'Send 50 chat messages in a game', icon: 'MessageCircle', rarity: 'rare' },
  { id: 'chat_100', title: 'Talk Show Host', description: 'Send 100 chat messages in a game', icon: 'MessageSquare', rarity: 'rare' },

  // Strategic achievements
  { id: 'short_stack_3', title: 'Short Stack Hero', description: 'Win 3 hands with under 10 BB', icon: 'ShieldAlert', rarity: 'rare' },
  { id: 'short_stack_5', title: 'Micro Stack Master', description: 'Win 5 hands with under 10 BB', icon: 'ShieldAlert', rarity: 'epic' },
  { id: 'bluff_master', title: 'Bluff Master', description: 'Win a hand without showdown', icon: 'EyeOff', rarity: 'rare' },
  { id: 'eliminator_3', title: 'Eliminator', description: 'Eliminate 3 players in one session', icon: 'Skull', rarity: 'epic' },

  // Session firsts
  { id: 'first_hand_win', title: 'Opening Act', description: 'Win the first hand of a session', icon: 'Flag', rarity: 'common' },
  { id: 'iron_man_200', title: 'Endurance', description: 'Play 200 hands in a single session', icon: 'Dumbbell', rarity: 'epic' },

  // Multi-table
  { id: 'tables_3', title: 'Table Hopper', description: 'Play at 3 different tables', icon: 'LayoutGrid', rarity: 'common' },
  { id: 'tables_5', title: 'Globetrotter', description: 'Play at 5 different tables', icon: 'LayoutGrid', rarity: 'rare' },

  // BB defense extended
  { id: 'big_blind_10', title: 'Blind Guardian', description: 'Win from the big blind 10 times', icon: 'ShieldCheck', rarity: 'epic' },
  { id: 'big_blind_25', title: 'Blind Fortress', description: 'Win from the big blind 25 times', icon: 'ShieldCheck', rarity: 'legendary' },

  // Chip leader extended
  { id: 'chip_leader_5', title: 'Table Boss', description: 'Be chip leader 5 times', icon: 'Medal', rarity: 'rare' },
  { id: 'chip_leader_10', title: 'Dominant Force', description: 'Be chip leader 10 times', icon: 'Medal', rarity: 'epic' },
];

const HAND_NAME_MAP: Record<string, string> = {
  'royal flush': 'royal_flush',
  'straight flush': 'straight_flush',
  'four of a kind': 'four_of_a_kind',
  'full house': 'full_house',
  'flush': 'flush_hit',
  'straight': 'straight_hit',
  'two pair': 'two_pair',
  'three of a kind': 'three_of_kind',
};

/** XP bonus per achievement (awarded in multiplayer only) */
export const ACHIEVEMENT_XP: Record<string, number> = {
  // Original
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
  // New career milestones
  hands_10: 100,
  hands_25: 200,
  hands_50: 500,
  hands_200: 2_000,
  hands_500: 5_000,
  hands_1000: 15_000,
  wins_5: 200,
  wins_10: 500,
  wins_25: 1_500,
  wins_50: 3_000,
  wins_100: 10_000,
  wins_250: 50_000,
  sessions_5: 300,
  sessions_10: 800,
  sessions_25: 3_000,
  sessions_50: 8_000,
  // New streaks
  fifteen_streak: 10_000,
  twenty_streak: 50_000,
  fold_5: 100,
  fold_10: 500,
  fold_20: 2_000,
  // New hand-based
  two_pair: 200,
  three_of_kind: 300,
  pocket_aces_win: 3_000,
  pocket_kings_win: 2_500,
  the_hammer: 200_000,
  suited_connectors: 1_500,
  // New stack
  triple_up: 1_500,
  quadruple_up: 3_000,
  five_x: 5_000,
  ten_x: 25_000,
  // New big pots
  pot_100x: 5_000,
  pot_200x: 15_000,
  // All-in survival
  allin_survive_3: 2_000,
  allin_survive_5: 5_000,
  // Social
  chat_25: 300,
  chat_50: 800,
  chat_100: 2_000,
  // Strategic
  short_stack_3: 2_000,
  short_stack_5: 5_000,
  bluff_master: 1_000,
  eliminator_3: 5_000,
  // Session firsts
  first_hand_win: 200,
  iron_man_200: 8_000,
  // Multi-table
  tables_3: 300,
  tables_5: 1_000,
  // BB defense extended
  big_blind_10: 3_000,
  big_blind_25: 10_000,
  // Chip leader extended
  chip_leader_5: 1_500,
  chip_leader_10: 5_000,
};

function isPocketPair(cards: [string, string], rank: string): boolean {
  return cards[0][0] === rank && cards[1][0] === rank;
}

function isSuitedConnectors(cards: [string, string]): boolean {
  if (!cards[0] || !cards[1]) return false;
  const suit0 = cards[0].slice(1);
  const suit1 = cards[1].slice(1);
  if (suit0 !== suit1) return false;
  const ranks = '23456789TJQKA';
  const r0 = ranks.indexOf(cards[0][0]);
  const r1 = ranks.indexOf(cards[1][0]);
  return Math.abs(r0 - r1) === 1;
}

function is72Offsuit(cards: [string, string]): boolean {
  if (!cards[0] || !cards[1]) return false;
  const ranks = new Set([cards[0][0], cards[1][0]]);
  const suited = cards[0].slice(1) === cards[1].slice(1);
  return ranks.has('7') && ranks.has('2') && !suited;
}

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
    if (ctx.winStreak >= 15) unlock('fifteen_streak');
    if (ctx.winStreak >= 20) unlock('twenty_streak');

    // All-in win
    if (ctx.allInWin) unlock('all_in_win');

    // Pot monster + big pots
    if (ctx.bigBlind > 0) {
      const potRatio = ctx.potWon / ctx.bigBlind;
      if (potRatio >= 50) unlock('pot_monster');
      if (potRatio >= 100) unlock('pot_100x');
      if (potRatio >= 200) unlock('pot_200x');
    }

    // Big blind defender
    if (ctx.wonFromBB) {
      updatedProgress.bb_wins = (updatedProgress.bb_wins ?? 0) + 1;
      if (updatedProgress.bb_wins >= 5) unlock('big_blind_defender');
      if (updatedProgress.bb_wins >= 10) unlock('big_blind_10');
      if (updatedProgress.bb_wins >= 25) unlock('big_blind_25');
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

    // Hole card-specific wins
    if (ctx.holeCards) {
      if (isPocketPair(ctx.holeCards, 'A')) unlock('pocket_aces_win');
      if (isPocketPair(ctx.holeCards, 'K')) unlock('pocket_kings_win');
      if (is72Offsuit(ctx.holeCards)) unlock('the_hammer');
      if (isSuitedConnectors(ctx.holeCards)) unlock('suited_connectors');
    }

    // Won without showdown (bluff)
    if (ctx.wonWithoutShowdown) unlock('bluff_master');

    // First hand win
    if (ctx.wonFirstHand) unlock('first_hand_win');

    // Short stack wins
    if (ctx.bigBlind > 0 && ctx.heroStack < ctx.bigBlind * 10) {
      updatedProgress.short_stack_wins = (updatedProgress.short_stack_wins ?? 0) + 1;
      if (updatedProgress.short_stack_wins >= 3) unlock('short_stack_3');
      if (updatedProgress.short_stack_wins >= 5) unlock('short_stack_5');
    }

    // Career wins tracking
    updatedProgress.career_wins = (updatedProgress.career_wins ?? 0) + 1;
    if (updatedProgress.career_wins >= 5) unlock('wins_5');
    if (updatedProgress.career_wins >= 10) unlock('wins_10');
    if (updatedProgress.career_wins >= 25) unlock('wins_25');
    if (updatedProgress.career_wins >= 50) unlock('wins_50');
    if (updatedProgress.career_wins >= 100) unlock('wins_100');
    if (updatedProgress.career_wins >= 250) unlock('wins_250');
  }

  // Fold streak
  if (ctx.foldStreak !== undefined) {
    if (ctx.foldStreak >= 5) unlock('fold_5');
    if (ctx.foldStreak >= 10) unlock('fold_10');
    if (ctx.foldStreak >= 20) unlock('fold_20');
  }

  // Double/triple/quad/5x/10x up
  if (ctx.startingStack > 0) {
    const multiplier = ctx.heroStack / ctx.startingStack;
    if (multiplier >= 2) unlock('double_up');
    if (multiplier >= 3) unlock('triple_up');
    if (multiplier >= 4) unlock('quadruple_up');
    if (multiplier >= 5) unlock('five_x');
    if (multiplier >= 10) unlock('ten_x');
  }

  // Chip leader
  if (ctx.isChipLeader && ctx.playerCount >= 4) {
    unlock('chip_leader');
    updatedProgress.chip_leader_count = (updatedProgress.chip_leader_count ?? 0) + 1;
    if (updatedProgress.chip_leader_count >= 5) unlock('chip_leader_5');
    if (updatedProgress.chip_leader_count >= 10) unlock('chip_leader_10');
  }

  // Iron man
  if (ctx.handsPlayed >= 100) unlock('iron_man');
  if (ctx.handsPlayed >= 200) unlock('iron_man_200');

  // Career hands tracking
  updatedProgress.career_hands = (updatedProgress.career_hands ?? 0) + 1;
  if (updatedProgress.career_hands >= 10) unlock('hands_10');
  if (updatedProgress.career_hands >= 25) unlock('hands_25');
  if (updatedProgress.career_hands >= 50) unlock('hands_50');
  if (updatedProgress.career_hands >= 200) unlock('hands_200');
  if (updatedProgress.career_hands >= 500) unlock('hands_500');
  if (updatedProgress.career_hands >= 1000) unlock('hands_1000');

  // Social achievements
  if (ctx.chatMessagesSent >= 10) unlock('social_butterfly');
  if (ctx.chatMessagesSent >= 25) unlock('chat_25');
  if (ctx.chatMessagesSent >= 50) unlock('chat_50');
  if (ctx.chatMessagesSent >= 100) unlock('chat_100');

  // Survivor
  if (ctx.lastPlayerStanding) unlock('survivor');

  // All-in survival
  if (ctx.survivedAllIns !== undefined) {
    if (ctx.survivedAllIns >= 3) unlock('allin_survive_3');
    if (ctx.survivedAllIns >= 5) unlock('allin_survive_5');
  }

  // Eliminator
  if (ctx.eliminatedPlayers !== undefined && ctx.eliminatedPlayers >= 3) unlock('eliminator_3');

  // Tables played
  if (ctx.tablesPlayed !== undefined) {
    if (ctx.tablesPlayed >= 3) unlock('tables_3');
    if (ctx.tablesPlayed >= 5) unlock('tables_5');
  }

  // Session tracking (use external value if provided)
  if (ctx.totalCareerSessions !== undefined) {
    if (ctx.totalCareerSessions >= 5) unlock('sessions_5');
    if (ctx.totalCareerSessions >= 10) unlock('sessions_10');
    if (ctx.totalCareerSessions >= 25) unlock('sessions_25');
    if (ctx.totalCareerSessions >= 50) unlock('sessions_50');
  }

  return { newlyUnlocked, updatedProgress };
}
