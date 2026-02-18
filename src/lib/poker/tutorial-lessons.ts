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
  waitForPhase?: boolean; // Wait until the game reaches this phase before showing
}

export interface IntroStep {
  message: string;
  position?: 'top' | 'center' | 'bottom';
  arrowDirection?: 'down' | 'up' | 'none';
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
  botActions?: Record<string, PlayerAction[]>; // bot-id -> ordered actions they should take
}

/**
 * Build a preset deck for 4 players (1 human + 3 bots).
 * Deal order: seats in order, 2 cards each = 8 cards for hole cards.
 * Then community: positions 8-10 = flop, 11 = turn, 12 = river.
 * Remaining cards are filler.
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
  // The dealing loop in usePokerGame deals to each active player in order (index 0..3), 2 cards each
  // It does deal(deck, 2) for each player sequentially
  // So deck[0..1] = player 0 (human), deck[2..3] = player 1 (bot-0), etc.
  const deck: Card[] = [
    ...humanCards,
    ...bot0Cards,
    ...bot1Cards,
    ...bot2Cards,
    ...flop,
    turn,
    river,
  ];

  // Fill remaining deck with arbitrary cards (won't be used)
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
      { message: "Welcome to your first poker lesson! 🎉 Let's learn the basics of Texas Hold'em together. I'll guide you step by step.", position: 'center', arrowDirection: 'none' },
      { message: "You'll see the poker table with your seat at the bottom. Your hole cards (private cards) will appear face-up at your position.", position: 'bottom', arrowDirection: 'down' },
      { message: "At the bottom of the screen are your action buttons: Fold, Check/Call, and Raise. These are how you play each turn.", position: 'bottom', arrowDirection: 'down' },
      { message: "The shared community cards appear in the center of the table. Use them together with your hole cards to make the best 5-card hand.", position: 'center', arrowDirection: 'none' },
      { message: "Ready? Let's deal your first hand! I'll pause at each step to explain what's happening. 🃏", position: 'center', arrowDirection: 'none' },
    ],
    presetDeck: buildDeck(
      [c(14, 'spades'), c(13, 'spades')],   // Human: A♠ K♠
      [c(7, 'hearts'), c(2, 'diamonds')],     // Bot 0: 7♥ 2♦ (weak, will fold)
      [c(8, 'clubs'), c(3, 'hearts')],        // Bot 1: 8♣ 3♥ (weak, will fold)
      [c(9, 'diamonds'), c(4, 'clubs')],      // Bot 2: 9♦ 4♣ (weak, will fold)
      [c(10, 'spades'), c(5, 'hearts'), c(12, 'diamonds')], // Flop
      c(6, 'clubs'),                           // Turn
      c(11, 'spades'),                         // River: gives player A-K-Q-J-10 straight!
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "Welcome! 👋 Let's play your first hand. You've been dealt Ace-King suited — a very strong starting hand! The two players to the left of the dealer post forced bets called 'blinds' to get the action started.", waitForPhase: true },
      { phase: 'preflop', message: "It's your turn. You have a premium hand, so let's raise to show strength. Click 'Raise' to put more chips in.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "Three community cards are dealt face-up — this is called the 'Flop'. Everyone shares these cards to make their best 5-card hand. You already have a strong draw!", waitForPhase: true },
      { phase: 'flop', message: "No one has bet yet, so you can 'Check' (pass without betting) or bet. Let's check and see what happens.", requiredAction: 'check', highlightElement: '[data-action="check"]' },
      { phase: 'turn', message: "One more community card — the 'Turn'. Now there are 4 shared cards. One more to come!", waitForPhase: true },
      { phase: 'turn', message: "Let's check again to keep things simple.", requiredAction: 'check', highlightElement: '[data-action="check"]' },
      { phase: 'river', message: "The final community card — the 'River'! Now you make your best 5-card hand from your 2 cards + 5 community cards. You have a Straight! 🎉", waitForPhase: true },
      { phase: 'river', message: "You have a great hand. Let's bet to try to win more chips. Click 'Raise'!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
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
      'bot-2': ['fold'],
    },
  },

  // Lesson 2: Hand Rankings
  {
    id: 'hand-rankings',
    title: 'Hand Rankings',
    subtitle: 'What Beats What',
    description: 'Learn all the poker hand rankings from High Card to Royal Flush.',
    presetDeck: buildDeck(
      [c(14, 'hearts'), c(14, 'diamonds')],    // Human: A♥ A♦ (pocket aces)
      [c(13, 'spades'), c(13, 'clubs')],        // Bot 0: K♠ K♣ (pocket kings)
      [c(8, 'hearts'), c(8, 'clubs')],          // Bot 1: 8♥ 8♣
      [c(5, 'spades'), c(6, 'spades')],         // Bot 2: 5♠ 6♠
      [c(14, 'clubs'), c(13, 'hearts'), c(8, 'diamonds')], // Flop: A♣ K♥ 8♦
      c(14, 'spades'),                           // Turn: A♠ → gives human four Aces!
      c(2, 'hearts'),                            // River
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "Pocket Aces! 🚀 This is the best starting hand in poker. The hand rankings from worst to best are: High Card → Pair → Two Pair → Three of a Kind → Straight → Flush → Full House → Four of a Kind → Straight Flush → Royal Flush.", waitForPhase: true },
      { phase: 'preflop', message: "With the best possible starting hand, let's raise big!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "Look at the board! There's an Ace on the flop, giving you Three of a Kind (also called 'trips' or 'a set'). Bot 0 has a pair of Kings. You're way ahead!", waitForPhase: true },
      { phase: 'flop', message: "Let's bet for value — we want opponents to put more chips in when we're winning.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "Another Ace on the Turn! You now have Four of a Kind — the second-best hand in poker! Only a Straight Flush can beat this. 🎰", waitForPhase: true },
      { phase: 'turn', message: "With an unbeatable hand, let's bet again!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Pocket Aces (AA) is the strongest starting hand',
      'Hand rankings: High Card < Pair < Two Pair < Three of a Kind < Straight < Flush < Full House < Four of a Kind < Straight Flush < Royal Flush',
      'A "set" is when you have a pair and one matches the board',
      'Knowing hand rankings helps you judge how strong you are',
    ],
  },

  // Lesson 3: Betting Actions
  {
    id: 'betting-actions',
    title: 'Betting Actions',
    subtitle: 'Fold, Check, Call, Raise',
    description: 'Master all the betting options available to you.',
    presetDeck: buildDeck(
      [c(12, 'hearts'), c(11, 'hearts')],      // Human: Q♥ J♥
      [c(14, 'spades'), c(10, 'clubs')],        // Bot 0: A♠ 10♣ (decent)
      [c(7, 'diamonds'), c(6, 'diamonds')],     // Bot 1: 7♦ 6♦
      [c(3, 'hearts'), c(2, 'clubs')],          // Bot 2: 3♥ 2♣ (bad)
      [c(10, 'hearts'), c(9, 'hearts'), c(4, 'spades')], // Flop: gives flush draw
      c(5, 'diamonds'),                          // Turn
      c(8, 'hearts'),                            // River: completes flush!
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "Q♥ J♥ — a suited connector! Not the strongest hand, but great potential. Let's learn the 4 main actions: Fold (give up), Check (pass), Call (match a bet), and Raise (increase the bet).", waitForPhase: true },
      { phase: 'preflop', message: "There's a bet to match. Let's 'Call' — match the current bet to stay in the hand.", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'flop', message: "The flop gives you a flush draw — 4 hearts! You need one more heart to make a Flush. You can 'Check' when no one has bet.", waitForPhase: true },
      { phase: 'flop', message: "Check to see the next card for free.", requiredAction: 'check', highlightElement: '[data-action="check"]' },
      { phase: 'turn', message: "The turn didn't complete your flush. But you still have one card to come. Sometimes you should call a small bet to chase a strong draw.", waitForPhase: true },
      { phase: 'turn', message: "Call to see the final card.", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'river', message: "The 8♥ on the river completes your Flush! 💎 When you hit your hand on the river, you should bet for value to win more chips.", waitForPhase: true },
      { phase: 'river', message: "Raise to win big with your Flush!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Fold: Give up your hand and any chips you\'ve bet',
      'Check: Pass the action (only when no bet to you)',
      'Call: Match the current bet to stay in',
      'Raise: Increase the bet, forcing others to match or fold',
    ],
  },

  // Lesson 4: Position Matters
  {
    id: 'position',
    title: 'Position Matters',
    subtitle: 'Early vs Late Position',
    description: 'Learn why acting last is a huge advantage.',
    presetDeck: buildDeck(
      [c(14, 'diamonds'), c(11, 'clubs')],     // Human: A♦ J♣
      [c(10, 'hearts'), c(9, 'hearts')],        // Bot 0: 10♥ 9♥
      [c(7, 'spades'), c(7, 'clubs')],          // Bot 1: 7♠ 7♣
      [c(4, 'hearts'), c(3, 'diamonds')],       // Bot 2: 4♥ 3♦
      [c(11, 'hearts'), c(6, 'diamonds'), c(2, 'spades')], // Flop: J on board
      c(11, 'diamonds'),                         // Turn: trips!
      c(5, 'clubs'),                             // River
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "Position is one of poker's most important concepts. When you act LAST, you get to see what everyone else does before making your decision. This is a huge advantage!", waitForPhase: true },
      { phase: 'preflop', message: "You have A-J, a decent hand. Raise to take control.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "You hit a Jack on the flop — top pair! When you have position (act last), you can check to see what opponents do, then decide. If they bet, you know they have something.", waitForPhase: true },
      { phase: 'flop', message: "Let's bet to protect our top pair.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "Another Jack! You now have Three of a Kind. Position lets you control the pot size — bet big with strong hands, check with weaker ones.", waitForPhase: true },
      { phase: 'turn', message: "Bet again with your trips!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Late position (acting last) is a major advantage',
      'You see opponents\' actions before deciding',
      'Play more hands in late position, fewer in early',
      'The "Button" (dealer) is the best position',
    ],
  },

  // Lesson 5: Reading the Board
  {
    id: 'reading-board',
    title: 'Reading the Board',
    subtitle: 'Draws and Dangers',
    description: 'Learn to spot flush draws, straight draws, and paired boards.',
    presetDeck: buildDeck(
      [c(14, 'clubs'), c(10, 'clubs')],         // Human: A♣ 10♣
      [c(13, 'hearts'), c(12, 'hearts')],        // Bot 0: K♥ Q♥
      [c(9, 'spades'), c(8, 'spades')],          // Bot 1: 9♠ 8♠
      [c(5, 'diamonds'), c(4, 'diamonds')],      // Bot 2: 5♦ 4♦
      [c(7, 'clubs'), c(3, 'clubs'), c(11, 'hearts')], // Flop: two clubs + J
      c(2, 'clubs'),                              // Turn: flush!
      c(9, 'hearts'),                             // River
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "A♣ 10♣ — two clubs! If the flop brings more clubs, you'll have a flush draw. Learning to 'read the board' means spotting these possibilities.", waitForPhase: true },
      { phase: 'preflop', message: "Call to see the flop.", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'flop', message: "Two clubs on the flop! 🃏 You have 4 clubs total — that's a 'flush draw'. You need 1 more club to complete it. There are 9 clubs left in the deck — those are your 'outs' (cards that help you).", waitForPhase: true },
      { phase: 'flop', message: "With a strong draw, call to see the next card.", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'turn', message: "The 2♣ completes your flush! 🎉 You have 5 clubs = Ace-high flush. This is very strong. Now look for danger: could anyone have a higher flush? No — you have the Ace of clubs, so yours is the best possible flush (the 'nut flush').", waitForPhase: true },
      { phase: 'turn', message: "Bet big with your nut flush!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'A "draw" is when you need 1-2 more cards to complete a hand',
      '"Outs" are the cards remaining that help you',
      'Flush draw = 4 suited cards, need 1 more (9 outs)',
      'Straight draw = 4 connected cards, need 1 more (8 outs)',
      'Always check if someone could have a better version of your hand',
    ],
  },

  // Lesson 6: Pot Odds
  {
    id: 'pot-odds',
    title: 'Pot Odds',
    subtitle: 'The Math of Calling',
    description: 'Learn when calling is mathematically correct.',
    presetDeck: buildDeck(
      [c(10, 'diamonds'), c(9, 'diamonds')],    // Human: 10♦ 9♦
      [c(14, 'clubs'), c(13, 'clubs')],          // Bot 0: A♣ K♣ (strong)
      [c(6, 'hearts'), c(5, 'hearts')],          // Bot 1
      [c(3, 'spades'), c(2, 'spades')],          // Bot 2
      [c(8, 'diamonds'), c(7, 'clubs'), c(2, 'hearts')], // Flop: gives open-ended straight draw
      c(14, 'hearts'),                            // Turn
      c(11, 'diamonds'),                          // River: straight!
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "10♦ 9♦ — a suited connector with great straight and flush potential. Today we'll learn about 'Pot Odds' — the math behind whether a call is profitable.", waitForPhase: true },
      { phase: 'preflop', message: "Call to see the flop.", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'flop', message: "The flop is 8-7-2. You have 10-9, giving you an 'open-ended straight draw' — either a Jack or a 6 completes your straight. That's 8 outs!", waitForPhase: true },
      { phase: 'flop', message: "🧮 POT ODDS: If the pot is 400 and you must call 200, your pot odds are 200/(400+200) = 33%. With 8 outs and ~32% chance to hit by the river, calling is roughly break-even. Call!", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'turn', message: "Didn't hit the straight yet. But the math still matters — with 8 outs and 1 card to come, you have roughly 17% chance (8/46). If the pot offers better than 5:1 odds, calling is correct.", waitForPhase: true },
      { phase: 'turn', message: "The pot is big enough. Call for one more card.", requiredAction: 'call', highlightElement: '[data-action="call"]' },
      { phase: 'river', message: "The Jack hits! 🎯 You made your straight: 7-8-9-10-J. The math worked in your favor. Bet big!", waitForPhase: true },
      { phase: 'river', message: "Value bet your straight!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Pot odds = cost to call ÷ (pot + cost to call)',
      'Compare pot odds to your chance of hitting your draw',
      'If your chance to win > pot odds required, calling is profitable',
      '8 outs ≈ 32% by river, 17% per card',
      '9 outs (flush draw) ≈ 35% by river, 19% per card',
    ],
  },

  // Lesson 7: When to Fold
  {
    id: 'when-to-fold',
    title: 'When to Fold',
    subtitle: 'Discipline Wins',
    description: 'Not every hand is worth playing. Learn when to fold.',
    presetDeck: buildDeck(
      [c(7, 'spades'), c(2, 'hearts')],         // Human: 7♠ 2♥ (worst hand!)
      [c(14, 'hearts'), c(14, 'clubs')],         // Bot 0: AA
      [c(13, 'diamonds'), c(12, 'diamonds')],    // Bot 1: KQ suited
      [c(10, 'hearts'), c(9, 'hearts')],         // Bot 2: 10-9 suited
      [c(14, 'spades'), c(13, 'hearts'), c(8, 'diamonds')],
      c(4, 'clubs'),
      c(3, 'spades'),
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "7♠ 2♥ — this is famously the WORST hand in Texas Hold'em! 🗑️ It's not suited, not connected, and has low card values. The key to winning poker is knowing when NOT to play.", waitForPhase: true },
      { phase: 'preflop', message: "The correct play with 7-2 offsuit is almost always to fold. Save your chips for better spots!", requiredAction: 'fold', highlightElement: '[data-action="fold"]' },
    ],
    summary: [
      '7-2 offsuit is the worst starting hand in poker',
      'Folding bad hands saves chips for when you have strong ones',
      'Discipline is what separates winning from losing players',
      'Play tight (fewer hands) and aggressive (bet/raise when you do play)',
      'Good starting hands: pairs, suited connectors, high cards',
    ],
  },

  // Lesson 8: Bluffing Basics
  {
    id: 'bluffing',
    title: 'Bluffing Basics',
    subtitle: 'The Art of Deception',
    description: 'Learn why and when to bluff.',
    presetDeck: buildDeck(
      [c(14, 'spades'), c(5, 'clubs')],          // Human: A♠ 5♣ (weak kicker)
      [c(8, 'hearts'), c(7, 'hearts')],           // Bot 0: 8♥ 7♥ (will fold to pressure)
      [c(6, 'diamonds'), c(4, 'diamonds')],       // Bot 1: will fold
      [c(3, 'clubs'), c(2, 'hearts')],            // Bot 2: will fold
      [c(13, 'hearts'), c(13, 'diamonds'), c(10, 'spades')], // Flop: K-K-10 scary board
      c(12, 'clubs'),                              // Turn: Q
      c(11, 'hearts'),                             // River: J (board: K-K-10-Q-J)
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "A♠ 5♣ — an Ace with a weak kicker. Today we'll learn about bluffing — betting as if you have a strong hand when you don't. Bluffing makes opponents fold better hands!", waitForPhase: true },
      { phase: 'preflop', message: "Raise preflop — having an Ace gives your bluff credibility.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "K-K-10 on the board. You missed, but this is a GREAT bluffing spot! The board is scary (paired Kings), and opponents will worry YOU have the King. A 'continuation bet' (betting after raising preflop) works here ~60% of the time.", waitForPhase: true },
      { phase: 'flop', message: "Bet as a bluff! You raised preflop, so opponents expect you to have something.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "The Queen on the turn makes the board even scarier. Your 'story' is strong — you could easily have AK, KQ, or a big pocket pair. Keep up the pressure!", waitForPhase: true },
      { phase: 'turn', message: "Fire another bet. The board supports your bluff.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'A bluff is betting with a weak hand to make opponents fold',
      'Bluff on scary boards (paired, high cards) where opponents fear you',
      'A "continuation bet" after raising preflop succeeds ~60% of the time',
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
      [c(12, 'spades'), c(12, 'hearts')],        // Human: Q♠ Q♥ (pocket queens)
      [c(11, 'clubs'), c(10, 'clubs')],           // Bot 0: J♣ 10♣ (draws)
      [c(14, 'diamonds'), c(9, 'diamonds')],      // Bot 1: A♦ 9♦
      [c(5, 'hearts'), c(4, 'hearts')],           // Bot 2: 5♥ 4♥
      [c(12, 'clubs'), c(7, 'diamonds'), c(3, 'spades')], // Flop: Q♣ 7♦ 3♠ (top set!)
      c(2, 'clubs'),                               // Turn
      c(8, 'hearts'),                              // River
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "Q♠ Q♥ — Pocket Queens! The 3rd best starting hand. When you have a monster, the goal isn't just to win — it's to win the MOST. This is called 'value betting'.", waitForPhase: true },
      { phase: 'preflop', message: "Raise, but not too much — you want callers!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'flop', message: "Q on the flop gives you Three of a Kind (top set)! 🎰 Now the art of value betting: bet an amount opponents might call. Too much and they fold; too little and you leave money on the table.", waitForPhase: true },
      { phase: 'flop', message: "Bet about half to two-thirds of the pot. This looks like a normal bet and gets calls from pairs and draws.", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'turn', message: "Keep betting for value. With top set, you're almost never beaten here. Size your bet so weaker hands (like a pair or a draw) feel they can call.", waitForPhase: true },
      { phase: 'turn', message: "Another value bet!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
      { phase: 'river', message: "Final street. Some opponents will call one more bet with a pair or a missed draw they're curious about. One more value bet to maximize your profit!", waitForPhase: true },
      { phase: 'river', message: "Bet for value one last time!", requiredAction: 'raise', highlightElement: '[data-action="raise"]' },
    ],
    summary: [
      'Value betting = betting to get called by weaker hands',
      'Bet 50-75% of the pot for value — too big scares opponents away',
      'Think about what hands your opponent would call with',
      'The best players extract maximum value from strong hands',
      'Don\'t slowplay too much — most of the time, betting is better',
    ],
  },

  // Lesson 10: Putting It All Together
  {
    id: 'final',
    title: 'Putting It All Together',
    subtitle: 'Free Play',
    description: 'Play a hand with light coaching hints.',
    presetDeck: buildDeck(
      [c(14, 'hearts'), c(13, 'diamonds')],      // Human: A♥ K♦ (big slick)
      [c(10, 'spades'), c(10, 'hearts')],         // Bot 0: pocket 10s
      [c(11, 'clubs'), c(9, 'clubs')],            // Bot 1: J♣ 9♣
      [c(6, 'hearts'), c(5, 'diamonds')],         // Bot 2: 6♥ 5♦
      [c(14, 'clubs'), c(8, 'diamonds'), c(3, 'hearts')], // Flop: A♣ 8♦ 3♥
      c(7, 'spades'),                              // Turn
      c(13, 'clubs'),                              // River: two pair A-K
    ),
    botCount: 3,
    startingChips: 10000,
    smallBlind: 50,
    bigBlind: 100,
    steps: [
      { phase: 'preflop', message: "A♥ K♦ — 'Big Slick'! You've learned the basics. This time, YOU decide what to do. Think about position, hand strength, and what you've learned. Good luck! 🍀", waitForPhase: true },
      { phase: 'flop', message: "You paired your Ace — top pair, top kicker! Remember: bet for value with strong hands. What would you do?", waitForPhase: true },
      { phase: 'river', message: "A-K on the river gives you Two Pair! Think about pot odds and value betting as you make your decision.", waitForPhase: true },
    ],
    summary: [
      '🎓 Congratulations — you\'ve completed the poker tutorial!',
      'Remember: Position, hand selection, pot odds, and discipline',
      'Bluff occasionally, value bet often, and always read the board',
      'Practice against bots to build confidence before multiplayer',
      'Most importantly — have fun! ♠♥♦♣',
    ],
  },
];
