

# Fix: Dealer Position Drift in OnlinePokerTable

## Problem

The dealer's `top` value on line 1181 mixes percentages with fixed pixel offsets:

```
calc(-4% - 32px)   // mobile landscape
calc(-4% + 8px)    // tablet
calc(-4% - 31px)   // large desktop
calc(-4% - 27px)   // default
```

The `-4%` scales with the table wrapper, but the pixel values (`-32px`, `-27px`, etc.) do NOT. On smaller tables the pixel portion is a huge chunk; on larger tables it's relatively small. This causes the dealer to float too high on some screens and sit too low on others.

The same issue applies to the dealer width (`min(9vw, 140px)`) being viewport-relative while the table wrapper has its own sizing constraints.

## Fix

**File:** `src/components/poker/OnlinePokerTable.tsx`, line 1181

Replace ALL the breakpoint logic and pixel offsets with pure percentages — matching the approach already used in PokerTablePro:

Current:
```typescript
style={{
  top: isMobileLandscape ? 'calc(-4% - 32px)' 
     : isTablet ? 'calc(-4% + 8px)' 
     : isLargeDesktop ? 'calc(-4% - 31px)' 
     : 'calc(-4% - 27px)',
  width: 'min(9vw, 140px)',
  zIndex: Z.DEALER
}}
```

New:
```typescript
style={{
  top: isLandscape ? '-12%' : '-18%',
  width: '11%',
  zIndex: Z.DEALER
}}
```

## Why This Works

- **`width: '11%'`** — dealer width is now a fixed fraction of the table wrapper. As the table grows or shrinks, the dealer scales in lockstep.
- **`top: '-12%'`** (landscape) — a pure percentage of the table wrapper height. No pixel offsets means no drift at any size.
- **`top: '-18%'`** (portrait) — same principle for portrait orientation.
- The `isLandscape` flag checks `width > height`, so it works correctly on all devices regardless of exact pixel width.

The `-12%` value was calculated from the iPhone 16 Pro reference (where it currently looks perfect): the effective offset is roughly 12% of the table wrapper height.

## What Changes
- `src/components/poker/OnlinePokerTable.tsx` line 1181 only — dealer wrapper style

## What Does NOT Change
- No seat positions
- No card layouts, animations, or other UI elements
- `isMobileLandscape` / `isTablet` / `isLargeDesktop` variables are untouched (used elsewhere)
- DealerCharacter component untouched
- PokerTablePro untouched
- Bottom nav untouched

