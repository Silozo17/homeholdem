

# Translate Remaining Hardcoded English Strings

## Problem

Several components still have hardcoded English text instead of using `t()` translation keys:

### 1. `src/components/home/HeroSection.tsx`
- "Good morning" / "Good afternoon" / "Good evening"
- "Ready for your next hand? Jump into a game or check your clubs."
- "Play Now"

### 2. `src/components/home/GameModesGrid.tsx`
- "Learn" / "Tutorial" / "Step-by-step poker lessons"
- "VS Bots" / "Practice Mode" / "Sharpen your skills against AI opponents"
- "Multiplayer" / "Real Players" / "Play Texas Hold'em with friends online"

### 3. `src/components/home/QuickStatsStrip.tsx`
- "Wins" / "Games" / "Net"

### 4. `src/components/home/UpcomingEventBanner.tsx`
- "Upcoming" (in the subtitle)

### 5. `src/pages/PokerHub.tsx`
- "Poker" (heading)
- "Choose your game mode"
- "Learn to Play" / "Interactive lessons teaching Texas Hold'em" / "10 lessons - Guided hands" / "Start Learning"
- "Play with Bots" / "Choose opponents, chips, and blinds" / "1-8 bots - Customizable" / "Configure & Play"
- "Online Multiplayer" / "Create or join a table with real players" / "Real-time - Invite friends" / "Find Table"
- "Paid Tournaments" / "Compete for real cash prizes" / "Entry fee - Prize pool" / "View Tournaments"

### 6. `src/components/layout/BottomNav.tsx` (poker mode only)
- "Home" / "Games" / "Quick" / "Stats" / "Rules" (lines 31-36 -- the `pokerNav` array is hardcoded while `defaultNav` already uses `t()`)

## Changes

### File: `src/components/home/HeroSection.tsx`
- Add `useTranslation` import
- Replace greeting with `t('home.good_morning')` / `t('home.good_afternoon')` / `t('home.good_evening')`
- Replace subtitle with `t('home.hero_subtitle')`
- Replace "Play Now" with `t('home.play_now')`

### File: `src/components/home/GameModesGrid.tsx`
- Add `useTranslation` import
- Replace all 3 mode objects' `title`, `subtitle`, `description` with `t()` calls

### File: `src/components/home/QuickStatsStrip.tsx`
- Add `useTranslation` import
- Replace "Wins", "Games", "Net" with `t('home.stat_wins')`, `t('home.stat_games')`, `t('home.stat_net')`

### File: `src/components/home/UpcomingEventBanner.tsx`
- Add `useTranslation` import
- Replace "Upcoming" with `t('home.upcoming')`

### File: `src/pages/PokerHub.tsx`
- Add `useTranslation` import
- Replace all hardcoded strings with `t('poker_hub.*')` keys

### File: `src/components/layout/BottomNav.tsx`
- Replace hardcoded `pokerNav` labels with `t('nav.poker_home')`, `t('nav.poker_games')`, `t('nav.poker_quick')`, `t('nav.poker_stats')`, `t('nav.poker_rules')`

### File: `src/i18n/locales/en.json`
Add keys:
```
"home": {
  "good_morning": "Good morning",
  "good_afternoon": "Good afternoon",
  "good_evening": "Good evening",
  "hero_subtitle": "Ready for your next hand? Jump into a game or check your clubs.",
  "play_now": "Play Now",
  "mode_learn": "Learn",
  "mode_learn_sub": "Tutorial",
  "mode_learn_desc": "Step-by-step poker lessons",
  "mode_bots": "VS Bots",
  "mode_bots_sub": "Practice Mode",
  "mode_bots_desc": "Sharpen your skills against AI opponents",
  "mode_multi": "Multiplayer",
  "mode_multi_sub": "Real Players",
  "mode_multi_desc": "Play Texas Hold'em with friends online",
  "stat_wins": "Wins",
  "stat_games": "Games",
  "stat_net": "Net",
  "upcoming": "Upcoming"
},
"poker_hub": {
  "title": "Poker",
  "subtitle": "Choose your game mode",
  "learn_title": "Learn to Play",
  "learn_desc": "Interactive lessons teaching Texas Hold'em",
  "learn_hint": "10 lessons \u2022 Guided hands",
  "learn_cta": "Start Learning",
  "bots_title": "Play with Bots",
  "bots_desc": "Choose opponents, chips, and blinds",
  "bots_hint": "1-8 bots \u2022 Customizable",
  "bots_cta": "Configure & Play",
  "multi_title": "Online Multiplayer",
  "multi_desc": "Create or join a table with real players",
  "multi_hint": "Real-time \u2022 Invite friends",
  "multi_cta": "Find Table",
  "tournaments_title": "Paid Tournaments",
  "tournaments_desc": "Compete for real cash prizes",
  "tournaments_hint": "Entry fee \u2022 Prize pool",
  "tournaments_cta": "View Tournaments"
},
"nav": {
  ... existing keys ...
  "poker_home": "Home",
  "poker_games": "Games",
  "poker_quick": "Quick",
  "poker_stats": "Stats",
  "poker_rules": "Rules"
}
```

### File: `src/i18n/locales/pl.json`
Add matching Polish translations:
```
"home": {
  "good_morning": "Dzień dobry",
  "good_afternoon": "Dzień dobry",
  "good_evening": "Dobry wieczór",
  "hero_subtitle": "Gotowy na kolejną rękę? Dołącz do gry lub sprawdź swoje kluby.",
  "play_now": "Zagraj teraz",
  "mode_learn": "Nauka",
  "mode_learn_sub": "Samouczek",
  "mode_learn_desc": "Lekcje pokera krok po kroku",
  "mode_bots": "VS Boty",
  "mode_bots_sub": "Tryb ćwiczebny",
  "mode_bots_desc": "Doskonal umiejętności grając z AI",
  "mode_multi": "Multiplayer",
  "mode_multi_sub": "Prawdziwi gracze",
  "mode_multi_desc": "Graj w Texas Hold'em z przyjaciółmi online",
  "stat_wins": "Wygrane",
  "stat_games": "Gry",
  "stat_net": "Bilans",
  "upcoming": "Nadchodzące"
},
"poker_hub": {
  "title": "Poker",
  "subtitle": "Wybierz tryb gry",
  "learn_title": "Naucz się grać",
  "learn_desc": "Interaktywne lekcje Texas Hold'em",
  "learn_hint": "10 lekcji \u2022 Z przewodnikiem",
  "learn_cta": "Rozpocznij naukę",
  "bots_title": "Graj z botami",
  "bots_desc": "Wybierz przeciwników, żetony i blindy",
  "bots_hint": "1-8 botów \u2022 Konfigurowalne",
  "bots_cta": "Skonfiguruj i graj",
  "multi_title": "Multiplayer online",
  "multi_desc": "Utwórz lub dołącz do stołu z prawdziwymi graczami",
  "multi_hint": "W czasie rzeczywistym \u2022 Zaproś znajomych",
  "multi_cta": "Znajdź stół",
  "tournaments_title": "Płatne turnieje",
  "tournaments_desc": "Rywalizuj o nagrody pieniężne",
  "tournaments_hint": "Wpisowe \u2022 Pula nagród",
  "tournaments_cta": "Zobacz turnieje"
},
"nav": {
  ... existing keys ...
  "poker_home": "Główna",
  "poker_games": "Gry",
  "poker_quick": "Szybka",
  "poker_stats": "Statystyki",
  "poker_rules": "Zasady"
}
```

## Summary of file changes

| File | Change |
|------|--------|
| `src/components/home/HeroSection.tsx` | Add `useTranslation`, replace 5 hardcoded strings with `t()` |
| `src/components/home/GameModesGrid.tsx` | Add `useTranslation`, replace 9 hardcoded strings with `t()` |
| `src/components/home/QuickStatsStrip.tsx` | Add `useTranslation`, replace 3 labels with `t()` |
| `src/components/home/UpcomingEventBanner.tsx` | Add `useTranslation`, replace "Upcoming" with `t()` |
| `src/pages/PokerHub.tsx` | Add `useTranslation`, replace ~16 hardcoded strings with `t()` |
| `src/components/layout/BottomNav.tsx` | Replace 5 hardcoded poker nav labels with `t()` |
| `src/i18n/locales/en.json` | Add `home` and `poker_hub` namespaces + 5 new `nav` keys |
| `src/i18n/locales/pl.json` | Add matching Polish translations |

## What does NOT change
- Game engine, database, auth flow
- Layout, styling, spacing
- Bottom navigation structure (only labels change)
- Auth page (already uses `t()`)
- Tutorial system (already translated)
