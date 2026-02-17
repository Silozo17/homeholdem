
# Add Paywall Gate to Multiplayer & Tournament Poker Modes

## Overview

Gate the Online Multiplayer and Tournament poker modes behind the existing subscription paywall, while keeping Play with Bots free. Follow the same pattern used for club creation/joining on the Dashboard.

## Changes

### 1. PokerHub page (`src/pages/PokerHub.tsx`)

- Import `useSubscription`, `PaywallDrawer`, and `Crown` (lock icon for badges)
- Add `paywallOpen` state
- For the Multiplayer and Tournament `GameModeCard` buttons, check `isActive` before navigating. If not active, open the paywall instead.
- The Bots card remains unchanged (free).
- Add a small `Crown` / lock badge on the Multiplayer and Tournament cards to visually indicate they are premium.
- Render `<PaywallDrawer>` at the bottom.

### 2. OnlinePoker page (`src/pages/OnlinePoker.tsx`)

- Import `useSubscription` and `PaywallDrawer`
- After auth check, if `!isActive`, show the paywall drawer (auto-open) instead of the lobby. This prevents direct URL access bypassing the hub.

### 3. PokerTournament page (`src/pages/PokerTournament.tsx`)

- Same treatment as OnlinePoker: gate with `useSubscription`, auto-open paywall if not subscribed.

### 4. GameModesGrid on Dashboard (`src/components/home/GameModesGrid.tsx`)

- Import `useSubscription` and `PaywallDrawer`
- For the Multiplayer card, check `isActive` before navigating; open paywall if not.
- Add a small lock/crown indicator on the Multiplayer card.

### 5. PaywallDrawer features list (`src/components/subscription/PaywallDrawer.tsx`)

- Add a 5th feature mentioning online poker: `{ icon: Gamepad2, text: "Online multiplayer & tournaments" }` (using a suitable icon like `Gamepad2` or `Spade`).

### 6. Translation files (`src/i18n/locales/en.json` and `pl.json`)

- Add `subscription.feature_5` key:
  - EN: `"Online multiplayer & tournament poker"`
  - PL: `"Poker wieloosobowy online i turnieje"`

## Technical Details

**Pattern (same as Dashboard club gating):**
```tsx
const { isActive } = useSubscription();
const [paywallOpen, setPaywallOpen] = useState(false);

const handleMultiplayer = () => {
  if (!isActive) { setPaywallOpen(true); return; }
  navigate('/online-poker');
};
```

**Direct URL protection (OnlinePoker / PokerTournament pages):**
```tsx
const { isActive, loading: subLoading } = useSubscription();
const [paywallOpen, setPaywallOpen] = useState(false);

useEffect(() => {
  if (!subLoading && !isActive) setPaywallOpen(true);
}, [subLoading, isActive]);

// If paywall is open and user dismisses it, navigate back
// Render PaywallDrawer alongside the lobby
```

**Files changed:**

| File | Change |
|------|--------|
| `src/pages/PokerHub.tsx` | Add subscription check + paywall for Multiplayer & Tournament cards |
| `src/pages/OnlinePoker.tsx` | Add subscription gate with auto-open paywall |
| `src/pages/PokerTournament.tsx` | Add subscription gate with auto-open paywall |
| `src/components/home/GameModesGrid.tsx` | Add subscription check + paywall for Multiplayer card |
| `src/components/subscription/PaywallDrawer.tsx` | Add 5th feature about online poker modes |
| `src/i18n/locales/en.json` | Add `subscription.feature_5` |
| `src/i18n/locales/pl.json` | Add `subscription.feature_5` |
