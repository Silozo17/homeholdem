import { Card, GameAction, PlayerAction } from './types';

// Helper to create a card shorthand
function c(rank: number, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'): Card {
  return { rank: rank as Card['rank'], suit };
}

/** Intro steps shown before the game starts (table tour in lesson 1) */
export interface IntroStep {
  message: string;
  position?: 'top' | 'center' | 'bottom';
  arrowDirection?: 'down' | 'up' | 'none';
  highlight?: 'actions' | 'cards' | 'community' | 'timer' | 'audio' | 'exit' | 'pot' | 'table';
}

/** A single scripted step in the tutorial — executed sequentially */
export interface ScriptedStep {
  type: 'coach_message' | 'deal_hole_cards' | 'deal_community' | 'bot_action' | 'require_action' | 'show_result';
  message: string;
  highlight?: 'actions' | 'cards' | 'community' | 'timer' | 'audio' | 'exit' | 'pot' | 'table';
  /** For bot_action: which bot (e.g. 'bot-0') */
  botId?: string;
  /** For bot_action: the action the bot performs */
  botAction?: GameAction;
  /** For require_action: the action the user must perform */
  requiredAction?: PlayerAction;
  /** For deal_community: which phase to deal */
  communityPhase?: 'flop' | 'turn' | 'river';
  /** Delay in ms before this step's action executes (default 1500 for bots) */
  delay?: number;
}

// Keep old type exports for compatibility but they're unused by new engine
export type TutorialStep = ScriptedStep;

export interface TutorialLesson {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  presetDeck: Card[];
  botCount: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  /** Sequential scripted steps — the heart of the new system */
  scriptedSteps: ScriptedStep[];
  summary: string[];
  introSteps?: IntroStep[];
  /** @deprecated — kept for type compat only */
  steps?: any[];
  /** @deprecated — kept for type compat only */
  botActions?: Record<string, PlayerAction[]>;
}

/**
 * Build a preset deck for 4 players (1 human + 3 bots).
 */
function buildDeck(
  humanCards: [Card, Card],
  bot0Cards: [Card, Card],
  bot1Cards: [Card, Card],
  bot2Cards: [Card, Card],
  flop: [Card, Card, Card],
  turn: Card,
  river: Card,
): Card[] {
  const deck: Card[] = [
    ...humanCards,
    ...bot0Cards,
    ...bot1Cards,
    ...bot2Cards,
    ...flop,
    turn,
    river,
  ];

  const usedKeys = new Set(deck.map(c => `${c.rank}-${c.suit}`));
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as Card['rank'][];
  for (const suit of suits) {
    for (const rank of ranks) {
      if (!usedKeys.has(`${rank}-${suit}`)) {
        deck.push({ rank, suit });
      }
    }
  }

  return deck;
}

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  // ═══════════════════════════════════════════
  // LESSON 1: The Basics — How a Hand Works
  // ═══════════════════════════════════════════
  {
    id: 'basics',
    title: 'The Basics',
    subtitle: 'How a Hand Works',
    description: 'Learn about blinds, dealing, and the four betting rounds.',
    introSteps: [
      { message: "Welcome to Learn Poker! I'm your coach — I'll guide you through every step. Let's start by learning the table layout.", position: 'center', arrowDirection: 'none' },
      { message: "This is the poker table. You'll see seats around it for each player — you and 3 opponents.", position: 'center', arrowDirection: 'none', highlight: 'table' },
      { message: "Your seat is at the bottom. Your private cards ('hole cards') will appear here, face-up so you can see them.", position: 'bottom', arrowDirection: 'down', highlight: 'cards' },
      { message: "The shared 'community cards' appear in the center. All players use them to make their best 5-card hand.", position: 'center', arrowDirection: 'up', highlight: 'community' },
      { message: "The pot — total chips bet by all players — is displayed above the community cards.", position: 'center', arrowDirection: 'up', highlight: 'pot' },
      { message: "At the top-left, the back arrow lets you leave the table and return to the lesson list.", position: 'top', arrowDirection: 'up', highlight: 'exit' },
      { message: "At the top-right, the speaker icon toggles game sounds on or off.", position: 'top', arrowDirection: 'up', highlight: 'audio' },
      { message: "The hand number and blind levels are shown at the top center. Blinds are forced bets that increase over time.", position: 'top', arrowDirection: 'up', highlight: 'timer' },
      { message: "When it's your turn, action buttons appear at the bottom: Fold, Check/Call, and Raise.", position: 'bottom', arrowDirection: 'down', highlight: 'actions' },
      { message: "Quick reference:\n• Fold = give up your hand\n• Check = pass (no bet to match)\n• Call = match the current bet\n• Raise = increase the bet", position: 'center', arrowDirection: 'none' },
      { message: "I'll pause at every important moment to explain what's happening. Take your time — there's no rush!", position: 'center', arrowDirection: 'none' },
      { message: "Ready? Let's deal your first hand!", position: 'center', arrowDirection: 'none' },
    ],
    presetDeck: buildDeck(
      [c(14, 'spades'), c(13, 'spades')],
      [c(7, 'hearts'), c(2, 'diamonds')],
      [c(8, 'clubs'), c(3, 'hearts')],
      [c(9, 'diamonds'), c(4, 'clubs')],
      [c(10, 'spades'), c(5, 'hearts'), c(12, 'diamonds')],
      c(6, 'clubs'),
      c(11, 'spades'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "Your cards are dealt! You have A♠ K♠ — Ace-King suited, a premium starting hand! Only about 2% of hands are this strong.", highlight: 'cards' },
      { type: 'coach_message', message: "Before cards were dealt, two players posted forced bets called 'blinds'. Small Blind (50) and Big Blind (100). This creates a pot worth fighting for.", highlight: 'pot' },
      { type: 'coach_message', message: "This is the 'Pre-flop' round — the first of four betting rounds. Players act clockwise starting left of the big blind. Let's watch..." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor folded. His cards were weak (7-2 offsuit) — he's saving his chips for a better hand. Good players fold about 70% of hands!", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded too (8-3). Two players down, only Ace remains. Folding bad hands is a winning strategy!", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'call' }, message: "Ace called the Big Blind (100 chips). He wants to see more cards with his 9-4. Now it's YOUR turn!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "With A-K suited, you should raise! This tells opponents you're strong and builds the pot. Tap 'Raise' to open the bet slider. Use the quick bet presets above the slider — try tapping '½ Pot' or set it to around 300 — then tap 'Raise' again to confirm!", highlight: 'actions' },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'call' }, message: "Ace called your raise — he's staying in! Pre-flop betting is complete. Time for the Flop!", delay: 1500 },
      { type: 'deal_community', communityPhase: 'flop', message: "The Flop! Three community cards dealt face-up: 10♠ 5♥ Q♦. Everyone shares these cards to build their best 5-card hand.", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "Your A-K with the board gives you 'overcards' — both your Ace and King are higher than any community card. Plus you have a gutshot straight draw (need a Jack for A-K-Q-J-10)!" },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'check' }, message: "Ace checked — he passed without betting. When no one has bet yet, you can 'Check' too (it costs nothing).", delay: 1500 },
      { type: 'require_action', requiredAction: 'check', message: "Let's see the next card for free. Tap 'Check'." },
      { type: 'deal_community', communityPhase: 'turn', message: "The Turn! A 4th community card: 6♣. Four shared cards on the board now, one more to come!", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'check' }, message: "Ace checked again. He seems cautious — his 9-4 didn't connect with the board at all.", delay: 1500 },
      { type: 'require_action', requiredAction: 'check', message: "Check to see the final card. Tap 'Check'." },
      { type: 'deal_community', communityPhase: 'river', message: "The River! The final community card: J♠! You now have A-K-Q-J-10 — that's a STRAIGHT! The 5th strongest hand in poker!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "A Straight uses 5 cards in consecutive order. Your A♠ K♠ plus Q♦ J♠ 10♠ on the board = the best possible straight (Broadway)! Time to bet big!" },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'check' }, message: "Ace checked. With your Broadway Straight, it's time to bet big!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "You have a monster hand! Bet to win more chips. Tap 'Raise', use the presets above the slider (try 'Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded! He couldn't handle your bet with just 9-high. You win the pot!", delay: 1500 },
      { type: 'show_result', message: "Congratulations! You won your first poker hand! The pot is yours. Remember: A hand has 4 rounds — Pre-flop, Flop, Turn, River." },
    ],
    summary: [
      'A hand has 4 betting rounds: Preflop, Flop, Turn, River',
      'Blinds are forced bets that start the action',
      'Community cards are shared by all players',
      'You make your best 5 cards from 2 hole cards + 5 community cards',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 2: Hand Rankings — What Beats What
  // ═══════════════════════════════════════════
  {
    id: 'hand-rankings',
    title: 'Hand Rankings',
    subtitle: 'What Beats What',
    description: 'Learn all the poker hand rankings from High Card to Royal Flush.',
    presetDeck: buildDeck(
      [c(14, 'hearts'), c(14, 'diamonds')],
      [c(13, 'spades'), c(13, 'clubs')],
      [c(8, 'hearts'), c(8, 'clubs')],
      [c(5, 'spades'), c(6, 'spades')],
      [c(14, 'clubs'), c(13, 'hearts'), c(8, 'diamonds')],
      c(14, 'spades'),
      c(2, 'hearts'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "Pocket Aces! A♥ A♦ — THE best starting hand in poker. Let's learn hand rankings from weakest to strongest:\n\nHigh Card → Pair → Two Pair → Three of a Kind → Straight → Flush → Full House → Four of a Kind → Straight Flush → Royal Flush", highlight: 'cards' },
      { type: 'coach_message', message: "Right now you have a 'Pair' (two Aces). A Pair beats High Card. Let's see if we can improve!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called with K♠ K♣ — Pocket Kings, the 2nd best starting hand! But Aces beat Kings. He doesn't know your cards.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded her 8-8. Pocket Eights are decent but she's playing cautious.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded too. Just you and Viktor now.", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "With the best starting hand, let's raise big! Tap 'Raise', use the preset buttons above the slider (try '½ Pot'), and confirm!", highlight: 'actions' },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called your raise with his Kings. He's committed! Let's see the flop.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'flop', message: "The Flop: A♣ K♥ 8♦! An Ace on the board gives you 'Three of a Kind' (also called a 'set')! Viktor has K♠ K♣ plus K♥ on the board — that's Three of a Kind (Kings) too!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "Rankings recap:\n• Viktor: Three of a Kind (Kings)\n• You: Three of a Kind (Aces)\n\nWhen both players have Three of a Kind, the higher rank wins. Aces beat Kings!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked his trip Kings. But your trip Aces are higher!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Bet for value — we want Viktor to put more chips in! Tap 'Raise', use the presets above the slider (try '½ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called! He thinks his Kings are good enough. Let's see the turn.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'turn', message: "The Turn: A♠! Another Ace! You now have FOUR OF A KIND — only a Straight Flush (or Royal Flush) can beat this!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "Four of a Kind = 4 cards of the same rank. You have all 4 Aces! Viktor now has a Full House (Kings full of Aces: K-K-K-A-A) — but your Four Aces still crush it!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. He's cautious now.", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Bet again with your monster hand! Tap 'Raise', use the presets above the slider (try '¾ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called again! He can't let go of those Kings.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'river', message: "The River: 2♥. The board is complete. You have Four of a Kind Aces — virtually unbeatable!", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. Time for one last value bet!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "One final value bet! Extract maximum chips. Tap 'Raise', use the presets above the slider (try 'Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor finally folded! Your aggressive betting scared him off. You win the pot!", delay: 1500 },
      { type: 'show_result', message: "You won with Four of a Kind (Aces)! Remember the rankings:\nHigh Card < Pair < Two Pair < Three of a Kind < Straight < Flush < Full House < Four of a Kind < Straight Flush < Royal Flush" },
    ],
    summary: [
      'Pocket Aces (AA) is the strongest starting hand',
      'Hand rankings: High Card < Pair < Two Pair < Three of a Kind < Straight < Flush < Full House < Four of a Kind < Straight Flush < Royal Flush',
      'A "set" is when you have a pair and one matches the board',
      'Knowing hand rankings helps you judge how strong you are',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 3: Betting Actions
  // ═══════════════════════════════════════════
  {
    id: 'betting-actions',
    title: 'Betting Actions',
    subtitle: 'Fold, Check, Call, Raise',
    description: 'Master all the betting options available to you.',
    presetDeck: buildDeck(
      [c(12, 'hearts'), c(11, 'hearts')],
      [c(14, 'spades'), c(10, 'clubs')],
      [c(7, 'diamonds'), c(6, 'diamonds')],
      [c(3, 'hearts'), c(2, 'clubs')],
      [c(10, 'hearts'), c(9, 'hearts'), c(4, 'spades')],
      c(5, 'diamonds'),
      c(8, 'hearts'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "Q♥ J♥ — a suited connector! Not the strongest, but great potential for a Flush or Straight. Today we'll practise all 4 betting actions.", highlight: 'cards' },
      { type: 'coach_message', message: "The 4 actions:\n• FOLD — give up your hand\n• CHECK — pass (only if no bet)\n• CALL — match the current bet\n• RAISE — increase the bet\n\nLet's start with a CALL." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called the blind. There's a bet of 100 to match.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded. 7-6 wasn't good enough for her.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded too. The action is on you.", delay: 1500 },
      { type: 'require_action', requiredAction: 'call', message: "CALL means matching the current bet (100) to stay in. Tap 'Call'.", highlight: 'actions' },
      { type: 'deal_community', communityPhase: 'flop', message: "The Flop: 10♥ 9♥ 4♠. You have a flush draw — 4 hearts! You need just 1 more heart for a Flush.", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. When nobody has bet, you can CHECK too — it costs nothing.", delay: 1500 },
      { type: 'require_action', requiredAction: 'check', message: "CHECK — pass without betting. See the next card for free. Tap 'Check'." },
      { type: 'deal_community', communityPhase: 'turn', message: "The Turn: 5♦. Didn't hit the flush yet. But you still have one more card coming.", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 200 }, message: "Viktor raised! He's betting 200. You'll need to CALL to stay in and chase your flush.", delay: 1500 },
      { type: 'require_action', requiredAction: 'call', message: "CALL Viktor's bet to see the final card. Your flush draw is worth chasing! Tap 'Call'." },
      { type: 'deal_community', communityPhase: 'river', message: "The River: 8♥! You made your FLUSH — 5 hearts (Q♥ J♥ 10♥ 9♥ 8♥)! Time to use our last action: RAISE!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "RAISE means increasing the bet. When you have a strong hand, raising extracts more chips from opponents who might call." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. He missed his draws. Time to bet your Flush!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "RAISE with your Flush! Make Viktor pay. Tap 'Raise', use the presets above the slider (try '½ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor folded! Your raise was too much for him. You win!", delay: 1500 },
      { type: 'show_result', message: "You practised all 4 actions!\n• Call — matched the blind\n• Check — passed on the flop\n• Call — chased your flush\n• Raise — won with a big bet!" },
    ],
    summary: [
      'Fold: Give up your hand and any chips you\'ve bet',
      'Check: Pass the action (only when no bet to you)',
      'Call: Match the current bet to stay in',
      'Raise: Increase the bet, forcing others to match or fold',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 4: Position Matters
  // ═══════════════════════════════════════════
  {
    id: 'position',
    title: 'Position Matters',
    subtitle: 'Early vs Late Position',
    description: 'Learn why acting last is a huge advantage.',
    presetDeck: buildDeck(
      [c(14, 'diamonds'), c(11, 'clubs')],
      [c(10, 'hearts'), c(9, 'hearts')],
      [c(7, 'spades'), c(7, 'clubs')],
      [c(4, 'hearts'), c(3, 'diamonds')],
      [c(11, 'hearts'), c(6, 'diamonds'), c(2, 'spades')],
      c(11, 'diamonds'),
      c(5, 'clubs'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "A♦ J♣ — Ace-Jack offsuit. Today's lesson: POSITION. Where you sit relative to the dealer determines when you act.", highlight: 'cards' },
      { type: 'coach_message', message: "Position types:\n• Early Position = act first (disadvantage — you don't know what others will do)\n• Late Position = act last (advantage — you see everyone's actions first)\n• The 'Button' (dealer) is the BEST position!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called from early position. He had to act without knowing what we'd do — that's risky!", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded her 7-7 from middle position. Small pairs are tricky when you act early.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded. Now it's your turn — you've seen all 3 opponents act! That's the power of position.", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "You've seen everyone act. With A-J and position info, raise to take control! Tap 'Raise', use the preset buttons above the slider (try '½ Pot'), and confirm!", highlight: 'actions' },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called. Just you two now, and you have position on him (you'll act last on every street).", delay: 1500 },
      { type: 'deal_community', communityPhase: 'flop', message: "Flop: J♥ 6♦ 2♠. You hit top pair with your Jack! Viktor acts first...", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked! Because you're in position, his check tells you he's likely weak. You can bet with confidence!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Bet to protect your top pair. In position, you control the pot size. Tap 'Raise', use the presets above the slider (try '½ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called. He's being stubborn.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'turn', message: "Turn: J♦! Another Jack! Three of a Kind! Position + a monster hand = total control.", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked again. Position lets you decide: bet big or slow-play. Let's keep betting!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Bet again with your trips! Tap 'Raise', use the presets above the slider (try '¾ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor folded! Your position and aggression won the pot.", delay: 1500 },
      { type: 'show_result', message: "Position advantage! You always acted AFTER Viktor, giving you info to make better decisions. The Button is the best seat at the table!" },
    ],
    summary: [
      'Late position (acting last) is a major advantage',
      'You see opponents\' actions before deciding',
      'Play more hands in late position, fewer in early',
      'The "Button" (dealer) is the best position',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 5: Reading the Board
  // ═══════════════════════════════════════════
  {
    id: 'reading-board',
    title: 'Reading the Board',
    subtitle: 'Draws and Dangers',
    description: 'Learn to spot flush draws, straight draws, and paired boards.',
    presetDeck: buildDeck(
      [c(14, 'clubs'), c(10, 'clubs')],
      [c(13, 'hearts'), c(12, 'hearts')],
      [c(9, 'spades'), c(8, 'spades')],
      [c(5, 'diamonds'), c(4, 'diamonds')],
      [c(7, 'clubs'), c(3, 'clubs'), c(11, 'hearts')],
      c(2, 'clubs'),
      c(9, 'hearts'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "A♣ 10♣ — two clubs! If the flop brings more clubs, you'll have a flush draw. Let's learn to 'read the board'.", highlight: 'cards' },
      { type: 'coach_message', message: "'Reading the board' means looking at community cards to spot:\n• Flush draws (3+ of same suit)\n• Straight draws (connected cards)\n• Paired boards (pairs that could mean Full Houses)" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called with K♥ Q♥ — he's also hoping for a flush draw, but in hearts!", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded. Smart play with a weak hand.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded too.", delay: 1500 },
      { type: 'require_action', requiredAction: 'call', message: "Call to see the flop with your suited hand. Tap 'Call'.", highlight: 'actions' },
      { type: 'deal_community', communityPhase: 'flop', message: "Flop: 7♣ 3♣ J♥. Two clubs on the board + your two clubs = 4 clubs total! That's a 'flush draw'.", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "'Outs' are the remaining cards that complete your hand. There are 13 clubs total, you see 4, so 9 clubs remain — those are your 9 outs! With 9 outs, you have about a 35% chance to hit by the river." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 200 }, message: "Viktor raised! He has J-high pair. But YOUR flush draw is actually a slight favourite to win by the river.", delay: 1500 },
      { type: 'require_action', requiredAction: 'call', message: "With a strong draw (9 outs), calling is correct. Tap 'Call'." },
      { type: 'deal_community', communityPhase: 'turn', message: "Turn: 2♣! The club you needed! A♣ 10♣ 7♣ 3♣ 2♣ = Ace-high flush! The 'nut flush' — the BEST possible flush!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "'Nut' means the best possible hand. Your Ace-high flush can't be beaten by any other flush. Always check if you have the 'nuts'!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. He's scared of the 3 clubs on the board — smart of him.", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Bet big with your nut flush! Tap 'Raise', use the presets above the slider (try '¾ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor folded. He correctly guessed you might have the flush!", delay: 1500 },
      { type: 'show_result', message: "You read the board perfectly! You spotted the flush draw, counted your outs (9), and hit the nut flush. Always look for draws and dangers on the board!" },
    ],
    summary: [
      'A "draw" is when you need 1-2 more cards to complete a hand',
      '"Outs" are the cards remaining that help you',
      'Flush draw = 4 suited cards, need 1 more (9 outs)',
      'Straight draw = 4 connected cards, need 1 more (8 outs)',
      'Always check if someone could have a better version of your hand',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 6: Pot Odds
  // ═══════════════════════════════════════════
  {
    id: 'pot-odds',
    title: 'Pot Odds',
    subtitle: 'The Math of Calling',
    description: 'Learn when calling is mathematically correct.',
    presetDeck: buildDeck(
      [c(10, 'diamonds'), c(9, 'diamonds')],
      [c(14, 'clubs'), c(13, 'clubs')],
      [c(6, 'hearts'), c(5, 'hearts')],
      [c(3, 'spades'), c(2, 'spades')],
      [c(8, 'diamonds'), c(7, 'clubs'), c(2, 'hearts')],
      c(14, 'hearts'),
      c(11, 'diamonds'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "10♦ 9♦ — a suited connector! Today: 'Pot Odds' — the maths behind whether a call is profitable long-term.", highlight: 'cards' },
      { type: 'coach_message', message: "Pot Odds = cost to call ÷ (pot + cost to call)\n\nIf your chance of winning is HIGHER than the pot odds, calling is profitable!\n\nDon't worry, I'll walk you through it step by step." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called with A♣ K♣. Strong hand, but we don't know that yet!", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded.", delay: 1500 },
      { type: 'require_action', requiredAction: 'call', message: "Call to see the flop. Tap 'Call'.", highlight: 'actions' },
      { type: 'deal_community', communityPhase: 'flop', message: "Flop: 8♦ 7♣ 2♥. You have 10-9 and the board shows 8-7. That's an 'open-ended straight draw' — either a Jack or 6 completes your straight!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "Outs count: 4 Jacks + 4 Sixes = 8 outs\n\nWith 2 cards to come, 8 outs ≈ 32% chance to hit your straight.\n\nLet's see if the pot odds justify calling..." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 200 }, message: "Viktor raised 200! The pot is now ~500. You need to call 200.\n\nPot Odds = 200 ÷ (500 + 200) = 29%\nYour chance = 32%\n\n32% > 29% → PROFITABLE CALL!", delay: 1500 },
      { type: 'require_action', requiredAction: 'call', message: "The math says call! Your 32% chance beats the 29% pot odds. Tap 'Call'." },
      { type: 'deal_community', communityPhase: 'turn', message: "Turn: A♥. Didn't complete the straight. Viktor's A♣ just paired though (he hit top pair). With 8 outs and 1 card to come ≈ 17%.", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 300 }, message: "Viktor bet again — 300 into a ~900 pot.\n\nPot Odds = 300 ÷ (900 + 300) = 25%\nYour chance with 1 card = 17%\n\n17% < 25% → Technically unprofitable... but the payoff if you hit is huge!", delay: 1500 },
      { type: 'require_action', requiredAction: 'call', message: "Sometimes you call slightly bad odds because the 'implied odds' (extra chips you'll win) make up for it. Call! Tap 'Call'." },
      { type: 'deal_community', communityPhase: 'river', message: "The River: J♦! You made your straight: 7-8-9-10-J! The math paid off!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "Your straight (7-8-9-10-J) beats Viktor's pair of Aces. This is why pot odds matter — sometimes the right call doesn't hit, but over many hands it's profitable!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. He's worried. Your straight is the best hand!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Value bet your straight! Make Viktor pay. Tap 'Raise', use the presets above the slider (try '¾ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called with top pair! He couldn't let go of his Aces.", delay: 1500 },
      { type: 'show_result', message: "Your straight wins! Pot odds told you calling was correct, and the river delivered. Remember: Pot Odds = cost ÷ total pot. Compare to your winning chance!" },
    ],
    summary: [
      'Pot odds = cost to call ÷ (pot + cost to call)',
      'Compare pot odds to your chance of hitting your draw',
      'If your chance to win > pot odds required, calling is profitable',
      '8 outs ≈ 32% by river, 17% per card',
      '9 outs (flush draw) ≈ 35% by river, 19% per card',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 7: When to Fold
  // ═══════════════════════════════════════════
  {
    id: 'when-to-fold',
    title: 'When to Fold',
    subtitle: 'Discipline Wins',
    description: 'Not every hand is worth playing. Learn when to fold.',
    presetDeck: buildDeck(
      [c(7, 'spades'), c(2, 'hearts')],
      [c(14, 'hearts'), c(14, 'clubs')],
      [c(13, 'diamonds'), c(12, 'diamonds')],
      [c(10, 'hearts'), c(9, 'hearts')],
      [c(14, 'spades'), c(13, 'hearts'), c(8, 'diamonds')],
      c(4, 'clubs'),
      c(3, 'spades'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "7♠ 2♥ — the WORST starting hand in Texas Hold'em!\n\nNot suited, not connected, both low. There's almost nothing good that can happen.", highlight: 'cards' },
      { type: 'coach_message', message: "Why is 7-2 so bad?\n• Can't make a straight easily (7 and 2 are too far apart)\n• Not suited (can't make a flush)\n• Both cards are low (even if you pair, it's weak)\n\nThe correct play is almost always FOLD." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 400 }, message: "Viktor raised big! He has Pocket Aces (you don't know that). Calling here with 7-2 would be throwing chips away.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'call' }, message: "Luna called with K♦ Q♦ — a reasonable hand. But your 7-2? No chance.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Even Ace folded his 10-9. If he's folding a decent hand, you should definitely fold 7-2!", delay: 1500 },
      { type: 'coach_message', message: "Winning poker = folding bad hands + betting strong hands.\n\nGood players fold about 70-80% of their starting hands! Discipline is the #1 skill in poker." },
      { type: 'require_action', requiredAction: 'fold', message: "Save your chips! The correct play with 7-2 is FOLD. Tap 'Fold'.", highlight: 'actions' },
      { type: 'coach_message', message: "Smart fold! 💪 Now let's watch how the rest of the hand plays out between Viktor and Luna. In real poker, the remaining players keep playing after you fold." },
      { type: 'deal_community', message: "The FLOP: A♠ K♥ 8♦\n\nViktor flopped THREE ACES (trip Aces)! That's a monster hand. Luna paired her King — a strong hand, but she's way behind.", highlight: 'community' },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 300 }, message: "Viktor bets 300 with trip Aces. He wants to build the pot because he knows he has a huge hand.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'call' }, message: "Luna calls with a pair of Kings — it looks strong to her, but she doesn't know Viktor has three Aces!", delay: 1500 },
      { type: 'deal_community', message: "The TURN: 4♣\n\nA blank card — doesn't help anyone. Viktor still dominates with trip Aces vs Luna's pair of Kings.", highlight: 'community' },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 600 }, message: "Viktor bets bigger — 600. With trip Aces, he's confident. This is called a 'value bet' — betting to get paid by weaker hands.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'call' }, message: "Luna calls again. She has top pair (Kings) so she thinks she might be good. This is a common mistake — calling too much with one pair.", delay: 1500 },
      { type: 'deal_community', message: "The RIVER: 3♠\n\nAnother blank. The final board is: A♠ K♥ 8♦ 4♣ 3♠. Viktor's trip Aces are still the best hand.", highlight: 'community' },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'raise', amount: 800 }, message: "Viktor bets 800 on the river — squeezing maximum value from his trip Aces. Luna is in a tough spot.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'call' }, message: "Luna calls one last time... let's see the showdown!", delay: 1500 },
      { type: 'show_result', message: "Viktor wins with Trip Aces! 🏆 Luna's pair of Kings was never ahead.\n\nYour 7♠ 2♥ would have made NOTHING on that board — not even a pair! Great fold.\n\nRemember: Folding isn't losing — it's SAVING. The best players fold 70-80% of hands.\n\nGood starting hands: Pairs (AA, KK, QQ...), suited connectors (J♥10♥), high cards (AK, AQ)." },
    ],
    summary: [
      '7-2 offsuit is the worst starting hand in poker',
      'Folding bad hands saves chips for when you have strong ones',
      'Discipline separates winning from losing players',
      'Play tight (fewer hands) and aggressive (bet/raise when you play)',
      'Good starting hands: pairs, suited connectors, high cards',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 8: Bluffing Basics
  // ═══════════════════════════════════════════
  {
    id: 'bluffing',
    title: 'Bluffing Basics',
    subtitle: 'The Art of Deception',
    description: 'Learn why and when to bluff.',
    presetDeck: buildDeck(
      [c(14, 'spades'), c(5, 'clubs')],
      [c(8, 'hearts'), c(7, 'hearts')],
      [c(6, 'diamonds'), c(4, 'diamonds')],
      [c(3, 'clubs'), c(2, 'hearts')],
      [c(13, 'hearts'), c(13, 'diamonds'), c(10, 'spades')],
      c(12, 'clubs'),
      c(11, 'hearts'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "A♠ 5♣ — an Ace with a weak kicker. Today we learn BLUFFING — betting as if you have a strong hand when you don't!", highlight: 'cards' },
      { type: 'coach_message', message: "Bluffing works because opponents don't see your cards. If your bets tell a believable 'story', they'll fold better hands!\n\nKey: Having an Ace gives your bluff credibility — you COULD have AK or AQ." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called with 8♥ 7♥. A mediocre hand.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded.", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Raise pre-flop to set up your bluff! This is called 'taking the lead'. Tap 'Raise', use the preset buttons above the slider (try '½ Pot'), and confirm!", highlight: 'actions' },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called. He's curious.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'flop', message: "Flop: K♥ K♦ 10♠. You completely missed! But this is a GREAT bluffing spot. The board has two Kings — opponents will worry YOU have the King.", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "A 'continuation bet' (c-bet) is when you bet the flop after raising pre-flop. It works about 60% of the time because opponents often miss the flop too!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. He's nervous about the Kings. Perfect for our bluff!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Fire a continuation bet! Act like you have a King. Tap 'Raise', use the presets above the slider (try '½ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called! Stubborn. Let's see if we can push him off on the turn.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'turn', message: "Turn: Q♣. The board now shows K-K-10-Q. Your 'story': you could easily have AK, KQ, or even KJ. Very believable!", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked again. He's scared of the strong board.", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Fire another barrel! Your story is strong. Tap 'Raise', use the presets above the slider (try '¾ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor folded! Your bluff worked! He believed you had a King. Well played!", delay: 1500 },
      { type: 'show_result', message: "Successful bluff! You won without the best hand!\n\nBluffing tips:\n• Bluff on scary boards (pairs, high cards)\n• Continuation bets work ~60%\n• Don't bluff too often — mix bluffs with value bets\n• Bluffs work best with fewer opponents" },
    ],
    summary: [
      'A bluff is betting with a weak hand to make opponents fold',
      'Bluff on scary boards (paired, high cards)',
      'A "continuation bet" after raising preflop succeeds ~60%',
      'Don\'t bluff too often — mix bluffs with value bets',
      'Bluffs work best in position against few opponents',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 9: Value Betting
  // ═══════════════════════════════════════════
  {
    id: 'value-betting',
    title: 'Value Betting',
    subtitle: 'Max Your Winnings',
    description: 'Extract maximum chips when you have the best hand.',
    presetDeck: buildDeck(
      [c(12, 'spades'), c(12, 'hearts')],
      [c(11, 'clubs'), c(10, 'clubs')],
      [c(14, 'diamonds'), c(9, 'diamonds')],
      [c(5, 'hearts'), c(4, 'hearts')],
      [c(12, 'clubs'), c(7, 'diamonds'), c(3, 'spades')],
      c(2, 'clubs'),
      c(8, 'hearts'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "Q♠ Q♥ — Pocket Queens! The 3rd best starting hand. Today: VALUE BETTING — winning the MOST chips when you have the best hand.", highlight: 'cards' },
      { type: 'coach_message', message: "Value betting = betting an amount that weaker hands will call. Bet too much → opponents fold (you win small). Bet too little → you miss out on chips. The sweet spot is 50-75% of the pot." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called with J♣ 10♣. A decent draw hand — exactly the type of hand that will pay us off!", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'call' }, message: "Luna called with A♦ 9♦. She has an Ace but we're still ahead with Queens.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded.", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Raise, but not too much — you WANT callers! A raise of 2.5-3x the big blind is standard. Tap 'Raise', use the preset buttons above the slider (try '½ Pot'), and confirm!", highlight: 'actions' },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called! Excellent — he's staying in with a worse hand.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded. One customer is enough!", delay: 1500 },
      { type: 'deal_community', communityPhase: 'flop', message: "Flop: Q♣ 7♦ 3♠. TOP SET! Three Queens!\nViktor has nothing but a J-10 draw. Time to extract value!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "With top set on a dry board (no flush or straight draws obvious), Viktor might have a pair or draw. Bet about half the pot — enough to build the pot but small enough that he might call." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. Let's bet for value!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Bet about 50-65% of the pot. Tap 'Raise', use the presets above the slider (try '½ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called! He's chasing his straight draw. Keep extracting value!", delay: 1500 },
      { type: 'deal_community', communityPhase: 'turn', message: "Turn: 2♣. Board is still safe for us — no straight or flush completed. Keep betting!", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked again. He's calling station — perfect for value betting!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "Another value bet. Size it so he's tempted to call. Tap 'Raise', use the presets above the slider (try '¾ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called again! The pot is getting big.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'river', message: "River: 8♥. Viktor missed his draw. But he has chips invested — he might call one more bet!", highlight: 'community', delay: 1000 },
      { type: 'coach_message', message: "Final street value bet: Think about what Viktor could have. He's been calling with a draw that missed. A medium bet might get a 'crying call' from him." },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked. He missed his straight draw. One more value bet!", delay: 1500 },
      { type: 'require_action', requiredAction: 'raise', message: "One final value bet! Tap 'Raise', use the presets above the slider (try '½ Pot'), and confirm!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor finally folded. You extracted 3 streets of value before he gave up! Maximum profit.", delay: 1500 },
      { type: 'show_result', message: "Great value betting! You bet 3 streets with top set, building a huge pot. Remember: Bet 50-75% of the pot to keep weaker hands calling!" },
    ],
    summary: [
      'Value betting = betting to get called by weaker hands',
      'Bet 50-75% of the pot for value',
      'Think about what hands your opponent would call with',
      'The best players extract maximum value from strong hands',
      'Don\'t slowplay too much — betting is usually better',
    ],
  },

  // ═══════════════════════════════════════════
  // LESSON 10: Putting It All Together (Unguided Free Play)
  // ═══════════════════════════════════════════
  {
    id: 'final',
    title: 'Putting It All Together',
    subtitle: 'Free Play',
    description: 'Play a hand on your own with light tips.',
    presetDeck: buildDeck(
      [c(14, 'hearts'), c(13, 'diamonds')],
      [c(10, 'spades'), c(10, 'hearts')],
      [c(11, 'clubs'), c(9, 'clubs')],
      [c(6, 'hearts'), c(5, 'diamonds')],
      [c(14, 'clubs'), c(8, 'diamonds'), c(3, 'hearts')],
      c(7, 'spades'),
      c(13, 'clubs'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    scriptedSteps: [
      { type: 'deal_hole_cards', message: "A♥ K♦ — Big Slick! A premium hand. Use everything you've learned. This one's all you!", highlight: 'cards' },
      { type: 'coach_message', message: "Think about position, hand strength, and your plan for the hand. Good luck!" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-1', botAction: { type: 'fold' }, message: "Luna folded.", delay: 1500 },
      { type: 'bot_action', botId: 'bot-2', botAction: { type: 'fold' }, message: "Ace folded.", delay: 1500 },
      { type: 'require_action', message: "" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'flop', message: "Flop: A♣ 8♦ 3♥.", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked.", delay: 1500 },
      { type: 'require_action', message: "" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'turn', message: "Turn: 7♠.", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked.", delay: 1500 },
      { type: 'require_action', message: "" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'call' }, message: "Viktor called.", delay: 1500 },
      { type: 'deal_community', communityPhase: 'river', message: "River: K♣. Two Pair — Aces and Kings!", highlight: 'community', delay: 1000 },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "Viktor checked.", delay: 1500 },
      { type: 'require_action', message: "" },
      { type: 'bot_action', botId: 'bot-0', botAction: { type: 'fold' }, message: "Viktor folded.", delay: 1500 },
      { type: 'show_result', message: "Tutorial complete!" },
    ],
    summary: [
      'Congratulations — you\'ve completed the poker tutorial!',
      'Remember: Position, hand selection, pot odds, and discipline',
      'Bluff occasionally, value bet often, and always read the board',
      'Practice against bots to build confidence before multiplayer',
      'Most importantly — have fun!',
    ],
  },
];
