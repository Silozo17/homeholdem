
# AAA Premium Casino Poker Experience -- Complete Plan

---

## A) PRODUCT VISION AND UX BLUEPRINT

### A1. User Journeys

**Quick Play vs Bots**
1. User taps "Play Poker" from Poker Hub
2. Lobby screen: choose bot count, chips, blinds -- or "Quick Play" instant start
3. Game loads with AI dealer, perimeter seating, cinematic dealing
4. Hands auto-advance (2.5s showdown pause, already implemented)
5. Game ends when human is eliminated or all bots busted
6. Results saved to `poker_play_results` table (already implemented)

**Friends Private Table (Invite Code/Link)**
1. User taps "Online Tables" from Poker Hub
2. Creates a table (name, seats, blinds, buy-in range) -- table_type = "friends"
3. Gets an invite code (6-char, already generated server-side)
4. Shares code/link via clipboard or WhatsApp share
5. Friends join via code, pick seat, choose buy-in within range
6. Creator (or any seated player) taps "Deal Hand" when 2+ players seated
7. Hands are server-authoritative, hole cards fetched via RLS-protected endpoint
8. Players can leave between hands; seat freed for others

**Club Table**
1. From club detail page, admin creates a poker table linked to club_id
2. Only club members can see/join (enforced by `is_club_member` RPC)
3. Same flow as Friends table but access scoped to club

**Public Table + Spectate Rules**
1. Public tables visible to all authenticated users in the lobby
2. Anyone can join an open seat
3. Spectators: users not seated can watch (community cards, actions, stacks visible; hole cards hidden until showdown)
4. Spectator chat separate from player chat (future)

**Tournament Flow**
1. Admin creates tournament (name, blind schedule, starting stack, max players, payout structure)
2. Players register (status = "registered" in `poker_tournament_players`)
3. Admin starts tournament: players assigned to tables (up to `players_per_table` each)
4. Blind levels advance on a timer (`blind_schedule` JSONB, `current_level`, `level_started_at`)
5. When a player busts, `finish_position` recorded, remaining players counted
6. Table balancing: when tables become uneven (difference > 1), shortest-stacked player at larger table moved
7. Final table merge: when total remaining fits one table, all moved to Table 1
8. Payout calculated from `payout_structure` applied to total buy-ins (play chips)
9. Tournament complete when one player remains

**Join/Leave/Sit-out/Reconnect/AFK**
- Join mid-hand: player waits in seat, dealt in next hand
- Leave: if in active hand, auto-fold remaining streets; seat freed after hand completes
- Sit-out: future feature -- player skips blinds, marked inactive after N orbits
- Reconnect: client calls `poker-table-state` for full snapshot including own hole cards via `poker-my-cards`
- AFK: 30s action timer client-side, `poker-timeout-ping` triggers auto-fold; 1-minute pg_cron backup; 3 consecutive timeouts = auto-stand-up

### A2. Poker Gameplay Dynamics (Texas Hold'em Rules)

**Dealer Button and Blinds**
- Dealer button rotates clockwise each hand
- Small blind: seat left of dealer; Big blind: seat left of SB
- Heads-up exception: dealer posts SB, other player posts BB
- Preflop action starts left of BB; postflop starts left of dealer

**Min-Raise Rules**
- Minimum raise = last raise increment (or BB if no raise yet)
- If a player goes all-in for less than a full raise, betting is NOT reopened for players who already acted
- All-in for more than a full raise reopens betting

**Side Pots**
- Already implemented server-side via `commit_poker_state` with `pots` JSONB array containing `{ amount, eligible_player_ids }`
- Each all-in creates a new side pot capped at the all-in player's contribution

**Showdown Rules**
- Last aggressor shows first; clockwise from there
- Players with losing hands may muck (auto-muck in our implementation)
- All remaining active/all-in players' cards revealed at showdown
- Split pots: divide equally, odd chip goes to player closest to dealer's left

**Hand History**
- All actions stored in `poker_actions` table (hand_id, player_id, action_type, amount, phase, sequence)
- Community cards stored in `poker_hands.community_cards`
- Results stored in `poker_hands.results`
- Client can display hand history panel by querying actions for a given hand_id

### A3. Emotional Pacing

| Moment | Visual | Audio | Duration |
|--------|--------|-------|----------|
| Hand start | Table lighting pulse, dealer card-slide animation | Card shuffle sound | 1.5s |
| Cards dealt | Arc trajectory from dealer to each seat, staggered 0.1s | Card snap per card | 0.8s total |
| Your turn | Golden spotlight on seat, other seats dim to 60% opacity | Soft chime | Until action |
| Check | Knock animation on table | Knock/tap sound | 0.3s |
| Call | Chip slides from seat toward pot | Chip clink | 0.5s |
| Raise > 2x pot | Dramatic chip stack animation | Rising tension tone | 0.6s |
| All-in | Screen flash, slow-motion chip push, text "ALL IN" in gold | Heartbeat rumble | 1.0s |
| Flop dealt | 3 cards slide from deck with stagger, flip with glow | Three card flips | 1.0s |
| Turn/River | Single card slides, flips with brief light flash | Card flip | 0.5s |
| Showdown | Cards flip one-by-one (0.2s stagger), hand name in gold serif typography | Reveal sound, then win stinger | 2.5s |
| Winner | Gold particle shimmer around winner seat, pot chips fly to winner | Short fanfare chord | 2.0s |
| All-in runout | Community cards dealt in sequence with dramatic pauses | Tension loop, then resolve | 3-5s |

---

## B) ART DIRECTION AND ASSET LIST

### B1. Complete Asset List

| Asset | Type | Resolution | Notes |
|-------|------|------------|-------|
| Dealer character (primary) | PNG portrait | 512x768 | Upper body, professional female dealer, black dress, gold accents |
| Dealer character (alt male 1) | PNG portrait | 512x768 | Distinguished male dealer in tuxedo |
| Dealer character (alt male 2) | PNG portrait | 512x768 | Young male dealer, modern casino vest |
| Dealer character (alt female 2) | PNG portrait | 512x768 | Asian female dealer, elegant red qipao with gold |
| Dealer character (futuristic) | PNG portrait | 512x768 | Cyberpunk-themed dealer, neon accents |
| Table felt texture | JPG | 1024x1024 | Emerald green baize, subtle fabric grain |
| Wood rail texture | JPG | 512x256 | Dark mahogany with grain and polish reflection |
| Leather background | JPG | 1024x1024 | Dark brown leather with subtle stitching |
| Card back design | PNG | 256x384 | Gold filigree on deep green, premium casino pattern |
| Chip (white/1) | PNG (transparent) | 128x128 | Ceramic casino chip, top-down view |
| Chip (red/5) | PNG (transparent) | 128x128 | Same style, red |
| Chip (green/25) | PNG (transparent) | 128x128 | Same style, green |
| Chip (blue/100) | PNG (transparent) | 128x128 | Same style, blue |
| Chip (black/500) | PNG (transparent) | 128x128 | Same style, black |
| Gold particle sprite | PNG (transparent) | 64x64 | Soft gold dot for shimmer effects |
| Vignette overlay | PNG (transparent) | 1024x1024 | Radial dark-to-transparent |
| Avatar frames (default, VIP, shark, grinder) | SVG | Scalable | Ring borders for player avatars |

### B2. AI Generation Prompts

**Primary Dealer**
```
Prompt: "Professional female casino dealer, upper body portrait, facing camera with slight smile, wearing elegant black cocktail dress with subtle gold embroidery accents on collar and cuffs, casino green felt background out of focus behind her, soft warm spotlight from above creating rim lighting on shoulders, photorealistic 3D render, high detail skin, natural makeup, dark hair pulled back neatly, transparent/clean background for compositing, studio quality, 4K"
Model: google/gemini-2.5-flash-image
Resolution: 512x768
```

**Male Dealer Alt**
```
Prompt: "Distinguished male casino dealer, upper body portrait, wearing classic black tuxedo with gold bow tie and gold cufflinks, warm confident expression, casino setting background blurred, studio lighting from top-right, photorealistic 3D render, clean background for compositing"
```

**Card Back**
```
Prompt: "Luxury playing card back design, symmetric pattern, deep emerald green background with intricate gold filigree scrollwork, central diamond motif, thin gold border, flat design suitable for game asset, no text, transparent edges, high resolution"
```

**Chip (Red)**
```
Prompt: "Top-down view of a single red casino poker chip, ceramic material with white edge spots pattern, number 5 in center, photorealistic, white background for transparency cutout, studio lighting, high detail texture"
```

**Table Felt**
```
Prompt: "Top-down photograph of green casino poker table felt fabric, emerald green baize material, subtle woven fabric texture visible, even lighting, no shadows, seamless tileable texture, 1024x1024"
```

### B3. Asset Storage and Loading Strategy

- **Storage**: All assets stored in `src/assets/poker/` as static imports (bundled by Vite for instant loading)
- **AI-generated assets**: Generated once via edge function (`generate-poker-assets`), downloaded as base64, converted to files in the repo
- **Preloading**: Key assets (felt, leather, card back, dealer portrait) preloaded via `<link rel="preload">` in index.html
- **Fallbacks**: CSS gradient backgrounds as fallback if images fail to load; dealer character optional (shows diamond icon if missing)
- **Performance**: All images optimized to WebP where possible; dealer portrait is the only large asset (~50-80KB)

---

## C) AAA UI DESIGN SYSTEM

### C1. Typography

| Use | Font | Weight | Size | Color |
|-----|------|--------|------|-------|
| Hand name (showdown) | System serif (Georgia fallback) | 900 | 24px | Gold shimmer gradient |
| Player name | System sans | 700 | 10px | `foreground/90` |
| Chip count | System sans (tabular nums) | 800 | 10px | `primary/80` with gold text-shadow |
| Pot amount | System sans (tabular nums) | 900 | 14px | `primary` with gold glow |
| Blind levels | System sans | 600 | 10px | `foreground/60` |
| Action badge | System sans | 700 | 8px | White on colored pill |
| Header text | System sans | 700 | 10px | `foreground/80` |

### C2. Color Palette

| Name | HSL | Use |
|------|-----|-----|
| Felt Green | 160 45% 18% | Table center |
| Deep Green | 160 30% 8% | Background |
| Casino Gold | 43 74% 49% | Primary, accents, highlights |
| Gold Dim | 43 50% 35% | Inactive gold elements |
| Mahogany | 20 40% 18% | Wood rail |
| Poker Red | 0 70% 50% | Fold, hearts/diamonds, all-in |
| Steel Blue | 200 55% 40% | Call button, clubs |
| Teal | 160 45% 30% | Check button |
| Charcoal | 0 0% 10% | Spades, card text |
| Cream White | 40 20% 96% | Card face |

### C3. Spacing

- Base unit: 4px
- Component gaps: 4px (tight), 8px (normal), 12px (loose)
- Screen padding: 12px horizontal
- Seat component: 56-64px wide
- Card sizes: sm=28x40, md=40x56, lg=48x68

### C4. Button Styles

| Button | Background | Text | Border | Press Effect |
|--------|------------|------|--------|-------------|
| Fold | `linear-gradient(180deg, hsl(0 50% 35%), hsl(0 60% 25%))` | White | `hsl(0 40% 40%)` | scale(0.92) + shadow reduce |
| Check | `linear-gradient(180deg, hsl(160 45% 30%), hsl(160 50% 22%))` | White | `hsl(160 40% 35%)` | scale(0.92) |
| Call | `linear-gradient(180deg, hsl(200 55% 40%), hsl(200 60% 30%))` | White | `hsl(200 50% 45%)` | scale(0.92) |
| Raise | `linear-gradient(180deg, hsl(43 80% 50%), hsl(43 74% 38%))` | Dark | `hsl(43 70% 55%)` | scale(0.92) |
| All-in | `linear-gradient(180deg, hsl(0 70% 45%), hsl(0 70% 35%))` | White | `hsl(0 60% 50%)` | scale(0.92) + flash |

### C5. Glass Overlays and Modals

- Background: `hsl(160 25% 12% / 0.8)` with `backdrop-filter: blur(16px)`
- Border: `1px solid hsl(43 74% 49% / 0.2)`
- Shadow: `0 8px 32px hsl(0 0% 0% / 0.4)`
- Corner radius: 16px for modals, 12px for panels

### C6. Motion Rules

| Category | Duration | Easing |
|----------|----------|--------|
| Button press | 150ms | ease-out |
| Card deal | 400ms | ease-out |
| Card flip | 300ms | ease-in-out |
| Chip slide | 500ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Fade in/out | 300ms | ease-out |
| Spotlight pulse | 1500ms infinite | ease-in-out |
| Phase transition | 600ms | ease-out |
| Winner banner | 400ms in, 400ms out (2s hold) | ease-out / ease-in |

---

## D) ANIMATION SPEC

| Name | Trigger | Duration | Easing | Layers | Performance Notes |
|------|---------|----------|--------|--------|-------------------|
| dealer-breathe | Idle loop | 4s infinite | ease-in-out | Dealer portrait scale 1.0-1.02 | CSS transform only, GPU |
| dealer-nod | Hand dealt | 0.6s | ease-out | Dealer translateY -4px and back | CSS transform |
| dealer-smile | Winner announced | 1s | ease-in-out | Dealer opacity crossfade to smile variant | Swap image src |
| card-deal-arc | Card dealt to player | 0.5s (stagger 0.1s) | ease-out | Card element: translate from dealer pos + rotate | CSS transform, will-change |
| card-flip-3d | Community card reveal | 0.4s | ease-in-out | rotateY(0 to 180deg), show face at 50% | CSS 3D transform, backface-visibility |
| card-fold-muck | Player folds | 0.5s | ease-in | translateY+20, rotateZ-15, opacity 0 | Already implemented |
| chip-slide-to-pot | Player bets | 0.5s | cubic-bezier | Small chip div translates from seat to pot center | Absolute positioned, removed after anim |
| chip-award-to-winner | Pot awarded | 0.6s | ease-out | Chips translate from pot center to winner seat | CSS transform |
| pot-bounce | Pot increases | 0.3s | ease-out | Scale 1 to 1.15 to 1 | Already implemented |
| spotlight-active | Player's turn | 1.5s infinite | ease-in-out | Box-shadow pulse around avatar | Already implemented |
| seat-dim | Not your turn | 300ms | ease-out | Opacity to 0.5 on non-active seats | CSS opacity |
| timer-ring | Turn countdown | 30s linear | linear | SVG stroke-dashoffset from full to 0 | SVG animation |
| allin-flash | All-in action | 0.6s | ease-out | Full-screen gradient flash | Already implemented |
| hand-name-reveal | Showdown | 0.6s | ease-out | Scale 0.5 to 1 + opacity, gold serif text | CSS transform |
| winner-shimmer | Winner determined | 2s | linear | Multiple small gold divs floating upward | CSS animation, max 8 particles |
| winner-banner | Hand complete | 0.4s in, 0.4s out | ease | Position overlay on felt center | Already implemented |
| lobby-transition | Enter/exit game | 0.3s | ease-out | Fade + scale | CSS |

**Portrait vs Landscape**: All animations use percentage-based or relative positioning. Seat coordinates already use percentage-based layout. In landscape, seats spread wider but animations are identical. The `SEAT_POSITIONS` map can include landscape-specific coordinates keyed by aspect ratio.

---

## E) SOUND DESIGN SPEC

| Event | Sound Type | Volume | Duration | Implementation |
|-------|-----------|--------|----------|----------------|
| Card shuffle | Noise burst | 0.3 | 0.4s | White noise with bandpass filter |
| Card deal (each) | Percussive click | 0.4 | 0.15s | Short sine burst at 1200Hz |
| Card flip | Paper swish | 0.35 | 0.2s | Filtered noise sweep |
| Chip clink (call) | Ceramic tap | 0.4 | 0.2s | Two sine tones at 3000/4500Hz |
| Chip stack (raise) | Multiple clinks | 0.4 | 0.4s | 3 staggered clinks |
| Check/knock | Wood tap | 0.3 | 0.15s | Low sine burst at 200Hz |
| Raise announcement | Ascending tone | 0.35 | 0.3s | Rising sine 400-800Hz |
| All-in tension | Low rumble | 0.25 | 1.5s | Low oscillator 60-80Hz with fade |
| Win stinger | Major chord | 0.4 | 0.6s | C-E-G chord (523/659/784Hz) |
| Your turn chime | Bell | 0.35 | 0.3s | Sine at 880Hz with decay |
| Ambient loop | Background hum | 0.05 | Loop | Very subtle low-frequency wash |
| Timer warning (5s) | Ticking | 0.3 | 0.1s each | Clicks at 1s intervals |

**Implementation**: Extend existing `useTournamentSounds.ts` pattern into a new `usePokerSounds.ts` hook using Web Audio API (already proven in codebase). All sounds synthesized -- no audio file downloads needed. Global toggle stored in localStorage.

**Mixing rules**: All volumes relative to master volume (0-1 slider). Ambient never exceeds 0.05. Action sounds cap at 0.4. Overlap allowed for chip clinks.

---

## F) GAME MODES AND BACKEND PLAN

### F1. Bots Mode (Client Engine)

- **Already implemented**: `usePokerGame.ts` with full reducer-based FSM
- **Engine**: Client-side, `useReducer` with `decideBotAction` AI
- **Cards**: `crypto.getRandomValues()` + Fisher-Yates shuffle
- **Side pots**: Currently simplified (winner-takes-all with equal split). Needs upgrade to proper multi-way side pots in client engine to match server.
- **No server calls needed** -- purely local state

### F2. Multiplayer Online (Server-Authoritative)

**Already implemented edge functions:**
- `poker-create-table` -- create table, auto-seat creator
- `poker-join-table` -- seat validation, buy-in range check, RLS club check
- `poker-leave-table` -- leave seat
- `poker-start-hand` -- deal cards, post blinds, broadcast state
- `poker-action` -- validate and process player action
- `poker-table-state` -- full state snapshot for reconnect
- `poker-my-cards` -- RLS-protected hole card fetch
- `poker-timeout-ping` -- client triggers when opponent's timer expires
- `poker-check-timeouts` -- pg_cron backup safety net

**Security model:**
- Hole cards stored in `poker_hole_cards` table with RLS: `player_id = auth.uid()`
- Deck seed stored in `deck_seed_internal` column (not in public view `poker_hands_public`)
- `commit_poker_state` RPC enforces `state_version` optimistic concurrency
- All game logic runs in edge functions (SECURITY DEFINER functions for DB access)

**Realtime:**
- Broadcast channel `poker:table:{id}` for public state updates
- Events: `game_state` (hand update), `seat_change` (join/leave), `hand_complete`

### F3. Tournaments

**DB tables already exist:**
- `poker_tournaments` (id, name, type, status, max_players, starting_stack, blind_schedule, current_level, etc.)
- `poker_tournament_players` (tournament_id, player_id, table_id, seat_number, stack, status, finish_position, payout_amount)
- `poker_tables.tournament_id` FK linking tables to tournaments

**New edge functions needed:**
- `poker-create-tournament` -- create tournament with blind schedule, register creator
- `poker-register-tournament` -- player registers
- `poker-start-tournament` -- assign players to tables, create poker_tables, seat players
- `poker-tournament-state` -- full tournament overview (tables, players, blinds, level timer)
- `poker-tournament-eliminate` -- record elimination, check for table balancing/merge
- `poker-tournament-advance-level` -- called by timer or admin to move to next blind level
- `poker-tournament-balance-tables` -- move player from larger to smaller table

**Blind schedule format** (stored in `blind_schedule` JSONB):
```json
[
  { "level": 1, "small": 25, "big": 50, "ante": 0, "duration_minutes": 15 },
  { "level": 2, "small": 50, "big": 100, "ante": 0, "duration_minutes": 15 },
  { "level": 0, "break": true, "duration_minutes": 5 },
  { "level": 3, "small": 75, "big": 150, "ante": 25, "duration_minutes": 15 }
]
```

**Spectate RLS:**
- `poker_tables`: SELECT allowed for authenticated users (public tables) or club members (club tables) or invited users (friends tables)
- `poker_hands_public` view: excludes `deck_seed_internal` -- safe for spectators
- `poker_hole_cards`: SELECT only where `player_id = auth.uid()` -- never visible to spectators until showdown results are in `poker_hands.results`

---

## G) ENGINEERING STRUCTURE

### G1. Module Map

```text
src/
  lib/poker/
    types.ts          -- shared types (Card, Rank, Suit, GameState, etc.)
    deck.ts           -- createDeck, shuffle, deal
    hand-evaluator.ts -- 7-card best-5 evaluator
    bot-ai.ts         -- bot decision engine
    online-types.ts   -- multiplayer API types
    side-pots.ts      -- NEW: proper multi-way side pot calculator (shared logic)
    blind-schedule.ts -- NEW: tournament blind level utilities

  hooks/
    usePokerGame.ts        -- client-side bot game FSM
    useOnlinePokerTable.ts -- multiplayer hook (realtime + HTTP)
    usePokerSounds.ts      -- NEW: Web Audio sound effects
    usePokerAssets.ts      -- NEW: asset preloading hook
    useTournamentTimer.ts  -- NEW: blind level countdown for tournaments

  components/poker/
    PokerTablePro.tsx   -- main game table (bots mode)
    OnlinePokerTable.tsx -- multiplayer table (shares visual components)
    PlayerSeat.tsx       -- seat component (avatar + cards + info)
    CardDisplay.tsx      -- card rendering with animations
    BettingControls.tsx  -- action buttons + raise slider
    DealerCharacter.tsx  -- NEW: AI dealer portrait with animations
    TableFelt.tsx        -- table background with felt + rail
    PlayerAvatar.tsx     -- avatar circle with status rings
    DealerButton.tsx     -- "D" chip indicator
    PotDisplay.tsx       -- pot amount with chip graphic
    WinnerOverlay.tsx    -- showdown/game-over overlays
    TurnTimer.tsx        -- NEW: SVG countdown ring
    ChipAnimation.tsx    -- NEW: animated chip sliding to pot
    HandHistory.tsx      -- NEW: slide-up panel of hand actions
    PlayPokerLobby.tsx   -- bot game lobby
    OnlinePokerLobby.tsx -- multiplayer lobby
    TournamentLobby.tsx  -- NEW: tournament registration + status

supabase/functions/
    poker-create-table/       -- existing
    poker-join-table/         -- existing
    poker-leave-table/        -- existing
    poker-start-hand/         -- existing
    poker-action/             -- existing
    poker-table-state/        -- existing
    poker-my-cards/           -- existing
    poker-timeout-ping/       -- existing
    poker-check-timeouts/     -- existing
    poker-create-tournament/  -- NEW
    poker-register-tournament/-- NEW
    poker-start-tournament/   -- NEW
    poker-tournament-state/   -- NEW
    poker-tournament-eliminate/-- NEW
    generate-poker-assets/    -- NEW (one-time AI image generation)
```

### G2. Shared Logic Between Bots and Server

- `deck.ts` (createDeck, shuffle, deal) is pure TypeScript -- usable in both Vite client and Deno edge functions
- `hand-evaluator.ts` -- same; used client-side for bot showdown and server-side for multiplayer showdown
- `side-pots.ts` (new) -- pure function calculating side pots from player bets; imported by both `usePokerGame.ts` and edge functions
- **Deno compatibility**: These modules use no browser APIs or npm packages -- they are plain TypeScript with ES module imports, compatible with both environments

### G3. State Management

- **Bots**: `useReducer` in `usePokerGame.ts` -- single source of truth, synchronous
- **Multiplayer**: Server state via `poker-table-state` HTTP endpoint; real-time updates via Supabase Broadcast channel; `useOnlinePokerTable.ts` merges broadcasts into local state
- **Optimistic updates**: Not used for poker actions (must be server-validated); UI shows "action pending" state briefly

### G4. Testing Plan

**Unit tests (Vitest, already configured):**
- `deck.test.ts` -- existing, covers shuffle and deal
- `hand-evaluator.test.ts` -- existing, covers all hand ranks
- `side-pots.test.ts` -- NEW: test 2-way, 3-way, 4-way all-in scenarios; odd chip distribution
- `min-raise.test.ts` -- NEW: test minimum raise calculations, all-in reopening rules
- `showdown-distribution.test.ts` -- NEW: test split pots, multiple winners, odd chip to dealer-left

**Integration tests (Deno test runner for edge functions):**
- `poker-action`: test concurrent actions with version conflicts
- `poker-start-hand`: test blind posting with insufficient chips (all-in blind)
- `poker-my-cards`: test RLS isolation (user A cannot see user B's cards)

**Security tests:**
- Verify `poker_hole_cards` RLS: query as different user, expect empty result
- Verify `deck_seed_internal` not in `poker_hands_public` view
- Verify `commit_poker_state` rejects stale version

---

## H) PHASES

### Phase 0: Foundations (Design System + Asset Pipeline + Rules Correctness)

**Goals**: Establish the visual foundation and fix poker rules correctness in the client engine.

**Deliverables:**
1. Generate all AI assets (dealer portraits x5, card back, chip textures, felt) via `generate-poker-assets` edge function and commit to `src/assets/poker/`
2. Create `usePokerSounds.ts` hook with all synthesized sounds and global toggle
3. Create `side-pots.ts` shared module with proper multi-way side pot calculation
4. Fix `usePokerGame.ts` to use proper side pots (replace current winner-takes-all)
5. Write unit tests for side pots, min-raise, showdown distribution
6. Create `DealerCharacter.tsx` component with breathing animation
7. Create `TurnTimer.tsx` SVG countdown ring component
8. Create `ChipAnimation.tsx` for bet-to-pot chip slide

**Dependencies**: None (foundational)

**Acceptance criteria:**
- All 5 dealer images generated and stored in repo
- `side-pots.test.ts` passes for 2/3/4-way all-in scenarios
- Sound toggle works in isolation (can be tested outside game)
- Dealer character renders with breathing animation in isolation

**Risks**: AI image generation quality may vary -- mitigated by generating multiple variants and selecting best. Side pot logic complexity -- mitigated by comprehensive unit tests.

---

### Phase 1: AAA Visual Experience for Bots Mode (Portrait + Landscape)

**Goals**: Transform the bot game into a premium casino experience matching competitor quality.

**Deliverables:**
1. Redesign `PokerTablePro.tsx` with:
   - AI dealer character at top-center with spotlight
   - Premium `TableFelt` with wood rail border (actual oval shape, not full rectangle)
   - Seat dimming for non-active players
   - Turn timer ring on active player
   - Chip slide animations on bet/call/raise
   - Hand name reveal in gold serif at showdown
   - Sound integration (deal, flip, clink, check, raise, all-in, win)
2. Upgrade `CardDisplay.tsx` with:
   - 3D flip animation for community cards (rotateY transform)
   - Arc deal animation from dealer position
   - Premium card back using AI-generated texture
   - Winner cards golden glow
3. Upgrade `PlayerSeat.tsx` with:
   - Turn timer ring integration
   - Animated chip bet indicator sliding toward pot
   - Better fold animation (cards slide to muck area)
   - Compact layout that fits well around the oval
4. Upgrade `BettingControls.tsx` with:
   - Quick-bet preset chips (2x BB, 3x BB, 1/2 Pot, Pot, All-in)
   - Press animations on all buttons
   - "YOUR TURN" pulsing indicator integrated
5. Upgrade `WinnerOverlay.tsx` with:
   - Gold particle shimmer (CSS-only, 8 floating dots)
   - Hand name in large serif gold text
   - Chip count rolling animation
6. Landscape support: define `SEAT_POSITIONS_LANDSCAPE` with wider coordinates, detect orientation via `useMediaQuery`

**Dependencies**: Phase 0 (assets, sounds, side pots)

**Acceptance criteria:**
- Game looks premium and immersive on iPhone 14 Pro (390x844)
- All animations run at 60fps (no jank) -- verified via browser DevTools performance tab
- Sounds play correctly and toggle works
- Dealer character visible and breathing
- Cards deal from dealer with arc animation
- Timer ring counts down on active player's turn
- Showdown displays hand name in gold text
- Side pots calculated correctly with 3+ players all-in

**Risks**: Animation performance on low-end devices -- mitigated by using CSS transforms (GPU-accelerated) and limiting particle count to 8. Landscape layout may need tuning per device -- mitigated by percentage-based coordinates.

---

### Phase 2: Friends Tables MVP Multiplayer

**Goals**: Production-quality multiplayer with secure hole cards, reconnect, and the same AAA visuals.

**Deliverables:**
1. Rewrite `OnlinePokerTable.tsx` to use the same premium layout as `PokerTablePro.tsx`:
   - Share `TableFelt`, `PlayerSeat`, `DealerCharacter`, `CardDisplay`, `BettingControls`
   - Perimeter seating using same `SEAT_POSITIONS` system
   - Sounds and animations identical to bots mode
2. Add reconnection flow: on component mount, call `poker-table-state` to restore full state including hole cards
3. Add join flow with seat selection: show empty seats as tappable with buy-in input
4. Add invite code sharing: copy button + WhatsApp deep link
5. Add action confirmation for large bets (> 50% stack): brief "Confirm All-in?" prompt
6. Add hand history panel: slide-up drawer showing recent hands with actions
7. Verify and harden timeout system: client ping + server cron fallback
8. Add "Deal Hand" button only for table creator when 2+ seated and no active hand

**Dependencies**: Phase 1 (visual components), existing edge functions

**Acceptance criteria:**
- Two users can create, join, and play a full game on separate devices
- Hole cards never visible to other players (verified by checking Broadcast payloads)
- Reconnecting (page refresh) restores game state including hole cards
- Timeout after 30s of inactivity auto-folds the player
- 3 consecutive timeouts kicks player from seat
- Invite code sharing works on mobile (clipboard + WhatsApp)

**Risks**: Realtime message ordering -- mitigated by `state_version` in `commit_poker_state`. Network latency causing stale UI -- mitigated by full state refetch on any conflict.

---

### Phase 3: Club/Public Tables + Spectating + Moderation

**Goals**: Extend multiplayer to club-scoped and public tables with spectator support.

**Deliverables:**
1. Club tables: create poker table from club detail page, enforce `is_club_member` check in all edge functions
2. Public tables: list in lobby, any authenticated user can join
3. Spectator mode: users not seated see table in read-only (no hole cards, no betting controls, no seat-join during active hand)
4. Spectator UI: "Watching" badge, player count includes spectators separately
5. Moderation: table creator can kick players (between hands), close table
6. Chat integration: simple text chat per table using existing chat infrastructure

**Dependencies**: Phase 2 (multiplayer working)

**Acceptance criteria:**
- Club member can create and play at a club-scoped table
- Non-member gets 403 when trying to join club table
- Public table visible to all users, joinable by any authenticated user
- Spectator sees all public state but never sees hole cards
- Table creator can kick a player and close the table

**Risks**: RLS policy complexity with multiple table types -- mitigated by using existing `is_club_member` and `table_type` checks already in edge functions.

---

### Phase 4: Tournaments

**Goals**: Full tournament system with blind schedules, table balancing, final table merges, and payouts.

**Deliverables:**
1. `poker-create-tournament` edge function: create tournament with blind schedule, payout structure
2. `poker-register-tournament` edge function: player registration, capacity check
3. `poker-start-tournament` edge function: assign players to tables (round-robin), create `poker_tables` linked to tournament, seat players, start first hand at each table
4. `poker-tournament-state` edge function: return tournament overview (all tables, player standings, current blind level, time remaining in level)
5. `poker-tournament-eliminate` edge function: record finish position, check table balance, trigger merge if needed
6. `poker-tournament-advance-level` edge function: update `current_level` and `level_started_at`, broadcast new blinds to all tables
7. `TournamentLobby.tsx`: registration UI, player list, blind schedule display, countdown to start
8. Tournament overlay on game table: current level, blind amounts, time remaining, players remaining
9. Table balancing logic: when tables differ by 2+ players, move shortest stack from larger table
10. Final table merge: when total remaining <= `players_per_table`, consolidate to one table
11. `useTournamentTimer.ts` hook: countdown timer for blind levels, triggers level advance

**Dependencies**: Phase 3 (multiplayer infrastructure stable)

**Acceptance criteria:**
- 6+ players can register, be seated across 2 tables, and play to completion
- Blinds advance automatically on schedule
- Eliminated player gets correct finish position
- Table balancing triggers when tables are uneven by 2+
- Final table merge works when remaining players fit one table
- Payouts calculated and displayed at tournament end

**Risks**: Table balancing mid-hand is complex -- mitigated by only balancing between hands. Tournament state synchronization across multiple tables -- mitigated by centralized `poker_tournaments` table as single source of truth.

---

### Phase 5: Polish, Performance, and Production Hardening

**Goals**: Ship-quality production app.

**Deliverables:**
1. **Performance**: Audit all animations with Chrome DevTools, ensure 60fps on iPhone 12+; lazy-load dealer portrait; reduce re-renders with `React.memo` on `PlayerSeat` and `CardDisplay`
2. **Accessibility**: ARIA labels on all buttons, screen reader announcements for game actions, high-contrast mode support
3. **Localisation**: Extract all poker UI strings to i18n (English, Polish already set up)
4. **Anti-abuse**: Rate-limit edge function calls (max 2 actions/second per user); detect and prevent multi-accounting (one seat per table per user, already enforced)
5. **Analytics**: Track key events (game started, hand played, tournament completed) via existing notification infrastructure
6. **Error handling**: Graceful error states for network failures during gameplay; retry logic for failed actions; "Connection lost" overlay with auto-reconnect
7. **PWA**: Ensure poker game works offline for bot mode (already a PWA); add "Add to Home Screen" prompt on poker pages
8. **Hand history export**: CSV export of hand histories for a session
9. **Player statistics**: Career stats page (hands played, win rate, best hand, biggest pot) from `poker_play_results`
10. **Sound settings**: Volume slider and per-sound-type toggles in settings page

**Dependencies**: Phases 0-4 complete

**Acceptance criteria:**
- Lighthouse performance score > 90 on poker game page
- All UI text available in English and Polish
- Rate limiting prevents spam actions
- Offline bot mode works without network
- Hand history exportable as CSV
- No console errors or warnings in production build

**Risks**: Performance on older Android devices -- mitigated by progressive enhancement (disable particles/blur on low-end).

---

## NEXT 10 CONCRETE IMPLEMENTATION TASKS

1. **Create `generate-poker-assets` edge function** -- Generate all 5 dealer portraits, card back, and chip textures using Lovable AI image generation and save to `src/assets/poker/`
2. **Create `usePokerSounds.ts` hook** -- Web Audio synthesized sounds for deal, flip, clink, check, raise, all-in, win, with global toggle
3. **Create `side-pots.ts` module + tests** -- Pure function for multi-way side pot calculation with unit tests
4. **Fix `usePokerGame.ts` side pots** -- Replace current winner-takes-all showdown with proper side pot resolution using new module
5. **Create `DealerCharacter.tsx`** -- AI dealer portrait component with CSS breathing animation and spotlight backdrop
6. **Create `TurnTimer.tsx`** -- SVG circular countdown ring component (30s default)
7. **Redesign `TableFelt.tsx`** -- Proper centered oval with wood rail border, deeper vignette, gold betting ellipse
8. **Upgrade `CardDisplay.tsx`** -- 3D card flip animation for community cards, arc deal from dealer, AI-generated card back
9. **Upgrade `PokerTablePro.tsx`** -- Integrate dealer character, sounds, turn timer, chip animations, seat dimming, hand name reveal
10. **Upgrade `BettingControls.tsx`** -- Quick-bet presets (2x, 3x, Pot), press animations, integrated raise confirmation

