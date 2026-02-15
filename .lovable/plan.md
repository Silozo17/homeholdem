

## Professional Poker Game Redesign

A complete visual and interactive overhaul of the Play Poker experience -- transforming the current basic UI into an immersive, animated, casino-quality game.

### What Changes

**1. Immersive Poker Table (PokerTable.tsx -- full rewrite)**
- Oval felt-green table with radial gradient and subtle noise texture, centered on screen
- Players positioned around the table in an arc layout (like a real poker table), not a flat list
- Dealer chip icon shown next to the dealer's seat
- Community cards dealt to the center with a flip animation (scale-in + rotate)
- Pot displayed as stacked chip icons in the center with a glowing gold counter
- "Your turn" pulse animation on the human player's seat

**2. Animated Card Display (CardDisplay.tsx -- enhanced)**
- Cards get a 3D flip animation when dealt (backface-visibility + rotateY transform)
- Card backs have a premium pattern (the existing spade icon, enhanced with a gradient)
- Cards slide in from off-screen when dealt, with staggered delay per card
- Showdown: losing cards grey out, winning cards glow gold

**3. Professional Player Seats (PlayerSeat.tsx -- rewrite)**
- Circular avatar with player initial (color-coded per player)
- Chip stack shown as a mini bar or number below the avatar
- Status indicators: green dot for active, red for folded, pulsing gold for all-in
- Current-player indicator: animated gold ring around their seat
- Action chips: when a player bets/raises, a small animated chip flies toward the pot area
- Last action shown as a floating badge that fades out after 2 seconds

**4. Enhanced Betting Controls (BettingControls.tsx -- polish)**
- Larger, thumb-friendly buttons for mobile
- Fold = red, Check/Call = blue/teal, Raise = gold
- Quick-bet preset buttons: 1/2 pot, 3/4 pot, pot, all-in
- Raise slider with gold track and value preview
- Haptic-style micro-animation on button press (scale bounce)

**5. Cinematic Lobby (PlayPokerLobby.tsx -- redesign)**
- Full-screen dark background with subtle card-suit pattern
- Animated poker chips or card fan as hero graphic (CSS-only)
- "Deal Me In" button with gold shimmer animation
- Player count selector shown as visual avatars (not just a slider)
- Difficulty hint text per bot count

**6. Hand Result / Game Over (HandResult.tsx -- enhanced)**
- Confetti-style particle burst on win (CSS keyframe sparkles)
- Winner's hand displayed with cards fanned out
- Chip count animated (counting up from 0 to final value)
- Game Over screen: session stats summary (hands played, won, best hand, biggest pot, time played)
- "Play Again" and "Back to Lobby" buttons

**7. Pot Display (PotDisplay.tsx -- upgraded)**
- Animated chip stack icon instead of plain text
- Number animates when pot increases (counter animation)
- Gold glow effect on pot changes

**8. Sound & Visual Feedback Cues (CSS-only)**
- Card deal: subtle slide-in animation
- Bet/raise: chip-slide animation toward pot
- Fold: cards grey + slide away
- Win: gold pulse + sparkle overlay
- Phase change (flop/turn/river): brief flash effect on community card area

---

### Technical Details

**Files to create:**
- `src/components/poker/PokerTablePro.tsx` -- the new immersive table layout with arc-positioned seats
- `src/components/poker/PlayerAvatar.tsx` -- circular avatar component with status indicators
- `src/components/poker/ChipAnimation.tsx` -- animated chip that flies to pot on bet
- `src/components/poker/DealerButton.tsx` -- small "D" chip indicator
- `src/components/poker/QuickBetButtons.tsx` -- preset bet amount buttons (1/2 pot, pot, all-in)
- `src/components/poker/WinnerOverlay.tsx` -- cinematic win/game-over screen with stats and sparkles
- `src/components/poker/CardFan.tsx` -- decorative animated card fan for the lobby

**Files to modify:**
- `src/components/poker/CardDisplay.tsx` -- add 3D flip animation, deal slide-in, winner glow
- `src/components/poker/BettingControls.tsx` -- add quick-bet presets, larger mobile buttons, press animations
- `src/components/poker/PlayPokerLobby.tsx` -- full visual redesign with card-suit background, animated hero, avatar-based player selector
- `src/components/poker/PotDisplay.tsx` -- animated counter, chip stack visual, gold glow
- `src/pages/PlayPoker.tsx` -- swap PokerTable for PokerTablePro
- `src/index.css` -- add new keyframes: card-flip, card-deal, chip-fly, sparkle, counter-pulse, phase-flash

**No database or backend changes needed.** This is entirely a frontend visual/animation upgrade using CSS animations and React state transitions. The existing `usePokerGame` hook and game logic remain unchanged.

**Animation approach:** All animations use CSS keyframes and Tailwind utility classes (no external animation libraries). Transitions use `transition-all` with appropriate durations. Card flip uses CSS `transform: rotateY()` with `backface-visibility: hidden`. Staggered animations use inline `animation-delay` styles.

