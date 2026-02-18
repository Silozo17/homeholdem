/** Strict z-index layering model for the poker table UI */
export const Z = {
  /** Dark room / leather background */
  BG: 0,
  /** Table image asset (rail + felt) */
  TABLE: 1,
  /** Gold trim glow overlay */
  TRIM_GLOW: 2,
  /** Club logo watermark on felt */
  LOGO: 3,
  /** Community cards + pot display + phase text */
  CARDS: 5,
  /** Chip animations (fly to pot, etc.) */
  CHIPS: 6,
  /** Dealer character */
  DEALER: 10,
  /** Player seat avatars, stacks, badges */
  SEATS: 15,
  /** Player hole cards (above seats) */
  HOLE_CARDS: 17,
  /** Hand name reveal, showdown particles */
  EFFECTS: 20,
  /** All-in flash */
  ALLIN_FLASH: 25,
  /** Winner overlay */
  WINNER: 30,
  /** Header bar (back, hand #, sound) */
  HEADER: 40,
  /** Action bar (fold/call/raise) + YOUR TURN badge */
  ACTIONS: 50,
} as const;
