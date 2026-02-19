

# Fix: Dealer Scales with Table Wrapper, Not Viewport

## Root Cause

The dealer image width is set to `min(9vw, 140px)` — relative to the **viewport**. But the table wrapper maxes out at 990px. On large monitors and larger phones (Pro Max), the viewport is bigger so the dealer image grows larger relative to the table, pushing its visual center downward past the table edge. The `top: -14%/-22%` percentage is correct for the table, but the dealer's own height changes disproportionately.

## Solution

Make the dealer's size relative to the **table wrapper** instead of the viewport. Since the dealer is already absolutely positioned inside the table wrapper, we set its width as a percentage of that wrapper.

### Changes

**1. `src/components/poker/DealerCharacter.tsx` (line 31)**

Change the image container width from viewport-relative to parent-relative:

```
// Current
width: 'min(9vw, 140px)',

// New
width: '100%',
```

This makes DealerCharacter fill whatever width its parent provides.

**2. `src/components/poker/PokerTablePro.tsx` (line 347)**

Add a percentage width to the dealer wrapper so it scales with the table:

```
// Current
<div className="absolute left-1/2 -translate-x-1/2" style={{ top: isLandscape ? '-14%' : '-22%', zIndex: Z.DEALER }}>

// New
<div className="absolute left-1/2 -translate-x-1/2" style={{ top: isLandscape ? '-14%' : '-22%', width: '11%', zIndex: Z.DEALER }}>
```

11% of the table wrapper width matches the current visual size on iPhone 16 Pro (where it looks perfect).

**3. `src/components/poker/OnlinePokerTable.tsx` (line 1181)**

Add matching width to maintain current behaviour in the online poker table:

```
// Add width to the existing dealer wrapper div
style={{ ..., width: 'min(9vw, 140px)' }}
```

This preserves the existing sizing for OnlinePokerTable since it has its own separate positioning logic.

## Why This Works

- On iPhone 16 Pro: table is ~86vw, 11% of that = ~9.5vw -- same as current, no visual change
- On large monitors: table caps at 990px, 11% = ~109px -- proportional to table, not oversized
- On Pro Max: table is slightly wider viewport but same ratio -- dealer stays proportional
- The `top` percentage now works correctly at all sizes because the dealer's height scales with the table

## What Does NOT Change
- No seat positions
- No card layouts or animations
- No styling, navigation, or spacing changes
- Bottom nav untouched
- Dealer expression/sparkle animations untouched
