

# Add Pre-Lesson Poker Explainer

## What

A new interactive, full-screen multi-page explainer that appears before Lesson 1 starts. Users swipe or tap Next/Previous through 5 pages that teach the fundamentals of Texas Hold'em. The final page has a "Begin Lesson 1" button. Once viewed, it is not shown again (tracked in localStorage), but users can re-open it from the lesson list.

## Pages

| # | Title | Content |
|---|-------|---------|
| 1 | What is Texas Hold'em? | Goal of the game: make the best 5-card hand from 2 private + 5 community cards. Win chips from other players. |
| 2 | How a Hand Works | The 4 betting rounds: Preflop (2 cards dealt), Flop (3 community), Turn (1 more), River (1 more), then Showdown. |
| 3 | Hand Rankings | All 10 hands from Royal Flush (#1) to High Card (#10), each with card examples. Scrollable list. Reuses the same data from `PokerHandRankings`. |
| 4 | Your Actions | Fold, Check, Call, Raise, All-in -- what each one does. |
| 5 | Ready to Play? | Encouraging message + prominent "Begin Lesson 1" button. |

## UI Design
- Full-screen overlay matching the app's dark theme
- Pagination dots at the bottom
- Previous / Next buttons (Previous hidden on page 1, Next becomes "Begin Lesson 1" on page 5)
- Skip button in the top-right corner to go straight to the lesson list
- Each page has an icon, title, and styled content area with scrollable content for the hand rankings page

## Flow
1. User taps Lesson 1 (or it's their first time on Learn Poker)
2. If `localStorage` key `poker-tutorial-explainer-seen` is not set, show the explainer
3. After completing or skipping the explainer, set the key and proceed to start Lesson 1
4. On subsequent visits, tapping Lesson 1 goes straight to gameplay
5. A small "Poker Basics" button at the top of the lesson list lets users re-open the explainer anytime

## File Changes

| File | Change |
|------|--------|
| `src/components/poker/TutorialExplainer.tsx` | **NEW** -- 5-page interactive explainer component |
| `src/pages/LearnPoker.tsx` | Add state for explainer visibility, show it before Lesson 1 on first visit, add "Poker Basics" re-open button |
| `src/i18n/locales/en.json` | Add ~30 `explainer.*` translation keys |
| `src/i18n/locales/pl.json` | Add matching Polish translations |

## Technical Details

### New Component: `TutorialExplainer`
- Props: `onComplete: () => void`, `onSkip: () => void`
- Internal state: `currentPage` (0-4)
- Uses `useTranslation` for all text
- Hand rankings data reuses the same translation keys already in `poker.*` namespace
- Renders as a fixed full-screen overlay (`fixed inset-0 z-50`)

### LearnPoker.tsx Changes
- New state: `showExplainer`
- New localStorage key: `poker-tutorial-explainer-seen`
- When user taps Lesson 1 and explainer not yet seen, show `TutorialExplainer` instead of starting gameplay
- On explainer complete/skip: mark as seen, start Lesson 1
- Add a small button above the lesson list to re-view the explainer

### Translation Keys (English)
```
"explainer": {
  "skip": "Skip",
  "next": "Next",
  "previous": "Previous",
  "page1_title": "What is Texas Hold'em?",
  "page1_text": "Texas Hold'em is the world's most popular poker game. Your goal is to make the best 5-card hand using any combination of your 2 private cards and 5 shared community cards.",
  "page1_text2": "Win chips by having the best hand at showdown -- or by betting so that everyone else folds.",
  "page2_title": "How a Hand Works",
  "page2_preflop": "Preflop: Each player gets 2 private cards",
  "page2_flop": "Flop: 3 community cards are dealt face up",
  "page2_turn": "Turn: 1 more community card is dealt",
  "page2_river": "River: The final community card is dealt",
  "page2_showdown": "Showdown: Players reveal cards, best hand wins",
  "page2_text": "There is a round of betting after each deal. You can bet, check, call, raise, or fold.",
  "page3_title": "Hand Rankings",
  "page3_subtitle": "From strongest (#1) to weakest (#10)",
  "page4_title": "Your Actions",
  "page4_fold": "Fold -- Give up your hand and sit out until the next deal",
  "page4_check": "Check -- Stay in without betting (only if no one has bet)",
  "page4_call": "Call -- Match the current bet to stay in",
  "page4_raise": "Raise -- Increase the bet, forcing others to match or fold",
  "page4_allin": "All-in -- Bet all your remaining chips",
  "page5_title": "Ready to Play?",
  "page5_text": "You know the basics! Let's put it into practice with guided hands.",
  "begin_lesson": "Begin Lesson 1",
  "basics_button": "Poker Basics"
}
```

### Translation Keys (Polish)
```
"explainer": {
  "skip": "Pomiń",
  "next": "Dalej",
  "previous": "Wstecz",
  "page1_title": "Czym jest Texas Hold'em?",
  "page1_text": "Texas Hold'em to najpopularniejsza gra pokerowa na świecie. Twoim celem jest ułożenie najlepszego układu 5 kart z 2 prywatnych kart i 5 wspólnych kart na stole.",
  "page1_text2": "Wygrywaj żetony mając najlepszy układ na showdownie -- lub licytując tak, by wszyscy inni spasowali.",
  "page2_title": "Jak wygląda ręka",
  "page2_preflop": "Preflop: Każdy gracz dostaje 2 prywatne karty",
  "page2_flop": "Flop: 3 wspólne karty są odkrywane",
  "page2_turn": "Turn: Odkrywana jest kolejna wspólna karta",
  "page2_river": "River: Odkrywana jest ostatnia wspólna karta",
  "page2_showdown": "Showdown: Gracze odkrywają karty, najlepszy układ wygrywa",
  "page2_text": "Po każdym rozdaniu jest runda licytacji. Możesz licytować, czekać, sprawdzić, podbić lub spasować.",
  "page3_title": "Ranking układów",
  "page3_subtitle": "Od najsilniejszego (#1) do najsłabszego (#10)",
  "page4_title": "Twoje akcje",
  "page4_fold": "Pas -- Poddaj rękę i czekaj na następne rozdanie",
  "page4_check": "Czekaj -- Zostań w grze bez licytacji (tylko gdy nikt nie postawił)",
  "page4_call": "Sprawdź -- Wyrównaj aktualny zakład, aby zostać w grze",
  "page4_raise": "Podbij -- Zwiększ zakład, zmuszając innych do wyrównania lub pasu",
  "page4_allin": "All-in -- Postaw wszystkie pozostałe żetony",
  "page5_title": "Gotowy do gry?",
  "page5_text": "Znasz podstawy! Przećwiczmy to w praktyce z przewodnikiem.",
  "begin_lesson": "Rozpocznij lekcję 1",
  "basics_button": "Podstawy pokera"
}
```

## What Does NOT Change
- Game engine, tutorial lessons 1-10, hooks
- Button positioning, sizing, layout
- Bottom navigation
- Database, auth
- CoachOverlay or BettingControls

