

# Fix Turn Order: Bot Must Act Before User on Every Post-Flop Street

## Problem
In real poker, the first active player left of the dealer acts first on every post-flop street. In several lessons, the user is asked to Raise without the bot acting first, breaking proper poker turn order and confusing learners.

## Affected Lessons and Fixes

All fixes involve inserting a `bot_action: check` step before the user's `require_action` step on the affected street. Each added step includes a brief, educational message.

### Lesson 1 (The Basics) -- River
- Insert: Ace (bot-2) checks before user raises
- Message: "Ace checked. With your Broadway Straight, it's time to bet big!"

### Lesson 2 (Hand Rankings) -- Flop, Turn, and River (3 fixes)
- **Flop**: Insert Viktor (bot-0) check before user raises
  - Message: "Viktor checked his trip Kings. But your trip Aces are higher!"
- **Turn**: Insert Viktor check before user raises
  - Message: "Viktor checked. He's cautious now."
- **River**: Insert Viktor check before user raises
  - Message: "Viktor checked. Time for one last value bet!"

### Lesson 3 (Betting Actions) -- River
- Insert: Viktor check before user raises
- Message: "Viktor checked. He missed his draws. Time to bet your Flush!"

### Lesson 6 (Pot Odds) -- River
- Insert: Viktor check before user raises
- Message: "Viktor checked. He's worried. Your straight is the best hand!"

### Lesson 9 (Value Betting) -- River
- Insert: Viktor check before user raises
- Message: "Viktor checked. He missed his straight draw. One more value bet!"

### Lesson 10 (Final) -- River
- Insert: Viktor check before user raises
- Message: "Viktor checked. Your Two Pair is strong!"

## Technical Details

**File changed:** `src/lib/poker/tutorial-lessons.ts`

Each fix is a single line insertion of the form:
```typescript
{ type: 'bot_action', botId: 'bot-0', botAction: { type: 'check' }, message: "...", delay: 1500 },
```

The step counter (e.g., "Step 16/18") will automatically adjust because it counts total steps. Lessons that gain a step will show the new correct total.

## What does NOT change
- Bottom navigation
- CoachOverlay UI
- Game reducer logic or hooks
- Database
- Translations
- Any other files

