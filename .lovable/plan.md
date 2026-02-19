

# Align Poker Table Layout + Fix All Missing Translations

## Part 1: Align Table Layout (Bots/Learn to match Multiplayer)

Both Bots (practice) and Learn (tutorial) modes use `PokerTablePro.tsx`. The multiplayer mode uses `OnlinePokerTable.tsx`. The table wrappers are nearly identical but have key differences:

### Differences to fix in `PokerTablePro.tsx`

| Property | PokerTablePro (current) | OnlinePokerTable (target) |
|----------|------------------------|--------------------------|
| Table wrapper `maxWidth` | missing | `'990px'` |
| Table wrapper `containerType` | missing | `'size'` |
| Dealer `top` | `isLandscape ? '-14%' : '-22%'` | Device-aware: `isMobileLandscape ? 'calc(-4% - 32px)' : isTablet ? 'calc(-4% + 8px)' : isLargeDesktop ? 'calc(-4% - 31px)' : 'calc(-4% - 27px)'` |
| Dealer `width` | `'11%'` | `'min(9vw, 140px)'` |
| Missing device checks | No `isTablet` / `isLargeDesktop` | Has both |

### Files changed

| File | Change |
|------|--------|
| `src/components/poker/PokerTablePro.tsx` | Add `maxWidth: '990px'` and `containerType: 'size'` to table wrapper. Add `isTablet` and `isLargeDesktop` variables. Update dealer positioning to match multiplayer formula. |

---

## Part 2: Fix All Missing Translations

### 2a. Install page: mismatched translation keys

The Install page (`src/pages/Install.tsx`) uses keys that don't exist in the JSON files. The JSON has different key names. Fix by updating Install.tsx to use the correct existing keys:

| Used in code (wrong) | Correct key in JSON |
|----------------------|-------------------|
| `install.already_installed_desc` | `install.installed_description` |
| `install.ios_subtitle` | `install.ios_description` |
| `install.ios_step1_desc` | `install.ios_step1_detail` |
| `install.ios_step2_desc` | `install.ios_step2_detail` |
| `install.ios_step3_desc` | `install.ios_step3_detail` |
| `install.android_subtitle` | `install.android_description` |
| `install.android_step1_desc` | `install.android_step1_detail` |
| `install.android_step2_desc` | `install.android_step2_detail` |
| `install.android_step3_desc` | `install.android_step3_detail` |
| `install.benefit_offline` | `install.works_offline` |
| `install.benefit_offline_desc` | `install.offline_description` |
| `install.benefit_quick` | `install.quick_access` |
| `install.benefit_quick_desc` | `install.quick_description` |
| `install.benefit_push` | `install.push_notifications` |
| `install.benefit_push_desc` | `install.push_description` |
| `install.ready` | `install.ready_to_install` |
| `install.ready_desc` | `install.one_tap` |
| `install.confirm` | needs new key: `install.confirm` |

### 2b. Raw English strings across poker components

Many poker components have hardcoded English strings that need to be wrapped with `t()` and added to both `en.json` and `pl.json`.

**Files with raw strings to translate:**

| File | Raw strings |
|------|------------|
| `PokerTablePro.tsx` | "Rotate Your Device", "The poker table works best in landscape...", "Sound Effects On/Off", "YOUR TURN", "Exit Game?", "Are you sure you want to exit?", "Cancel", "Exit Game" |
| `OnlinePokerTable.tsx` | "Rotate Your Device", "The poker table works best in landscape...", "Sound Effects On/Off", "Voice Announcements On/Off", "YOUR TURN", "5 SEC LEFT!", "Loading table...", "Table not found", "Starting soon...", "Waiting for players...", "Deal Hand", "Are you still playing?", "You will be removed...", "I'm Still Here", "Kick {name}?", "Cancel", "Kick Player", "Close Table?", "Leave Table?", "Leave Seat?", "Open", "Tap a glowing seat to join", "Leave", many more |
| `WinnerOverlay.tsx` | "Winner", "You Won!", "Game Over", "You busted out", "chips", "Hands", "Won", "Best Hand", "Biggest Pot", "Duration", "Close Game", "Play Again" |
| `LessonCompleteOverlay.tsx` | "Lesson Complete", "Back to Lessons", "Next Lesson", "Back to Lesson List" |
| `LearnPoker.tsx` | "Learn Poker", "Master Texas Hold'em step by step", "Lessons", "Reset Progress" |
| `PlayPokerLobby.tsx` | "Play Poker", "Texas Hold'em vs AI...", "Start Game", "Casual", "Quick heads-up", "Standard", "Classic table", "Full Ring", "Tight play", "Opponents", "Starting Chips", "Blinds", "Blind Timer", "Off" |

### 2c. New translation keys to add

Add all the above raw strings as new keys in `poker_table` and `poker_lobby` namespaces in both `en.json` and `pl.json`.

### Files changed summary

| File | Change |
|------|--------|
| `src/components/poker/PokerTablePro.tsx` | Align table wrapper and dealer to match multiplayer. Add `useTranslation`. Replace all raw strings with `t()`. |
| `src/components/poker/OnlinePokerTable.tsx` | Add `useTranslation`. Replace all raw strings with `t()`. |
| `src/components/poker/WinnerOverlay.tsx` | Add `useTranslation`. Replace all raw strings with `t()`. |
| `src/components/poker/LessonCompleteOverlay.tsx` | Add `useTranslation`. Replace all raw strings with `t()`. |
| `src/components/poker/PlayPokerLobby.tsx` | Add `useTranslation`. Replace all raw strings with `t()`. |
| `src/pages/LearnPoker.tsx` | Add `useTranslation`. Replace all raw strings with `t()`. |
| `src/pages/Install.tsx` | Fix mismatched translation keys to use correct JSON keys. Add missing `install.confirm` key. |
| `src/i18n/locales/en.json` | Add new `poker_table`, `poker_lobby`, `learn_poker` translation sections. Add `install.confirm`. |
| `src/i18n/locales/pl.json` | Add Polish translations for all new keys. Add `install.confirm`. |

## What does NOT change
- Bottom navigation
- Seat positions / seat layout (`seatLayout.ts`)
- Game logic / hooks
- No database changes
- No styling changes beyond the dealer repositioning

