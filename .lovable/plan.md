
# Fix Tutorial Errors, Add Tutorial Gate, Grant XP on Completion

## Part 1: Fix Remaining Tutorial Error

### Lesson 5 (Reading the Board) — Line 351
Viktor's bot action is `{ type: 'call' }` but the message says "Viktor checked." The action should be `{ type: 'check' }`.

**File:** `src/lib/poker/tutorial-lessons.ts`
- Line 351: Change `botAction: { type: 'call' }` to `botAction: { type: 'check' }`

All other lessons (1, 2, 3, 4, 6, 7, 8, 9, 10) have been verified and their hand evaluations, card combinations, and messages are factually correct.

---

## Part 2: Award 1600 XP on Tutorial Completion

XP formula: `level = floor(sqrt(xp / 100)) + 1`. To reach level 5: `(5-1)^2 * 100 = 1600 XP`.

### Database changes
1. Add `tutorial_completed_at` column (nullable timestamp) to `profiles` table — null means not completed
2. Migration data: Set `tutorial_completed_at = now()` for ALL existing users EXCEPT:
   - Kamil Chuchro (`e5162f27-b90a-48c5-a8f5-b6e22d77fa36`)
   - TimmyPoker (`9db2b9e1-640e-49cc-b77b-4f3cd379323d`)
3. For those same users (all except Kamil and Timmy), insert 1600 XP via `xp_events` table (the trigger `update_player_xp` will auto-update `player_xp`)

### Frontend changes
**File:** `src/pages/LearnPoker.tsx`
- When ALL 10 lessons are completed and `tutorial_completed_at` is null:
  - Set `tutorial_completed_at = now()` on the user's profile
  - Insert an `xp_events` row with `xp_amount: 1600, reason: 'tutorial_complete'`
  - Show a congratulations toast

---

## Part 3: Lock Game Modes Until Tutorial Complete

### New component: `src/components/poker/TutorialGateDialog.tsx`
A dialog/drawer that appears when an unauthenticated-tutorial user tries to access locked game modes:
- Message: "Complete the tutorial to unlock this game mode"
- Two buttons:
  - **"Go to Tutorial"** — navigates to `/learn-poker`
  - **"Skip Tutorial"** — sets `tutorial_completed_at = now()` (no XP awarded), closes dialog, allows access
- Tournaments additionally require Level 5 (existing gate stays)

### Files to modify for locking:

| File | Change |
|------|--------|
| `src/components/home/GameModesGrid.tsx` | Check `tutorial_completed_at` from profile. If null, show `TutorialGateDialog` instead of navigating to VS Bots or Multiplayer. Learn mode always accessible. |
| `src/pages/PokerHub.tsx` | Same gate for "Play with Bots", "Online Multiplayer", and "Paid Tournaments" cards |
| `src/components/poker/PlayPokerLobby.tsx` | Add redirect check — if tutorial not completed, redirect to tutorial gate |
| `src/pages/OnlinePoker.tsx` | Add redirect check |
| `src/pages/PaidTournaments.tsx` | Add redirect check (this also has Level 5 gate already) |

### Hook: `src/hooks/useTutorialComplete.ts`
- Fetches `tutorial_completed_at` from `profiles` table for current user
- Returns `{ isComplete: boolean, isLoading: boolean, skipTutorial: () => void, markComplete: (withXp: boolean) => void }`
- `skipTutorial()` sets `tutorial_completed_at` without XP
- `markComplete(true)` sets `tutorial_completed_at` and inserts 1600 XP

---

## Part 4: Translations

Add new keys to `en.json` and `pl.json`:

```
"tutorial_gate": {
  "title": "Complete Tutorial First",
  "message": "Complete the poker tutorial to unlock this game mode.",
  "go_to_tutorial": "Go to Tutorial",
  "skip_tutorial": "Skip Tutorial",
  "skip_description": "Skip the tutorial and unlock all game modes (no XP reward)"
}
```

Polish:
```
"tutorial_gate": {
  "title": "Najpierw ukoncz samouczek",
  "message": "Ukoncz samouczek pokera, aby odblokowac ten tryb gry.",
  "go_to_tutorial": "Przejdz do samouczka",
  "skip_tutorial": "Pomin samouczek",
  "skip_description": "Pomin samouczek i odblokuj wszystkie tryby gry (bez nagrody XP)"
}
```

---

## Files changed summary

| File | Change |
|------|--------|
| `src/lib/poker/tutorial-lessons.ts` | Fix Lesson 5 line 351 bot action from `call` to `check` |
| Migration SQL | Add `tutorial_completed_at` to `profiles`, backfill for existing users, grant 1600 XP |
| `src/hooks/useTutorialComplete.ts` | New hook for tutorial completion state |
| `src/components/poker/TutorialGateDialog.tsx` | New lock overlay dialog |
| `src/pages/LearnPoker.tsx` | Mark tutorial complete + award XP when all 10 lessons done |
| `src/components/home/GameModesGrid.tsx` | Add tutorial gate check |
| `src/pages/PokerHub.tsx` | Add tutorial gate check |
| `src/components/poker/PlayPokerLobby.tsx` | Add tutorial gate redirect |
| `src/pages/OnlinePoker.tsx` | Add tutorial gate redirect |
| `src/pages/PaidTournaments.tsx` | Add tutorial gate redirect |
| `src/i18n/locales/en.json` | Add `tutorial_gate` translations |
| `src/i18n/locales/pl.json` | Add `tutorial_gate` Polish translations |

## What does NOT change
- Bottom navigation
- Game logic or hooks
- Existing XP system or level formula
- Existing subscription/paywall gates
- Tournament Level 5 requirement (kept as additional gate)
