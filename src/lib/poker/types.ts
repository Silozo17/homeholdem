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
}

export interface LobbySettings {
  botCount: number;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
}
