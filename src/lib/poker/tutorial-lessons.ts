import { Card, GamePhase, PlayerAction } from './types';

// Helper to create a card shorthand
function c(rank: number, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'): Card {
  return { rank: rank as Card['rank'], suit };
}

export interface TutorialStep {
  phase: GamePhase;
  message: string;
  highlightElement?: string;
  requiredAction?: PlayerAction;
  autoAdvance?: boolean;
  waitForPhase?: boolean;
}

export interface IntroStep {
  message: string;
  position?: 'top' | 'center' | 'bottom';
  arrowDirection?: 'down' | 'up' | 'none';
  highlight?: 'actions' | 'cards' | 'community' | 'timer' | 'audio' | 'exit' | 'pot' | 'table';
}

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
  steps: TutorialStep[];
  summary: string[];
  introSteps?: IntroStep[];
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
  // Lesson 1: The Basics
  {
    id: 'basics',
    title: 'The Basics',
    subtitle: 'How a Hand Works',
    description: 'Learn about blinds, dealing, and the four betting rounds.',
    introSteps: [
      { message: "Welcome to Learn Poker! 🎉 I'm your coach — I'll guide you through every step. Let's start by learning the table layout.", position: 'center', arrowDirection: 'none' },
      { message: "This is the poker table. You'll see seats around it for each player — you and 3 opponents.", position: 'center', arrowDirection: 'none', highlight: 'table' },
      { message: "Your seat is at the bottom. Your private cards ('hole cards') will appear here, face-up so you can see them.", position: 'bottom', arrowDirection: 'down', highlight: 'cards' },
      { message: "The shared 'community cards' appear in the center. All players use them to make their best 5-card hand.", position: 'center', arrowDirection: 'up', highlight: 'community' },
      { message: "The pot — total chips bet by all players — is displayed above the community cards.", position: 'center', arrowDirection: 'up', highlight: 'pot' },
      { message: "⬆️ At the top-left, the back arrow lets you leave the table and return to the lesson list.", position: 'top', arrowDirection: 'up', highlight: 'exit' },
      { message: "🔊 At the top-right, the speaker icon toggles game sounds on or off.", position: 'top', arrowDirection: 'up', highlight: 'audio' },
      { message: "The hand number and blind levels are shown at the top center. Blinds are forced bets that increase over time.", position: 'top', arrowDirection: 'up', highlight: 'timer' },
      { message: "When it's your turn, action buttons appear at the bottom: Fold, Check/Call, and Raise.", position: 'bottom', arrowDirection: 'down', highlight: 'actions' },
      { message: "📝 Quick reference:\n• Fold = give up your hand\n• Check = pass (no bet to match)\n• Call = match the current bet\n• Raise = increase the bet", position: 'center', arrowDirection: 'none' },
      { message: "I'll pause at every important moment to explain what's happening. Take your time — there's no rush! 🕐", position: 'center', arrowDirection: 'none' },
      { message: "Ready? Let's deal your first hand! 🃏", position: 'center', arrowDirection: 'none' },
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
    steps: [
      { phase: 'preflop', message: "👋 Your first hand! You've been dealt Ace-King suited — a premium starting hand! The two players left of the dealer posted forced bets called 'blinds' to start the action.", waitForPhase: true },
      { phase: 'preflop', message: "It's your turn! With a strong hand like this, let's raise. Tap the 'Raise' button at the bottom. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "Three community cards are dealt face-up — this is the 'Flop'. Everyone shares these to make their best 5-card hand. You have a strong draw!", waitForPhase: true },
      { phase: 'flop', message: "No one has bet yet, so you can 'Check' (pass without betting). Tap 'Check'. 👇", requiredAction: 'check', highlightElement: '[data-action="check"]' },
      { phase: 'turn', message: "One more community card — the 'Turn'. 4 shared cards now, 1 more to come!", waitForPhase: true },
      { phase: 'turn', message: "Let's check again to keep things simple. Tap 'Check'. 👇", requiredAction: 'check', highlightElement: '[data-action="check"]' },
      { phase: 'river', message: "The final community card — the 'River'! You now make your best 5-card hand from your 2 cards + 5 community cards. You have a Straight! 🎉", waitForPhase: true },
      { phase: 'river', message: "You have a great hand! Let's bet to win more chips. Tap 'Raise'! 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'A hand has 4 betting rounds: Preflop, Flop, Turn, River',
      'Blinds are forced bets that start the action',
      'Community cards are shared by all players',
      'You make your best 5 cards from 2 hole cards + 5 community cards',
    ],
    botActions: {
      'bot-0': ['fold'],
      'bot-1': ['fold'],
      'bot-2': ['call', 'check', 'check', 'fold'],
    },
  },

  // Lesson 2: Hand Rankings
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
    steps: [
      { phase: 'preflop', message: "Pocket Aces! 🚀 The best starting hand. Rankings from worst to best: High Card → Pair → Two Pair → Three of a Kind → Straight → Flush → Full House → Four of a Kind → Straight Flush → Royal Flush.", waitForPhase: true },
      { phase: 'preflop', message: "With the best starting hand, let's raise big! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "An Ace on the flop gives you Three of a Kind ('a set'). Bot 0 has Kings but you're way ahead!", waitForPhase: true },
      { phase: 'flop', message: "Bet for value — we want opponents to put more chips in. Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "Another Ace! Four of a Kind — the 2nd best hand in poker! Only a Straight Flush beats this. 🎰", waitForPhase: true },
      { phase: 'turn', message: "Bet again with your monster hand! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Pocket Aces (AA) is the strongest starting hand',
      'Hand rankings: High Card < Pair < Two Pair < Three of a Kind < Straight < Flush < Full House < Four of a Kind < Straight Flush < Royal Flush',
      'A "set" is when you have a pair and one matches the board',
      'Knowing hand rankings helps you judge how strong you are',
    ],
    botActions: {
      'bot-0': ['call', 'call', 'call', 'call', 'call', 'fold'],
      'bot-1': ['fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 3: Betting Actions
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
    steps: [
      { phase: 'preflop', message: "Q♥ J♥ — a suited connector! Not the strongest, but great potential. Let's practise the 4 main actions: Fold, Check, Call, Raise.", waitForPhase: true },
      { phase: 'preflop', message: "There's a bet to match. Let's 'Call' — match the current bet to stay in. Tap 'Call'. 👇", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'flop', message: "The flop gives you a flush draw — 4 hearts! You need 1 more heart for a Flush. You can 'Check' when no one has bet.", waitForPhase: true },
      { phase: 'flop', message: "Check to see the next card for free. Tap 'Check'. 👇", requiredAction: 'check', highlightElement: '[data-action="check"]' },
      { phase: 'turn', message: "Didn't complete the flush yet. But you still have one more card. Sometimes calling a small bet to chase a strong draw is correct.", waitForPhase: true },
      { phase: 'turn', message: "Call to see the final card. Tap 'Call'. 👇", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'river', message: "The 8♥ completes your Flush! 💎 When you hit your hand on the river, bet for value to win more chips.", waitForPhase: true },
      { phase: 'river', message: "Raise to win big with your Flush! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Fold: Give up your hand and any chips you\'ve bet',
      'Check: Pass the action (only when no bet to you)',
      'Call: Match the current bet to stay in',
      'Raise: Increase the bet, forcing others to match or fold',
    ],
    botActions: {
      'bot-0': ['call', 'check', 'raise', 'call', 'call', 'fold'],
      'bot-1': ['fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 4: Position Matters
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
    steps: [
      { phase: 'preflop', message: "Position is one of poker's most important concepts. Acting LAST lets you see what everyone else does first — a huge advantage!", waitForPhase: true },
      { phase: 'preflop', message: "You have A-J, a decent hand. Raise to take control. Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "You hit a Jack on the flop — top pair! In position, you can control the pot size.", waitForPhase: true },
      { phase: 'flop', message: "Bet to protect your top pair. Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "Another Jack! Three of a Kind! Position lets you bet big with strong hands.", waitForPhase: true },
      { phase: 'turn', message: "Bet again with your trips! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Late position (acting last) is a major advantage',
      'You see opponents\' actions before deciding',
      'Play more hands in late position, fewer in early',
      'The "Button" (dealer) is the best position',
    ],
    botActions: {
      'bot-0': ['call', 'check', 'fold'],
      'bot-1': ['fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 5: Reading the Board
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
    steps: [
      { phase: 'preflop', message: "A♣ 10♣ — two clubs! If the flop brings more clubs, you'll have a flush draw.", waitForPhase: true },
      { phase: 'preflop', message: "Call to see the flop. Tap 'Call'. 👇", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'flop', message: "Two clubs on the flop! 🃏 4 clubs total — a 'flush draw'. You need 1 more club. 9 clubs remain — those are your 'outs'.", waitForPhase: true },
      { phase: 'flop', message: "With a strong draw, call to see the next card. Tap 'Call'. 👇", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'turn', message: "The 2♣ completes your flush! 🎉 Ace-high flush — the 'nut flush' (best possible flush).", waitForPhase: true },
      { phase: 'turn', message: "Bet big with your nut flush! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'A "draw" is when you need 1-2 more cards to complete a hand',
      '"Outs" are the cards remaining that help you',
      'Flush draw = 4 suited cards, need 1 more (9 outs)',
      'Straight draw = 4 connected cards, need 1 more (8 outs)',
      'Always check if someone could have a better version of your hand',
    ],
    botActions: {
      'bot-0': ['call', 'raise', 'call', 'fold'],
      'bot-1': ['fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 6: Pot Odds
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
    steps: [
      { phase: 'preflop', message: "10♦ 9♦ — a suited connector! Today we learn 'Pot Odds' — the math behind whether a call is profitable.", waitForPhase: true },
      { phase: 'preflop', message: "Call to see the flop. Tap 'Call'. 👇", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'flop', message: "8-7-2 on the flop. You have 10-9, giving you an 'open-ended straight draw' — either a Jack or 6 completes it. That's 8 outs!", waitForPhase: true },
      { phase: 'flop', message: "🧮 POT ODDS: If pot is 400 and you call 200, odds are 33%. With 8 outs ≈ 32% to hit — roughly break-even. Call! Tap 'Call'. 👇", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'turn', message: "Didn't hit yet. With 8 outs and 1 card to come ≈ 17% chance. If the pot offers better than 5:1 odds, calling is correct.", waitForPhase: true },
      { phase: 'turn', message: "The pot is big enough. Call for one more card. Tap 'Call'. 👇", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'river', message: "The Jack hits! 🎯 You made your straight: 7-8-9-10-J. The math worked!", waitForPhase: true },
      { phase: 'river', message: "Value bet your straight! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Pot odds = cost to call ÷ (pot + cost to call)',
      'Compare pot odds to your chance of hitting your draw',
      'If your chance to win > pot odds required, calling is profitable',
      '8 outs ≈ 32% by river, 17% per card',
      '9 outs (flush draw) ≈ 35% by river, 19% per card',
    ],
    botActions: {
      'bot-0': ['call', 'raise', 'raise', 'call', 'fold'],
      'bot-1': ['fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 7: When to Fold
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
    steps: [
      { phase: 'preflop', message: "7♠ 2♥ — the WORST hand in Texas Hold'em! 🗑️ Not suited, not connected, low values. Winning poker means knowing when NOT to play.", waitForPhase: true },
      { phase: 'preflop', message: "The correct play with 7-2 offsuit is almost always fold. Save your chips! Tap 'Fold'. 👇", requiredAction: 'fold', highlightElement: '[data-action="fold"]' },
    ],
    summary: [
      '7-2 offsuit is the worst starting hand in poker',
      'Folding bad hands saves chips for when you have strong ones',
      'Discipline separates winning from losing players',
      'Play tight (fewer hands) and aggressive (bet/raise when you play)',
      'Good starting hands: pairs, suited connectors, high cards',
    ],
    botActions: {
      'bot-0': ['raise', 'raise', 'raise'],
      'bot-1': ['call', 'call', 'fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 8: Bluffing Basics
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
    steps: [
      { phase: 'preflop', message: "A♠ 5♣ — an Ace with a weak kicker. Today: bluffing — betting as if you have a strong hand when you don't!", waitForPhase: true },
      { phase: 'preflop', message: "Raise preflop — having an Ace gives your bluff credibility. Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "K-K-10 on the board. You missed, but this is a GREAT bluffing spot! Opponents will worry YOU have the King.", waitForPhase: true },
      { phase: 'flop', message: "Bet as a bluff — a 'continuation bet' after raising preflop works ~60% of the time. Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "The Queen makes the board even scarier. Your 'story' is strong — you could have AK, KQ, or a big pair!", waitForPhase: true },
      { phase: 'turn', message: "Fire another bet. The board supports your bluff. Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'A bluff is betting with a weak hand to make opponents fold',
      'Bluff on scary boards (paired, high cards)',
      'A "continuation bet" after raising preflop succeeds ~60%',
      'Don\'t bluff too often — mix bluffs with value bets',
      'Bluffs work best in position against few opponents',
    ],
    botActions: {
      'bot-0': ['call', 'call', 'fold'],
      'bot-1': ['fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 9: Value Betting
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
    steps: [
      { phase: 'preflop', message: "Q♠ Q♥ — Pocket Queens! 3rd best starting hand. The goal: win the MOST chips. This is 'value betting'.", waitForPhase: true },
      { phase: 'preflop', message: "Raise, but not too much — you want callers! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "Q on the flop = Three of a Kind (top set)! 🎰 Bet an amount opponents might call — too much and they fold.", waitForPhase: true },
      { phase: 'flop', message: "Bet about half to two-thirds of the pot. Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "Keep betting for value. With top set, you're almost never beaten. Size your bet so weaker hands call.", waitForPhase: true },
      { phase: 'turn', message: "Another value bet! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'river', message: "Final street. Some opponents will call one more bet. Maximize your profit!", waitForPhase: true },
      { phase: 'river', message: "Bet for value one last time! Tap 'Raise'. 👇", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Value betting = betting to get called by weaker hands',
      'Bet 50-75% of the pot for value',
      'Think about what hands your opponent would call with',
      'The best players extract maximum value from strong hands',
      'Don\'t slowplay too much — betting is usually better',
    ],
    botActions: {
      'bot-0': ['call', 'call', 'call', 'call', 'call', 'fold'],
      'bot-1': ['call', 'fold'],
      'bot-2': ['fold'],
    },
  },

  // Lesson 10: Putting It All Together
  {
    id: 'final',
    title: 'Putting It All Together',
    subtitle: 'Free Play',
    description: 'Play a hand with light coaching hints.',
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
    steps: [
      { phase: 'preflop', message: "A♥ K♦ — 'Big Slick'! You've learned the basics. This time, YOU decide. Think about position, hand strength, and what you've learned. Good luck! 🍀", waitForPhase: true },
      { phase: 'flop', message: "You paired your Ace — top pair, top kicker! Remember: bet for value with strong hands.", waitForPhase: true },
      { phase: 'river', message: "A-K on the river gives you Two Pair! Think about pot odds and value betting.", waitForPhase: true },
    ],
    summary: [
      '🎓 Congratulations — you\'ve completed the poker tutorial!',
      'Remember: Position, hand selection, pot odds, and discipline',
      'Bluff occasionally, value bet often, and always read the board',
      'Practice against bots to build confidence before multiplayer',
      'Most importantly — have fun! ♠♥♦♣',
    ],
    botActions: {
      'bot-0': ['call', 'check', 'check', 'call', 'check', 'fold'],
      'bot-1': ['fold'],
      'bot-2': ['fold'],
    },
  },
];
