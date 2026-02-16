

# Fix "Your Turn" Pill Position & Add Icons to Betting Buttons

## Issue 1: "YOUR TURN" pill overlaps the player avatar

The pill is positioned at `bottom: calc(env(safe-area-inset-bottom) + 100px)` in portrait mode, which places it right over the hero seat area.

**Fix**: Move it higher so it sits just above the betting controls bar instead of on top of the player. Change the bottom offset from `100px` to `140px` in portrait, placing it clearly above the action buttons and below the player avatar zone.

## Issue 2: Fold/Check/Call/Raise buttons have no icons

The buttons are text-only, making them hard to distinguish at a glance during fast gameplay.

**Fix**: Add Lucide icons to each button:
- **Fold**: `X` icon (clear "no" signal)
- **Check**: `Check` icon (tick mark)
- **Call**: `PhoneCall` or `ArrowRight` icon (matching action)
- **Raise**: `TrendingUp` icon (upward arrow)
- **All-in**: `Flame` icon (dramatic emphasis)

Icons will be small (14px) and placed before the text label in both portrait and landscape layouts.

## Technical Detail

### File: `src/components/poker/BettingControls.tsx`
- Import `X, Check, PhoneCall, TrendingUp, Flame` from `lucide-react`
- Add the appropriate icon (`<Icon size={14} />`) inside each button, before the text label
- Apply to both portrait and landscape button variants

### File: `src/components/poker/OnlinePokerTable.tsx`
- Line 588: Change portrait bottom from `100px` to `140px` to push the "YOUR TURN" pill above the controls bar and away from the avatar

