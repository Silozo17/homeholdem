

## Premium Poker Game Visual Overhaul

The current game looks basic because it uses plain colored circles, simple CSS gradients, and lacks the visual richness of real poker games. This plan transforms every visual element with AI-generated graphics, rich textures, 3D-style card designs, and polished animations.

---

### What Changes

**1. AI-Generated Game Assets**

Create a backend function that uses Lovable AI's image generation (google/gemini-2.5-flash-image) to produce premium game assets, stored in file storage:

- Poker table felt texture (top-down oval green felt with rail and cup holders)
- Card back design (premium pattern with gold accents)
- Chip stack icons for pot display
- Background texture for the game screen

These get generated once per project and cached in storage so they load instantly during gameplay.

**2. Redesigned Poker Table (PokerTablePro.tsx)**

Replace the current plain radial gradient with a layered visual:
- Full-bleed background with dark leather/wood texture
- Centered oval table element with an actual felt texture image, raised rail border with 3D shadow
- Inner betting line (gold dashed ellipse) where community cards sit
- The pot display centered with a chip stack graphic
- Subtle vignette overlay on edges for depth

**3. Premium Card Design (CardDisplay.tsx)**

Complete card visual overhaul:
- White cards with rounded corners, subtle inner shadow, and a linen texture gradient
- Rank and suit rendered larger with proper card layout (top-left corner + center suit)
- Red suits use a rich crimson, black suits use deep charcoal
- Card back gets a premium crosshatch/diamond pattern with gold foil border
- 3D perspective tilt on hover/deal (subtle rotateX + rotateY)
- Winner cards get a golden glow border with particle sparkle overlay
- Folded cards: desaturate + scale down + rotate away

**4. Rich Player Avatars (PlayerAvatar.tsx)**

Replace plain colored circles with premium styled avatars:
- Gradient ring border (gold for active, grey for folded, red pulse for all-in)
- Inner shadow and 3D raised effect
- Player name on a dark pill below the avatar
- Chip count displayed as a styled badge with chip icon
- Action badges (Fold/Call/Raise/All-in) as floating animated pills with color coding and icons
- Current player gets an animated spotlight ring (concentric expanding circles)

**5. Immersive Betting Controls (BettingControls.tsx)**

Transform from plain buttons to premium game controls:
- Fold: Dark red gradient button with a card-toss icon, press animation (cards fly away)
- Check/Call: Teal gradient with chip icon, press ripple effect
- Raise: Gold gradient with upward arrow, expandable slider with gold track
- Quick bet chips: Styled as actual poker chip shapes (using the existing .poker-chip CSS) with denominations
- Entire control bar has a dark frosted glass background with rounded corners

**6. Enhanced Pot Display (PotDisplay.tsx)**

- Replace the simple chip stack with layered chip graphics (3-4 stacked colored circles with edge highlights)
- Number counter with a gold glow and shadow
- Chips animate (scale bounce) when pot increases
- Show side pots as separate smaller displays

**7. Cinematic Animations (index.css + components)**

New premium animations:
- Card dealing: Cards slide from a deck position (top-right corner) with rotation, arriving at their position with a satisfying "snap"
- Community card reveal: Card placed face-down first, then flips with a 3D rotate effect and a brief light flash
- Bet action: Chip token slides from player toward pot center
- Win announcement: Gold particle burst radiating from the winning cards, cards lift and glow
- Phase transition: Subtle pulse wave across the table when flop/turn/river is dealt
- Turn indicator: Spotlight beam effect on the active player's seat

**8. Game Header Redesign**

- Replace plain text header with a dark glass bar
- Hand number in a gold badge
- Blinds displayed as styled chip pairs
- Back button as a translucent circle with arrow

---

### Technical Details

**New files:**
- `supabase/functions/generate-poker-assets/index.ts` -- backend function using Lovable AI image generation to create table felt, card back, and chip graphics (generated once, cached in storage)
- `src/components/poker/PokerChip.tsx` -- reusable styled poker chip component (CSS-only, uses the existing .poker-chip class with enhancements)
- `src/components/poker/TableFelt.tsx` -- the oval table visual with layered textures, rail, and betting line
- `src/hooks/usePokerAssets.ts` -- hook to load/cache AI-generated game assets from storage

**Files to modify:**
- `src/components/poker/PokerTablePro.tsx` -- use TableFelt component, restructure layout with premium header, spotlight effects
- `src/components/poker/CardDisplay.tsx` -- complete visual redesign with proper card layout, 3D effects, premium patterns
- `src/components/poker/PlayerAvatar.tsx` -- gradient rings, 3D raised effect, spotlight for active player
- `src/components/poker/BettingControls.tsx` -- gradient buttons with icons, poker chip quick-bets, frosted glass bar
- `src/components/poker/PotDisplay.tsx` -- chip stack graphic, enhanced counter animation
- `src/components/poker/DealerButton.tsx` -- premium 3D dealer chip with embossed "D"
- `src/components/poker/WinnerOverlay.tsx` -- more dramatic with gold particle burst, card fan display
- `src/index.css` -- new keyframes for spotlight, card snap, chip slide, light flash, wave pulse

**No database schema changes needed.** One new storage bucket for cached game assets (created via migration).
