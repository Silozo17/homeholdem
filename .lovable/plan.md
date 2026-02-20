
# Full Polish Translation for Learn Poker Tutorial

## Scope

There are ~200+ hardcoded English strings across the tutorial system that need Polish translations:

- **10 lesson titles, subtitles, and descriptions** (displayed in the lesson list and completion overlay)
- **~12 intro steps** (lesson 1 table tour)
- **~150 scripted step messages** (coach messages, bot actions, deal announcements, require_action prompts, show_result)
- **~40 summary bullet points** (shown on lesson completion)
- **3 hardcoded strings in LearnPoker.tsx** (tutorial complete toast, 2 performance messages)
- **3 strings in CoachOverlay.tsx** (button text: "Continue", "Got it", "Tap X" -- already translated via `coach.*` keys but currently hardcoded in the component)

## Approach

### 1. Convert `TUTORIAL_LESSONS` from a static constant to a factory function

**File: `src/lib/poker/tutorial-lessons.ts`**

Change `export const TUTORIAL_LESSONS` to `export function getTutorialLessons(t: TFunction)` that accepts the i18next `t` function and returns the lessons array with all strings wrapped in `t()` calls.

Every string becomes a translation key lookup:
```typescript
title: t('tutorial.basics.title', 'The Basics'),
subtitle: t('tutorial.basics.subtitle', 'How a Hand Works'),
// scripted steps:
message: t('tutorial.basics.step_1', "Your cards are dealt! You have A-S K-S..."),
// summaries:
t('tutorial.basics.summary_1', 'A hand has 4 betting rounds...')
```

The second argument is the English default (fallback), so the app still works even if a key is missing.

Also export `TUTORIAL_LESSON_COUNT = 10` as a constant for places that just need the count.

### 2. Update LearnPoker.tsx to use the factory

**File: `src/pages/LearnPoker.tsx`**

```typescript
const { t } = useTranslation();
const lessons = useMemo(() => getTutorialLessons(t), [t]);
// Replace all TUTORIAL_LESSONS references with lessons
```

Also wrap the 3 hardcoded strings:
- Toast title: `t('tutorial.complete_toast_title', 'Tutorial Complete!')`
- Toast description: `t('tutorial.complete_toast_desc', 'You earned 1600 XP...')`
- Performance messages: `t('tutorial.result_good', "That was good!...")` and `t('tutorial.result_ok', "You've got the basics...")`

### 3. Fix CoachOverlay.tsx button text to use existing translation keys

**File: `src/components/poker/CoachOverlay.tsx`**

The `coach.continue`, `coach.got_it`, `coach.tap_action`, and `coach.step_of` keys already exist in both locales but are NOT used in the component (it has hardcoded English). Fix:

```typescript
const { t } = useTranslation();
// ...
const buttonText = isIntro
  ? t('coach.continue')
  : isRequireAction
    ? t('coach.tap_action', { action: step!.requiredAction! })
    : t('coach.got_it');

// Step counter:
t('coach.step_of', { current: currentStepNum, total: totalSteps })
```

### 4. Add all translation keys to en.json and pl.json

**File: `src/i18n/locales/en.json`** -- Add `tutorial` namespace with all ~200 keys in English.

**File: `src/i18n/locales/pl.json`** -- Add `tutorial` namespace with all ~200 keys translated to Polish.

Key structure:
```json
{
  "tutorial": {
    "complete_toast_title": "Tutorial Complete! / Samouczek ukończony!",
    "complete_toast_desc": "You earned 1600 XP... / Zdobyłeś 1600 XP...",
    "result_good": "That was good!... / To było dobre!...",
    "result_ok": "You've got the basics... / Opanowałeś podstawy...",
    "basics": {
      "title": "The Basics / Podstawy",
      "subtitle": "How a Hand Works / Jak działa ręka",
      "description": "... / ...",
      "intro_1": "Welcome to Learn Poker!... / Witaj w Nauce Pokera!...",
      "intro_2": "...",
      "step_1": "Your cards are dealt!... / Karty rozdane!...",
      "step_2": "...",
      "summary_1": "...",
      "summary_2": "..."
    },
    "hand_rankings": { ... },
    "betting_actions": { ... },
    "position": { ... },
    "reading_board": { ... },
    "pot_odds": { ... },
    "when_to_fold": { ... },
    "bluffing": { ... },
    "value_betting": { ... },
    "final": { ... }
  }
}
```

### Polish translations for all 10 lessons (summary)

| Lesson | English Title | Polish Title |
|--------|--------------|-------------|
| 1 | The Basics | Podstawy |
| 2 | Hand Rankings | Ranking układów |
| 3 | Betting Actions | Akcje licytacji |
| 4 | Position Matters | Znaczenie pozycji |
| 5 | Reading the Board | Czytanie stołu |
| 6 | Pot Odds | Szanse puli |
| 7 | When to Fold | Kiedy spasować |
| 8 | Bluffing Basics | Podstawy blefu |
| 9 | Value Betting | Obstawianie wartości |
| 10 | Putting It All Together | Wszystko razem |

All scripted step messages, intro messages, summaries, and UI strings will receive full Polish translations maintaining poker terminology (using standard Polish poker terms: fold/pas, check/czekaj, call/sprawdzenie, raise/podbicie, blind, flop, turn, river, etc.).

## Files changed

| File | Change |
|------|--------|
| `src/lib/poker/tutorial-lessons.ts` | Convert `TUTORIAL_LESSONS` to `getTutorialLessons(t)` factory; export `TUTORIAL_LESSON_COUNT` |
| `src/pages/LearnPoker.tsx` | Use factory with `t`; translate toast and performance messages |
| `src/components/poker/CoachOverlay.tsx` | Use existing `coach.*` translation keys for button text and step counter |
| `src/i18n/locales/en.json` | Add ~200 keys under `tutorial` namespace |
| `src/i18n/locales/pl.json` | Add ~200 Polish translations under `tutorial` namespace |

## What does NOT change
- Game engine, hooks, reducers
- Bottom navigation
- Database
- Layout or styling
- Any non-tutorial components
