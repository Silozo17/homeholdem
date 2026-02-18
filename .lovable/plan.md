

# Fix: Voice Announces Old Blinds Instead of New Blinds

## Root Cause

The voice announcement message `"Blinds are now ${small} ${big}"` concatenates two numbers without a clear separator (e.g., "Blinds are now 100 200"). The TTS engine can misread or merge these numbers, making it sound like the old blind level.

## Fix

**File:** `src/hooks/usePokerVoiceAnnouncements.ts` (line 107)

Change the announcement phrasing to be unambiguous for the TTS engine:

Before:
```typescript
enqueue(`Blinds are now ${small} ${big}`);
```

After:
```typescript
enqueue(`Blinds are now ${small} and ${big}`);
```

Adding "and" between the two numbers ensures the TTS engine clearly separates and speaks both values correctly.

## What Does NOT Change

- No layout, style, navigation, spacing, or BottomNav changes
- No database or edge function changes
- No file renames or refactoring
- Only the voice announcement text phrasing is updated

