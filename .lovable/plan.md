

## Premium Platform Overhaul: From 3/10 to 10/10

A comprehensive visual, navigational, and structural redesign that transforms every screen into an immersive, casino-quality experience with dedicated game mode pages, a dynamic bottom nav, and a stunning home hub.

---

### 1. Immersive Home Screen (Dashboard.tsx -- full redesign)

The current Dashboard is a simple card + club list. It will become a rich, animated home hub:

- **Hero section**: Animated background with floating card suits (CSS keyframes), a greeting ("Good evening, [name]"), and a glowing "Play Now" CTA
- **Game Modes section**: Two visually distinct cards side-by-side:
  - **VS Bots** -- navigates to `/play-poker`, shows a robot icon with gold accent, "Practice Mode" subtitle
  - **Multiplayer** -- navigates to `/online-poker`, shows users icon with green accent, "Real Players" subtitle
  - Each card has a subtle parallax-style hover effect and gradient border
- **Upcoming Event** banner: If user has an upcoming event, show a compact event card with countdown timer (days/hours)
- **Your Clubs** section: Enhanced club cards with member avatars, last activity date, and a subtle gradient background per club
- **Quick Stats** strip: Horizontal scrollable row showing wins/games/net profit as animated mini cards

### 2. Poker Game Hub Page (new: PokerHub.tsx at /poker)

A dedicated gateway page for all poker modes, replacing the direct `/play-poker` and `/online-poker` entry points:

- Full-screen dark felt background with animated card fan hero
- **Three game mode cards** stacked vertically:
  1. **Quick Play vs Bots** -- immediate game with default settings, one-tap start
  2. **Custom Game vs Bots** -- opens the existing lobby with settings (opponent count, chips, blinds)
  3. **Multiplayer** -- opens the online poker lobby (create/join tables)
- Each card has an icon, description, player count indicator, and a shimmer CTA button
- Back navigation to Dashboard

### 3. Dynamic Bottom Navigation (BottomNav.tsx + AppLayout.tsx)

The bottom nav will become context-aware:

- **Default mode** (Dashboard, Events, Stats, Profile): Standard 5-icon nav as today
- **Poker mode** (when on `/poker`, `/play-poker`, `/online-poker`): Nav morphs to show poker-specific icons:
  - Home (back to dashboard)
  - Game Hub (/poker)
  - Center chip button (Quick Play -- starts a bot game immediately)
  - Leaderboard (future, links to stats for now)
  - Rules (/rules)
- The transition between modes uses a crossfade animation
- AppLayout detects route prefix to determine which nav mode to show
- Hide bottom nav entirely during active gameplay (PokerTablePro, OnlinePokerTable)

### 4. Enhanced Online Poker Lobby (OnlinePokerLobby.tsx -- redesign)

Transform from a plain list into a premium lobby:

- Poker felt background with card-suit pattern
- Header with animated logo and "Online Tables" title in gold gradient
- **Create Table** card: Large, visually prominent with poker chip icon and shimmer border
- **Table list**: Each table card shows:
  - Table name with status badge (Open/In Game) using color-coded pills
  - Player count as visual seat dots (filled = occupied, empty = available)
  - Blinds and buy-in range
  - Subtle hover animation (lift + shadow)
- **Empty state**: Animated card fan with "No tables yet -- be the first to deal" messaging
- Back button returns to Poker Hub

### 5. Enhanced Online Poker Table (OnlinePokerTable.tsx -- visual upgrade)

Apply the same premium treatment as the bot game:

- Use the same `poker-felt-bg` radial gradient table
- Use `PlayerAvatar` components (color-coded circles with status dots) instead of plain text seats
- Proper arc/circle seat layout matching PokerTablePro
- Community cards with `animate-card-deal` animations
- `DealerButton` indicator on the dealer seat
- Enhanced empty seat design with a pulsing "Sit" indicator
- Winner announcement overlay reusing `WinnerOverlay` component

### 6. Improved PokerTablePro Animations & Polish

- **Card dealing**: Add a staggered cascade effect -- cards slide from a "deck" position (top-right) with rotation
- **Community card reveal**: Each flop/turn/river card flips from face-down with `animate-card-flip`
- **Bet visualization**: When a player bets, show a brief chip-fly animation from their seat toward the pot
- **Turn indicator**: The current player's avatar gets a more prominent golden ring pulse + a subtle "YOUR TURN" text badge for the human
- **Fold animation**: Folded cards grey out and slide away (translateY + opacity)
- **All-in animation**: Screen edge briefly flashes red/gold when any player goes all-in
- **Hand result**: Winning cards get a golden glow border, losing cards desaturate

### 7. Enhanced PlayPokerLobby (PlayPokerLobby.tsx -- polish)

- Add a "Quick Play" button at the top that starts with defaults (3 bots, 10k chips, 50/100 blinds)
- Difficulty presets: "Casual" (2 bots), "Standard" (4 bots), "Full Ring" (8 bots) as tappable chips
- Animated chip stack visual that grows/shrinks with the starting chips slider
- Bot avatars preview showing the actual opponents you'll face

### 8. CSS Animations & Global Polish (index.css)

New keyframes:
- `float-suit`: Card suits floating upward in background (for home screen hero)
- `pulse-border`: Animated gradient border for premium cards
- `slide-up-fade`: Content sections animate in on page load
- `glow-pulse`: Alternating glow for important CTAs

New utility classes:
- `.glass-card`: Frosted glass card style (bg-card/60 backdrop-blur-lg border-primary/20)
- `.gradient-border`: Animated gradient border effect
- `.text-shimmer`: Gold shimmer text animation for headers

### 9. Page Transition Animations

- All main pages (Dashboard, Events, Stats, Profile, PokerHub) get a `animate-fade-in` wrapper on mount
- Route transitions feel smooth rather than jarring

### 10. Updated Routing (App.tsx)

- Add `/poker` route for the new PokerHub page
- Keep `/play-poker` and `/online-poker` as direct routes
- Update AppLayout hidden nav routes to include poker gameplay routes

---

### Technical Details

**New files to create:**
- `src/pages/PokerHub.tsx` -- the poker game hub/menu page with game mode selection
- `src/components/poker/GameModeCard.tsx` -- reusable game mode selection card with icon, title, description, and animated CTA
- `src/components/home/HeroSection.tsx` -- animated home screen hero with floating card suits and greeting
- `src/components/home/GameModesGrid.tsx` -- side-by-side game mode cards for the dashboard
- `src/components/home/UpcomingEventBanner.tsx` -- compact upcoming event card with countdown
- `src/components/home/QuickStatsStrip.tsx` -- horizontal scrollable stats row

**Files to modify:**
- `src/pages/Dashboard.tsx` -- complete redesign using new home components
- `src/components/layout/BottomNav.tsx` -- add context-aware nav mode switching based on route
- `src/components/layout/AppLayout.tsx` -- update hidden routes for poker gameplay, pass route context
- `src/components/poker/OnlinePokerLobby.tsx` -- full visual redesign with felt background, enhanced table cards
- `src/components/poker/OnlinePokerTable.tsx` -- apply PokerTablePro visual treatment (felt bg, PlayerAvatar, animations)
- `src/components/poker/PlayPokerLobby.tsx` -- add quick play button and difficulty presets
- `src/components/poker/PokerTablePro.tsx` -- enhanced animations (fold, all-in flash, turn badge)
- `src/components/poker/CardDisplay.tsx` -- add fold slide-away animation variant
- `src/components/poker/WinnerOverlay.tsx` -- more dramatic sparkle burst, larger trophy animation
- `src/App.tsx` -- add `/poker` route
- `src/index.css` -- add new keyframes and utility classes (float-suit, glass-card, gradient-border, text-shimmer, slide-up-fade)
- `src/i18n/locales/en.json` -- add translation keys for new sections (poker hub, game modes, home hero)
- `src/i18n/locales/pl.json` -- matching Polish translations

**No database or backend changes needed.** This is entirely a frontend visual/navigation/UX overhaul.

