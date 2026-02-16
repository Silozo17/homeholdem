
# Fix Header Spacer Height on Online Poker and Tournament Pages

## Root Cause

The header has a two-element structure where safe-area padding and h-14 stack additively:
```
header (padding-top: safe-area) -> div (h-14)
Total = safe-area + 3.5rem
```

But the spacer is a single element with both classes:
```
div (h-14 + padding-top: safe-area)
With border-box: total = 3.5rem (padding eats into height)
```

The spacer is shorter than the header by `env(safe-area-inset-top)`, causing content to render behind the header on iPhones with notches.

`/play-poker` appears unaffected because its first content element (CardFan) provides enough visual buffer to mask the overlap.

## Fix

Change the spacer from a single element to a nested structure that properly stacks the two heights, matching the header's structure. Apply this to all three affected files:

**Before:**
```html
<div className="h-14 safe-area-top shrink-0" />
```

**After:**
```html
<div className="shrink-0 safe-area-top">
  <div className="h-14" />
</div>
```

This ensures the spacer height = `safe-area-inset-top` (outer padding) + `3.5rem` (inner height), exactly matching the header.

## Files to Modify

1. `src/components/poker/OnlinePokerLobby.tsx` (line 204) -- fix spacer
2. `src/components/poker/TournamentLobby.tsx` (lines 231 and 379) -- fix spacer in both detail and list views
3. `src/components/poker/PlayPokerLobby.tsx` (line 46) -- fix spacer here too for consistency, even though CardFan masks the issue
