

## Fix: Fit-to-Screen Premium Poker Table

The game currently overflows the viewport because (1) the bottom nav and its 80px padding remain visible during active gameplay, (2) the felt table area takes too much vertical space, and (3) the bot section wraps freely. Looking at the reference screenshots, premium poker games use a single fullscreen view where everything -- opponents, table, cards, controls -- fits within the viewport with zero scrolling.

---

### Problems Identified

1. **Bottom nav stays visible** -- `/play-poker` is not in the hidden routes list in `AppLayout.tsx`, so the nav bar and its `pb-20` padding persist during gameplay
2. **Table area wastes space** -- The felt center uses `flex-1` with `min-h-[180px]` and `p-4`, making it too tall when there are few community cards
3. **Bot section is unbounded** -- Uses `flex-wrap` that can grow vertically with more bots
4. **Community card placeholders** -- 5 empty card slots always rendered, taking space even when unnecessary
5. **Human player section has loose spacing** -- `space-y-2` and `gap-4` add up

---

### Solution: Single-Screen Layout

Redesign `PokerTablePro.tsx` to be a true fullscreen, no-scroll poker table:

**AppLayout.tsx** -- Add `/play-poker` to the hidden nav routes so bottom nav and padding are removed during active gameplay.

**PokerTablePro.tsx** -- Complete layout restructure:
- Use a CSS grid or constrained flexbox with `h-[100dvh]` and `overflow-hidden` (already has this, but the AppLayout wrapper overrides it)
- **Header**: Shrink to a minimal 32px bar with hand number and blinds
- **Bot arc**: Use `overflow-x-auto` with `flex-nowrap` so bots scroll horizontally instead of wrapping vertically. Each bot seat becomes more compact (48px wide)
- **Felt center**: Remove `min-h-[180px]`, reduce padding to `p-2`, tighten gap. Only show community card placeholders when a hand is active
- **Human section**: Compact layout -- cards and avatar side-by-side in a single row, chip count inline
- **Betting controls**: Rendered inside the felt area or overlaid at the bottom, not stacked below it
- **"Next Hand" button**: Overlaid on the felt center, not below it

**BettingControls.tsx** -- Make more compact:
- Quick bet buttons and action buttons in a single combined row
- Remove the slider by default (only show when "Raise" is tapped as a second step, or use a more compact inline input)
- Reduce overall height from ~120px to ~80px

**CardDisplay.tsx** -- Reduce `md` size slightly (from `w-11 h-16` to `w-10 h-14`) to save vertical space in the community card area.

**PlayerAvatar.tsx** -- No changes needed, already compact.

**PotDisplay.tsx** -- Reduce padding (`px-3 py-1` instead of `px-4 py-1.5`).

---

### Technical Details

**Files to modify:**

1. **`src/components/layout/AppLayout.tsx`**
   - Add `/play-poker` and `/online-poker` to the routes that hide the bottom nav (or check for a gameplay-active prefix)

2. **`src/components/poker/PokerTablePro.tsx`**
   - Restructure to a 3-zone vertical layout: top (bots, ~25%), middle (felt with pot + community cards, ~45%), bottom (human cards + controls, ~30%)
   - Bot section: `flex-nowrap overflow-x-auto` with compact seats
   - Felt: remove `min-h-[180px]`, use `flex-1` with reduced padding
   - Remove empty card slot placeholders (only show dealt cards)
   - Human section: single-row layout with cards, avatar, and chip count side by side
   - Betting controls inline within the bottom section, not stacked

3. **`src/components/poker/BettingControls.tsx`**
   - Compact single-row layout: Fold | Check/Call | Raise as a tight button bar
   - Quick bet presets shown as small chips above the main buttons
   - Raise slider only appears when "Raise" is tapped (two-step interaction), keeping default view to ~44px height

4. **`src/components/poker/CardDisplay.tsx`**
   - Reduce `md` size: `w-10 h-14 text-xs`

5. **`src/components/poker/PotDisplay.tsx`**
   - Tighter padding and smaller text

6. **`src/index.css`**
   - No new animations needed, just ensuring existing ones work with the tighter layout

### No database or backend changes needed.
