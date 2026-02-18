

# Learn to Play Poker -- Interactive Tutorial Mode

A guided, step-by-step poker tutorial that teaches beginners through scripted, interactive hands with 3 bots. Each lesson uses preset cards to guarantee the player experiences every key concept.

## Curriculum Structure

The tutorial is a linear series of **lessons** (10 total), each consisting of 1-2 scripted hands with preset cards. The player plays through each hand while a **coach overlay** explains what's happening and why. After each lesson, a summary screen shows what was learned, then the player advances.

### Lesson Plan

| # | Title | Concept | Preset Hand Setup |
|---|-------|---------|------------------|
| 1 | **The Basics** | How a hand works: blinds, dealing, betting rounds | Player gets A-K suited. Walk through preflop, flop, turn, river. Bots fold early. |
| 2 | **Hand Rankings** | What beats what | Player gets pocket Aces. Community cards form a Full House. Coach highlights the ranking. |
| 3 | **Betting Actions** | Fold, Check, Call, Raise explained | Player gets medium hand (Q-J). Coach prompts specific actions at each step. |
| 4 | **Position Matters** | Early vs late position advantage | Two hands: one where player is UTG (tight play), one where player is on the button (wider range). |
| 5 | **Reading the Board** | Flush draws, straight draws, paired boards | Player has flush draw on flop. Coach explains outs and probability. |
| 6 | **Pot Odds** | When to call based on math | Player faces a bet with a draw. Coach shows pot odds calculation. |
| 7 | **When to Fold** | Discipline -- not every hand is playable | Player gets 7-2 offsuit. Coach says fold. Then gets J-10 suited -- coach says play. |
| 8 | **Bluffing Basics** | Why and when to bluff | Player has nothing but is in position. Coach guides a successful bluff. |
| 9 | **Value Betting** | Extracting max chips with strong hands | Player has top set. Coach teaches bet sizing for value. |
| 10 | **Putting It All Together** | Free play hand with coach tips | Semi-guided hand with hints but player decides. |

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/pages/LearnPoker.tsx` | Page component, manages lesson state and renders the table |
| `src/lib/poker/tutorial-lessons.ts` | Lesson definitions: preset decks, coach messages, required actions per step |
| `src/hooks/useTutorialGame.ts` | Modified poker game hook that uses preset decks instead of random shuffles, and pauses for coach messages |
| `src/components/poker/CoachOverlay.tsx` | The coaching UI: speech bubble with text, "Next" button, highlights |

### How Preset Hands Work

Each lesson defines a `presetDeck` -- an ordered array of cards that replaces the random shuffle. The deck is arranged so that:
- The player's hole cards are at specific positions
- Bot hole cards are at specific positions  
- Community cards (flop/turn/river) are at specific positions

This guarantees the exact hand the lesson needs. The `useTutorialGame` hook is a fork of `usePokerGame` that:
1. Uses the lesson's preset deck instead of `shuffle(createDeck())`
2. Pauses at specific phases to show coach messages (e.g., pause at preflop to explain blinds)
3. Can restrict available actions (e.g., "In this lesson, try clicking Call")
4. Tracks lesson progress and advances to the next lesson

### Coach Overlay

A floating speech bubble that appears at the bottom of the screen (above betting controls) with:
- Coach avatar (dealer character reuse)
- Text explaining the current concept
- "Got it" / "Next" button to advance
- Optional highlight ring around specific UI elements (e.g., highlight the "Call" button)

When the coach overlay is visible, the game is paused. The player reads the tip, taps "Got it", and the game resumes.

### Lesson Data Structure

```typescript
interface TutorialStep {
  phase: GamePhase;           // When to show this step
  message: string;            // Coach text
  highlightElement?: string;  // CSS selector to highlight (optional)
  requiredAction?: PlayerAction; // Force player to take this action
  autoAdvance?: boolean;      // Auto-continue after delay
}

interface TutorialLesson {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  presetDeck: Card[];         // Fixed deck order
  botCount: 3;
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  steps: TutorialStep[];
  summary: string[];          // Key takeaways shown after lesson
}
```

### Navigation and Entry Point

- Add a "Learn" card to `GameModesGrid.tsx` alongside "VS Bots" and "Multiplayer"
- Add route `/learn-poker` in `App.tsx`
- Lesson progress is saved to `localStorage` (no database needed)
- A lesson select screen shows completed/locked lessons with progress

### Lesson Select Screen

Shows all 10 lessons as cards in a vertical list:
- Completed lessons: green checkmark
- Current lesson: highlighted, "Start" button
- Locked lessons: greyed out with lock icon
- "Reset Progress" button at the bottom

## Visual Flow

1. User taps "Learn" on the Poker Hub or Dashboard
2. Lesson select screen shows progress
3. User taps a lesson
4. Brief intro screen: lesson title + what you'll learn
5. Poker table loads with preset cards + 3 bots
6. Coach overlay appears at key moments, pausing the game
7. Player follows guided actions
8. After the hand(s), summary screen with key takeaways
9. "Next Lesson" button advances to the next one

## Files Changed Summary

| File | Change |
|------|---------|
| `src/pages/LearnPoker.tsx` | New page: lesson select + tutorial game |
| `src/lib/poker/tutorial-lessons.ts` | New: all 10 lesson definitions with preset decks and coach steps |
| `src/hooks/useTutorialGame.ts` | New: modified poker game hook supporting preset decks and pause/resume |
| `src/components/poker/CoachOverlay.tsx` | New: coaching speech bubble UI |
| `src/components/home/GameModesGrid.tsx` | Add "Learn" mode card |
| `src/App.tsx` | Add `/learn-poker` route |

## NOT Changed

- Bottom navigation, existing poker game, online multiplayer, styles, layout, edge functions, database

