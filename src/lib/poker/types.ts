export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
// 11=J, 12=Q, 13=K, 14=A

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const RANK_NAMES: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};

export const HAND_RANK_NAMES: Record<number, string> = {
  0: 'High Card',
  1: 'One Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
  9: 'Royal Flush',
};

export interface HandResult {
  rank: number;       // 0-9
  name: string;       // e.g. "Full House"
  score: number;      // numeric score for comparison (higher = better)
  bestCards: Card[];   // the best 5 cards
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'eliminated';

export type BotPersonality = 'shark' | 'maniac' | 'rock' | 'fish' | 'pro';

export interface PersonalityProfile {
  foldThreshold: number;
  raiseThreshold: number;
  bluffChance: number;
  raiseSizing: number; // multiplier of pot
  usePotOdds: boolean;
  positionAware: boolean;
}

export const BOT_PERSONALITIES: Record<BotPersonality, PersonalityProfile> = {
  shark:  { foldThreshold: 50, raiseThreshold: 70, bluffChance: 0.05, raiseSizing: 1.0, usePotOdds: false, positionAware: false },
  maniac: { foldThreshold: 25, raiseThreshold: 45, bluffChance: 0.20, raiseSizing: 1.5, usePotOdds: false, positionAware: false },
  rock:   { foldThreshold: 60, raiseThreshold: 85, bluffChance: 0.02, raiseSizing: 0.5, usePotOdds: false, positionAware: false },
  fish:   { foldThreshold: 55, raiseThreshold: 90, bluffChance: 0.03, raiseSizing: 0.6, usePotOdds: false, positionAware: false },
  pro:    { foldThreshold: 40, raiseThreshold: 65, bluffChance: 0.10, raiseSizing: 0.75, usePotOdds: true, positionAware: true },
};

export interface PokerPlayer {
  id: string;
  name: string;
  chips: number;
  holeCards: Card[];
  status: PlayerStatus;
  currentBet: number;     // amount bet this betting round
  totalBetThisHand: number; // total bet this hand
  isBot: boolean;
  isDealer: boolean;
  seatIndex: number;
  lastAction?: string;
  personality?: BotPersonality;
}

export type GamePhase =
  | 'idle'
  | 'dealing'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand_complete'
  | 'game_over';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface GameAction {
  type: PlayerAction;
  amount?: number; // for raise
}

export interface GameState {
  phase: GamePhase;
  players: PokerPlayer[];
  communityCards: Card[];
  deck: Card[];
  pot: number;
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minRaise: number;
  handNumber: number;
  lastRaiserIndex: number | null;
  // Stats tracking
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  bestHandRank: number;
  bestHandName: string;
  startTime: number;
  startingChips: number;
  blindLevel: number;
  blindTimer: number; // minutes, 0 = off
  lastBlindIncrease: number; // timestamp
  lastHandWinners: Array<{
    playerId: string;
    name: string;
    handName: string;
    chipsWon: number;
  }>;
}

export const BLIND_LEVELS = [
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 75, big: 150 },
  { small: 100, big: 200 },
  { small: 150, big: 300 },
  { small: 200, big: 400 },
  { small: 300, big: 600 },
  { small: 500, big: 1000 },
  { small: 1000, big: 2000 },
  { small: 2000, big: 4000 },
];

export interface LobbySettings {
  botCount: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  blindTimer: number; // minutes: 0 = off, 5/10/15/30
}
